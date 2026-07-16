---
title: 把动态博客改造成静态知识库
summary: 拆掉不必要的后端，把文章和八股文沉淀成可构建、可搜索、可部署的静态资产。
author: CodeNest
category: work
tags: [静态站点, 架构, Markdown]
createdAt: 2026-07-12
updatedAt: 2026-07-13
readingMinutes: 5
---

# 把动态博客改造成静态知识库

## 核心取舍

静态化适合长期沉淀内容，不适合继续承载评论、点赞、登录和学习进度。

## 内容组织

文章放在 articles，题目放在 questions，构建期生成搜索索引。

## 部署方式

最终产物只有 dist 目录，可以直接交给 Nginx 或 CDN 托管。
