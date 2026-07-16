# AI Content Formatting Rules (CodeNest Blog)

> When asking an AI to organize or rewrite blog Markdown, read this file first and follow it strictly.

## 1. Directories & Languages

```
content/
  zh/
    articles/          # Chinese articles
    banks/             # Chinese question banks
    questions/<bank>/  # Chinese questions
  en/
    articles/          # English articles
    banks/
    questions/<bank>/
```

- **Language-first**: Keep Chinese and English in separate trees. Never mix them in one folder.
- **Strict isolation**: No fallback across languages. Missing translations simply do not appear.
- **Shared slug**: Paired translations must use the same filename / `slug`, e.g.:
  - `content/zh/articles/seatunnel-data-sync.md`
  - `content/en/articles/seatunnel-data-sync.md`

Filenames starting with `_` are ignored by the scanner (useful for drafts).

## 2. Article Frontmatter (required)

Follow `content/zh/articles/spring-cache-consistency.md`:

```md
---
title: Title
summary: One-line summary
author: CodeNest
category: learning   # learning | work | diary
tags: [Tag1, Tag2]
createdAt: YYYY-MM-DD
updatedAt: YYYY-MM-DD
readingMinutes: 5
topOrder: 1          # optional homepage pin, smaller = higher
slug: custom-slug    # optional; defaults to filename
---

# Body Title

## Section

Body…
```

## 3. Rewrite Style

When turning rough notes into a blog post:

1. Always add complete YAML frontmatter (never bare Markdown only).
2. Organize with clear H2 sections (context / approach / steps / tips).
3. Replace numbered dump lists with readable prose plus code blocks.
4. Fence code with a language tag (`bash` / `sql` / `hocon` / `ts`, etc.).
5. **Redact secrets**: replace hosts, ports, users, passwords, and private IPs with placeholders such as `<SOURCE_HOST>` or `<PASSWORD>`.
6. Use English kebab-case filenames (e.g. `seatunnel-data-sync.md`), not non-ASCII names.

## 4. Questions / Banks

Bank file `content/{lang}/banks/<slug>.md`:

```md
---
name: Java Basics
description: Short description
tags: [Java]
---
```

Question file `content/{lang}/questions/<bankSlug>/<slug>.md`:

```md
---
title: Question title
description: Short prompt
tags: [Java]
difficulty: medium   # easy | medium | hard
source: optional
---

## Answer

…
```

## 5. Bilingual Workflow

- Write one language first; the other tree may stay empty.
- When translating, keep structure and the **same slug**; translate title/summary/body only.
- UI copy lives in `src/lib/i18n.ts` and is separate from Markdown content.

## 6. Checklist Before Done

- [ ] File is under the correct `zh/` or `en/` tree
- [ ] Frontmatter is complete with valid dates
- [ ] Slug is English kebab-case
- [ ] No real passwords or private network addresses
- [ ] Visible via local `npm run dev`
