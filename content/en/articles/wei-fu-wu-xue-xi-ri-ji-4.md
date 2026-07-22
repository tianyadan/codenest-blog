---
title: Microservices Learning Diary 4
summary: "Nacos can be used not only as a service registry but also as a configuration center. This note covers basic setup, DataId rules, dynamic refresh, and practical enterprise-style use cases."
author: evan
category: diary
tags: [Diary, Learning, Microservices]
createdAt: 2026-04-04 09:17:26
updatedAt: 2026-04-04 09:17:26
readingMinutes: 7
---
# Microservices Learning Diary 4

**Nacos can be used not only as a service registry, but also as a configuration center.**

![截屏2026-04-04 08.58.23](https://codenest.oss-cn-qingdao.aliyuncs.com/images/2026/04/04/16203ef3-f95e-49f9-8376-6cae08b991e4.png)

# Basic Usage of the Configuration Center

1. Add the dependency

```pom
<dependency>
    <groupId>com.alibaba.cloud</groupId>
    <artifactId>spring-cloud-starter-alibaba-nacos-config</artifactId>
</dependency>
```

2. Configure `application.yml`

```yml
spring:
  application:
    name: user-service   # Service name (must match the DataId in Nacos)

  cloud:
    nacos:
      config:
        server-addr: 127.0.0.1:8848   # Nacos address
        file-extension: yaml          # Config file format
        namespace: public             # Namespace (default: public)
        group: DEFAULT_GROUP          # Group (default: DEFAULT_GROUP)

        # Optional: extension configs (advanced usage)
        extension-configs:
          - data-id: common.yaml
            group: DEFAULT_GROUP
            refresh: true

        # Optional: shared configs (shared across multiple services)
        shared-configs:
          - data-id: shared.yaml
            group: DEFAULT_GROUP
            refresh: true
```

> **Where does the DataId come from?**
> Default rule: `${spring.application.name}.${file-extension}`
> With the configuration above, the app will actually pull: `user-service.yaml`

> **Nacos configuration priority (frequently asked)**
> Priority from high to low: `extension-configs` > `shared-configs` > default config

# Dynamic Refresh in Nacos

## Scenario: dynamically switch a feature on or off without restarting the service

For example, in a blog system there may be a setting that controls whether comments require moderation.

### 1. Add the config in Nacos

```yaml
comment:
  audit:
    enabled: true
```

### 2. Read the config in Spring Boot

```java
@RefreshScope   // Core point: enable dynamic refresh
@RestController
@RequestMapping("/comment")
public class CommentController {

    @Value("${comment.audit.enabled}")
    private Boolean auditEnabled;

    @PostMapping("/add")
    public String addComment(String content) {
        if (auditEnabled) {
            return "Comment sent to the moderation queue";
        }
        return "Comment published directly";
    }
}
```

### 3. Runtime effect (important)

Initial state:

```yaml
enabled: true
```

Returns:

```code
Comment sent to the moderation queue
```

Change the config in the Nacos dashboard:

```yaml
enabled: false
```

No service restart needed. Request the endpoint again:

```code
Comment published directly
```

### 4. Key points

- Without this annotation, refresh will not happen: `@RefreshScope`
- Nacos refresh must be enabled: `refresh: true`
- Recommended approach (more advanced than `@Value`)

```java
@Data
@Component
@RefreshScope
@ConfigurationProperties(prefix = "comment.audit")
public class CommentConfig {
    private Boolean enabled;
}
```

Usage:

```java
@Autowired
private CommentConfig config;
```

Benefits: type safety and better support for complex objects.

### 5. More realistic enterprise scenarios

- Control a rate-limiting switch for an API
- Control log levels
- Enable certain features gradually
- Dynamically adjust cache TTL

### 6. How it works

Nacos uses **long polling**:

1. The client listens for config changes
2. The config changes -> Nacos notifies the client
3. Spring Context refreshes the Bean
4. The `@RefreshScope` Bean reloads
