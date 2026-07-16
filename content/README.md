# Content 写作指南

把 Markdown 丢进对应目录即可，开发服务器 / 构建会自动扫描。

## 目录约定

| 类型 | 路径 | 说明 |
|------|------|------|
| 文章 | `content/articles/*.md` | 文件名默认作为 `slug` |
| 题库 | `content/banks/*.md` | 文件名默认作为题库 `slug` |
| 题目 | `content/questions/<bankSlug>/*.md` | 子目录名即所属题库 |

以 `_` 开头的文件名会被忽略（可用于草稿说明）。

## 文章 frontmatter

```md
---
title: 标题
summary: 摘要
author: CodeNest
category: learning   # learning | work | diary
tags: [Spring, Redis]
createdAt: 2026-07-16
updatedAt: 2026-07-16
readingMinutes: 5
topOrder: 1          # 可选，首页置顶排序，越小越靠前
slug: custom-slug    # 可选，默认用文件名
---

# 正文标题

正文……
```

## 题目 frontmatter

```md
---
title: 题目标题
description: 题目简述
tags: [Java, 并发]
difficulty: medium   # easy | medium | hard
source: 手工整理     # 可选
---

## 答案

……
```

`bankSlug` 默认取父目录名；也可在 frontmatter 里写 `bank: java` 覆盖。

## 题库 frontmatter

```md
---
name: Java 基础
description: 覆盖集合、并发、JVM 等高频面试题。
tags: [Java, JVM, 并发]
---
```

## 工作流

1. 新建或编辑上述目录中的 `.md`
2. 本地 `npm run dev` 可热更新
3. `git push` 到主分支后由 CI/部署重新构建即可上线
