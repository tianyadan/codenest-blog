# Content 写作指南

把 Markdown 丢进对应语言目录即可，开发服务器 / 构建会自动扫描。

## 目录约定

| 类型 | 路径 | 说明 |
|------|------|------|
| 中文文章 | `content/zh/articles/*.md` | 文件名默认作为 `slug` |
| 英文文章 | `content/en/articles/*.md` | 与中文共用同一 `slug` 配对 |
| 中文题库 | `content/zh/banks/*.md` | 文件名默认作为题库 `slug` |
| 英文题库 | `content/en/banks/*.md` | 同上 |
| 中文题目 | `content/zh/questions/<bankSlug>/*.md` | 子目录名即所属题库 |
| 英文题目 | `content/en/questions/<bankSlug>/*.md` | 同上 |

以 `_` 开头的文件名会被忽略（可用于草稿说明）。

切换站点语言后，**只展示当前语言内容**；缺译不会回退到另一语言。

题库页面层级：

1. `/题库` — 只展示分类与题目数量
2. `/题库/:bankSlug` — 该分类下的题目列表
3. `/题库/:bankSlug/:slug` — 题目详情

AI 整理文档时请阅读：`docs/ai-content-rules/RULES.zh.md`（中文）或 `RULES.en.md`（英文）。

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
name: Java
description: 覆盖集合、并发、JVM 等高频面试题。
tags: [Java, JVM, 并发]
order: 3          # 可选，分类页排序，越小越靠前
---
```

## 工作流

1. 在 `content/zh/` 或 `content/en/` 下新建或编辑 `.md`
2. 本地 `npm run dev` 可热更新
3. `git push` 到主分支后由 CI/部署重新构建即可上线
