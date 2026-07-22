---
title: "Website Traffic Security Optimization [Sentinel]"
summary: "With limited server resources, traffic control must protect confidentiality, integrity, availability, and performance. This article uses Sentinel to implement rate limiting, circuit breaking, and degradation for practical traffic protection."
author: evan
category: learning
tags: [Learning, Sentinel]
createdAt: 2025-09-08 20:39:27
updatedAt: 2025-09-08 20:39:27
readingMinutes: 20
---
# Website Traffic Security Optimization [Sentinel]

## **Requirement Analysis**

With limited server resources, the goal is to protect confidentiality, integrity, and availability during data transmission, prevent unauthorized access, tampering, data leakage, and attacks, and at the same time improve network transmission efficiency and performance.

---

For a comparison between circuit breaking and degradation, see:
[Difference Between Circuit Breaking and Degradation](https://www.codenest.com.cn/articles/6)

---

## **Solution Design**

### 1. Rate limit a single endpoint as a whole

(Control the request frequency of slow or frequently accessed endpoints to prevent too many requests from overloading the system.)

**Rate-limiting rules:**

- No more than 10 requests per second for the whole endpoint.
- Blocking action: return a message saying the system is under heavy pressure and the user should wait.

**Circuit-breaking rules:**

- Trigger a 60-second circuit break if the exception ratio exceeds 10%, or if the proportion of slow calls (response time > 3 seconds) exceeds 20%.
- Circuit-break action: return local data directly (cached data or empty data).

### 2. Rate limit a single IP calling a single endpoint

**Rate-limiting rules:**

- Strategy: each IP address may view the problem list no more than 60 times per minute
- Blocking action: return "Access is too frequent, please try again later"

**Circuit-breaking rules:**

- Trigger a 60-second circuit break if the exception ratio exceeds 10%, or if the proportion of slow calls (response time > 3 seconds) exceeds 20%.
- Circuit-break action: return local data directly (cached data or empty data).

---

## **Implementation Plan**

My first recommendation is **Sentinel**. It is Alibaba's open-source component for rate limiting, circuit breaking, and degradation, designed to provide reliable protection for distributed systems. It is especially suitable for high-concurrency scenarios and integrates with frameworks such as Dubbo and Spring Cloud.

Its main features include:

- Rate limiting: supports QPS- and concurrency-based throttling, along with sliding-window, warm-up, and leaky-bucket style strategies
- Circuit breaking and degradation: supports failure-rate and slow-call based triggers, with automatic recovery
- Hotspot parameter limiting: applies limits based on specific parameters, such as a particular user ID
- System load protection: dynamically adjusts traffic control according to CPU, memory, and other system metrics
- **Graphical dashboard** for easier configuration

Other middleware can also handle parts of this problem: Resilience4j (lightweight, but with fewer features, especially for rate limiting), Guava RateLimiter (token-bucket based, good only for rate limiting), and Hystrix (not recommended because it is no longer maintained).

---

## Sentinel Quick Start

#### 1. Core concepts

- Define resources
- Define rules
- Verify whether the rules take effect

**Resource**: the business logic or code block to protect.

Resources can be defined in several ways, such as programmatically or through annotations: [Official documentation](https://sentinelguard.io/zh-cn/docs/basic-api-resource-rule.html)

**Rules**: Sentinel uses rules to define how resources are protected. Examples include:

- Flow rules: used to control traffic, for example by setting QPS thresholds
- Circuit-breaking rules: used for degradation when exception ratio or response time exceeds a threshold
- System rules: used to protect the overall system according to CPU usage, memory usage, and similar metrics
- Hotspot parameter rules
- Authorization rules: define allowlists and blocklists for access control

**Dashboard**: Sentinel provides a visual dashboard for monitoring, configuring, and managing rate-limiting and circuit-breaking rules. This is the heart of the product.

**Client**: the application integrated with Sentinel. Usually it connects by adding Sentinel dependencies. The client performs local monitoring, rate limiting, and circuit breaking, and **reports data to the dashboard**.

#### 2. Architecture design

For the detailed process, see the [official documentation](https://sentinelguard.io/zh-cn/docs/basic-implementation.html).

In short: metric collection is critical in a rate-limiting system. Sentinel uses a high-performance ring counter (a sliding window) for this purpose. See also:
[What Is a Sliding Window (Ring Counter)](https://www.codenest.com.cn/articles/19)

#### 3. Download and start the Sentinel dashboard

[Go to GitHub](https://github.com/alibaba/Sentinel/releases) and download the release jar.

Make sure the Sentinel version matches your Spring Boot version. To choose a version, you can check CSDN, the Sentinel website, or ask AI.

**Startup command**: Sentinel requires JDK 1.8 or above.

```bash
java -Dserver.port=8131 -jar sentinel-dashboard-1.8.6.jar
```

Then visit http://localhost:8131/ to access the dashboard. The default username and password are both `sentinel`.

**Client connection to the dashboard**

Add the Maven dependency used to communicate with Sentinel:

```xml
<dependency>
  <groupId>com.alibaba.csp</groupId>
  <artifactId>sentinel-transport-simple-http</artifactId>
  <version>1.8.6</version>
</dependency>
```

**Important note (using IntelliJ IDEA as an example): when starting Spring Boot, you need to add JVM parameters**

Click Edit Configurations -> Build and Run -> Modify options -> Java -> Add VM options.

If that is still unclear, search for: how to add JVM parameters when starting a Spring Boot project in IDEA.

```text
-Dcsp.sentinel.dashboard.server=consoleIp:port
```

If you start multiple applications, use `-Dcsp.sentinel.api.port=xxxx` to specify the client monitoring API port. The default is `8719`.

Then start the Spring Boot project.
Make sure the client receives traffic: Sentinel initializes **on the first client-side invocation**, and only then starts sending heartbeats to the dashboard. After that, you can view real-time access information in the dashboard.

Extra note: where are Sentinel rules stored?
The official docs describe three push modes for rules, including the original mode...

#### 4. Integrate Sentinel with Spring Boot (recommended lazy-person approach)

**Important: when adding the integration dependency, pay close attention to the version number**

The official guidance divides Spring Boot versions into three groups: `< 2.4`, `2.4 ~ 3.0`, and `> 3.0`.
Reference: [official documentation](https://github.com/alibaba/spring-cloud-alibaba/wiki/%E7%89%88%E6%9C%AC%E8%AF%B4%E6%98%8E)

Taking Spring Boot 2.7 as an example, use Sentinel Starter version `2021.0.5.0`. Add this dependency:

```xml
<!-- https://mvnrepository.com/artifact/com.alibaba.cloud/spring-cloud-starter-alibaba-sentinel -->
<dependency>
    <groupId>com.alibaba.cloud</groupId>
    <artifactId>spring-cloud-starter-alibaba-sentinel</artifactId>
    <version>2021.0.5.0</version>
</dependency>
```

This dependency automatically brings in Sentinel core, client communication, annotation support, WebMVC integration, and hotspot parameter support.

The starter can automatically recognize all endpoints as resources based on their URL paths. After starting the project, you can use your API docs or test calls to observe monitoring behavior.

#### 5. Development model

##### 5.1 Define resources

- Define resources in code (not recommended):

```java
Entry entry = null;
// Make sure finally will always execute
try {
  // The resource name can be any business-meaningful string
  entry = SphU.entry("Custom resource name");
  // Protected business logic
  // do something...
} catch (BlockException e1) {
  // Resource access was blocked due to rate limiting or degradation
  // Handle it accordingly
} finally {
  // Always release the resource
  if (entry != null) {
    entry.exit();
  }
}
```

- Define resources with annotations (recommended):

```java
public class TestService {

    // The `handleException` function must be in the `ExceptionUtil` class and must be static.
    @SentinelResource(value = "test", blockHandler = "handleException", blockHandlerClass = {ExceptionUtil.class})
    public void test() {
        System.out.println("Test");
    }

    // Original function
    @SentinelResource(value = "hello", blockHandler = "exceptionHandler", fallback = "helloFallback")
    public String hello(long s) {
        return String.format("Hello at %d", s);
    }

    // Fallback function: signature must match the original function, or add one Throwable parameter
    public String helloFallback(long s) {
        return String.format("Fallback result %d", s);
    }

    // Block exception handler: same parameters as the original function, plus a final BlockException parameter
    public String exceptionHandler(long s, BlockException ex) {
        // Do some log here.
        ex.printStackTrace();
        return "Oops, error occurred at " + s;
    }
}
```

The configuration in `@SentinelResource` takes priority over automatically recognized defaults. In other words, if the annotation defines a specific rule, it overrides the auto-detected one.

The recommended order is: first try automatic resource recognition through the starter, then use annotations where needed, and only fall back to manual code definitions when necessary.

##### 5.2 Define rules

Rules can be defined through code, the **dashboard (strongly recommended)**, or configuration files. However, rules created through the dashboard are lost when the project restarts, so if persistence matters, use code or configuration files.

For example, define a rate-limiting rule in code:

```java
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

Using the dashboard is usually more efficient.

---

## Project Practice

### 1. Implement rate limiting and circuit-breaking rules for an API

Refactor the `listQuestionBankVOByPage` endpoint.
Goal: control requests to a slow and frequently used endpoint and prevent overload caused by excessive traffic.

**Rate-limiting rules:**

- Strategy: no more than 10 requests per second for the entire endpoint
- Blocking action: return a message telling the user the system is under heavy pressure and to wait patiently

**Circuit-breaking rules:**

- Trigger a 60-second circuit break if the exception ratio exceeds 10%, or if the proportion of slow calls (response time > 3 seconds) exceeds 20%
- Circuit-break action: return local data directly (cached data or empty data)

Development style: define the resource with annotations and define the rules through the dashboard.

### 1.1 Define the resource

Add `@SentinelResource` to the endpoint that needs protection:

```java
@PostMapping("/list/page/vo")
@SentinelResource(value = "listQuestionBankVOByPage", // Method name
        blockHandler = "handleBlockException", // Rule applied for circuit breaking / rate limiting
        fallback = "handleFallback") // Rule applied for degradation
public BaseResponse<Page<QuestionBankVO>> listQuestionBankVOByPage(
    @RequestBody QuestionBankQueryRequest questionBankQueryRequest,
    HttpServletRequest request) {
}
```

Start the project, and do not forget the JVM parameters.

### 1.2 Implement the block and fallback methods

```java
/**
 * Degradation handler for listQuestionBankVOByPage: return local data directly
 */
public BaseResponse<Page<QuestionBankVO>> handleFallback(@RequestBody QuestionBankQueryRequest questionBankQueryRequest,
                                                         HttpServletRequest request, Throwable ex) {
    // Return local data or empty data
    return ResultUtils.success(null);
}

/**
 * Flow-control handler for listQuestionBankVOByPage
 * Rate limiting: return "The system is under heavy pressure, please wait"
 */
public BaseResponse<Page<QuestionBankVO>> handleBlockException(@RequestBody QuestionBankQueryRequest questionBankQueryRequest,
                                                               HttpServletRequest request, BlockException ex) {
    // Rate-limiting behavior
    return ResultUtils.error(ErrorCode.SYSTEM_ERROR, "The system is under heavy pressure, please wait");
}
```

### 1.3 Configure the rate-limiting rule in the dashboard

Open http://localhost:8131/

Choose **Flow Control Rules** -> **Add Flow Rule**, then configure it through the UI.

Choose **Flow Control Rules** -> **Add Circuit Breaker Rule**, then configure it through the UI.

### 1.4 Test whether rate limiting and circuit breaking are triggered

Use your API docs or request tool for testing.

Note: only business exceptions (such as invalid parameters or database failures) count toward circuit-breaking conditions. `BlockException` generated by Sentinel's own rate limiting and circuit breaking does not count.

During testing, you will find that any business exception triggers `fallbackHandler`, which can act as a generic degradation processor.

If both `blockHandler` and `fallbackHandler` are configured, then once the circuit breaker opens, the request still enters `blockHandler`. That means `blockHandler` also needs to distinguish degrade-triggered behavior:

```java
/**
 * Flow-control handler for listQuestionBankVOByPage
 * Rate limiting: return "The system is under heavy pressure, please wait"
 * Circuit breaking: execute degradation logic
 */
public BaseResponse<Page<QuestionBankVO>> handleBlockException(@RequestBody QuestionBankQueryRequest questionBankQueryRequest,
                                                               HttpServletRequest request, BlockException ex) {
    // Degradation logic
    if (ex instanceof DegradeException) {
        return handleFallback(questionBankQueryRequest, request, ex);
    }
    // Rate-limiting logic
    return ResultUtils.error(ErrorCode.SYSTEM_ERROR, "The system is under heavy pressure, please wait");
}
```

In short, `blockHandler` is responsible for blocked traffic, including circuit-breaker cases, while `fallback` is better suited for general business-exception degradation.
