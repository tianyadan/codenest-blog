---
title: Detailed Implementation of a Multi-Layer Rate Limiting System in Spring Boot (Redis + Bucket4j + AOP)
summary: "In high-concurrency web systems, rate limiting is one of the core ways to protect stability. This article breaks down a production-style three-layer protection design using a Redis IP blacklist, Redis counters, and Bucket4j with AOP."
author: evan
category: work
tags: [Work Notes, Spring, Redis]
createdAt: 2026-01-26 22:10:43
updatedAt: 2026-01-26 22:10:43
readingMinutes: 13
---
# Detailed Implementation of a Multi-Layer Rate Limiting System in Spring Boot (Redis + Bucket4j + AOP)

## Main Text

**In high-concurrency web systems, rate limiting is one of the core ways to protect system stability. This article breaks down a production-grade three-layer rate limiting system and includes the overall code structure and design ideas.**

---

## 1. Overall Architecture

This project uses a three-layer rate limiting protection model:

```text
IP blacklist interception (Redis)
        ↓
IP high-frequency access blocking (Redis counter)
        ↓
API-level token-bucket rate limiting (Bucket4j + AOP annotation)
```

**Design goals**

- Prevent malicious crawlers, brute-force attacks, and traffic abuse
- Limit access frequency to protect the database and service stability
- Provide fine-grained rate limiting policies at the API level
- Support future expansion to distributed rate limiting

---

## 2. Layer 1: IP Blacklist Interception

Design idea:

Store blacklisted IPs in Redis. When a request enters the system, intercept it first to prevent it from reaching the business layer and consuming resources.

Blacklist storage:

| Key | Description |
| --- | --- |
| blocked:ips (Set) | IPs manually banned by administrators |
| blocked:ip:{ip}) | IPs automatically banned by the system (with TTL) |

---

Core code (IP interceptor):

```java
@Component
public class IpBlockInterceptor implements HandlerInterceptor {

    @Autowired
    private StringRedisTemplate redisTemplate;

    private static final int ACCESS_THRESHOLD = 60; // 60 times within 30 seconds
    private static final int ACCESS_INTERVAL = 30;  // Counting window
    private static final int BLOCK_TTL = 30;       // Ban duration

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        String clientIp = getClientIp(request);

        // Check whether the IP is blocked
        String blockKey = "blocked:ip:" + clientIp;
        Boolean isBlockedBySet = redisTemplate.opsForSet().isMember("blocked:ips", clientIp);
        Boolean isBlockedByKey = redisTemplate.hasKey(blockKey);

        if (Boolean.TRUE.equals(isBlockedBySet) || isBlockedByKey) {
            response.setStatus(403);
            response.getWriter().write("{\"message\":\"Your connection has been limited\"}");
            return false;
        }

        return true;
    }
}
```

---

## 3. Layer 2: Ban IPs for High-Frequency Access

Design idea:

Use a Redis counter to count the number of requests in a time window. When the threshold is exceeded, block the IP automatically.

**Rate limiting rules**

| Parameter | Meaning |
| --- | --- |
| ACCESS_INTERVAL | Counting window (30 seconds) |
| ACCESS_THRESHOLD | Threshold (60 times) |
| BLOCK_TTL | Ban duration (30 seconds) |

**That means: 30 seconds with >= 60 requests -> ban for 30 seconds**

```java
// Redis counting logic
String accessKey = "access:ip:" + clientIp;
Long count = redisTemplate.opsForValue().increment(accessKey);
if (count == 1) {
    redisTemplate.expire(accessKey, Duration.ofSeconds(ACCESS_INTERVAL));
}

if (count >= ACCESS_THRESHOLD) {
    redisTemplate.opsForValue().set(blockKey, "1", Duration.ofSeconds(BLOCK_TTL));
    return false;
}
```

---

## 4. Layer 3: API-Level Token Bucket Rate Limiting (Bucket4j)

Why choose Bucket4j?

- Production-grade token bucket implementation
- High performance and thread safe
- Supports both local and Redis-backed distributed modes

Maven dependency:

```xml
<dependency>
    <groupId>com.bucket4j</groupId>
    <artifactId>bucket4j_jdk17-core</artifactId>
    <version>8.14.0</version>
</dependency>
```

Token bucket service:

```java
@Component
public class RateLimitService {

    private final Map<String, Bucket> cache = new ConcurrentHashMap<>();

    public Bucket resolveBucket(String key, int capacity, int refill, int refillSeconds) {
        return cache.computeIfAbsent(key, k -> newBucket(capacity, refill, refillSeconds));
    }

    private Bucket newBucket(int capacity, int refill, int refillSeconds) {
        Bandwidth limit = Bandwidth.builder()
                .capacity(capacity)
                .refillGreedy(refill, Duration.ofSeconds(refillSeconds))
                .build();

        return Bucket.builder().addLimit(limit).build();
    }
}
```

Rate limiting annotation:

```java
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface RateLimit {
    String key() default "";
    int capacity() default 5;
    int refill() default 5;
    int refillSeconds() default 60;
}
```

AOP aspect implementation:

```java
@Aspect
@Component
@RequiredArgsConstructor
public class RateLimitAspect {

    private final RateLimitService rateLimitService;
    private final HttpServletRequest request;

    @Before("@annotation(rateLimit)")
    public void doRateLimit(RateLimit rateLimit) {
        String ip = request.getRemoteAddr();
        String key = rateLimit.key() + ":" + ip;

        Bucket bucket = rateLimitService.resolveBucket(
                key,
                rateLimit.capacity(),
                rateLimit.refill(),
                rateLimit.refillSeconds()
        );

        if (!bucket.tryConsume(1)) {
            throw new RateLimitException("Too many requests, please try again later");
        }
    }
}
```

Usage example: each IP may call the login API at most 5 times per minute.

```java
@RateLimit(key = "login", capacity = 5, refill = 5, refillSeconds = 60)
@PostMapping("/login")
public Result login() {
    return Result.ok();
}
```

---

## 5. How the Three Layers Work Together

```text
Request enters
  ↓
IP blacklist interception
  ↓
IP access frequency check
  ↓
API token bucket rate limiting
  ↓
Business logic execution
```

---

## 6. Production Optimization Suggestions

### 1. Get the real client IP (Nginx/CDN scenarios)

- `X-Forwarded-For`
- `X-Real-IP`
- `request.getRemoteAddr()`

### 2. Upgrade to distributed rate limiting

The current Bucket4j setup uses local memory, so it becomes ineffective across multiple instances.

Production options:

- Bucket4j Redis Extension
- Sentinel
- Resilience4j
- Nginx rate limiting

### 3. Improve the time window algorithm

The current solution is a fixed window, which can suffer from boundary spikes.

Possible upgrades:

- Sliding window
- Leaky bucket
- Redis SortedSet + Lua

### 4. Strengthen the blocking strategy

Exponential backoff for bans is recommended:

| Violation Count | Ban Duration |
| --- | --- |
| 1 | 30s |
| 2 | 5min |
| 3 | 1h |
| 4 | 24h |

---

## 7. Summary

This article implemented an enterprise-style rate limiting and anti-abuse system with the following core features:

- Redis blacklist and counter-based limiting
- Bucket4j API-level token bucket limiting
- AOP-based annotation configuration
- Precise control across both IP and API dimensions

It also makes a strong technical blog topic or resume project highlight.

Reference directions for future architecture upgrades:

- API Gateway rate limiting (Spring Cloud Gateway)
- `Nginx limit_req`
- Cloud provider WAF
- Distributed Redis-based token bucket implementation

This rate limiting design works well as a strong core-project highlight and shows both technical depth and engineering practice.
