---
title: JS数据精度修复
summary: 由于前端 JS 的精度范围有限，后端返回的 id 范围过大，导致前端精度丢失，会影响前端页面获取的数据结果。 为了解决这问题，可以在后端 config 包...
author: evan
category: work
tags: [工作总结]
createdAt: 2026-03-01 17:57:45
updatedAt: 2026-03-01 17:57:45
readingMinutes: 2
---
# JS数据精度修复

## 正文

由于前端 JS 的精度范围有限，后端返回的 id 范围过大，导致前端精度丢失，会影响前端页面获取的数据结果。

为了解决这问题，可以在后端 **config**  包下新建一个全局 JSON 配置，将整个后端 Spring MVC 接口返回值的长整形数字转为字符串进行返回，从而集中解决问题。

```java
/**
 * Spring MVC Json 配置
 */
@JsonComponent
public class JsonConfig {

    /**
     * 添加 Long 转 json 精度丢失的配置
     */
    @Bean
    public ObjectMapper jacksonObjectMapper(Jackson2ObjectMapperBuilder builder) {
        ObjectMapper objectMapper = builder.createXmlMapper(false).build();
        SimpleModule module = new SimpleModule();
        module.addSerializer(Long.class, ToStringSerializer.instance);
        module.addSerializer(Long.TYPE, ToStringSerializer.instance);
        objectMapper.registerModule(module);
        return objectMapper;
    }
}

```
