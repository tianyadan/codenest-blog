---
title: 查 Redis keyA 却返回 keyB：从 Spring Data Redis Issue 学连接复用
summary: 以 spring-data-redis#3077 为例，拆解 shareNativeConnection 默认开启时，高并发或异常恢复后出现「串值」的机制、误判与应对。
author: evan
category: learning
tags: [Redis, Spring Data Redis, Lettuce, 连接复用, GitHub Issue]
createdAt: 2026-07-20
updatedAt: 2026-07-20
readingMinutes: 10
---

# 查 Redis keyA 却返回 keyB：从 Spring Data Redis Issue 学连接复用

来源 Issue：

- [spring-projects/spring-data-redis#3077](https://github.com/spring-projects/spring-data-redis/issues/3077)
- 相关讨论：[redis/lettuce#3117](https://github.com/redis/lettuce/issues/3117)
- 重复报告：[spring-data-redis#3083](https://github.com/spring-projects/spring-data-redis/issues/3083)

这是「Issue 搬砖」系列的第一篇实战拆解：看起来像业务串数据，根因却落在客户端连接模型上。

## 现场：现象非常吓人

报告者在 Spring Boot + WebFlux + 默认 `LettuceConnectionFactory` 场景下遇到：

- 查询 `key1`，反序列化时却读到别的内容
- 有时拿到的是字面量 `OK`
- 有时拿到的是另一个 key 的 JSON
- 问题极偶发，更像高并发或异常之后才出现
- 把 `shareNativeConnection` 设为 `false` 后，现象消失

错误日志的核心不是「key 不存在」，而是「读到了不该属于这次请求的字节」：

```text
Could not read JSON: ... [Source: (byte[])"OK"; ...]
Expected to obtain a policy model but got OK
```

以及：

```text
Cannot deserialize value of type ArrayList<Policy> from Object value
[Source: (byte[])"{"name":"123","age":16,...}"]
```

第一反应很容易怪 Jackson、业务缓存封装，甚至 Redis 本身。但「关闭共享连接后稳定」这个对照实验，把矛头指向了连接复用路径。

## 默认配置里藏着的开关

`LettuceConnectionFactory` 默认会共享原生连接。文档大意是：

- `getConnection()` 每次返回新的 `LettuceConnection` 包装对象
- 多个包装对象默认共享同一条 thread-safe native connection
- `shareNativeConnection=true` 时，常规命令走共享连接；阻塞/事务类操作另取连接
- 共享 native connection 通常不会被 `LettuceConnection` 关闭，因此默认不做连接校验

简化理解：

```text
业务线程 A / B / C
    ↓
多个 LettuceConnection 包装
    ↓
默认共享 1 条 Lettuce native connection
    ↓
Redis Server
```

共享连接的收益是省资源、少握手；代价是：一旦响应乱序、连接状态异常，症状会表现为「这次读到了上次/别人的回复」。

## Issue 里真正值钱的线索

维护者 @mp911de 指出两个关键点：

1. 没有稳定复现时，很难直接定性是 Spring Data Redis 还是 Lettuce
2. 有可能是 Lettuce 侧响应乱序；Spring Data Redis 使用自己的 `byte[]` 反序列化，不走 Lettuce `RedisCodec`

报告者后来补充了一句更关键的信息：

> 这个问题可能出现在 OOM 发生一段时间之后。

这句话把问题从「纯业务并发写错」推进到「异常恢复后的连接健康度」。也正因如此，Issue 被标成 `for: external-project`，并转到 Lettuce 侧继续跟进。

## 为什么会误判成「序列化 bug」

串值问题最会伪装：

| 你看到的 | 实际可能是 |
|----------|------------|
| JSON 解析失败 | 读到了别人的 payload |
| 类型不匹配 | 读到了另一个业务模型 |
| 偶发难复现 | 共享连接在异常后状态不稳定 |
| 关共享连接就好 | 隔离连接后不再「串回复」 |

所以排障顺序建议改成：

1. 先确认「读到的字节」是不是当前 key 该有的内容
2. 再看连接工厂是否共享 native connection、是否多 `RedisTemplate` 共用工厂
3. 对照异常事件（OOM、连接闪断、超时重试）时间线
4. 最后才深入业务序列化器

## 可落地的应对

### 1. 临时止血：关闭共享连接

```java
@Bean
public LettuceConnectionFactory redisConnectionFactory(RedisStandaloneConfiguration config) {
    LettuceConnectionFactory factory = new LettuceConnectionFactory(config);
    // 关闭共享 native connection，优先保证正确性
    factory.setShareNativeConnection(false);
    return factory;
}
```

代价是连接与握手开销上升，适合先止损、再评估容量。

### 2. 需要共享时：加强校验与边界

- 不要手动关闭共享 native connection
- 异常频繁时可考虑 `setValidateConnection(true)`（会增加往返开销）
- 多个 Redis 主机 / 多个 `RedisTemplate` 时，确认工厂与连接生命周期没有串用

### 3. 升级与观测

- 对齐 Spring Data Redis 与 Lettuce 版本，关注客户端侧乱序/恢复相关修复
- 日志里同时打：key、原始字节摘要、连接工厂配置、是否刚发生过 OOM/重连
- 压测时专门覆盖「异常注入后的恢复窗口」，而不是只测稳态 QPS

## 这篇文章能带走什么

从这条 Issue 学到的不是「Redis 不可信」，而是：

1. **默认性能优化可能牺牲故障隔离**
2. **串值问题优先怀疑连接与协议层，再怀疑业务序列化**
3. **OOM / 重连之后的「偶发正确性」往往比稳态性能更危险**
4. **Issue 评论里的一句话（例如 OOM 后出现）可能比整页堆栈更值钱**

这也是 GitHub Issue 值得搬砖的原因：你搬到的不是热闹，而是别人用故障替你交过的学费。
