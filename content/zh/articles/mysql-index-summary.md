---
title: MySQL 索引优化总结
summary: 聚簇索引、回表、覆盖索引、最左前缀匹配等核心知识梳理。
author: CodeNest
category: learning
tags: [MySQL, 索引, 优化, SQL]
createdAt: 2026-07-08
updatedAt: 2026-07-08
readingMinutes: 7
---

# MySQL 索引优化总结

## 索引设计原则

索引不是越多越好，核心是围绕查询条件、排序字段和返回字段建立组合索引。

## 常见风险

- 低区分度字段单独建索引收益有限
- 函数计算会破坏索引使用
- 过多索引会拖慢写入
