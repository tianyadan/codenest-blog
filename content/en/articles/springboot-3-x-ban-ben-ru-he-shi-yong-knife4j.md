---
title: How to Use Knife4j with Spring Boot 3.x
summary: "Spring Boot 3.x changed enough internals that using the old Spring Boot 2.x Knife4j setup can trigger a NoSuchMethodError. This note records the dependencies and configuration that work with Spring Boot 3.x."
author: evan
category: work
tags: [Work Notes, Spring]
createdAt: 2025-10-14 20:17:56
updatedAt: 2025-10-14 20:17:56
readingMinutes: 3
---
# How to Use Knife4j with Spring Boot 3.x

Because Spring Boot 3.x introduced significant changes, continuing to use the old Spring Boot 2.x setup can lead to the following exception:

```java
java.lang.NoSuchMethodError: 'void org.springframework.web.method.ControllerAdviceBean.<init>(java.lang.Object)'
```

This means:

- The code tried to call a constructor of `ControllerAdviceBean`, but that constructor could not be found at runtime.

**Correct approach (for Spring Boot 3.x and later):**

1. Add the following dependencies to `pom.xml`

```xml
<!-- knife4j -->
<dependency>
    <groupId>com.github.xiaoymin</groupId>
    <artifactId>knife4j-openapi3-jakarta-spring-boot-starter</artifactId>
    <version>4.4.0</version>
</dependency>

<!-- Fix a Knife4j compatibility issue -->
<dependency>
    <groupId>org.springdoc</groupId>
    <artifactId>springdoc-openapi-starter-webmvc-ui</artifactId>
    <version>2.7.0</version>
</dependency>
```

2. Add the following to `application.yaml`

```yaml
# springdoc-openapi
springdoc:
  group-configs:
    - group: 'default'
      packages-to-scan: com.ithw.mylove.controller # Replace with your controller package path
# knife4j
knife4j:
  enable: true
  setting:
    language: zh_cn
```

3. Open `http://localhost:8080/doc.html`
