---
title: 从0到1：服务器异常告警 + 邮件通知 + AI 自动分析解决方案
summary: 在 Spring Boot 项目部署到服务器之后，异常情况几乎不可避免。对于个人项目来说，由于缺乏专职运维人员，很难做到实时监控与快速响应。 因此，我希望...
author: evan
category: work
tags: [工作总结]
createdAt: 2026-03-20 20:54:19
updatedAt: 2026-03-20 20:54:19
readingMinutes: 22
---
# 从0到1：服务器异常告警 + 邮件通知 + AI 自动分析解决方案

## 需求背景:

在 Spring Boot 项目部署到服务器之后，异常情况几乎不可避免。对于个人项目来说，由于缺乏专职运维人员，很难做到实时监控与快速响应。

因此，我希望构建一套自动化的异常告警机制：当系统出现问题时，能够第一时间将异常信息推送出来。

但仅仅发送原始的异常堆栈信息，往往内容冗杂、可读性差，排查成本依然很高。基于这一痛点，我引入了 AI 能力，对异常信息进行智能分析与总结。

最终实现的方案是：当服务器出现异常（如 **RuntimeException**）时，系统自动捕获异常，并基于 Spring Boot 的事件机制（<span style="color:#9b59b6">观察者模式</span>）<span style="color:#e74c3c">异步</span>通知**邮件服务**与 **AI 服务**，从而完成告警推送与问题分析的自动化处理。

## 正文开始：

### 1) 引入Pom坐标:

```java
        <!--  阿里云百炼 模型服务 -->
        <dependency>
            <groupId>com.openai</groupId>
            <artifactId>openai-java</artifactId>
            <version>3.5.0</version>
        </dependency>
        
          <!--  邮件服务-->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-mail</artifactId>
        </dependency>

```

### 2) 编写配置文件所需要的配置(application.yml)

```yml
  # 邮件服务配置
  mail:
    host: smtp.163.com
    port: 465
    username: xxxxxx@163.com # 填写自己的邮箱,此处建议申请 163 邮箱，更方便
     # 这里的不是密码，而是自己申请的 key，此处的 key 申请可以询问AI
    password: <PASSWORD>   
    properties:
      mail:
        smtp:
          ssl:
            enable: true
            
  ai:
     ai-model: qwen3.5-27b #模型名称，有很多可以自己根据token数量去选择合适的
```

### 3）编写发送邮件服务

在根目录下新建`utils`包，新建一个`MailService`服务实体类:

```java
@Component
public class MailService {

    // 注入依赖
    @Resource
    private  JavaMailSender javaMailSender;

    public void sendMail(String to, String subject, String content) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom("xxxxxxx@163.com"); // 必须和 spring.mail.username 一致
        message.setTo(to); //  邮件接收者（发给谁）
        message.setSubject(subject); // 邮件主题
        message.setText(content);  // 邮件内容
        javaMailSender.send(message);
    }
}
```

### 3)  编写全局异常处理类

在根目录下新建`exception` 名称的包，用于专门处理异常。然后新建一个 `GlobalExceptionHandler` 的异常处理类，内容如下:

```java
/**
 * 全局异常处理器
 */
@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

     // 运行时异常
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
        // 发布系统异常事件
        eventPublisher.publishEvent(new SystemExceptionEvent(context));
        return Result.failure(ErrorCode.SERVER_ERROR, "系统错误");
    }

}
```

 对应的异常实体类:
 
```java
@Data
public class ExceptionContext {
    // 触发异常的 URL
    private String url;
    // 触发异常的 method
    private String method;
    
    private String query;
    // 触发异常的ip
    private String ip;
    // 错误消息
    private String errorMessage;
    // 堆栈信息
    private String stackTrace;
}
```

### 4） 编写观察者模式的监听事件

在根目录下新建 `event` 包,  编写事件:

```java
// 异常事件 这是个记录类
public record SystemExceptionEvent(ExceptionContext context) {
}
```

接着在根目录下同样新建一个 `listener` 包，然后编写监听方法：

```java
@Component
public class ExceptionMailListener {
    
    // 邮件服务
    @Resource
    private MailService mailService;

    // ai 服务
    @Resource
    private QwenAiAnalyzeService aiService;

    @Value("${spring.mail.username}")
    private String adminEmail;

    @Async
    @EventListener
    public void handleException(SystemExceptionEvent event) {
        ExceptionContext ctx = event.context();

        // 调用 AI 分析
        String aiSuggestion = aiService.analyzeException(ctx);

        // 拼接邮件内容
        String finalContent = buildEmailContent(ctx, aiSuggestion);

        mailService.sendMail(adminEmail, "==系统异常告警==", finalContent);
    }

       // 拼接邮件工具类（可单独放置其他包中）
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

### 5）编写AI分析服务

建议依旧在根目录下新建一个`ai` 包，专门存放 ai 相关的功能，建好之后新建一个 `QwenAiAnalyzeService` 实体类（因为使用的是阿里的 Qwen）

编写对应方法:

```java
@Service
@Slf4j
public class QwenAiAnalyzeService {

     // 配置的模型
    @Value("${ai.ai-model}")
    private String model;

    public String analyzeException(ExceptionContext ctx) {
        OpenAIClient client = OpenAIOkHttpClient.builder()
                .apiKey("xxxxxxxxxx")  //此处填写阿里云百炼申请的 key
                .baseUrl("https://dashscope.aliyuncs.com/compatible-mode/v1")//地址可写死
                .build();

        // 构建 prompt
        String prompt = buildAiPrompt(ctx);

        ChatCompletionCreateParams params = ChatCompletionCreateParams.builder()
                .addUserMessage(prompt)
                .model(model) // 你配置的 model
                .build();

        try {
            ChatCompletion chatCompletion = client.chat().completions().create(params);
            // 将对象转 JSON
            ObjectMapper mapper = new ObjectMapper();
            JsonNode root = mapper.valueToTree(chatCompletion);
            // 解析内容
            return root.path("choices").get(0)
                    .path("message")
                    .path("content")
                    .asText();
        } catch (Exception e) {
            log.warn("AI 分析失败: {}", e.getMessage());
            return "AI 分析失败: " + e.getMessage();
        }
    }

    // 构建提示词，便于 AI 分析异常
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
            // 按逗号或换行分割堆栈
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

至此大功告成了，可以手动触发一个运行时异常，或者其他异常（需要再定义监听事件）来调试一下 AI 处理结果。

### 效果图:

![8d8fd73eb56cbfc557a8e1872439c1c4](https://codenest.oss-cn-qingdao.aliyuncs.com/images/2026/03/20/b56aaacf-4f7d-48ef-a6b1-48dd89d045f7.jpg)

![22911761495e16e73134fccf8190ca31](https://codenest.oss-cn-qingdao.aliyuncs.com/images/2026/03/20/c2274721-a668-45d9-a8ed-6e58caf123c3.jpg)

### 扩展点：

#### a. AI Client 每次 new（严重问题）：性能浪费 ， 连接无法复用 ，高并发下容易炸

```java
OpenAIClient client = OpenAIOkHttpClient.builder()
```

修改：然后注入使用。使用单例 Bean 管理 AI Client，避免重复创建连接

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

#### b. 没有“限流 / 防抖”

 如果某个接口炸了，一秒 1000个异常，现在会直接破产+邮箱封号。
 
 处理方式：
 
 - 同一异常 1 分钟只发 1 次
 - Redis+去重 key （进阶） `error:NullPointer:/api/user`

#### c. 使用AI自动修复（高阶思路）

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
