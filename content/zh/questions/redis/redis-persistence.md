---
title: Redis 有哪些持久化方式？
description: 对比 RDB 与 AOF 的原理、优缺点与典型选型场景。
tags: [Redis, 持久化, 缓存]
difficulty: medium
source: 手工整理
---

## 两种方式

- **RDB**：按周期生成内存快照，恢复快，但可能丢失最近一次快照后的数据。
- **AOF**：记录写命令，数据更完整，文件通常更大，可配置 `everysec` 等刷盘策略。

## 选型建议

对丢失容忍更高、追求恢复速度时偏 RDB；对数据完整性要求更高时启用 AOF，或两者组合使用。
