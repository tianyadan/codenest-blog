---
title: Vue 响应式原理是什么？
description: 说明依赖收集与派发更新如何驱动视图刷新。
tags: [Vue, 响应式, 前端]
difficulty: medium
source: 手工整理
---

## 基本流程

1. 访问响应式数据时收集依赖（effect / watcher）
2. 修改数据时触发依赖重新执行
3. 组件渲染函数作为副作用被调度更新

## Vue 3 要点

Vue 3 使用 Proxy 代理对象读写，对新增属性与数组变更支持更自然，配合 `ref` / `reactive` 使用。
