---
title: API Design for Goal Delete WeCom Notifications
summary: Design a 1-minute debounce + delayed RocketMQ flow so deleteGoals / batch delete notify assignees and creators via WeCom text cards.
author: evan
category: work
tags: [API Design, RocketMQ, Redis, WeCom, Goals]
createdAt: 2026-07-22 09:00:00
updatedAt: 2026-07-23 09:23:00
readingMinutes: 6
---

# API Design for Goal Delete WeCom Notifications

When a goal/task is deleted, assignees and the creator usually need to know immediately. This note captures the notification design for `GoalsController.deleteGoals` / `deleteGoalsList`: without touching reminder jobs or writing `goal_notify_job`, we use a **1-minute debounce + delayed RocketMQ** pipeline to coalesce multiple deletes into one WeCom card push.

Module: `yudao-module-goals`.

## Goals and Boundaries

| Item | Contract |
|---|---|
| Trigger | Single delete `deleteGoals` and batch `deleteGoalsListByIds` share one pipeline |
| Delivery | 1-minute debounce → delayed RocketMQ → Consumer sends WeCom |
| Recipients | Per-goal **assignees ∪ creator**; operator also receives if in that set |
| Out of scope | No `goal_notify_job` writes; no 1-hour mute; no changes to existing reminder Jobs |
| Reuse | `GoalWeComNotifier`; MQ package layout mirrors calendar |

Principle: **the delete path only persists and enqueues**; sending is async. When the switch is off, deletes still succeed and no messages are published.

## Flow

```text
Snapshot before delete → delete goal / clear notify_job / clear assignees
  → afterCommit: append snapshot in Redis + gen++ + publish delay=1m MQ
  → more deletes within 1 minute: append again, gen++, publish another delayed message
    (stale messages are dropped when generation no longer matches)
  → Consumer: if gen matches, buf→inflight, aggregate by recipient, push via GoalWeComNotifier
```

A generation counter resolves races during a burst of deletes: each append bumps `gen`, so older delayed messages are discarded on arrival. Only the latest generation is consumed and sent.

## Redis Keys

| Key | Meaning | TTL |
|---|---|---|
| `goals:delete-notify:buf:{tenantId}:{operatorId}` | Snapshot JSON list for the current window | 10 minutes |
| `goals:delete-notify:gen:{tenantId}:{operatorId}` | Generation counter | 10 minutes |
| `goals:delete-notify:inflight:{tenantId}:{operatorId}:{gen}` | In-flight backup for MQ retries | 30 minutes |

Snapshot fields: `goalId`, `name`, `creatorId`, `assigneeIds`.

Windows are isolated by `tenantId + operatorId`, so one operator’s rapid deletes land in the same buffer and can be rendered as a single aggregated card.

## MQ Design (Aligned with Calendar)

- **Topic**: `goals-delete-notification`
- **Message**: `tenantId` + `operatorId` + `generation`
- **Publisher**: interface + `RocketMq*` / `Noop*`, toggled by `goals.notification.rocketmq.enabled`
- **Consumer**: `maxReconsumeTimes=5`; failures throw to trigger retry
- **Delay**: RocketMQ `delayLevel = 5` (~1 minute)

The payload stays intentionally small: task snapshots live in Redis; MQ only carries *who* and *which generation* is due, so retries can recover from `inflight`.

## Send Strategy

`GoalDeleteNotifyService` aggregates cards per recipient, then calls:

- `GoalWeComNotifier.buildCardDescription`
- `GoalWeComNotifier.sendTextCard`

Card title: **Task Deletion Reminder**. Multiple deleted goals for the same recipient are merged into one card to avoid notification spam.

## Implementation Touchpoints

| Component | Location |
|---|---|
| Debounce | `service/notify/GoalDeleteNotifyDebounceService` |
| Send | `service/notify/GoalDeleteNotifyService` |
| MQ | `mq/message` · `mq/producer` · `mq/consumer` |
| Hook-in | `GoalsServiceImpl#deleteGoals` / `deleteGoalsListByIds` |
| Switch | `goals.notification.rocketmq.enabled` |

Redis writes and MQ publish happen `afterCommit`, so a rolled-back delete never produces a notification.

## Acceptance Checklist

1. After a single delete, assignees and creator receive a WeCom text card in about 1 minute  
2. Multiple deletes within 1 minute → one push only; the card lists all items  
3. Batch delete behaves the same as single delete  
4. With `goals.notification.rocketmq.enabled=false`, delete still succeeds and nothing is published  
5. After delete, reminder nodes and assignee rows are cleaned up  

## Takeaway

This design decouples **delete** from **notify**: Redis owns window aggregation and generation control, RocketMQ owns delay and retry, and WeCom delivery reuses `GoalWeComNotifier`. Callers get one notification semantics for single and batch deletes; ops can mute notifications with a switch without hurting delete availability.
