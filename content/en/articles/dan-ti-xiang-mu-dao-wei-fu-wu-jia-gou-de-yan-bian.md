---
title: The Evolution from a Monolith to a Microservice Architecture
summary: At the beginning of a project, a monolith is often the best choice for balancing development quality and speed. If microservice expansion may be needed later, design the code so it can be split at any time.
author: evan
category: work
tags: [Work Notes, Microservices]
createdAt: 2026-03-05 10:10:09
updatedAt: 2026-03-05 10:10:09
readingMinutes: 6
---

# The Evolution from a Monolith to a Microservice Architecture

At the beginning of a project, if you want both quality and development speed, a monolith is usually the recommended choice. If you may expand into microservices later, then from day one you should write the project in a microservice-friendly way. You do not need to split it immediately, but the code should always remain easy to split.
 
This article uses an e-commerce project as an example to explain the transition from monolithic design to microservices.
 
Monolithic project structure (SpringBoot):

- snackhub-user
- snackhub-merchant
- snackhub-admin ...

## Monolith Stage

If you want to call another business module, you **do not need Http or Feign. Direct interface dependency plus Spring injection is enough**, for example:

1. Define the interface in the `merchant` module to expose its capability

```java
// snackhub-merchant module
public interface ProductService {
    ProductDTO getProductById(Long productId);
}
```

Implementation class:

```java
@Service
public class ProductServiceImpl implements ProductService {

    @Override
    public ProductDTO getProductById(Long productId){
    // Query the database
    return productDTO;
    }
}
```

2. Inject the interface in the `user` module

```java
@Service
public class UserOrderService {

    // Constructor injection
    private final ProductService productService;
    
    public UserOrderService (ProductService productService){
        this.productService = productService;
    }
    
    public void createOrder(Long productId){
        ProductDTO product = productService.getProductById(productId);
        
        if(product == null){
            throw new RuntimeException("商品不存在");
        }
        // Follow-up order logic...
    }
}
```

Key point: do not directly access another module's Mapper, and do not hardcode implementation class names. That way, if you later move to microservices, you only need to change the interface call into Feign.

## Moving to Microservices

When `snackhub-user` and `sanckhub-merchant` are split into independent SpringBoot applications, direct injection no longer works. You need to switch to Feign, or RESTTemplate if you must, though it is not recommended.

Microservice version:

1. Define a Feign Client in the `user` service

```java
@FeignClient(name = "snackhub-merchant")
public interface productFeignClient {

    @GetMapping("/api/product/{id}"}
    ProductDTO getProductById(@PathVariable("id") Long id);
}
```

2. Call it inside `UserService`

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
          // Follow-up order logic...
    }
    
}
```

3. The `merchant` service exposes the interface

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
