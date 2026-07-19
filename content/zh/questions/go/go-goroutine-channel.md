---
title: Goroutine 与 Channel 如何协作？
description: 用并发模型说明 goroutine 通信与同步的基本思路。
tags: [Go, Goroutine, Channel]
difficulty: medium
source: 手工整理
---

## 核心思想

Go 提倡「通过通信共享内存」，用 channel 在 goroutine 之间传递数据与信号。

## 常见模式

- 生产者 / 消费者
- fan-in / fan-out
- 用 `select` 处理超时与多路复用
