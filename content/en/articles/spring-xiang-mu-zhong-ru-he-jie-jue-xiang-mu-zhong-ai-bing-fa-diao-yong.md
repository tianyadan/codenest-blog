---
title: How to Handle Concurrent AI Calls in Spring Projects
summary: "When many users call a large model API at the same time, performance bottlenecks can cause later requests to block behind earlier ones. One practical approach is to use Spring's prototype scope so each request gets a fresh ChatModel instance."
author: evan
category: learning
tags: [Learning, Spring]
createdAt: 2025-10-27 20:38:06
updatedAt: 2025-10-27 20:38:06
readingMinutes: 7
---
# How to Handle Concurrent AI Calls in Spring Projects

## Problem Description

When you call a large model API in a real application, you may run into performance bottlenecks. When multiple users use the platform at the same time, only a small number of users may get immediate responses. As user volume grows, later requests can be blocked and must wait for earlier requests to finish. For this kind of scenario, the following approach can help.

## Prototype Scope

With Spring prototype scope, you can take advantage of Spring's Bean lifecycle mechanism to obtain a fresh `ChatModel` instance from the Spring container. This fits Spring's design philosophy and best practices well.

## Create a prototype configuration class

You can use the `@Scope("prototype")` annotation. It tells the Spring container to create a brand-new instance every time the Bean is requested, instead of reusing a singleton.

Example:

### 1. Create a configuration class `ChatModelConfig.java`

```java
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Scope;

@Configuration
public class ChatModelConfig {

    @Bean
    @Scope("prototype") // Create a new instance for every injection/request
    public ChatModel chatModel() {
        return new ChatModel();
    }
}
```

### 2. Create a `ChatModel` class (simulating a large model call)

```java
import java.util.UUID;

public class ChatModel {
    private final String instanceId;

    public ChatModel() {
        // Use a random ID to simulate different instances
        this.instanceId = UUID.randomUUID().toString();
    }

    public String getInstanceId() {
        return instanceId;
    }

    public String chat(String message) {
        // Simulate one call
        return "[Instance " + instanceId + "] Reply: " + message.toUpperCase();
    }
}
```

### 3. Service class that uses the prototype Bean

```java
import org.springframework.beans.factory.ObjectFactory;
import org.springframework.stereotype.Service;

@Service
public class ChatService {

    private final ObjectFactory<ChatModel> chatModelFactory;

    public ChatService(ObjectFactory<ChatModel> chatModelFactory) {
        this.chatModelFactory = chatModelFactory;
    }

    public String handleRequest(String userInput) {
        // Get a new ChatModel instance for every request
        ChatModel chatModel = chatModelFactory.getObject();
        System.out.println("Created ChatModel instance ID: " + chatModel.getInstanceId());
        return chatModel.chat(userInput);
    }
}
```

### 4. Test at the Controller layer

```java
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

### 5. Example runtime output

When you call the controller, the console may print:

```text
Created ChatModel instance ID: a3f1e6b2...
Created ChatModel instance ID: 7b9f2d43...
```

Tip: You can use Java 21 virtual threads to send concurrent requests in testing. They are very lightweight, you can create a huge number of them, and they are especially suitable for I/O-intensive concurrency tests.
