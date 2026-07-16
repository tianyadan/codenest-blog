# AI 内容整理规则（CodeNest Blog）

> 以后让 AI 整理 / 改写博客 Markdown 时，请先阅读本文件并严格遵守。

## 1. 目录与语言

```
content/
  zh/
    articles/          # 中文文章
    banks/             # 中文题库
    questions/<bank>/  # 中文题目
  en/
    articles/          # 英文文章
    banks/
    questions/<bank>/
```

- **语言优先**：中英文分目录，不要混放在同一文件夹。
- **严格隔离**：缺译不回退；只维护当前语言文件即可。
- **同 slug 配对**：同一篇文章的中英文文件名（或 frontmatter `slug`）保持一致，例如：
  - `content/zh/articles/seatunnel-data-sync.md`
  - `content/en/articles/seatunnel-data-sync.md`

以 `_` 开头的文件名会被扫描忽略，可用于草稿。

## 2. 文章 Frontmatter（必填）

参考 `content/zh/articles/spring-cache-consistency.md`：

```md
---
title: 标题
summary: 一句话摘要
author: CodeNest
category: learning   # learning | work | diary
tags: [标签1, 标签2]
createdAt: YYYY-MM-DD
updatedAt: YYYY-MM-DD
readingMinutes: 5
topOrder: 1          # 可选，首页置顶，越小越靠前
slug: custom-slug    # 可选，默认用文件名
---

# 正文标题

## 小节标题

正文……
```

## 3. 正文改写风格

把随手笔记整理成博客时：

1. 补全 YAML frontmatter（不要只写裸 Markdown）。
2. 用清晰的二级标题组织（问题 / 方案 / 步骤 / 建议）。
3. 删除口语化序号堆砌，改成可阅读的段落 + 代码块。
4. 代码块标注语言（`bash` / `sql` / `hocon` / `ts` 等）。
5. **脱敏**：主机、端口、账号、密码、内网 IP 一律改为占位符，例如 `<SOURCE_HOST>`、`<PASSWORD>`。
6. 文件名使用英文 kebab-case（如 `seatunnel-data-sync.md`），不要用中文文件名。

## 4. 题目 / 题库

题库 `content/{lang}/banks/<slug>.md`：

```md
---
name: Java 基础
description: 简述
tags: [Java]
---
```

题目 `content/{lang}/questions/<bankSlug>/<slug>.md`：

```md
---
title: 题目标题
description: 题目简述
tags: [Java]
difficulty: medium   # easy | medium | hard
source: 可选来源
---

## 答案

……
```

## 5. 双语维护

- 先写一种语言，另一种语言目录可暂时为空。
- 补译时复制结构，翻译 title/summary/正文，**保持同一 slug**。
- UI 文案在 `src/lib/i18n.ts`，与 Markdown 内容无关。

## 6. 完成后检查清单

- [ ] 文件位于正确的 `zh/` 或 `en/` 目录
- [ ] frontmatter 字段完整、日期合法
- [ ] slug 为英文 kebab-case
- [ ] 无真实密码 / 内网地址
- [ ] 本地 `npm run dev` 能看到文章
