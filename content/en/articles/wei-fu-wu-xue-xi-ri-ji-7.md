---
title: Microservices Learning Diary 7
summary: "Sentinel is Alibaba's traffic-control component for rate limiting, circuit breaking, and degradation. This note covers startup, Spring Boot integration, rule setup, and a simple custom fallback."
author: evan
category: diary
tags: [Diary, Learning, Microservices]
createdAt: 2026-04-04 16:41:49
updatedAt: 2026-04-04 16:41:49
readingMinutes: 5
---
# Microservices Learning Diary 7

# Sentinel Notes

## 1. Introduction to Sentinel

Sentinel is Alibaba's open-source **traffic-control** component. It provides **rate limiting**, **circuit breaking**, and **degradation** to protect system stability.

## 2. Start Sentinel

After downloading the jar, run:

```bash
java -jar sentinel-dashboard.jar
```

Visit:

http://localhost:8080  
Username/password: `sentinel / sentinel`

## 3. Integrate Sentinel with Spring Boot

1. Add the dependency (`pom.xml`)

```pom
<!-- Sentinel core dependency -->
<dependency>
    <groupId>com.alibaba.cloud</groupId>
    <artifactId>spring-cloud-starter-alibaba-sentinel</artifactId>
</dependency>
```

2. Configure `application.yml` (important)

```yaml
spring:
  application:
    name: sentinel-demo   # Service name

  cloud:
    sentinel:
      transport:
        dashboard: localhost:8080   # Sentinel dashboard address (the dashboard must be running)
        port: 8719                  # Port used to communicate with the dashboard (default is fine)

      eager: true   # Initialize Sentinel at startup to avoid waiting for the first request

server:
  port: 8081
```

3. Write a test endpoint

```java
@RestController
@RequestMapping("/test")
public class TestController {

    /**
     * Simple endpoint for testing rate limiting
     */
    @GetMapping("/hello")
    public String hello() {
        return "hello sentinel";
    }
}
```

4. Configure a rate-limiting rule

1. Visit the endpoint a few times so the resource appears in the dashboard

http://localhost:8081/test/hello

2. Open the dashboard -> find the service -> Cluster Link -> `/test/hello`

3. Add a rate-limiting rule:

| Parameter | Example |
| --- | --- |
| Threshold type | QPS |
| Single-machine threshold | 1 |

5. Test result

Normal case: `hello sentinel`

When QPS is exceeded: `Blocked by Sentinel (flow limiting)`

6. Extra: add a custom fallback

```java
@GetMapping("/hello2")
@SentinelResource(value = "hello2", blockHandler = "blockHandler")
public String hello2() {
    return "Normal response";
}

/**
 * Fallback method after rate limiting
 */
public String blockHandler(BlockException e) {
    return "The request has been rate-limited. Please try again later.";
}
```
