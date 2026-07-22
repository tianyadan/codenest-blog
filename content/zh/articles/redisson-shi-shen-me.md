---
title: Redisson 是什么？
summary: 它的核心目标是： 在 Java 应用中，通过 Redis 提供分布式能力（锁、队列、集合、对象、信号量、限流器等）。 换句话说： Redisson 不是简...
author: evan
category: learning
tags: [学习, Redis, Redisson]
createdAt: 2025-10-28 21:58:03
updatedAt: 2025-10-28 21:58:03
readingMinutes: 10
---
# Redisson 是什么？

## Redisson 是一个基于 Redis 的 Java 分布式框架。

它的核心目标是：

> 在 Java 应用中，通过 Redis 提供分布式能力（锁、队列、集合、对象、信号量、限流器等）。

换句话说：
Redisson 不是简单的 Redis 客户端（像 Jedis、Lettuce 那种低层封装），
而是一个高层次的分布式工具包。

## Redisson 的主要功能模块：

| 功能类别 |说明 |示例类| 
| --- | --- | --- |
| 分布式锁 | 提供可重入锁、公平锁、读写锁、红锁（RedLock） | RLock, RReadWriteLock  |
| 分布式集合 | 提供与 Java 集合接口类似的分布式版本 | RMap, RSet, RList, RQueue, RDeque |
| 分布式对象 | 类似 Java 对象，但数据存储在 Redis |RBucket, RAtomicLong, RBitSet |
| 分布式服务 | 支持远程调用、发布订阅、布隆过滤器、限流器等 | RTopic, RRateLimiter, RRemoteService |
| 事务与批量操作 | 支持 Redis 的 pipeline 和事务机制 | RBatch, RTransaction  |
| 分布式工具类 | 信号量、倒计时锁存器、计数器等 | RSemaphore, RCountDownLatch  |

**概括来说**：Redisson 就是让 Redis 变成分布式 Java 内存结构的支撑系统。

## 为什么使用 Redisson？

| 场景 |  | 使用 Redisson 的原因 |
| --- | --- | --- |
| 分布式锁 |  |防止多节点同时修改同一资源（比如库存、用户余额） |
| 延迟队列 |  |实现订单超时关闭、任务延迟执行 |
| 限流 |  |实现接口防刷、限速访问 |
| 缓存穿透、击穿、雪崩 |  |结合锁机制和缓存对象 |
| 信号量/计数器 |  |控制并发任务数量  |
| 分布式 session |  |可共享登录态、验证码等  |
 
## 快速上手示例
通过 Maven 添加 Redisson：

```xml
<dependency>
    <groupId>org.redisson</groupId>
    <artifactId>redisson-spring-boot-starter</artifactId>
    <version>3.27.0</version>
</dependency>
```

配置文件 application.yml：

```yaml
spring:
  redis:
    host: localhost
    port: 6379
```

示例代码（分布式锁）：

```Java
import org.redisson.api.RedissonClient;
import org.redisson.api.RLock;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class OrderService {

    @Autowired
    private RedissonClient redissonClient;

    public void createOrder(String orderId) {
        RLock lock = redissonClient.getLock("order-lock:" + orderId);
        try {
            // 尝试获取锁，等待3秒，锁定10秒后自动释放
            if (lock.tryLock(3, 10, TimeUnit.SECONDS)) {
                System.out.println("获取到锁，正在创建订单...");
                // 模拟业务操作
                Thread.sleep(2000);
            } else {
                System.out.println("未获取到锁，操作被拒绝");
            }
        } catch (InterruptedException e) {
            e.printStackTrace();
        } finally {
            if (lock.isHeldByCurrentThread()) {
                lock.unlock();
                System.out.println("释放锁");
            }
        }
    }
}
```
这段代码背后，Redisson 会自动用 Lua 脚本 + Redis 的原子操作保障分布式锁的可靠性，非常安全稳定。

## 典型应用架构（SpringBoot + Redisson）

```
用户请求 → Gateway → 服务A (Redisson锁) 
                  ↘ 服务B (Redisson队列/信号量)
                    ↘ Redis 集群
```

## 总结一句话
Redisson 是 Java 世界中 Redis 的最优雅使用方式。
> 你不用再手写 Lua 脚本、自己维护锁逻辑，它帮你封装好一切，还能和 Spring 无缝集成。

### 补充（Redisson 客户端配置）可以直接复用：

```Java
@Configuration
public class RedissonConfig {

    @Value("${spring.data.redis.host}")
    private String redisHost;

    @Value("${spring.data.redis.port}")
    private Integer redisPort;

    @Value("${spring.data.redis.password}")
    private String redisPassword;

    @Value("${spring.data.redis.database}")
    private Integer redisDatabase;

    @Bean
    public RedissonClient redissonClient() {
        Config config = new Config();
        String address = "redis://" + redisHost + ":" + redisPort;
        SingleServerConfig singleServerConfig = config.useSingleServer()
                .setAddress(address)
                .setDatabase(redisDatabase)
                .setConnectionMinimumIdleSize(1)
                .setConnectionPoolSize(10)
                .setIdleConnectionTimeout(30000)
                .setConnectTimeout(5000)
                .setTimeout(3000)
                .setRetryAttempts(3)
                .setRetryInterval(1500);
        // 如果有密码则设置密码
        if (redisPassword != null && !redisPassword.isEmpty()) {
            singleServerConfig.setPassword(redisPassword);
        }
        return Redisson.create(config);
    }
}

```
