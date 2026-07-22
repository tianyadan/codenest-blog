---
title: Spring AI Tool Calling
summary: "Wrap multiple tools in InterviewTools.java and mark them with @Tool. Spring AI exposes only the tools you explicitly provide, and the model decides whether to call them based on the user's request and each tool's description."
author: evan
category: learning
tags: [Learning, Spring]
createdAt: 2026-06-11 11:35:41
updatedAt: 2026-06-11 11:35:41
readingMinutes: 5
---
# Spring AI Tool Calling

Create a tool class such as `InterviewTools.java`, put multiple tools inside it, and mark them with the `@Tool` annotation.

```java
@Component
public class InterviewTools {

    @Tool(description = "Use this when the user needs a candidate's interview score, rating, or interview suggestions")
    public String queryInterviewScore(Long userId) {
        return """
                {
                  "userId": %d,
                  "name": "Zhang San",
                  "score": 86,
                  "level": "Mid-level Java Developer",
                  "suggestion": "Good Spring Boot fundamentals, but needs stronger JVM and distributed transaction knowledge"
                }
                """.formatted(userId);
    }

    @Tool(description = "Use this when the user needs resume details, years of experience, tech stack, or project history")
    public String queryResumeInfo(Long userId) {
        return """
                {
                  "userId": %d,
                  "workYears": "2 years",
                  "skills": ["Java", "Spring Boot", "MySQL", "Redis", "Vue3"],
                  "project": "AI Interview Practice System"
                }
                """.formatted(userId);
    }

    @Tool(description = "Use this when the user needs a study plan, review roadmap, or improvement suggestions")
    public String generateStudyPlan(String weakness) {
        return """
                {
                  "weakness": "%s",
                  "plan": [
                    "Week 1: Review the fundamentals",
                    "Week 2: Practice common interview questions",
                    "Week 3: Solve scenario-based questions using project examples",
                    "Week 4: Run mock interviews and do a retrospective"
                  ]
                }
                """.formatted(weakness);
    }
}
```

These methods are wrapped by Spring AI as tools and exposed to the model.

```java
ChatResponse response = chatClient
        .prompt(prompt)
        .tools(interviewTools) // Provide multiple tools that are available for this request.
        .call()
        .chatResponse();
```

Whether a tool is actually called is decided by the model itself. In other words: you provide the `interviewTools` tool set, and the model decides whether to use it according to the user's question and the tool descriptions.

```plain text
Needs resume information -> call queryResumeInfo
Needs interview score -> call queryInterviewScore
Needs study suggestions -> may call generateStudyPlan
```

### Extension

```java
.toolNames("queryInterviewScore") // Only expose this tool name for the current request; the concrete tool is resolved dynamically by ToolCallbackResolver.
```

Pitfall:

> The model can only choose from the tools you explicitly expose to it. It cannot invoke every Bean in the Spring container out of thin air. That would be far too dangerous, because it would effectively expose your whole backend to the model.
