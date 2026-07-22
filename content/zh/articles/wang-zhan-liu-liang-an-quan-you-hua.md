---
title: "网站流量安全优化[sentinel]"
summary: 由于服务器配置有限，确保数据在传输过程中的机密性、完整性、可用性，防止未经授权的访问、篡改、泄露和攻击，同时提升网络传输效率与性能。 熔断和降级可以参考：...
author: evan
category: learning
tags: [学习, Sentinel]
createdAt: 2025-09-08 20:39:27
updatedAt: 2025-09-08 20:39:27
readingMinutes: 20
---
# 网站流量安全优化[sentinel]

## **🌟 需求分析**

 由于服务器配置有限，确保数据在传输过程中的机密性、完整性、可用性，防止未经授权的访问、篡改、泄露和攻击，同时提升网络传输效率与性能。
 
 ---
 
熔断和降级可以参考：
[熔断和降级区别](https://www.codenest.com.cn/articles/6)

 ---

## **📎 方案设计**

### 1. 对单个接口整体限流 （控制对耗时较长、经常访问的接口的请求频率，防止过多请求导致系统过载）

**限流规则：**
- 整个接口每秒钟不超过 10 次请求。
- 阻塞操作：提示系统压力古达，请耐心等待。

**熔断规则：**
-  熔断条件：如果接口异常率超过 10%，或者慢调用（响应时长>3 秒）的比例大于 20%，触发 60 秒熔断。
-  熔断操作：直接返回本地数据（缓存或者空数据）

### 2. 对单个 IP 访问单个接口限流

**限流规则：**
- 策略：每个 IP 地址每分钟允许查看题目列表的次数不能超过 60 次
- 阻塞操作：提示“访问过于频繁，稍后再试”

**熔断规则：**

- 熔断条件：如果接口异常率超过 10%，或者慢调用（响应时长>3 秒）的比例大于 20%，触发 60 秒熔断。
- 熔断操作：直接返回本地数据（缓存或者空数据）

 ---

## **⚒️ 实现方案**

首推 **sentinel**，它是阿里巴巴开源的限流、熔断、降级组件，旨在为分布式系统提供可靠的保护机制，他设计用于解决高并发流量下的稳定性问题，并且支持Dubbo、Spring Cloud 等框架集成。

功能如下：
- 限流：支持基于 QPS、并发数量等条件限流，支持滑动窗口、预热、漏桶等算法。
- 熔断降级：支持失败率、慢调用比例等指标触发熔断，并提供自动恢复机制。
- 热点参数限流：可以基于特定的参数进行限流，如限定特定用户 ID 的请求频率。
- 系统负载保护：可以根据系统的实际负载（如 CPU、内存）动态调整流量。
- **有图形化界面** ，配置方便！

除此之外还有这些中间件也可以实现：Resilience4j（轻量，但是功能少尤其是限流功能不丰富）、Guava RateLimiter（基于令牌桶算法实现，仅支持限流，功能单一，不能熔断）、Hystrix【不推荐，不维护】

 ---

## 🟢 sentinel 入门

#### 1. 核心概念：

- 定义资源
- 定义规则
- 校验规则是否生效

**资源**： 表示要保护的业务逻辑或者代码快/

定义资源由多种方法：比如编程式、注解式 -> [官方文档](https://sentinelguard.io/zh-cn/docs/basic-api-resource-rule.html

**规则**： Sentinel 使用规则来定义对资源的保护策略，例如：
- 限流规则 ：用于控制流量的规则，设置 QPS 等参数，防止过载
- 熔断规则 ：用于实现熔断降级的规则，当某个资源的异常比例或响应时间超过阈值，触发熔断，短时间内不再访问该资源。
- 系统规则 ：根据系统整体的复杂 cpu使用率、内存使用率等进行保护。
- 热点参数规则 
- 授权规则：用于定义黑白名单的授权规则，控制资源访问的权限。

**控制台**：Sentinel 提供了可视化的控制台，主要用于监控、配置、管理 Sentinel 的流控规则、熔断规则等。这是灵魂！！！

**客户端**：是指集成了 Sentinel 的应用程序，通常是通过引入 Sentinel 的依赖来接入，客户端负责在本地进行资源监控、限流、熔断，并将**数据上报控制台**。

#### 2. 架构设计：

详细过程
参考 -> [官方文档](https://sentinelguard.io/zh-cn/docs/basic-implementation.html)

简要描述： 对于限流系统，指标的统计很关键，Sentinel 中使用高性能的环形计数器（滑动窗口）来实现.
参考 -> [什么是滑动窗口（环形计数器）](https://www.codenest.com.cn/articles/19)

#### 3. 下载并启动 Sentinel 控制台（了解，不用下载):

[点击前往 github](https://github.com/alibaba/Sentinel/releases)，下载 release 的 jar 包。
注意下载的Sentinel 要适配SpringBoot 版本，至于版本的选择可以去 CSDN、Sentinel 官网、问 AI 都可以。

**启动命令**： 注意启动 Sentinel 需要 JDK 1.8 及其 以上版本。
```
java -Dserver.port=8131 -jar sentinel-dashboard-1.8.6.jar
```

然后访问http://localhost:8131/ （启动的端口号），即可访问控制台。 默认账号面都是 sentinel

**客户端接入控制台**：

引入 Maven 依赖，用于和 Sentinel 通讯：

```
<dependency>
  <groupId>com.alibaba.csp</groupId>
  <artifactId>sentinel-transport-simple-http</artifactId>
  <version>1.8.6</version>
</dependency>
```

**此处要注意（以 idea 为例）：SpringBoot 启动时需要添加 JVM 参数：**
点击编辑按钮 -> 构建并运行 -> 修改选项 -> java ->  添加虚拟机选项。

还是不懂就去百度搜索：如何在 idea 启动 SpringBoot 项目 时添加 JVM 参数。

```
-Dcsp.sentinel.dashboard.server=consoleIp:port
```

若启动多个应用，则需要通过 `-Dcsp.sentinel.api.port=xxxx` 指定客户端监控 API 的端口，默认8719。

然后启动 SpringBoot 项目即可。
确保客户端由访问量：Sentinel 会在**客户端首次调用**的初始化。开始向控制台发送心跳包。通过控制台可以查看实时访问情况。

扩展知识：Sentinel 的规则存储在哪里？
官方详细介绍到规则推送有 3 种模式，包括“原始

#### 4. SpringBoot 整合 Sentinel(用这种方式，懒人必备）

**特别注意： 在引入整合依赖时需要注意版本号：**
官方把 SpringBoot 版本划分为三大模块 <2.4 、2.4.~3.0、>3.0 
参考 -> [官方文档](https://github.com/alibaba/spring-cloud-alibaba/wiki/%E7%89%88%E6%9C%AC%E8%AF%B4%E6%98%8E)

以 SpringBoot 2.7 为例，使用 Sentinel Starter 的版本 2021.0.5.0 。 在项目中引入依赖:

```
<!-- https://mvnrepository.com/artifact/com.alibaba.cloud/spring-cloud-starter-alibaba-sentinel -->
<dependency>
    <groupId>com.alibaba.cloud</groupId>
    <artifactId>spring-cloud-starter-alibaba-sentinel</artifactId>
    <version>2021.0.5.0</version>
</dependency>
```
 这个依赖自动整合了Sentinel 的 core 包、客户端通讯报、注解开发包、webmvc 包、热点难受限流包。
 
 整合包支持自动将所有的接口根据 URl 路径识别为资源。启动项目后，通过接口文档测试就能看到监控效果。
 
 
#### 5. 开发模式

##### 5.1 定义资源：

- 代码形式定义资源（不推荐）：

```
Entry entry = null;
// 务必保证finally会被执行
try {
  // 资源名可使用任意有业务语义的字符串
  entry = SphU.entry("自定义资源名");
  // 被保护的业务逻辑
  // do something...
} catch (BlockException e1) {
  // 资源访问阻止，被限流或被降级
  // 进行相应的处理操作
} finally {
    // 一定要释放资源
  if (entry != null) {
    entry.exit();
  }
}
```

- 注解形式定义资源（推荐）：

```
public class TestService {

    // 对应的 `handleException` 函数需要位于 `ExceptionUtil` 类中，并且必须为 static 函数.
    @SentinelResource(value = "test", blockHandler = "handleException", blockHandlerClass = {ExceptionUtil.class})
    public void test() {
        System.out.println("Test");
    }

    // 原函数
    @SentinelResource(value = "hello", blockHandler = "exceptionHandler", fallback = "helloFallback")
    public String hello(long s) {
        return String.format("Hello at %d", s);
    }
    
    // Fallback 函数，函数签名与原函数一致或加一个 Throwable 类型的参数.
    public String helloFallback(long s) {
        return String.format("Halooooo %d", s);
    }

    // Block 异常处理函数，参数最后多一个 BlockException，其余与原函数一致.
    public String exceptionHandler(long s, BlockException ex) {
        // Do some log here.
        ex.printStackTrace();
        return "Oops, error occurred at " + s;
    }
}
```

@SentinelResource 注解的配置优先于自动识别的配置。意味着如果注解中定义了特定的限流或熔断策略，这些策略将覆盖默认的或自动识别的配置。

这里推荐优先试用适配包自动识别资源、尽量用注解最后再手动编码定义资源。

##### 5.2 定义规则：

支持通过代码、**控制台（强烈推荐）**、配置文件来定义规则。但是，使用控制台定义规则项目重新启动就会丢失，所以如果考虑持久化还是要选择编码或者配置文件。

例如：通过代码定义一个限流规则（更灵活）：

```
private static void initFlowQpsRule() {
    List<FlowRule> rules = new ArrayList<>();
    FlowRule rule1 = new FlowRule();
    rule1.setResource(resource);
    // Set max qps to 20
    rule1.setCount(20);
    rule1.setGrade(RuleConstant.FLOW_GRADE_QPS);
    rule1.setLimitApp("default");
    rules.add(rule1);
    FlowRuleManager.loadRules(rules);
}
```

通过控制台配置更高效。

---

## 🔧  项目实战

### 1.  实现接口的限流、熔断规则 

改造接口资源：listQuestionBankVOByPage 接口，
目的：控制对耗时较长、经常访问的接口的请求频率，防止过多请求导致系统过载。

**限流规则：**
- 策略 整个接口每秒钟不超过 10 次请求。
- 阻塞操作：提示系统压力过大，请耐心等待

**熔断规则：**
-  熔断条件：如果接口异常率超过 10%，或者慢调用（响应时长>3 秒）的比例大于 20%，触发 60 秒熔断。
-  熔断操作：直接返回本地数据（缓存或者空数据）

开发模式：用注解定义资源+基于控制台定义规则

### 1.1 定义资源：

需要给限流的接口加上@SentinelResource 注解
```
@PostMapping("/list/page/vo")
@SentinelResource(value = "listQuestionBankVOByPage", //方法名称、
        blockHandler = "handleBlockException", // 熔断/限流时定义的规则
        fallback = "handleFallback") // 降级时定义的规则
public BaseResponse<Page<QuestionBankVO>> listQuestionBankVOByPage(
    @RequestBody QuestionBankQueryRequest questionBankQueryRequest,
    HttpServletRequest request) {
}
```

启动项目。，别忘记添加 JVM 参数。

### 1.2 实现限流阻塞和降级方法：

```
/**
 * listQuestionBankVOByPage 降级操作：直接返回本地数据
 */
public BaseResponse<Page<QuestionBankVO>> handleFallback(@RequestBody QuestionBankQueryRequest questionBankQueryRequest,
                                                         HttpServletRequest request, Throwable ex) {
    // 可以返回本地数据或空数据
    return ResultUtils.success(null);
}

/**
 * listQuestionBankVOByPage 流控操作
 * 限流：提示“系统压力过大，请耐心等待”
 */
public BaseResponse<Page<QuestionBankVO>> handleBlockException(@RequestBody QuestionBankQueryRequest questionBankQueryRequest,
                                                               HttpServletRequest request, BlockException ex) {
    // 限流操作
    return ResultUtils.error(ErrorCode.SYSTEM_ERROR, "系统压力过大，请耐心等待");
}

```

### 1.3 通过控制台配置限流规则
打开http://localhost:8131/ 

 选择 流控规则 -> 添加流控按钮，根据图形化界面设置即可。

 选择 流控规则 -> 添加 熔断按钮，根据图形化界面设置即可。
 
 
 ### 1.4 通过接口文档去测试，是否触发限流和熔断。
 
 需要注意的是：只有业务异常（请求参数错误、数据库操作失败等）才会触发熔断条件，通过限流熔断本身的异常 BlockException 是不计算的～
 
测试应该会发现，任何业务异常都会触发 fallbackHandler ，该方法可以作为一个通用的降级逻辑处理器。

如果 blockeHandler 和 fallbackhandler 同时配置，当熔断器打开后，仍然会进入 blockHandler 方法去处理，因此需要在该方法中处理因为熔断出发导致的降级逻辑：

```
/**
 * listQuestionBankVOByPage 流控操作
 * 限流：提示“系统压力过大，请耐心等待”
 * 熔断：执行降级操作
 */
public BaseResponse<Page<QuestionBankVO>> handleBlockException(@RequestBody QuestionBankQueryRequest questionBankQueryRequest,
                                                               HttpServletRequest request, BlockException ex) {
    // 降级操作
    if (ex instanceof DegradeException) {
        return handleFallback(questionBankQueryRequest, request, ex);
    }
    // 限流操作
    return ResultUtils.error(ErrorCode.SYSTEM_ERROR, "系统压力过大，请耐心等待");
}

```

总结一下：block
