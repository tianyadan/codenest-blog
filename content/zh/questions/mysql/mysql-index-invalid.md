---
title: MySQL 索引为什么会失效？
description: 解释函数计算、隐式转换、最左前缀和范围查询对索引命中的影响。
tags: [MySQL, 索引, SQL 优化]
difficulty: medium
source: 手工整理
---

## 常见原因

- 对索引列使用函数
- 字符串字段发生隐式类型转换
- 不满足联合索引最左前缀
- 范围查询后面的列无法继续充分利用索引

## 排查方式

使用 EXPLAIN 查看 type、key、rows 和 Extra，重点关注是否出现全表扫描。
