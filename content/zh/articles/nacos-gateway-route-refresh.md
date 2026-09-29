---
title: Nacos 改了路由，Gateway 为什么还要重启？
summary: 一次持续很久的网关路由热更新故障：补齐 Actuator 后恢复，但根因仍需对照实验确认。
author: CodeNest
category: work
tags: [Spring Cloud Gateway, Nacos, Actuator, 故障排查]
createdAt: 2026-09-29
updatedAt: 2026-09-29
readingMinutes: 4
---

# Nacos 改了路由，Gateway 为什么还要重启？

这个问题拖了很久：在 Nacos 修改 Gateway 的路由，运行中的网关始终走旧规则；重启容器后，新规则才生效。一开始很容易怀疑是 Docker 缓存，其实重启只是让应用重新读取了一遍配置。

## 从一个 404 开始查

为了看网关当前的路由，我试着调用 `POST /actuator/gateway/refresh`，结果是 404，日志里还有一句：

```text
No static resource actuator/gateway/refresh.
```

这不是“刷新失败”，而是请求根本没匹配到 Gateway 的管理端点。启动日志还提示，旧的 `management.endpoint.metrics.enabled` 和 `management.endpoint.prometheus.enabled` 配置已不适用于当前版本。这些提示值得清理，但不能据此认定它们造成了路由不刷新。

## 这次改了什么

网关模块补上 Actuator 依赖：

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-actuator</artifactId>
</dependency>
```

测试环境临时开放 Gateway 管理端点，方便确认路由和手工刷新：

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

重新打包并启动后，`GET /actuator` 已经能看到 `gateway`。随后再次修改 Nacos 路由，这回没有重启容器，路由也更新了。

**这里要留个边界：**依赖和管理配置是一起改的。现有验证能证明“这组变更之后问题消失”，还不能单独证明一定是缺少 Actuator 导致 Nacos 自动刷新失效。尤其 `gateway.access` 控制的是 HTTP 管理端点的权限，不能把它直接当作自动刷新的开关。

## 生产环境怎么留

如果 Nacos 变更已经能自动生效，生产环境只需查看路由时，可以把 Gateway 端点设为只读：

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

`read-only` 能查看路由，不能通过 HTTP 调用 `POST /actuator/gateway/refresh`，也不能创建或删除路由。自动热更新是否正常，仍要用实际的 Nacos 配置变更验证。不要把测试环境的 `include: "*"` 和 `unrestricted` 原样搬到对外开放的生产端口。

下次再遇到“改配置必须重启”，先确认 Nacos 的变更有没有进入应用，再看 `/actuator/gateway/routes` 是否更新。重启能解决现象，却不能说明是哪一层没刷新。

参考：[Spring Cloud Gateway Actuator API](https://docs.spring.io/spring-cloud-gateway/reference/spring-cloud-gateway-server-webflux/actuator-api.html) · [Nacos 配置进阶指南](https://sca.aliyun.com/docs/2025.x/user-guide/nacos/advanced-guide/)
