---
title: Nacos 介绍及安装
summary: Nacos 是 Dynamic Naming and Configuration Service 的首字母简称，一个更易于构建云原生的<span styl...
author: evan
category: learning
tags: [学习, Nacos]
createdAt: 2026-04-04 10:15:46
updatedAt: 2026-04-04 10:15:46
readingMinutes: 4
---
# Nacos 介绍及安装

# Nacos 简介 

Nacos 是 Dynamic Naming and Configuration Service 的首字母简称，一个更易于构建云原生的<span style="color:#f39c12">动态服务发现</span>、<span style="color:#f39c12">配置管理</span>和服务管理平台。

- 官网 : https://nacos.io/zh-cn/docs/v2/quickstart/quick-start.html 

- 安装:
- - 下载安装包[2.4.3]
- - 启动命令: `startup.cmd -m standalone` [单机模式启动]

**使用步骤**:

| 流程 | 内容  | 核心|
| --- | --- | ---|
| 步骤 1 | 启动微服务 | SpringBoot 微服务 web 项目启动|
| 步骤 2 |  引入服务发现依赖 | spring-cloud-starter-alibaba-nacos-discovery|
| 步骤 3 | 配置Nacos地址 | spring.cloud.nacos.server-addr = 127.0.0.1:8848|
| 步骤 4 | 查看注册中心效果 | 访问http://localhost:8848/nacos |
| 步骤 5 | 集群模式启动测试 | 单机情况下通过改变端口模拟微服务集群|

# 服务注册实现 :

1） 引入pom依赖

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

2) 编写yml

```yml
spring:
    application:
        name: codenest # 应用程序名字
    cloud:
        nacos:
            server-addr: 127.0.0.1:8848 # 默认8848 nacos 地址
    
server:
    port: 9000 # 指定端口
    
```

# 服务发现 :

| 流程 | 内容 |核心|
| --- | ---| --- |
| <span style="color:#27ae60">步骤 1</span> | <span style="color:#27ae60">开启服务发现功能</span> | <span style="color:#27ae60">@EnableDiscoveryClient</span>|
| 步骤 2 | 测试服务发现 API | DiscoveryClient|
| 步骤 3 | 测试服务发现 API| NacosDiscoveryClient|

# Nacos 各种使用场景：

![截屏2026-04-04 10.15.00](https://codenest.oss-cn-qingdao.aliyuncs.com/images/2026/04/04/47ec9f22-5872-4439-a4d7-1120a9c88355.jpg)
