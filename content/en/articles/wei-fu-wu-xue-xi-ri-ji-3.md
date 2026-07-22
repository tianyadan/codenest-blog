---
title: Microservices Learning Diary 3
summary: "Remote invocation can be built step by step with Spring Cloud LoadBalancer and RestTemplate. This note covers the basic flow, configuration, and one common question about registry outages."
author: evan
category: diary
tags: [Diary, Learning, Microservices]
createdAt: 2026-04-04 08:57:37
updatedAt: 2026-04-04 08:57:37
readingMinutes: 3
---
# Microservices Learning Diary 3

## Main Notes

**Steps to implement remote invocation:**

| Flow | Content | Core |
| --- | --- | --- |
| Step 1 | Add the load-balancing dependency | `spring-cloud-starter-loadbalancer` |
| Step 2 | Test the load-balancing API | `LoadBalancerClient` |
| Step 3 | Test remote calls | `RestTemplate` |
| Step 4 | Test load-balanced calls | `@LoadBalanced` |

One-step load-balancing configuration:

```java
@Configuration
public class OrderConfig {

    @LoadBalanced  // Annotation-based load balancing
    @Bean
    RestTemplate restTemplate(){
        return new RestTemplate();
    }
}
```

More advanced load balancing based on annotations:

```java
private Product getProductFromRemoteWithLoadBalanceAnnoation(Long productId){

   String url = "http://service-product/product/"+productId; // Fill in the service-product address

    // Send a remote request and automatically deserialize the response into JSON and a Java entity
   Product product =  restTemplate.getForObject(url,Product.class);

   return product;
}
```

Diagram:

![截屏2026-04-04 08.46.22](https://codenest.oss-cn-qingdao.aliyuncs.com/images/2026/04/04/69d58e61-8d3f-43b7-a901-6d60847bcbe9.png)

> **Extra note: if the registry goes down, can remote service calls still succeed?**
> If it is the first remote call, the service must query the registry to get the target address. If the registry is down, the address cannot be retrieved, so the call will fail. If the service has already been called before, there may be cached data, so calls can still succeed for a short time.
