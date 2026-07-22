---
title: Fixing JavaScript Data Precision Issues
summary: Convert backend Long values to strings in a global Spring MVC JSON configuration to avoid precision loss on the JavaScript side.
author: evan
category: work
tags: [Work Notes]
createdAt: 2026-03-01 17:57:45
updatedAt: 2026-03-01 17:57:45
readingMinutes: 2
---
# Fixing JavaScript Data Precision Issues

## Main Text

Because the precision range of frontend JavaScript is limited, if the backend returns IDs that are too large, the frontend can lose precision, which affects the data displayed on the page.

To solve this problem, you can create a global JSON configuration under the backend `config` package and convert all long integer values returned by Spring MVC APIs into strings. This solves the problem in one place.

```java
/**
 * Spring MVC JSON configuration
 */
@JsonComponent
public class JsonConfig {

    /**
     * Add configuration to prevent precision loss when serializing Long to JSON
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
