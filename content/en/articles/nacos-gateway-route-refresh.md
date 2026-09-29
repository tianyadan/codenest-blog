---
title: Why Did a Nacos Route Change Still Require a Gateway Restart?
summary: A long-running Gateway route refresh issue resolved after an Actuator change, with the exact cause left open for a controlled check.
author: CodeNest
category: work
tags: [Spring Cloud Gateway, Nacos, Actuator, Troubleshooting]
createdAt: 2026-09-29
updatedAt: 2026-09-29
readingMinutes: 4
---

# Why Did a Nacos Route Change Still Require a Gateway Restart?

This one stayed open for a long time. I would edit a Gateway route in Nacos, but the running service kept using the old rule. Restarting its container made the new rule appear. The restart was rereading configuration; it did not tell me which part of the refresh path had failed.

## The 404 that helped

I tried `POST /actuator/gateway/refresh` to inspect the route refresh behavior. It returned 404, with this log message:

```text
No static resource actuator/gateway/refresh.
```

The request had reached the application, but there was no matching Gateway management endpoint. Startup logs also warned that `management.endpoint.metrics.enabled` and `management.endpoint.prometheus.enabled` were obsolete for this version. Those settings need cleanup, but the warning alone does not explain the route issue.

## What changed

I added Actuator to the Gateway module:

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-actuator</artifactId>
</dependency>
```

For diagnosis in the test environment, I exposed the Gateway endpoint with write access:

```yaml
management:
  endpoints:
    web:
      exposure:
        include: health,info,gateway
  endpoint:
    gateway:
      access: unrestricted
```

After rebuilding and restarting, `GET /actuator` listed `gateway`. I then changed a route in Nacos again. This time the running Gateway picked up the change without a container restart.

There is one limit to that conclusion: the dependency and management settings changed together. The observation proves that the issue disappeared after those changes, not that the missing Actuator dependency alone caused automatic refresh to fail. `gateway.access` governs the HTTP management endpoint; it is not, by itself, a switch for Nacos automatic refresh.

## What I would use in production

If Nacos changes already refresh routes automatically and operators only need to inspect them, I would use read-only access:

```yaml
management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics,prometheus,gateway
  endpoint:
    gateway:
      access: read-only
```

With `read-only`, route inspection works, while HTTP refresh and route creation or deletion are disabled. I would still verify automatic refresh by making a real Nacos change. The test setup's `include: "*"` and `unrestricted` settings should not be exposed on a public production port.

Next time a config change seems to require a restart, I will check whether it reached the application, then compare the active routes at `/actuator/gateway/routes`. Restarting fixes the symptom but hides the failing step.

References: [Spring Cloud Gateway Actuator API](https://docs.spring.io/spring-cloud-gateway/reference/spring-cloud-gateway-server-webflux/actuator-api.html) · [Nacos advanced guide](https://sca.aliyun.com/en/docs/2025.x/user-guide/nacos/advanced-guide/)
