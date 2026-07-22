---
title: 如何通过 Redisson 实现分布式限流
summary: "（可选）可以考虑新增一个枚举类： 这是限流的核心入口方法，在标注了 @RateLimit 注解的方法执行前进行拦截。生成限流 key，获取 Redisso..."
author: evan
category: learning
tags: [学习, Redis, Redisson]
createdAt: 2025-10-28 22:30:19
updatedAt: 2025-10-28 22:30:19
readingMinutes: 15
---
# 如何通过 Redisson 实现分布式限流

## 1. 首先引入 Redisson 依赖

```xml
<!-- Redisson -->
<dependency>
    <groupId>org.redisson</groupId>
    <artifactId>redisson</artifactId>
    <version>3.50.0</version>
</dependency>
```

## 2. 在项目根目录下创建 config 包，在 config 包下创建 RedissonConfig 配置类。

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

（可选）可以考虑新增一个枚举类：

```Java
TOO_MANY_REQUEST(42900, "请求过于频繁"),
```

## 3. 创建限流枚举类，支持接口、用户、IP 多个维度的限流。

```Java
public enum RateLimitType {
    
    /**
     * 接口级别限流
     */
    API,
    
    /**
     * 用户级别限流
     */
    USER,
    
    /**
     * IP级别限流
     */
    IP
}
```

```js
```
## 4. 创建限流注解，创建 annotation 包，新建 RateLimit 注解。

```Java
@Target({ElementType.METHOD})
@Retention(RetentionPolicy.RUNTIME)
public @interface RateLimit {
    
    /**
     * 限流key前缀
     */
    String key() default "";
    
    /**
     * 每个时间窗口允许的请求数
     */
    int rate() default 10;
    
    /**
     * 时间窗口（秒）
     */
    int rateInterval() default 1;
    
    /**
     * 限流类型
     */
    RateLimitType limitType() default RateLimitType.USER;
    
    /**
     * 限流提示信息
     */
    String message() default "请求过于频繁，请稍后再试";
}
```

## 5. 实现限流切面，新建aspect 包，创建 RateLimitAspect 切面类，使用 AOP 面向切面编程来实现限流逻辑。

#### 5.1 先定义切面和注解依赖：

```Java
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
#### 5.2 编写核心限流逻辑：

```Java
@Before("@annotation(rateLimit)")
public void doBefore(JoinPoint point, RateLimit rateLimit) {
    String key = generateRateLimitKey(point, rateLimit);
    // 使用Redisson的分布式限流器
    RRateLimiter rateLimiter = redissonClient.getRateLimiter(key);
    rateLimiter.expire(Duration.ofHours(1)); // 1 小时后过期
    // 设置限流器参数：每个时间窗口允许的请求数和时间窗口
    rateLimiter.trySetRate(RateType.OVERALL, rateLimit.rate(), rateLimit.rateInterval(), RateIntervalUnit.SECONDS);
    // 尝试获取令牌，如果获取失败则限流
    if (!rateLimiter.tryAcquire(1)) {
        throw new BusinessException(ErrorCode.TOO_MANY_REQUEST, rateLimit.message());
    }
}
```
这是限流的核心入口方法，在标注了`@RateLimit`注解的方法执行前进行拦截。生成限流 key，获取 Redisson 限流器，设置限流规则，然后使用令牌桶算法进行限流判断，超限时抛出业务异常。

需要注意的是一定要为限流器设置过期时间，否则 Redis 中的 key 永不过期，长时间运行后内存占用会越来越高导致 OOM。

#### 5.3 编写生成限流 key 的方法：

```Java
private String generateRateLimitKey(JoinPoint point, RateLimit rateLimit) {
    StringBuilder keyBuilder = new StringBuilder();
    keyBuilder.append("rate_limit:");
    // 添加自定义前缀
    if (!rateLimit.key().isEmpty()) {
        keyBuilder.append(rateLimit.key()).append(":");
    }
    // 根据限流类型生成不同的key
    switch (rateLimit.limitType()) {
        case API:
            // 接口级别：方法名
            MethodSignature signature = (MethodSignature) point.getSignature();
            Method method = signature.getMethod();
            keyBuilder.append("api:").append(method.getDeclaringClass().getSimpleName())
                    .append(".").append(method.getName());
            break;
        case USER:
            // 用户级别：用户ID
            try {
                ServletRequestAttributes attributes = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
                if (attributes != null) {
                    HttpServletRequest request = attributes.getRequest();
                    User loginUser = userService.getLoginUser(request);
                    keyBuilder.append("user:").append(loginUser.getId());
                } else {
                    // 无法获取请求上下文，使用IP限流
                    keyBuilder.append("ip:").append(getClientIP());
                }
            } catch (BusinessException e) {
                // 未登录用户使用IP限流
                keyBuilder.append("ip:").append(getClientIP());
            }
            break;
        case IP:
            // IP级别：客户端IP
            keyBuilder.append("ip:").append(getClientIP());
            break;
        default:
            throw new BusinessException(ErrorCode.SYSTEM_ERROR, "不支持的限流类型");
    }
    return keyBuilder.toString();
}
```

这段代码的作用是根据不同的限流策略生成唯一的 Redis key，API 级别按方法名、用户级别按照用户 ID、IP级别按照客户端 IP、从而支持三种限流维度。

此处还有一个获取用户 IP 的工具方法，参考 [获取用户 IP 工具方法。](https://www.codenest.com.cn/articles/32)

## 6. 应用限流注解

在需要限流的接口上使用限流注解。

```Java
@GetMapping(value = "/getmethod")
@RateLimit(limitType = RateLimitType.USER, rate = 5, rateInterval = 60, message = "请求过于频繁，请稍后再试")
public Result<String> doMethod(@RequestParam String parameter) {
     // 方法实现...
}
```
代码解释：每个用户在 60 秒内最多只能发起 5 次请求，超过限制会返回有好的错误提示。

## 7. 限流实现原理：

对于限流功能 Redisson 实现了基于令牌桶算法的 RRateLimiter。这是经典网络流量速率限制算法。

1： 令牌桶：系统维护一个固定容量的令牌桶
2： 令牌生成：以规定的速率向桶中添加令牌
3： 请求处理：每个请求需要消耗一个令牌才能被处理。
4： 限流效果：当桶中没有令牌时，请求会被拒绝或排队。

这种算法的优势在于允许突发流量

![截屏](https://github.com/thw610013/picx-images-hosting/raw/master/截屏2025-10-28-22.26.18.8l0hs149sc.webp)
