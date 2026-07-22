---
title: Microservices Learning Diary 7 - Gateway
summary: "This note introduces what a gateway does, compares Reactive and Server MVC gateway styles, and points to a YAML configuration example."
author: evan
category: diary
tags: [Diary, Learning, Gateway, Microservices]
createdAt: 2026-04-04 18:14:04
updatedAt: 2026-04-04 18:14:04
readingMinutes: 2
---
# Microservices Learning Diary 7 - Gateway

# What a Gateway Does

![截屏2026-04-04 16.58.09](https://codenest.oss-cn-qingdao.aliyuncs.com/images/2026/04/04/2dde0578-9a65-4a9c-9763-f9fc65e82e4f.png)

There are two gateway styles. **Reactive** is based on reactive programming and can handle high concurrency more easily, so it is the recommended option. **Server MVC** stays closer to the traditional Servlet model and feels a bit heavier.

![截屏2026-04-04 16.59.05](https://codenest.oss-cn-qingdao.aliyuncs.com/images/2026/04/04/5bc75409-ee3b-4229-827d-0faac58fba62.png)

Example gateway `yml` configuration:

![截屏2026-04-04 17.49.35](https://codenest.oss-cn-qingdao.aliyuncs.com/images/2026/04/04/92ebe7b6-aa2f-4302-a7e6-a84300e37319.png)
