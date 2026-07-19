---
title: React Hooks 为什么不能写在条件语句里？
description: 从 Hooks 调用顺序与状态对应关系解释规则背后的原因。
tags: [React, Hooks, 前端]
difficulty: medium
source: 手工整理
---

## 原因

React 依赖 Hooks 的调用顺序来匹配 state / effect。条件分支会打乱顺序，导致状态错位。

## 正确做法

始终在组件顶层调用 Hooks；条件逻辑放到 Hook 内部，或拆成更小的组件。
