---
title: 微服务学习日记 3
summary: 远程调用实现步骤： 流程 内容 核心 步骤 1 引入负载均衡依赖 spring cloud starter loadbalancer 步骤 2 测试负载均...
author: evan
category: diary
tags: [日记, 学习, 微服务]
createdAt: 2026-04-04 08:57:37
updatedAt: 2026-04-04 08:57:37
readingMinutes: 3
---
# 微服务学习日记 3

## 正文

**远程调用实现步骤：**

| 流程 | 内容| 核心 |
| --- | --- | ---|
| 步骤 1 | 引入负载均衡依赖 |spring-cloud-starter-loadbalancer |
| 步骤 2 | 测试负载均衡 API |LoadBalancerClient |
| 步骤 3 | 测试远程调用 | RestTemplate |
| 步骤 4 | 测试负载均衡调用 |@LoadBlanced |

一步到位负载均衡配置：

```java
@Configuration
public class OrderConfig {

    @LoadBalanced  // 注解式负载均衡
    @Bean
    RestTemplate restTemplate(){
        return new RestTemplate();
    }
}
```

基于注解的复杂均衡: 

```java
private Product getProductFromRemoteWithLoadBalanceAnnoation(Long productId){

   String url = "http://service-product/product/"+productId; // 填写service-product 服务地址
    
    // 给远程发送请求 自动序列化为 JSON 对象及 Java 实体类
   Product product =  restTemplate.getForObject(url,Product.class);
   
   return product;
}
```
 图解 ：

![截屏2026-04-04 08.46.22](https://codenest.oss-cn-qingdao.aliyuncs.com/images/2026/04/04/69d58e61-8d3f-43b7-a901-6d60847bcbe9.png)

> **补充：注册中心宕机，远程服务调用还能成功吗？**
>  如果第一次远程调用必须要去注册中心拿到远程地址，但是注册中心挂了，就拿不到远程地址，注定失败。如果之前调用过，会有缓存，短时间内依旧可以调用成功。
