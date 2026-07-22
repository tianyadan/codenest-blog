---
title: 微服务学习日记 7
summary: "Sentinel 是阿里开源的<span style=\"color: e74c3c\" 流量控制</span 组件，提供<span style=\"color..."
author: evan
category: diary
tags: [日记, 学习, 微服务]
createdAt: 2026-04-04 16:41:49
updatedAt: 2026-04-04 16:41:49
readingMinutes: 5
---
# 微服务学习日记 7

# Sentinel 篇

## 1. Sentinel 简介

Sentinel 是阿里开源的<span style="color:#e74c3c">流量控制</span>组件，提供<span style="color:#e67e22">限流</span>、<span style="color:#e67e22">熔断</span>和<span style="color:#e67e22">降级</span>保护系统稳定性。

## 2. 启动 Sentinel

下载 jar 后运行：
```bash
java -jar sentinel-dashboard.jar 
```

访问：

http://localhost:8080 账号密码：sentinel / sentinel

## 3. SpringBoot集成Sentinel

1️⃣ 引入依赖（pom.xml）

```pom
<!-- Sentinel 核心依赖 -->
<dependency>
    <groupId>com.alibaba.cloud</groupId>
    <artifactId>spring-cloud-starter-alibaba-sentinel</artifactId>
</dependency>
```

2️⃣ application.yml 配置（重点）

```yaml
spring:
  application:
    name: sentinel-demo   # 服务名

  cloud:
    sentinel:
      transport:
        dashboard: localhost:8080   # Sentinel 控制台地址（必须启动控制台）
        port: 8719                  # 与控制台通信端口（默认即可）

      eager: true   # 启动时就初始化 Sentinel（避免第一次请求才加载）

server:
  port: 8081
```

3️⃣ 写一个测试接口

```java
@RestController
@RequestMapping("/test")
public class TestController {

    /**
     * 简单接口，用于测试限流
     */
    @GetMapping("/hello")
    public String hello() {
        return "hello sentinel";
    }
}
```

4️⃣ 配置限流规则

1 ） 访问接口几次，让资源注册到控制台

http://localhost:8081/test/hello

2 ） 打开控制台 → 找到服务  簇点链路 → /test/hello

3 ）添加限流规则：

| 参数  | 示例 |
| --- | --- |
| 阈值类型 | QPS |
| 单机阈值 |  1 |

5️⃣ 测试效果

正常情况： hello sentinel

超过 QPS： Blocked by Sentinel (flow limiting)

6️⃣ 【补充】加一个自定义兜底

```java
@GetMapping("/hello2")
@SentinelResource(value = "hello2", blockHandler = "blockHandler")
public String hello2() {
    return "正常返回";
}

/**
 * 限流后的兜底方法
 */
public String blockHandler(BlockException e) {
    return "请求被限流了，请稍后再试";
}
```
