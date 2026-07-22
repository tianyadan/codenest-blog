---
title: Microservices Learning Diary 2
summary: "Spring Boot, Spring Cloud, and Spring Cloud Alibaba versions must be matched correctly. This note lists compatibility ranges and a practical starter version set."
author: evan
category: diary
tags: [Diary, Learning, Microservices]
createdAt: 2026-04-03 20:54:56
updatedAt: 2026-04-03 20:54:56
readingMinutes: 2
---
# Microservices Learning Diary 2

# Microservice Version Compatibility

| Spring Boot Version | Spring Cloud Version | Spring Cloud Alibaba |
| --- | --- | --- |
| 3.4.x+ | 2024.0.x | Not yet supported |
| 3.2.x - 3.3.x | 2023.0.x | 2023.0.* |
| 3.0.2 - 3.2.x | 2022.0.x | 2022.0.* |
| 2.6.x - 2.7.x | 2021.0.x | 2021.0.* |
| 2.4.x - 2.5.x | 2020.0.x | 2020.0.* |
| 2.3.x - | Hoxton/Greenwich | 2.2.* - |

Detailed version notes: [Click here](https://github.com/alibaba/spring-cloud-alibaba/wiki/版本说明)

# A Recommended Starter Version Set

**Usable framework versions**:

- Spring Boot 3.3.4
- Spring Cloud 2023.0.3
- Spring Cloud Alibaba 2023.0.3.2

**Component versions**

- Nacos: 2.4.3
- Sentinel: 1.8.8
- Seata: 2.2.0
