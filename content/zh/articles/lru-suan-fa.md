---
title: LRU 算法
summary: LRU 又称 Least Recently Used 最近最少使用算法 ，是一种非常经典的缓存淘汰策略。核心思想基于局部性原理：如果一个数据最近被访问过，...
author: evan
category: diary
tags: [日记]
createdAt: 2026-04-07 08:46:20
updatedAt: 2026-04-07 08:46:20
readingMinutes: 1
---
# LRU 算法

## 记录

LRU 又称 Least Recently Used 最近最少使用算法 ，是一种非常经典的缓存淘汰策略。核心思想基于局部性原理：如果一个数据最近被访问过，那么它将来被访问的概率也更高。精髓就是"谁最近理我，我就把谁捧在手心；谁冷落我，我就把谁踢出去"。听起来像极了某些人的恋爱策略。
