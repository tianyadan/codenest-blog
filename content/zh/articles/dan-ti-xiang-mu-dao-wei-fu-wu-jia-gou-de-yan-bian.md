---
title: 单体项目到微服务架构的演变
summary: 项目设计初期，为保证开发质量和速度兼得，建议使用单体项目开发，如果有微服务拓展的需要，需要在设计之初就采用微服务项目写法，可以先不拆分，但要保证随时可拆。...
author: evan
category: work
tags: [工作总结, 微服务]
createdAt: 2026-03-05 10:10:09
updatedAt: 2026-03-05 10:10:09
readingMinutes: 6
---
# 单体项目到微服务架构的演变

项目设计初期，为保证开发质量和速度兼得，建议使用单体项目开发，如果有微服务拓展的需要，需要在设计之初就采用微服务项目写法，可以先不拆分，但要保证随时可拆。
 
 本文以商城项目为例，详细讲解由单体项目设计到微服务的转变。
 
 单体项目开发设计结构(SpringBoot)：
 - snackhub-user
 - snackhub-merchant
 - snackhub-admin ...

## 单体项目阶段
如果想要调用其他业务模块，**不需要 Http、Feign 调用，直接接口依赖+Spring 注入即可**，例如：

1. 在merchant模块定义接口（对外暴露能力）
```java
// snackhub-merchant 模块
public interface ProductService {
    ProductDTO getProductById(Long productId);
}
```
实现类:

```java
@Service
public class ProductServiceImpl implements ProductService {

    @Override
    public ProductDTO getProductById(Long productId){
    // 查询数据库
    return productDTO;
    }
}
```

2. user 模块中注入接口

```java
@Service
public class UserOrderService {

    // 构造器注入
    private final ProductService productService;
    
    public UserOrderService (ProductService productService){
        this.productService = productService;
    }
    
    public void createOrder(Long productId){
        ProductDTO product = productService.getProductById(productId);
        
        if(product == null){
            throw new RuntimeException("商品不存在");
        }
        //  后续订单逻辑...
    }
}
```
 关键点：不能跨模块直接访问 Mapper，不能写死实现类名。这样后续改动微服务只需要把接口改成 Feign

## 改造微服务
当snackhub-user、sanckhub-merchant 拆成独立的SpringBoot 应用时, 就不能直接注入了。要改成 Feign 调用，或 RESTTemplate（不推荐）

微服务版本：
1. 在 user 服务中定义 Feign Client

```java
@FeignClient(name = "snackhub-merchant")
public interface productFeignClient {

    @GetMapping("/api/product/{id}"}
    ProductDTO getProductById(@PathVariable("id") Long id);
}
```

2. 在UserService 中调用

```java
@Service
public class UserOrderService {

    private final ProductFeignClient productFeignClient;
    
    public UserOrderService(ProductFeignClient productFeignClient){
        this.productFeignClient = productFeignClient;
    }
    
    public void createOrder (Long productId){
        ProductDTO product = productFeignClient.getProductById(Long id);
        
        if(product == null){
            throw new RuntimeException("商品不存在");
          }
          // 后续订单逻辑...
    }
    
}
```

3. merchant 服务提供接口

@RestController

```java
@RestController
@RequestMapping("/api/prodcut")
public class ProductController {
    
    @GetMapping("/{id}")
    public ProductDTO getProductById(@PathVariable Long id){
        return productService.getProductById(id);
    }
}
```
