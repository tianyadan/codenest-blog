---
title: Nacos Introduction and Installation
summary: A quick introduction to Nacos, how to install it, how to register Spring Boot services, and how basic service discovery works.
author: evan
category: learning
tags: [Learning, Nacos]
createdAt: 2026-04-04 10:15:46
updatedAt: 2026-04-04 10:15:46
readingMinutes: 4
---
# Nacos Introduction and Installation

# Nacos Overview

Nacos is the abbreviation for Dynamic Naming and Configuration Service. It is a platform for building cloud-native applications more easily with <span style="color:#f39c12">dynamic service discovery</span>, <span style="color:#f39c12">configuration management</span>, and service management.

- Official website: https://nacos.io/zh-cn/docs/v2/quickstart/quick-start.html

- Installation:
- - Download the installation package [2.4.3]
- - Startup command: `startup.cmd -m standalone` [start in standalone mode]

**Usage steps**:

| Flow | Content | Core |
| --- | --- | --- |
| Step 1 | Start the microservice | Start the Spring Boot microservice web project |
| Step 2 | Add the service discovery dependency | `spring-cloud-starter-alibaba-nacos-discovery` |
| Step 3 | Configure the Nacos address | `spring.cloud.nacos.server-addr = 127.0.0.1:8848` |
| Step 4 | Check the registry effect | Visit `http://localhost:8848/nacos` |
| Step 5 | Test startup in cluster mode | In a standalone setup, simulate a microservice cluster by changing the port |

# Service Registration Implementation:

1) Add the `pom` dependencies

```pom
 <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-web</artifactId>
 </dependency>
 
 
 <dependency>
    <groupId>com.alibaba.cloud</groupId>
    <artifactId>spring-cloud-starter-alibaba-nacos-discovery</artifactId>
</dependency>
```

2) Write the `yml`

```yml
spring:
    application:
        name: codenest # application name
    cloud:
        nacos:
            server-addr: 127.0.0.1:8848 # default Nacos address is 8848
    
server:
    port: 9000 # specify the port
    
```

# Service Discovery:

| Flow | Content | Core |
| --- | --- | --- |
| <span style="color:#27ae60">Step 1</span> | <span style="color:#27ae60">Enable service discovery</span> | <span style="color:#27ae60">@EnableDiscoveryClient</span> |
| Step 2 | Test the service discovery API | `DiscoveryClient` |
| Step 3 | Test the service discovery API | `NacosDiscoveryClient` |

# Common Nacos Usage Scenarios:

![截屏2026-04-04 10.15.00](https://codenest.oss-cn-qingdao.aliyuncs.com/images/2026/04/04/47ec9f22-5872-4439-a4d7-1120a9c88355.jpg)
