---
title: What Is Redisson?
summary: Redisson is a Redis-based Java distributed framework that gives Java applications distributed capabilities such as locks, queues, collections, objects, semaphores, and rate limiters.
author: evan
category: learning
tags: [Learning, Redis, Redisson]
createdAt: 2025-10-28 21:58:03
updatedAt: 2025-10-28 21:58:03
readingMinutes: 10
---
# What Is Redisson?

## Redisson is a Redis-based Java distributed framework.

Its core goal is:

> To provide distributed capabilities inside Java applications through Redis, including locks, queues, collections, objects, semaphores, rate limiters, and more.

In other words:
Redisson is not just a simple Redis client like Jedis or Lettuce with low-level wrappers.
It is a higher-level distributed toolkit.

## Main functional modules of Redisson

| Feature category | Description | Example classes |
| --- | --- | --- |
| Distributed locks | Provides reentrant locks, fair locks, read-write locks, and RedLock | RLock, RReadWriteLock |
| Distributed collections | Distributed versions similar to Java collection interfaces | RMap, RSet, RList, RQueue, RDeque |
| Distributed objects | Similar to Java objects, but data is stored in Redis | RBucket, RAtomicLong, RBitSet |
| Distributed services | Supports remote calls, publish-subscribe, Bloom filters, rate limiters, and more | RTopic, RRateLimiter, RRemoteService |
| Transactions and batch operations | Supports Redis pipeline and transaction mechanisms | RBatch, RTransaction |
| Distributed utility classes | Semaphores, countdown latches, counters, and more | RSemaphore, RCountDownLatch |

**In short**: Redisson turns Redis into the supporting system for distributed Java in-memory structures.

## Why use Redisson?

| Scenario |  | Why use Redisson |
| --- | --- | --- |
| Distributed locks |  | Prevent multiple nodes from modifying the same resource at the same time, such as inventory or user balance |
| Delayed queues |  | Handle order timeout closing or delayed task execution |
| Rate limiting |  | Prevent API abuse and control request speed |
| Cache penetration, breakdown, and avalanche |  | Combine locks with cache objects |
| Semaphores / counters |  | Control the number of concurrent tasks |
| Distributed sessions |  | Share login state, verification codes, and similar data |

## Quick start example

Add Redisson through Maven:

```xml
<dependency>
    <groupId>org.redisson</groupId>
    <artifactId>redisson-spring-boot-starter</artifactId>
    <version>3.27.0</version>
</dependency>
```

Configuration file `application.yml`:

```yaml
spring:
  redis:
    host: localhost
    port: 6379
```

Example code (distributed lock):

```java
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
            // Try to acquire the lock, wait up to 3 seconds, and auto-release after 10 seconds
            if (lock.tryLock(3, 10, TimeUnit.SECONDS)) {
                System.out.println("Lock acquired, creating order...");
                // Simulate business logic
                Thread.sleep(2000);
            } else {
                System.out.println("Lock not acquired, operation rejected");
            }
        } catch (InterruptedException e) {
            e.printStackTrace();
        } finally {
            if (lock.isHeldByCurrentThread()) {
                lock.unlock();
                System.out.println("Lock released");
            }
        }
    }
}
```

Behind this code, Redisson automatically uses Lua scripts plus Redis atomic operations to guarantee the reliability of distributed locks. It is very safe and stable.

## Typical application architecture (SpringBoot + Redisson)

```
User request -> Gateway -> Service A (Redisson lock)
                     -> Service B (Redisson queue / semaphore)
                        -> Redis cluster
```

## One-line summary

Redisson is the most elegant way to use Redis in the Java ecosystem.

> You no longer need to handwrite Lua scripts or maintain lock logic yourself. It wraps everything for you and integrates seamlessly with Spring.

### Extra: reusable Redisson client configuration

```java
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
        // Set the password if one exists
        if (redisPassword != null && !redisPassword.isEmpty()) {
            singleServerConfig.setPassword(redisPassword);
        }
        return Redisson.create(config);
    }
}

```
