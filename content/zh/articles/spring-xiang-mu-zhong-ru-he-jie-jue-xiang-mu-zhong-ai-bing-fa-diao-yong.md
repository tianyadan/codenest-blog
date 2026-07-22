---
title: Spring项目中如何解决项目中 AI 并发调用问题
summary: 在实际通过 API 调用大模型接口时，可能会有性能瓶颈。当多个用户同时使用平台时，只有少量用户无需等待，如果用户数量规模庞大，那么后续的请求都会被阻塞，需...
author: evan
category: learning
tags: [学习, Spring]
createdAt: 2025-10-27 20:38:06
updatedAt: 2025-10-27 20:38:06
readingMinutes: 7
---
# Spring项目中如何解决项目中 AI 并发调用问题

## 问题描述：
 
在实际通过 API 调用大模型接口时，可能会有性能瓶颈。当多个用户同时使用平台时，只有少量用户无需等待，如果用户数量规模庞大，那么后续的请求都会被阻塞，需要等待前面的请求处理完毕后才能开始执行，针对此种情况可以采用以下方法。

## 多例模式：

Spring 多例模式中利用 Spring 的 Bean 作用机制，从 Spring 容器中获取新的 ChatModel 实例，它更符合 Spring 的设计理念和最佳实践。

## 创建多例配置类

可以使用@Scope（“prototype”） 注解，它告诉 Spring 容器每次获取 Bean 时创建一个全新的实例，而不是复用单例。

示例：

1️⃣ 创建一个配置类 ChatModelConfig.java

```Java
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Scope;

@Configuration
public class ChatModelConfig {

    @Bean
    @Scope("prototype") // ✅ 每次注入都创建一个新实例
    public ChatModel chatModel() {
        return new ChatModel();
    }
}
```

2️⃣ 创建 ChatModel 类（模拟一个大模型调用类）

```Java
import java.util.UUID;

public class ChatModel {
    private final String instanceId;

    public ChatModel() {
        // 用随机 ID 模拟不同实例
        this.instanceId = UUID.randomUUID().toString();
    }

    public String getInstanceId() {
        return instanceId;
    }

    public String chat(String message) {
        // 模拟一次调用
        return "[实例 " + instanceId + "] 回复：" + message.toUpperCase();
    }
}
```

3️⃣ 使用多例 Bean 的服务类

```Java
import org.springframework.beans.factory.ObjectFactory;
import org.springframework.stereotype.Service;

@Service
public class ChatService {

    private final ObjectFactory<ChatModel> chatModelFactory;

    public ChatService(ObjectFactory<ChatModel> chatModelFactory) {
        this.chatModelFactory = chatModelFactory;
    }

    public String handleRequest(String userInput) {
        // 每次请求都会获取新的 ChatModel 实例
        ChatModel chatModel = chatModelFactory.getObject();
        System.out.println("创建的 ChatModel 实例ID：" + chatModel.getInstanceId());
        return chatModel.chat(userInput);
    }
}
```

4️⃣ Controller 层测试

```Java
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class ChatController {

    private final ChatService chatService;

    public ChatController(ChatService chatService) {
        this.chatService = chatService;
    }

    @GetMapping("/chat")
    public String chat(@RequestParam String msg) {
        return chatService.handleRequest(msg);
    }
}
```

5️⃣ 运行结果示例

 调用 controller，控制台可能输出：

```text
创建的 ChatModel 实例ID：a3f1e6b2...
创建的 ChatModel 实例ID：7b9f2d43...
```

提示：此处可以使用 Java21 的虚拟线程开启并发请求，非常轻量，可以创建百万个实例而不会对系统造成太大负担，非常适合 I/O 密集型的并发测试。
