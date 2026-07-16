# I18n Content Split Design

**Date:** 2026-07-16  
**Status:** Approved

## Goal

Support Chinese/English content switching with language-first directories, rewrite the SeaTunnel sync article to blog format, and add AI content-rules docs for future formatting.

## Decisions

| Topic | Choice |
|-------|--------|
| Directory layout | Language-first: `content/{zh\|en}/{articles,banks,questions}/` |
| Missing translation | Strict isolation — only show current language |
| Slug pairing | Same slug across languages |
| This batch English body | Migrate Chinese only; `en/` scaffold empty |
| URL prefix | Keep current routes (no `/zh` `/en` prefix) |

## Architecture

1. Content scanner walks `content/zh` and `content/en`, tags each item with `lang`.
2. Generated index/search corpus include `lang`.
3. App language toggle filters articles/questions/banks/search by `lang`.
4. Detail loaders resolve by `(slug, lang)`.

## Deliverables

- Migrate existing Markdown under `content/zh/`
- Rewrite `数据同步解决方案` → `content/zh/articles/seatunnel-data-sync.md` (frontmatter + sections, secrets redacted)
- `docs/ai-content-rules/RULES.zh.md` + `RULES.en.md`
- Scanner + UI filtering updates + tests
- Update `content/README.md`

## Out of scope

- English article translations
- Locale-prefixed URLs / SEO hreflang
