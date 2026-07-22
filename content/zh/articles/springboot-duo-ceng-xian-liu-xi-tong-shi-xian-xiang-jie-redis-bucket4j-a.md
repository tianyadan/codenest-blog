---
title: SpringBoot 多层限流系统实现详解(Redis+Bucket4j+AOP)
summary: 在高并发 Web 系统中，限流是保护系统稳定性的核心手段之一。本篇文章详细拆解一个 生产级三层限流防护体系 的实现方案，并附上完整代码结构与设计思路 一、...
author: evan
category: work
tags: [工作总结, Spring, Redis]
createdAt: 2026-01-26 22:10:43
updatedAt: 2026-01-26 22:10:43
readingMinutes: 13
---
# SpringBoot 多层限流系统实现详解(Redis+Bucket4j+AOP)

## 正文

**在高并发 Web 系统中，限流是保护系统稳定性的核心手段之一。本篇文章详细拆解一个 生产级三层限流防护体系 的实现方案，并附上完整代码结构与设计思路**

---

**一、整体架构设计**

本项目采用 三层限流防护体系：

IP 黑名单拦截（Redis）
        ↓
IP 高频访问封禁（Redis 计数器）
        ↓
接口级令牌桶限流（Bucket4j + AOP 注解）

**设计目标**
	•	防止恶意爬虫、暴力破解、接口刷流量
	•	限制用户访问频率，保护数据库与服务稳定
	•	提供接口级精细限流策略
	•	可扩展为分布式限流方案

---

**二、第一层：IP 黑名单拦截**

设计思路:

通过 Redis 存储黑名单 IP，当请求进入系统时优先拦截，避免进入业务层消耗资源。

黑名单存储方式

	
	
	

| Key | 说明 |
| --- | --- |
| blocked:ips (Set) | 管理员手动封禁 IP |
| blocked:ip:{ip}) | 系统自动封禁 IP（带 TTL） |

---

🧠 核心代码（IP 拦截器）

```JAVA
@Component
public class IpBlockInterceptor implements HandlerInterceptor {

    @Autowired
    private StringRedisTemplate redisTemplate;

    private static final int ACCESS_THRESHOLD = 60; // 30秒内60次
    private static final int ACCESS_INTERVAL = 30;  // 统计窗口
    private static final int BLOCK_TTL = 30;       // 封禁时间

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        String clientIp = getClientIp(request);

        // 判断是否封禁
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

 **三、第二层：IP 高频访问封禁**

设计思路:

使用 Redis 计数器统计时间窗口内访问次数，超过阈值则自动封禁。

**限流规则:**

| 参数 | 含义  |
| --- | --- |
| ACCESS_INTERVAL | 统计时间窗口（30秒） |
| ACCESS_THRESHOLD | 阈值（60次） |
| BLOCK_TTL | 封禁时间（30秒) |

**即：30 秒内访问 ≥ 60 次 → 封禁 30 秒**

```JAVA
Redis 计数逻辑:

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

**四、第三层：接口级令牌桶限流（Bucket4j）**

为什么选择 Bucket4j ?
	•	工业级令牌桶算法实现
	•	高性能、线程安全
	•	支持本地 / Redis 分布式模式

Maven 依赖:

```XML
<dependency>
    <groupId>com.bucket4j</groupId>
    <artifactId>bucket4j_jdk17-core</artifactId>
    <version>8.14.0</version>
</dependency>
```

令牌桶服务：
```JAVA
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

限流注解定义:

```JAVA
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface RateLimit {
    String key() default "";
    int capacity() default 5;
    int refill() default 5;
    int refillSeconds() default 60;
}
```

AOP 切面实现:

```JAVA
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
            throw new RateLimitException("访问过于频繁，请稍后再试");
        }
    }
}
```

使用示例：每个 IP 每分钟最多调用 5 次登录接口。
```JAVA
@RateLimit(key = "login", capacity = 5, refill = 5, refillSeconds = 60)
@PostMapping("/login")
public Result login() {
    return Result.ok();
}
```

---

**五、三层限流协同流程**

请求进入
  ↓
IP 黑名单拦截
  ↓
IP 访问频率检测
  ↓
接口令牌桶限流
  ↓
业务逻辑执行

---

**六、生产级优化建议**

1.获取真实 IP（Nginx/CDN 场景）

X-Forwarded-For
X-Real-IP
request.getRemoteAddr()

⸻

2.分布式限流升级

当前 Bucket4j 为本地内存模式，多实例会失效。

生产建议：
	•	Bucket4j Redis Extension
	•	Sentinel
	•	Resilience4j
	•	Nginx 限流

⸻

3.时间窗口算法优化

当前方案为固定窗口，存在临界突刺问题。

可升级：
	•	滑动窗口
	•	漏桶算法
	•	Redis SortedSet + Lua

⸻

4.封禁策略增强

建议指数退避封禁：

| 违规次数 | 封禁时间 |
| --- | --- |
| 1 | 30s |
| 2 |  5min|
| 3 | 1h |
| 4 | 24h |

---

**七、总结**

本文实现了一套企业级限流与防刷系统，核心特点：

- Redis 黑名单与计数限流
- Bucket4j 接口级令牌桶限流
- AOP 注解化配置
- IP + 接口维度精准控制

可写入技术博客与简历项目亮点。

⸻

参考架构升级方向
	•	API Gateway 限流（Spring Cloud Gateway）
	•	Nginx limit_req
	•	云厂商 WAF
	•	分布式令牌桶 Redis 实现

⸻

这套限流设计可以作为核心项目亮点，技术深度与工程实践都非常加分。
