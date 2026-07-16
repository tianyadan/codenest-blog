---
title: HashMap 为什么线程不安全？
description: 从扩容、链表/红黑树、并发写入角度解释 HashMap 的风险。
tags: [Java, 集合, 并发]
difficulty: medium
source: 手工整理
---

## 核心原因

HashMap 没有同步控制，多线程同时 put 时可能覆盖数据，也可能在扩容迁移时产生结构异常。

## 生产建议

并发场景使用 ConcurrentHashMap。不要通过给 HashMap 外面随手加锁来替代并发容器，除非锁粒度和生命周期非常明确。
