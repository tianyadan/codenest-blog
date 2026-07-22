---
title: How to Implement Distributed Rate Limiting with Redisson
summary: This article shows how to build distributed rate limiting with Redisson, including client configuration, a rate-limit annotation, an AOP aspect, per-user or per-IP keys, and a token-bucket-based RRateLimiter.
author: evan
category: learning
tags: [Learning, Redis, Redisson]
createdAt: 2025-10-28 22:30:19
updatedAt: 2025-10-28 22:30:19
readingMinutes: 15
---
# How to Implement Distributed Rate Limiting with Redisson

## 1. First, add the Redisson dependency

```xml
<!-- Redisson -->
<dependency>
    <groupId>org.redisson</groupId>
    <artifactId>redisson</artifactId>
    <version>3.50.0</version>
</dependency>
```

## 2. Create a `config` package under the project root and add a `RedissonConfig` configuration class

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

(Optional) You can also add an enum entry like this:

```java
TOO_MANY_REQUEST(42900, "Too many requests"),
```

## 3. Create a rate-limit enum to support API-level, user-level, and IP-level limiting

```java
public enum RateLimitType {

    /**
     * API-level rate limiting
     */
    API,

    /**
     * User-level rate limiting
     */
    USER,

    /**
     * IP-level rate limiting
     */
    IP
}
```

```js
```

## 4. Create the rate-limit annotation

Create an `annotation` package and add a `RateLimit` annotation.

```java
@Target({ElementType.METHOD})
@Retention(RetentionPolicy.RUNTIME)
public @interface RateLimit {

    /**
     * Rate-limit key prefix
     */
    String key() default "";

    /**
     * Number of requests allowed in each time window
     */
    int rate() default 10;

    /**
     * Time window in seconds
     */
    int rateInterval() default 1;

    /**
     * Rate-limit type
     */
    RateLimitType limitType() default RateLimitType.USER;

    /**
     * Rate-limit message
     */
    String message() default "Too many requests, please try again later";
}
```

## 5. Implement the rate-limit aspect

Create an `aspect` package and add a `RateLimitAspect` class. Use AOP to implement the rate-limiting logic.

#### 5.1 First define the aspect and injected dependencies

```java
@Aspect
@Component
@Slf4j
public class RateLimitAspect {
    @Resource
    private RedissonClient redissonClient;
    @Resource
    private UserService userService;
}
```

#### 5.2 Write the core rate-limiting logic

```java
@Before("@annotation(rateLimit)")
public void doBefore(JoinPoint point, RateLimit rateLimit) {
    String key = generateRateLimitKey(point, rateLimit);
    // Use Redisson's distributed rate limiter
    RRateLimiter rateLimiter = redissonClient.getRateLimiter(key);
    rateLimiter.expire(Duration.ofHours(1)); // Expire after 1 hour
    // Set the rate limiter parameters: request count per window and the window size
    rateLimiter.trySetRate(RateType.OVERALL, rateLimit.rate(), rateLimit.rateInterval(), RateIntervalUnit.SECONDS);
    // Try to acquire a token; if it fails, reject the request
    if (!rateLimiter.tryAcquire(1)) {
        throw new BusinessException(ErrorCode.TOO_MANY_REQUEST, rateLimit.message());
    }
}
```

This is the core entry point of the rate-limiting logic. Before a method annotated with `@RateLimit` executes, the aspect intercepts it, generates a rate-limit key, obtains the Redisson rate limiter, sets the limiting rules, and then uses a token bucket algorithm to decide whether the request can proceed. If the limit is exceeded, it throws a business exception.

One important detail is that you must set an expiration time for the rate limiter. Otherwise the Redis key never expires, and long-running systems may eventually consume more and more memory until they hit OOM.

#### 5.3 Write the method that generates the rate-limit key

```java
private String generateRateLimitKey(JoinPoint point, RateLimit rateLimit) {
    StringBuilder keyBuilder = new StringBuilder();
    keyBuilder.append("rate_limit:");
    // Add a custom prefix
    if (!rateLimit.key().isEmpty()) {
        keyBuilder.append(rateLimit.key()).append(":");
    }
    // Generate different keys based on the rate-limit type
    switch (rateLimit.limitType()) {
        case API:
            // API level: method name
            MethodSignature signature = (MethodSignature) point.getSignature();
            Method method = signature.getMethod();
            keyBuilder.append("api:").append(method.getDeclaringClass().getSimpleName())
                    .append(".").append(method.getName());
            break;
        case USER:
            // User level: user ID
            try {
                ServletRequestAttributes attributes = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
                if (attributes != null) {
                    HttpServletRequest request = attributes.getRequest();
                    User loginUser = userService.getLoginUser(request);
                    keyBuilder.append("user:").append(loginUser.getId());
                } else {
                    // Request context unavailable, fall back to IP rate limiting
                    keyBuilder.append("ip:").append(getClientIP());
                }
            } catch (BusinessException e) {
                // Unauthenticated users fall back to IP rate limiting
                keyBuilder.append("ip:").append(getClientIP());
            }
            break;
        case IP:
            // IP level: client IP
            keyBuilder.append("ip:").append(getClientIP());
            break;
        default:
            throw new BusinessException(ErrorCode.SYSTEM_ERROR, "Unsupported rate-limit type");
    }
    return keyBuilder.toString();
}
```

The purpose of this code is to generate a unique Redis key for different rate-limiting strategies. API-level keys are based on the method name, user-level keys are based on the user ID, and IP-level keys are based on the client IP, so the system supports all three dimensions of rate limiting.

There is also a utility method for obtaining the user's IP address. See [utility method for getting the user's IP](https://www.codenest.com.cn/articles/32).

## 6. Apply the rate-limit annotation

Use the annotation on any endpoint that needs rate limiting.

```java
@GetMapping(value = "/getmethod")
@RateLimit(limitType = RateLimitType.USER, rate = 5, rateInterval = 60, message = "Too many requests, please try again later")
public Result<String> doMethod(@RequestParam String parameter) {
     // Method implementation...
}
```

Code explanation: each user can initiate at most 5 requests within 60 seconds. If the limit is exceeded, the API returns a friendly error message.

## 7. How the rate limiting works

For rate limiting, Redisson provides `RRateLimiter`, which is based on the token bucket algorithm. This is a classic network traffic rate control algorithm.

1. Token bucket: the system maintains a token bucket with a fixed capacity
2. Token generation: tokens are added to the bucket at a fixed rate
3. Request handling: every request must consume a token before it can be processed
4. Limiting effect: when there are no tokens left, requests are rejected or queued

The advantage of this algorithm is that it allows burst traffic.

![Screenshot](https://github.com/thw610013/picx-images-hosting/raw/master/截屏2025-10-28-22.26.18.8l0hs149sc.webp)
