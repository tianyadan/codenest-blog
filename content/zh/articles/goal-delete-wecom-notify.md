---
title: 任务删除触发企微通知的接口设计
summary: 为 deleteGoals / 批量删除设计 1 分钟 debounce 聚合的企微文本卡片通知，覆盖 Redis 世代号、延迟 RocketMQ 与接收人聚合。
author: evan
category: work
tags: [接口设计, RocketMQ, Redis, 企微, 目标管理]
createdAt: 2026-07-22 09:00:00
updatedAt: 2026-07-23 09:23:00
readingMinutes: 6
---

# 任务删除触发企微通知的接口设计

删除任务时，负责人和发起人往往需要立刻知情。本文记录 `GoalsController.deleteGoals` / `deleteGoalsList` 的通知侧设计：在不改动催办 Job、不写入 `goal_notify_job` 的前提下，用 **1 分钟 debounce + 延迟 RocketMQ** 把多次删除聚合成一次企微卡片推送。

关联模块：`yudao-module-goals`。

## 目标与边界

| 项 | 约定 |
|---|---|
| 触发 | 单删 `deleteGoals`、批量 `deleteGoalsListByIds` 走同一套逻辑 |
| 通知方式 | 1 分钟 debounce 聚合 → 延迟 RocketMQ → Consumer 发企微 |
| 接收人 | 各任务 **负责人（分工）∪ 发起人（creator）**；操作人若在其中也收 |
| 不做 | 不写入 `goal_notify_job`；不做 1 小时静默；不改现有催办 Job |
| 复用 | `GoalWeComNotifier`；MQ 包结构对齐 calendar |

核心原则：**删除主链路只负责落库与投递**，通知发送异步完成；开关关闭时删除仍成功、不投递消息。

## 流程概览

```text
删前快照 → 删任务 / 清 notify_job / 清分工
  → afterCommit：Redis 追加快照 + gen++ + 投递 delay=1m 的 MQ
  → 1 分钟内再删：继续追加、gen++、再发延迟消息（旧消息到点因 gen 不匹配丢弃）
  → Consumer：gen 匹配则 buf→inflight，按接收人聚合，GoalWeComNotifier 推送
```

用世代号（`generation`）解决「窗口内连续删除」的竞态：每次追加都会 bump gen，旧延迟消息到达时若 gen 已变，直接丢弃，避免重复推送；最终只有最新世代的消息真正消费。

## Redis Key

| Key | 含义 | TTL |
|---|---|---|
| `goals:delete-notify:buf:{tenantId}:{operatorId}` | 本窗口快照 JSON 列表 | 10 分钟 |
| `goals:delete-notify:gen:{tenantId}:{operatorId}` | 世代号 | 10 分钟 |
| `goals:delete-notify:inflight:{tenantId}:{operatorId}:{gen}` | 消费中备份（供 MQ 重试） | 30 分钟 |

快照字段：`goalId`、`name`、`creatorId`、`assigneeIds`。

按 `tenantId + operatorId` 隔离窗口，同一操作人短时间内的多次删除会进入同一 buffer，便于聚合卡片文案。

## MQ 设计（对齐 calendar）

- **Topic**：`goals-delete-notification`
- **Message**：`tenantId` + `operatorId` + `generation`
- **Publisher**：接口 + `RocketMq*` / `Noop*`，由 `goals.notification.rocketmq.enabled` 切换
- **Consumer**：`maxReconsumeTimes=5`；失败抛异常触发重试
- **延迟**：RocketMQ `delayLevel = 5`（约 1 分钟）

消息体刻意保持轻量：真正的任务快照在 Redis buffer 里，MQ 只携带「谁、哪个世代该发了」，方便重试时从 `inflight` 恢复。

## 发送策略

`GoalDeleteNotifyService` 按接收人聚合卡片，再调用：

- `GoalWeComNotifier.buildCardDescription`
- `GoalWeComNotifier.sendTextCard`

卡片标题固定为：**任务删除提醒**。同一接收人若涉及多条被删任务，合并进一张卡片，避免刷屏。

## 实现落点

| 组件 | 路径 |
|---|---|
| Debounce | `service/notify/GoalDeleteNotifyDebounceService` |
| 发送 | `service/notify/GoalDeleteNotifyService` |
| MQ | `mq/message` · `mq/producer` · `mq/consumer` |
| 接入 | `GoalsServiceImpl#deleteGoals` / `deleteGoalsListByIds` |
| 开关 | `goals.notification.rocketmq.enabled` |

删除事务提交后再写 Redis / 投递 MQ（`afterCommit`），避免事务回滚后仍发出通知。

## 验收清单

1. 单删约 1 分钟后，负责人与发起人收到企微文本卡片  
2. 1 分钟内连续删除多个任务 → 只推一次，卡片含多条  
3. 批量删除与单删行为一致  
4. `goals.notification.rocketmq.enabled=false` 时删除仍成功、不投递  
5. 删除后催办节点与分工数据已清理  

## 小结

这套设计把「删任务」与「发通知」解耦：Redis 承担窗口聚合与世代控制，RocketMQ 承担延迟与重试，企微推送复用现有 `GoalWeComNotifier`。对调用方而言，单删和批量删是同一套通知语义；对运维而言，一个开关即可静默通知而不影响删除可用性。
