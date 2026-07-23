---
title: "什么是 html 语义化？"
description: "HTML知识库 · 原站真题整理"
tags: ["HTML"]
difficulty: medium
---

## 答案

# 📖 HTML 语义化

## 1️⃣ 定义
**HTML 语义化（HTML Semantics）**  
> 用合适的 HTML 标签表达对应内容的含义，让页面结构不仅浏览器能理解，人和搜索引擎也能读懂。

---

## 2️⃣ 优势
- **可读性高**：打开代码就能理解结构。
- **SEO 友好**：搜索引擎更易识别页面内容。
- **可访问性好**：对屏幕阅读器、辅助设备更友好。
- **易维护**：结构清晰，后期修改方便。

---

## 3️⃣ 常用语义化标签

| 标签 | 含义 |
|------|------|
| `<header>` | 页头 |
| `<nav>` | 导航栏 |
| `<main>` | 主内容区域 |
| `<section>` | 内容分区 |
| `<article>` | 独立文章或内容块 |
| `<aside>` | 侧栏或补充内容 |
| `<footer>` | 页脚 |
| `<h1>` ~ `<h6>` | 标题层级 |
| `<p>` | 段落 |
| `<strong>` | 强调重要内容 |
| `<em>` | 语气强调 |

---

## 4️⃣ 对比示例

❌ **非语义化**
```html
<div id="header"></div>
<div class="nav"></div>
<div class="content"></div>
<div class="footer"></div>