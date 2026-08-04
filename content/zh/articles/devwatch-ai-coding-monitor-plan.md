---
title: DevWatch：打造 AI 编程助手进度监控手表
summary: 记录使用 Apple Watch、Python Agent 与 SpringBoot 打造 AI 编程助手状态监控系统的一周开发计划。
category: 学习
tags:
  - AI
  - Apple Watch
  - Swift
  - Python
  - Agent
date: 2026-08-04
updated: 2026-08-04 11:53
---

# DevWatch：打造 AI 编程助手进度监控手表

## 项目背景

随着 Claude Code、Codex、Cursor 等 AI 编程工具逐渐成为开发流程的一部分，开发者越来越依赖 AI Agent 完成代码分析、重构、测试等工作。

但是这些工具主要运行在电脑端，当离开电脑后，开发者无法快速了解 AI Agent 当前是否正在执行任务、执行到了哪个阶段。

因此，我计划开发一个属于程序员自己的 Apple Watch 工具：

**DevWatch —— 将 AI 编程助手的工作状态同步到手腕。**

## 项目目标

整体架构：

```text
Claude Code / Codex / Cursor
            |
            |
        Mac Agent
            |
            |
       SpringBoot API
            |
            |
       Apple Watch
```

Apple Watch 最终展示：

- AI Agent 当前状态
- 当前执行任务
- 代码修改进度
- Git 提交情况
- 服务器运行状态

示例：

```text
🤖 Claude Code

Task:
Refactor GoalNotifyPushJob

Progress:
███████░░ 70%

Status:
Running
```

# 一周开发计划

## Day 1：设计整体架构

目标：明确三个核心模块。

- Mac Agent：负责采集 AI 工具运行状态
- SpringBoot Backend：负责数据存储和接口提供
- Apple Watch：负责状态展示

## Day 2：开发 Mac Agent

目标：让 Mac 自动收集 AI 工作状态。

技术：

- Python
- 文件监听
- Shell 调用
- HTTP 请求

统一输出状态数据。

## Day 3：开发 SpringBoot 服务

目标：完成状态同步接口。

实现：

- 接收 Agent 状态
- 保存最新状态
- 提供查询接口

接口：

```text
POST /api/watch/status
GET  /api/watch/latest
```

## Day 4：开发 Apple Watch App

目标：完成第一个 Watch 展示页面。

技术：

- Swift
- SwiftUI
- WatchKit

展示 AI Agent 当前状态。

## Day 5：优化展示效果

增加：

- 动态进度展示
- Agent 状态图标
- 深色主题
- 动画效果

让应用更接近程序员专属仪表盘。

## Day 6：扩展开发者数据

增加：

- Git 提交记录
- Docker 服务状态
- AI Token 使用量
- 服务器资源状态

## Day 7：整理项目文档

完成：

- README
- 架构说明
- 使用文档
- 开源准备

# 后续规划

未来扩展：

- iPhone Widget
- Mac 菜单栏应用
- 企业微信通知
- AI 工作总结
- 多 Agent 管理

DevWatch 不只是一个 Apple Watch 应用，而是探索 AI 时代开发者工作方式的一次实践。
