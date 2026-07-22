---
title: Spring Ai 工具调用
summary: "封装工具类 InterviewTools.java ，包含多个工具，使用 @Tool 注解标识工具 这个方法会被 Spring AI 包装成 Tool。将..."
author: evan
category: learning
tags: [学习, Spring]
createdAt: 2026-06-11 11:35:41
updatedAt: 2026-06-11 11:35:41
readingMinutes: 5
---
# Spring Ai 工具调用

封装工具类 InterviewTools.java ，包含多个工具，使用 `@Tool` 注解标识工具

```java
@Component
public class InterviewTools {

    @Tool(description = "当用户需要查询候选人的面试分数、评级、面试建议时使用")
    public String queryInterviewScore(Long userId) {
        return """
                {
                  "userId": %d,
                  "name": "张三",
                  "score": 86,
                  "level": "中级Java开发",
                  "suggestion": "Spring Boot基础较好，但需要加强JVM和分布式事务"
                }
                """.formatted(userId);
    }

    @Tool(description = "当用户需要查询候选人的简历信息、工作年限、技术栈、项目经历时使用"
    public String queryResumeInfo(Long userId) {
        return """
                {
                  "userId": %d,
                  "workYears": "2年",
                  "skills": ["Java", "Spring Boot", "MySQL", "Redis", "Vue3"],
                  "project": "AI面试刷题系统"
                }
                """.formatted(userId);
    }

    @Tool(description = "当用户需要生成候选人的学习计划、复习路线、补强建议时使用")
    public String generateStudyPlan(String weakness) {
        return """
                {
                  "weakness": "%s",
                  "plan": [
                    "第1周：复习基础概念",
                    "第2周：刷高频面试题",
                    "第3周：结合项目做场景题",
                    "第4周：模拟面试和复盘"
                  ]
                }
                """.formatted(weakness);
    }
}

```
这个方法会被 Spring AI 包装成 Tool。将工具暴露给模型 .

```java
ChatResponse response = chatClient
        .prompt(prompt)
        .tools(interviewTools) // 提供多个工具 ， 表示本次请求可用工具。
        .call()
        .chatResponse();
```

真正是否调用，由模型自己决定。其含义为：我给你 interviewTools 这个工具集，可以用，也可以不用，是否调用，由模型根据用户问题和工具描述自己判断。

```plain text
需要简历信息 -> 调 queryResumeInfo
需要面试分数 -> 调 queryInterviewScore
需要学习建议 -> 可能调 generateStudyPlan
```

### 扩展 ：

```java
.toolNames("queryInterviewScore") // 表示：本次请求只暴露这个工具名，具体工具由 ToolCallbackResolver 动态解析。
```

 坑点：
 
 > 模型只能在你暴露给它的工具范围内选择。不能凭空调用 Spring 容器里所有 Bean，否则太危险，相当于整个后端裸奔给模型了。
