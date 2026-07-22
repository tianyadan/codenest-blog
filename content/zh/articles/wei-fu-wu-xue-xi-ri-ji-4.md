---
title: 微服务学习日记 4
summary: Nacos 也可以不仅是注册中心，也可以作为配置中心使用 1 ) 引入依赖 2 ） application.yml 配置 DataId 是怎么来的？ 默认...
author: evan
category: diary
tags: [日记, 学习, 微服务]
createdAt: 2026-04-04 09:17:26
updatedAt: 2026-04-04 09:17:26
readingMinutes: 7
---
# 微服务学习日记 4

**Nacos 也可以不仅是注册中心，也可以作为配置中心使用**

![截屏2026-04-04 08.58.23](https://codenest.oss-cn-qingdao.aliyuncs.com/images/2026/04/04/16203ef3-f95e-49f9-8376-6cae08b991e4.png) 

# 配置中心基本使用：

1 ) 引入依赖
```pom
<dependency>
    <groupId>com.alibaba.cloud</groupId>
    <artifactId>spring-cloud-starter-alibaba-nacos-config</artifactId>
</dependency>
```

 2 ） application.yml 配置
 
 
```yml
spring:
  application:
    name: user-service   # 服务名称（必须和 Nacos 中配置的 DataId 对应）

  cloud:
    nacos:
      config:
        server-addr: 127.0.0.1:8848   # Nacos 地址
        file-extension: yaml          # 配置文件格式
        namespace: public             # 命名空间（默认 public）
        group: DEFAULT_GROUP          # 分组（默认 DEFAULT_GROUP）

        # 可选：扩展配置（进阶用法，面试加分点）
        extension-configs:
          - data-id: common.yaml
            group: DEFAULT_GROUP
            refresh: true

        # 可选：共享配置（多个服务共享）
        shared-configs:
          - data-id: shared.yaml
            group: DEFAULT_GROUP
            refresh: true
```

> **DataId 是怎么来的？**
> 默认规则： `${spring.application.name}.${file-extension}`
> 上面这个配置实际会去拉： user-service.yaml

> **Nacos 配置优先级（超爱问）**
> 优先级从高到低：extension-configs > shared-configs > 默认配置

# Nacos 动态刷新

## 场景：动态修改开关（不用重启服务）

比如做一个博客系统，有个功能：是否开启评论审核

### 1 ） Nacos 配置中心写配置

```yaml
comment:
  audit:
    enabled: true
```

### 2 ）SpringBoot 读取配置

```java
@RefreshScope   // 💡 核心：开启动态刷新
@RestController
@RequestMapping("/comment")
public class CommentController {

    @Value("${comment.audit.enabled}")
    private Boolean auditEnabled;

    @PostMapping("/add")
    public String addComment(String content) {
        if (auditEnabled) {
            return "评论进入审核队列";
        }
        return "评论直接发布成功";
    }
}
```

### 3 ） 运行效果（重点）

初始状态：

```yaml
enabled: true
```

返回：

``` code
评论进入审核队列
```

在 Nacos 控制台改配置：

```yaml
enabled: false
```

不用重启服务！再次请求接口：

```code
评论直接发布成功
```

### 4 ） 核心关键点：

- 没有这个注解 = 不会刷新 @RefreshScope
- Nacos 必须开启 refresh ： refresh: true
- 推荐写法（比 @Value 更高级）

```java
@Data
@Component
@RefreshScope
@ConfigurationProperties(prefix = "comment.audit")
public class CommentConfig {
    private Boolean enabled;
}
```

使用：

```java
@Autowired
private CommentConfig config;
```

好处：类型安全，支持复杂对象

### 5 ）更真实的企业场景

- 控制接口限流开关
- 控制日志级别
- 控制某些功能灰度开启
- 动态调整缓存时间（TTL）

### 6 ）原理

 Nacos 用的是 长轮询（Long Polling）：
 
1. 客户端监听配置
2. 配置变化 -> Nacos 通知客户端
3. Spring Context 重新刷新 Bean
4. @RefreshScop Bean 重新加载
