---
title: What If Redis Goes Down When You Use It for IP Rate Limiting? How Do You Keep It Highly Available?
summary: "If Redis is used for IP rate limiting in a real project, a Redis outage or network jitter can break the limiter. This article explains how to keep the design highly available through HA Redis, failover strategies, timeouts, and local fallback limiting."
author: evan
category: work
tags: [Work Notes, Redis]
createdAt: 2026-05-29 09:46:46
updatedAt: 2026-05-29 09:46:46
readingMinutes: 7
---
# What If Redis Goes Down When You Use It for IP Rate Limiting? How Do You Keep It Highly Available?

## Question

In real projects, if Redis is used to implement IP rate limiting, the rate limiter can fail when Redis goes down, the network jitters, or the cluster becomes unavailable.

So:

- What should you do if Redis goes down?
- How do you keep the rate limiting system highly available?
- What does the actual implementation look like?

---

## Answer

Redis-based rate limiting carries a single-point dependency risk by nature. In production, you cannot think only about the rate limiting logic itself. You also have to think about degradation strategies for Redis failures.

My design approach is:

### 1. Make Redis itself highly available

In most cases, you would not use a standalone Redis node.

Production deployments usually use:

- Redis Sentinel
- Redis Cluster
- A cloud provider's high-availability Redis offering

When the primary node fails, the system can automatically complete failover and reduce service interruption time.

---

### 2. Add fallback strategies at the business layer

Even with Redis HA, you still cannot guarantee that nothing will ever go wrong.

Because of that, the rate limiting logic must support degradation.

There are two common strategies:

#### Fail Closed

If Redis is unavailable, reject requests directly.

Suitable for:

- Login APIs
- CAPTCHA APIs
- Payment APIs
- Risk control APIs

Advantages:

- Higher security

Disadvantages:

- May block legitimate users by mistake

---

#### Fail Open

If Redis is unavailable, allow the request to continue.

Suitable for:

- General query APIs
- Article browsing APIs
- Non-core business APIs

Advantages:

- Preserves business continuity

Disadvantages:

- You may temporarily lose rate limiting capability

---

### 3. Use local rate limiting as a fallback

Redis-based limiting is global rate limiting.

If Redis fails, you can automatically degrade to local JVM-based rate limiting.

For example:

- Caffeine
- Guava RateLimiter
- Bucket4j
- Sentinel

This prevents the system from running completely unprotected even when Redis has a problem.

---

### 4. Set Redis request timeouts

Do not let Redis failures drag down your business threads.

For example:

```yaml
spring:
  data:
    redis:
      timeout: 300ms
```

Or:

```java
commandTimeout(Duration.ofMillis(300));
```

After a Redis timeout, trigger degradation logic immediately.

---

## Follow-up Question

So how do you implement automatic fallback when Redis fails?

---

## Answer

My implementation is:

### Normal case

Use Redis + a Lua script to implement global rate limiting.

For example:

```text
The same IP can access at most 100 times in 60 seconds
```

Lua script:

```lua
local key = KEYS[1]
local limit = tonumber(ARGV[1])
local expire = tonumber(ARGV[2])
local current = redis.call('incr', key)
if current == 1 then
    redis.call('expire', key, expire)
end
if current > limit then
    return 0
else
    return 1
end
```

Lua guarantees:

```text
INCR + EXPIRE execute atomically
```

This avoids concurrency issues.

---

### When Redis is healthy

```java
Long result = redisTemplate.execute(
        script,
        List.of(key),
        "100",
        "60"
);
return result == 1;
```

All service instances share the same Redis counter.

That gives you global rate limiting.

---

### When Redis fails

Catch the Redis exception:

```java
try {
    return redisLimit(ip);
} catch (Exception e) {
    return localLimit(ip);
}
```

Then automatically switch to local rate limiting.

For example:

```java
private boolean localLimit(String ip) {
    AtomicInteger counter = cache.get(ip, k -> new AtomicInteger(0));
    return counter.incrementAndGet() <= 100;
}
```

---

## Another Follow-up Question

If the system is deployed on 10 servers and Redis goes down, and each machine switches to local rate limiting, won't the result become inaccurate?

---

## Answer

Yes.

Because local rate limiting can only count requests inside the current JVM.

For example:

```text
Limit: 100 requests/minute
Deployment: 10 servers
Theoretical maximum: 100 x 10 = 1000 requests/minute
```

So local rate limiting cannot guarantee global precision.

But the goal here is not absolute accuracy.

During a Redis outage, the goal is to:

- Prevent traffic from overwhelming the system directly
- Avoid a service avalanche
- Keep core business functions running

This is a degradation protection measure.

---

## Summary

In production, a highly available Redis rate limiting solution usually includes:

1. Redis Sentinel or Redis Cluster to keep Redis highly available.
2. Lua scripts for atomic rate limiting.
3. Short Redis timeouts.
4. Automatic degradation on Redis exceptions.
5. Local rate limiting as a fallback.
6. Choosing Fail Open or Fail Closed according to the business scenario.

Core idea:

```text
Redis HA + business-layer degradation + local rate limiting fallback + timeout control
```

Do not rely solely on the Redis cluster.
