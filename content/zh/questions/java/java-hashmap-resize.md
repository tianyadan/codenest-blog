---
title: HashMap 为什么线程不安全？
description: 从扩容、链表/红黑树、并发写入角度解释 HashMap 的风险。
tags: [Java, 集合, 并发]
difficulty: medium
source: 手工整理
---

## 核心原因
HashMap 底层是数组+链表/红黑树 。 执行 put (k,v) 不是单独赋值，而是可能触发一些列操作。
例如：
计算 Hash 
- 计算数组下标
- 判断同内是否有元素
- 判断 key是否已经存在
- 插入节点
- size++
- 必要时resize 扩容 最关键的是这些操作都不是原子的

可能线程 A  读取 table[5]=null , 线程 B 读取 table[5]=null , 线程 A table[5]=node(A) ,之后 线程 B table[5]=node(b) 
结果可能变成 Node(A) 被Node(B) 覆盖 。典型的丢失更新。还有扩容时容易形成链表环(JDK8 之后就修复了） ，扩容导致的并发状态下节点数值丢失，因此并发状态下一般使用 ConcurrentHashMap 。

## 生产建议


并发场景使用 ConcurrentHashMap。不要通过给 HashMap 外面随手加锁来替代并发容器，除非锁粒度和生命周期非常明确。
