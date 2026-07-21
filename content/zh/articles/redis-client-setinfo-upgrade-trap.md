---
title: 升级 Spring Boot 后 Redis 连不上：CLIENT SETINFO 背后的协议坑
summary: 以 spring-data-redis#3071 为例，说明 Spring Boot 3.4 / Lettuce 握手行为变化后，旧版 Redis 上出现 ERR unknown command 与 NOAUTH 的根因和规避方式。
author: evan
category: learning
tags: [Redis, Spring Boot, Lettuce, 升级, GitHub Issue]
createdAt: 2026-07-20
updatedAt: 2026-07-20
readingMinutes: 8
---

# 升级 Spring Boot 后 Redis 连不上：CLIENT SETINFO 背后的协议坑

来源 Issue：[spring-projects/spring-data-redis#3071](https://github.com/spring-projects/spring-data-redis/issues/3071)

「Issue 搬砖」系列第二篇实战：升级框架后突然连不上 Redis，错误看起来像鉴权或 database 配置写错，根因却在客户端握手协议。

## 现场：database=0 正常，database=1 失败

报告者升级到 Spring Boot 3.4 / Spring Data Redis 3.4 后：

- `spring.data.redis.database=0` 可以连
- `spring.data.redis.database=1` 失败
- 报错链路里出现 `ERR unknown command`（针对 `CLIENT SETINFO`）
- 更深的堆栈里还能看到 `NOAUTH Authentication required`
- 同一套业务在 Spring Data Redis 3.2 没问题
- Redis 服务端版本低于 7.2（Issue 中为 5.0）

这很像「切库写错了」或「密码没生效」，但真正触发点是：**新客户端握手行为变了，旧 Redis 听不懂新命令。**

## 为什么会出现 CLIENT SETINFO

较新的 Lettuce 在连接阶段会走更现代的握手路径（涉及 `HELLO` / RESP3，以及连接元信息设置）。`CLIENT SETINFO` 从 Redis 7.2 才正式支持。

于是版本组合变成：

```text
新 Spring Data Redis + 新 Lettuce
        ↓
握手时发 CLIENT SETINFO / HELLO 相关命令
        ↓
旧 Redis（< 7.2）回复 ERR unknown command
        ↓
认证与选库时序被打乱
        ↓
表现为连不上 / NOAUTH / 切 database 失败
```

维护者给出的定性很干脆：这是 driver（Lettuce）行为变化带来的问题，不是业务代码突然坏了。

## 可执行的规避方案

### 方案 A：强制 RESP2（兼容旧 Redis）

```java
@Bean
public LettuceConnectionFactory redisConnectionFactory(RedisStandaloneConfiguration serverConfig) {
    LettuceClientConfiguration clientConfig = LettuceClientConfiguration.builder()
        .clientOptions(ClientOptions.builder()
            .protocolVersion(ProtocolVersion.RESP2)
            .build())
        .build();

    return new LettuceConnectionFactory(serverConfig, clientConfig);
}
```

强制 RESP2 后，认证会回到传统 `AUTH` 路径，避开旧服务端不支持的握手命令。

### 方案 B：升级 Redis 到 7.2+

如果基础设施允许，直接升级服务端，让 `CLIENT SETINFO` 成为合法命令。这是更干净的长期方案。

### 方案 C：对齐客户端修复版本

Issue 提到 Lettuce 6.5 通过相关修复改善了该问题（见 [lettuce#3035](https://github.com/redis/lettuce/pull/3035)）。升级 Spring 生态时，同步核对 Lettuce 版本，不要只看 Boot 大版本号。

## 升级检查清单（可直接复用）

发布前至少核对这四项：

1. **Redis 服务端小版本**：是否 < 7.2
2. **Lettuce 版本**：是否会默认走新握手
3. **非 0 号库**：用 `database=1` 做一次真实连通性探测
4. **鉴权路径**：确认密码库场景下不会先发不受支持的命令再 AUTH

一条简单的上线探针：

```bash
# 应用启动后立刻验证非 0 库读写
redis-cli -n 1 PING
```

应用侧再补一个启动期健康检查：对目标 database 执行 `PING`，失败即快速失败，避免「进程起来了但缓存全挂」。

## 这篇文章能带走什么

1. **框架小版本升级，可能改变客户端握手，而不只是 API**
2. **`database=0` 成功不能证明 `database=1` 也成功**
3. **报错文案可能是 `NOAUTH`，根因却是更早的 unknown command**
4. **兼容旧中间件时，记得保留「强制旧协议」的逃生开关**

Issue 搬砖的价值就在这里：你不用自己先炸一次生产，也能提前把升级雷写进检查清单。
