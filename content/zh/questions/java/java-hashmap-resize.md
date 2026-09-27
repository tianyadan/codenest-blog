---
title: HashMap 为什么线程不安全？
description: 从扩容、链表/红黑树、并发写入角度解释 HashMap 的风险。
tags: [Java, 集合, 并发]
difficulty: medium
source: 手工整理
---

## 核心原因
HashMap 底层是数组 + 链表/红黑树。执行 put(k, v) 不是单独的赋值，而是可能触发一系列操作，例如：

- 计算 hash
- 计算数组下标
- 判断桶内是否有元素
- 判断 key 是否已经存在
- 插入节点
- size++
- 必要时 resize 扩容

最关键的是，这些操作都不是原子的。

例如线程 A 读取到 `table[5] = null`，线程 B 也读取到 `table[5] = null`，之后线程 A 写入 `table[5] = node(A)`，线程 B 再写入 `table[5] = node(B)`，结果可能变成 node(A) 被 node(B) 覆盖，这是典型的丢失更新。此外，扩容时容易形成链表环（JDK8 之后已修复），并发状态下也可能丢失节点，因此并发场景一般使用 ConcurrentHashMap。

## 生产建议

并发场景使用 ConcurrentHashMap。不要通过给 HashMap 外面随手加锁来替代并发容器，除非锁粒度和生命周期非常明确。
