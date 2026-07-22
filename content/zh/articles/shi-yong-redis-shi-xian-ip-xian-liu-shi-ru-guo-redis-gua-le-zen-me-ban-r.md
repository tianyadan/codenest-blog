---
title: 使用 Redis 实现 IP 限流时，如果 Redis 挂了怎么办？如何保证高可用？
summary: 在实际项目中，如果使用 Redis 实现 IP 限流，当 Redis 发生故障、网络抖动或者集群不可用时，限流功能将失效。 请问： Redis 挂了怎么办...
author: evan
category: work
tags: [工作总结, Redis]
createdAt: 2026-05-29 09:46:46
updatedAt: 2026-05-29 09:46:46
readingMinutes: 7
---
# 使用 Redis 实现 IP 限流时，如果 Redis 挂了怎么办？如何保证高可用？

## 提问

在实际项目中，如果使用 Redis 实现 IP 限流，当 Redis 发生故障、网络抖动或者集群不可用时，限流功能将失效。

请问：

- Redis 挂了怎么办？
- 如何保证限流系统高可用？
- 具体代码如何实现？

---

## 回答

Redis 限流本身存在单点依赖风险，因此生产环境不能只考虑限流逻辑，还需要考虑 Redis 故障场景下的降级策略。

我的设计思路是：

### 1、Redis 本身保证高可用

通常不会使用单机 Redis。

生产环境一般采用：

- Redis Sentinel（哨兵模式）
- Redis Cluster（集群模式）
- 云厂商 Redis 高可用版

当主节点故障时，可以自动完成主从切换，减少服务中断时间。

---

### 2、业务层增加降级策略

即使 Redis 高可用，也无法保证 100% 不出问题。

因此限流逻辑需要支持降级。

主要有两种策略：

#### Fail Closed（默认拒绝）

Redis 不可用时直接拒绝请求。

适用于：

- 登录接口
- 验证码接口
- 支付接口
- 风控接口

优点：

- 安全性高

缺点：

- 可能误伤正常用户

---

#### Fail Open（默认放行）

Redis 不可用时允许请求继续执行。

适用于：

- 普通查询接口
- 文章浏览接口
- 非核心业务接口

优点：

- 保证业务连续性

缺点：

- 短时间内可能失去限流能力

---

### 3、本地限流兜底

Redis 限流属于全局限流。

Redis 异常时，可以自动退化为本地 JVM 限流。

例如：

- Caffeine
- Guava RateLimiter
- Bucket4j
- Sentinel

这样即使 Redis 故障，也能避免系统完全裸奔。

---

### 4、Redis 请求设置超时时间

避免 Redis 故障拖垮业务线程。

例如：

yaml spring:   data:     redis:       timeout: 300ms 

或者：

java commandTimeout(Duration.ofMillis(300)); 

Redis 超时后立即触发降级逻辑。

---

## 追问:

那么代码层面如何实现 Redis 故障自动降级？

---

## 回答

我的实现方式是：

### 正常情况

Redis + Lua 脚本实现全局限流。

例如：

text 同一个 IP 60 秒最多访问 100 次 

Lua 脚本：

```lua
lua local key = KEYS[1] 
local limit = tonumber(ARGV[1]) 
local expire = tonumber(ARGV[2])  
local current = redis.call('incr', key)  
if current == 1 then     
    redis.call('expire', key, expire) end  
if current > limit then    
    return 0 
        else return 1 end 
```

利用 Lua 保证：

text INCR + EXPIRE 原子执行 

避免并发问题。

---

### Redis 正常时

```java
     Long result = redisTemplate.execute(     
         script,     List.of(key),     "100",     "60" );  
     return result == 1; 
```

所有服务实例共享 Redis 计数器。

实现全局限流。

---

### Redis 故障时

捕获 Redis 异常：

```java
 try {     
     return redisLimit(ip); 
     } 
     catch (Exception e) 
         {     return localLimit(ip); } 
```
自动切换到本地限流。

例如：

```java
private boolean localLimit(String ip) 
    {     AtomicInteger counter = cache.get(ip, k -> new AtomicInteger(0));      
    return counter.incrementAndGet() <= 100; } 
```

---

## 继续追问

如果系统部署了 10 台服务，Redis 挂了以后，每台机器都使用本地限流，会不会导致限流不准确？

---

## 回答

会。

因为本地限流只能统计当前 JVM 内部的请求数。

例如：

text 限制： 100 次/分钟  部署： 10 台服务器  理论最大： 100 × 10 = 1000 次/分钟 

因此本地限流无法保证全局精确性。

但这里的目标并不是保证绝对准确。

而是在 Redis 故障期间：

- 防止系统被流量直接打穿
- 避免服务雪崩
- 保证核心业务继续运行

属于一种降级保护措施。

---

## 总结

生产环境下 Redis 限流高可用方案通常采用：

1. Redis Sentinel 或 Redis Cluster 保证 Redis 高可用。
2. Lua 脚本实现原子限流。
3. Redis 设置短超时时间。
4. Redis 异常自动降级。
5. 本地限流作为兜底方案。
6. 根据业务场景选择 Fail Open 或 Fail Closed。

核心思想：

text Redis 高可用 + 业务降级 + 本地限流兜底 + 超时控制  而不是单纯依赖 Redis 集群。
