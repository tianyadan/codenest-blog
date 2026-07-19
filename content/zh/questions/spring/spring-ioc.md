---
title: Spring IoC 解决了什么问题？
description: 从依赖反转和控制反转角度说明 IoC 容器的价值。
tags: [Spring, IoC, 依赖注入]
difficulty: easy
source: 手工整理
---

## 核心价值

IoC 把对象创建与依赖装配交给容器，业务代码只声明需要什么，不负责怎么 new。

## 常见体现

- 构造器注入 / Setter 注入
- `@Autowired` / `@Resource` 装配
- Bean 生命周期由容器统一管理
