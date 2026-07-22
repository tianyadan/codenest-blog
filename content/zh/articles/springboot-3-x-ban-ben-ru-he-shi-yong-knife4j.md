---
title: SpringBoot 3.x 版本如何使用 Knife4j ？
summary: 由于 SpringBoot 3.x 版本做了不小改动 ，如果继续沿用 SpringBoot 2.x 版本就会导致出下以下异常。 意思是： 代码调用了 Co...
author: evan
category: work
tags: [工作总结, Spring]
createdAt: 2025-10-14 20:17:56
updatedAt: 2025-10-14 20:17:56
readingMinutes: 3
---
# SpringBoot 3.x 版本如何使用 Knife4j ？

由于 SpringBoot 3.x 版本做了不小改动 ，如果继续沿用 SpringBoot 2.x 版本就会导致出下以下异常。

```Java
java.lang.NoSuchMethodError: 'void org.springframework.web.method.ControllerAdviceBean.<init>(java.lang.Object)'
```

意思是：

- 代码调用了 ControllerAdviceBean 的一个构造方法，但在运行时找不到这个方法。

**正确方法：（适用于 SpringBoot 3.x 之后版本）**

 1. 在 Pom.xml 文件中添加以下依赖

``` xml
          <!-- knife4j -->
        <dependency>
            <groupId>com.github.xiaoymin</groupId>
            <artifactId>knife4j-openapi3-jakarta-spring-boot-starter</artifactId>
            <version>4.4.0</version>
        </dependency>

        <!--    修复 knife4j bug 异常    -->
        <dependency>
            <groupId>org.springdoc</groupId>
            <artifactId>springdoc-openapi-starter-webmvc-ui</artifactId>
            <version>2.7.0</version>
        </dependency>
```

2.  在application.yaml 文件中添加

```yaml
# springdoc-openapi
springdoc:
  group-configs:
    - group: 'default'
      packages-to-scan: com.ithw.mylove.controller #替换包扫描路径
# knife4j
knife4j:
  enable: true
  setting:
    language: zh_cn
```

 3. 在 http://localhost:8080/doc.html 中访问即可
