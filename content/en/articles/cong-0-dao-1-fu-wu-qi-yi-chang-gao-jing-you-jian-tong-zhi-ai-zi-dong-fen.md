---
title: From 0 to 1: Server Exception Alerts + Email Notifications + AI-Powered Analysis
summary: After deploying a Spring Boot project to a server, exceptions are almost inevitable. This article shows how to automate alerting, email notifications, and AI-based exception analysis.
author: evan
category: work
tags: [Work Notes]
createdAt: 2026-03-20 20:54:19
updatedAt: 2026-03-20 20:54:19
readingMinutes: 22
---

# From 0 to 1: Server Exception Alerts + Email Notifications + AI-Powered Analysis

## Background

After a Spring Boot project is deployed to a server, exceptions are almost impossible to avoid. For personal projects, without a dedicated operations team, it is hard to achieve real-time monitoring and fast response.

Because of that, I wanted to build an automated exception alerting mechanism so that when the system has a problem, the exception details can be pushed out immediately.

However, sending only the raw stack trace usually creates another problem: the content is noisy, hard to read, and still expensive to troubleshoot. To solve that, I introduced AI to analyze and summarize the exception information.

The final approach is this: when a server-side exception occurs, such as a **RuntimeException**, the system captures it automatically and uses Spring Boot's event mechanism (the <span style="color:#9b59b6">Observer pattern</span>) to <span style="color:#e74c3c">asynchronously</span> notify the **mail service** and the **AI service**, completing both alert delivery and problem analysis in an automated flow.

## Main Walkthrough

### 1) Add the dependencies

```xml
        <!-- Alibaba Cloud Bailian model service -->
        <dependency>
            <groupId>com.openai</groupId>
            <artifactId>openai-java</artifactId>
            <version>3.5.0</version>
        </dependency>
        
          <!-- Mail service -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-mail</artifactId>
        </dependency>

```

### 2) Add the required configuration to `application.yml`

```yml
  # Mail service configuration
  mail:
    host: smtp.163.com
    port: 465
    username: xxxxxx@163.com # Fill in your own email. A 163 mailbox is recommended because it is easier to use here.
     # This is not the password. It is the key you apply for. You can ask AI how to obtain it.
    password: <PASSWORD>   
    properties:
      mail:
        smtp:
          ssl:
            enable: true
            
  ai:
     ai-model: qwen3.5-27b # Model name. You can choose one based on token count and your actual needs.
```

### 3) Write the mail sending service

Create a `utils` package under the project root, then create a `MailService` class:

```java
@Component
public class MailService {

    // Inject dependencies
    @Resource
    private  JavaMailSender javaMailSender;

    public void sendMail(String to, String subject, String content) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom("xxxxxxx@163.com"); // Must match spring.mail.username
        message.setTo(to); // Mail recipient
        message.setSubject(subject); // Mail subject
        message.setText(content);  // Mail content
        javaMailSender.send(message);
    }
}
```

### 3) Write the global exception handler

Create a package named `exception` under the project root specifically for exception handling. Then create a `GlobalExceptionHandler` class with the following content:

```java
/**
 * Global exception handler
 */
@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

     // Runtime exception
    @ExceptionHandler(RuntimeException.class)
    public BaseResponse<?> runtimeExceptionHandler(RuntimeException e) {
        ServletRequestAttributes attributes =
                (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();

        HttpServletRequest request = attributes.getRequest();
        ExceptionContext context = new ExceptionContext();
        context.setUrl(request.getRequestURI());
        context.setMethod(request.getMethod());
        context.setQuery(request.getQueryString());
        context.setIp(request.getRemoteAddr());
        context.setErrorMessage(e.getMessage());
        context.setStackTrace(Arrays.toString(e.getStackTrace()));

        log.error("RuntimeException", e);
        // Publish the system exception event
        eventPublisher.publishEvent(new SystemExceptionEvent(context));
        return Result.failure(ErrorCode.SERVER_ERROR, "系统错误");
    }

}
```

The corresponding exception entity class:
 
```java
@Data
public class ExceptionContext {
    // URL that triggered the exception
    private String url;
    // Method that triggered the exception
    private String method;
    
    private String query;
    // IP that triggered the exception
    private String ip;
    // Error message
    private String errorMessage;
    // Stack trace
    private String stackTrace;
}
```

### 4) Write the listener event using the Observer pattern

Create an `event` package under the project root and write the event:

```java
// Exception event. This is a record.
public record SystemExceptionEvent(ExceptionContext context) {
}
```

Then create a `listener` package under the project root and write the listener method:

```java
@Component
public class ExceptionMailListener {
    
    // Mail service
    @Resource
    private MailService mailService;

    // AI service
    @Resource
    private QwenAiAnalyzeService aiService;

    @Value("${spring.mail.username}")
    private String adminEmail;

    @Async
    @EventListener
    public void handleException(SystemExceptionEvent event) {
        ExceptionContext ctx = event.context();

        // Call AI analysis
        String aiSuggestion = aiService.analyzeException(ctx);

        // Concatenate the mail content
        String finalContent = buildEmailContent(ctx, aiSuggestion);

        mailService.sendMail(adminEmail, "==系统异常告警==", finalContent);
    }

       // Utility method for assembling mail content (can also be placed in another package)
    private String buildEmailContent(ExceptionContext ctx, String aiSuggestion) {
        StringBuilder sb = new StringBuilder();
        sb.append("【请求信息】\n")
                .append("URL: ").append(ctx.getUrl()).append("\n")
                .append("Method: ").append(ctx.getMethod()).append("\n")
                .append("IP: ").append(ctx.getIp()).append("\n")
                .append("Query 参数: ").append(ctx.getQuery()).append("\n\n")
                .append("【异常信息】\n")
                .append(ctx.getErrorMessage()).append("\n\n")
                .append("【堆栈信息】\n")
                .append(ctx.getStackTrace()).append("\n\n")
                .append("【AI 建议】\n")
                .append(aiSuggestion);
        return sb.toString();
    }

}
```

### 5) Write the AI analysis service

It is still a good idea to create an `ai` package under the project root to store AI-related functions. After that, create a `QwenAiAnalyzeService` class, since this example uses Alibaba's Qwen model.

Write the method like this:

```java
@Service
@Slf4j
public class QwenAiAnalyzeService {

     // Configured model
    @Value("${ai.ai-model}")
    private String model;

    public String analyzeException(ExceptionContext ctx) {
        OpenAIClient client = OpenAIOkHttpClient.builder()
                .apiKey("xxxxxxxxxx")  // Fill in the key you applied for from Alibaba Cloud Bailian
                .baseUrl("https://dashscope.aliyuncs.com/compatible-mode/v1")// The address can be hardcoded
                .build();

        // Build the prompt
        String prompt = buildAiPrompt(ctx);

        ChatCompletionCreateParams params = ChatCompletionCreateParams.builder()
                .addUserMessage(prompt)
                .model(model) // Your configured model
                .build();

        try {
            ChatCompletion chatCompletion = client.chat().completions().create(params);
            // Convert the object to JSON
            ObjectMapper mapper = new ObjectMapper();
            JsonNode root = mapper.valueToTree(chatCompletion);
            // Parse the content
            return root.path("choices").get(0)
                    .path("message")
                    .path("content")
                    .asText();
        } catch (Exception e) {
            log.warn("AI 分析失败: {}", e.getMessage());
            return "AI 分析失败: " + e.getMessage();
        }
    }

    // Build the prompt to help AI analyze the exception
    private String buildAiPrompt(ExceptionContext ctx) {
        StringBuilder sb = new StringBuilder();

        sb.append("你是一名经验丰富的 Java 后端开发专家。\n");
        sb.append("我在系统中遇到了如下异常，请帮我分析并给出处理建议：\n\n");

        sb.append("【请求信息】\n");
        sb.append("URL: ").append(ctx.getUrl()).append("\n");
        sb.append("Method: ").append(ctx.getMethod()).append("\n");
        sb.append("IP: ").append(ctx.getIp()).append("\n");
        sb.append("Query 参数: ").append(ctx.getQuery()).append("\n\n");

        sb.append("【异常信息】\n");
        sb.append(ctx.getErrorMessage()).append("\n\n");

        sb.append("【堆栈信息（前 10 条）】\n");
        if (ctx.getStackTrace() != null && !ctx.getStackTrace().isEmpty()) {
            // Split the stack trace by commas or newlines
            String[] traces = ctx.getStackTrace().split("[,\\r?\\n]+");
            for (int i = 0; i < Math.min(10, traces.length); i++) {
                sb.append(traces[i]).append("\n");
            }
            if (traces.length > 10) {
                sb.append("...（堆栈信息被截断，仅显示前 10 条）\n\n");
            }
        }

        sb.append("请按照以下结构输出：\n");
        sb.append("1. 异常可能原因（简明扼要）\n");
        sb.append("2. 处理建议（可操作步骤）\n");
        sb.append("请用条理清晰、易于直接参考和执行的方式回答。");

        return sb.toString();
    }

}
```

At this point, the main flow is complete. You can manually trigger a runtime exception, or another type of exception if you define more listener events, and then debug the AI analysis result.

### Result Screenshots

![8d8fd73eb56cbfc557a8e1872439c1c4](https://codenest.oss-cn-qingdao.aliyuncs.com/images/2026/03/20/b56aaacf-4f7d-48ef-a6b1-48dd89d045f7.jpg)

![22911761495e16e73134fccf8190ca31](https://codenest.oss-cn-qingdao.aliyuncs.com/images/2026/03/20/c2274721-a668-45d9-a8ed-6e58caf123c3.jpg)

### Extension Points

#### a. Creating a new AI Client every time is a serious problem: wasted performance, no connection reuse, and easy failures under high concurrency

```java
OpenAIClient client = OpenAIOkHttpClient.builder()
```

Fix: inject it instead. Use a singleton Bean to manage the AI Client and avoid repeatedly creating connections.

```java
@Configuration
public class AiConfig {

    @Bean
    public OpenAIClient openAIClient() {
        return OpenAIOkHttpClient.builder()
                .apiKey("xxx")
                .baseUrl("xxx")
                .build();
    }
}
```

#### b. There is no rate limiting or debouncing
 
If one interface blows up and throws 1000 exceptions per second, this implementation can bankrupt you and get your mailbox blocked.
 
How to handle it:
 
- Send the same exception only once per minute
- Redis + deduplication key (advanced): `error:NullPointer:/api/user`

#### c. Use AI for automatic repair as an advanced direction

```txt
异常发生
 → Spring Event
 → AI分析（总结原因 + 修复建议 + Patch代码）
 → 存入数据库
 → 推送通知（邮件 / 钉钉）

 → 后台管理系统（React，Vue）
     - 异常列表
     - AI分析结果
     - 修复建议
     - 一键复制Patch
     - 标记已解决

（可选）
 → 简单规则自动修复（NPE等）
```
