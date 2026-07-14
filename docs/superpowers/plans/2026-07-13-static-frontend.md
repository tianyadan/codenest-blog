# Static Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a static, componentized technical blog and question-bank frontend with Chinese routes, dark/light themes, Chinese/English UI, global search, and article table of contents.

**Architecture:** Use Vite + React + TypeScript as a static SPA. Keep content in local typed data for the first version, isolate reusable logic in `src/lib`, and keep pages thin by composing reusable components.

**Tech Stack:** React 18, TypeScript, Vite, React Router, Vitest, React Testing Library, local CSS tokens.

## Global Constraints

- No backend, no database connection, no SQL migration script in this phase.
- Chinese route paths must be supported.
- Components must be reusable and split by responsibility.
- Key logic must include concise Chinese comments explaining why it exists.
- UI must be simple, responsive, and support light/dark themes.
- UI text must support Chinese and English switching.
- Global search and article/question table of contents are required.

---

### Task 1: Project Foundation

**Files:**
- Create: `package.json`
- Create: `index.html`
- Create: `vite.config.ts`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `src/test/setup.ts`

**Interfaces:**
- Produces: Vite app shell and Vitest environment.

- [x] Create project configuration and test environment.

### Task 2: Core Domain Logic

**Files:**
- Create: `src/types/content.ts`
- Create: `src/data/content.ts`
- Create: `src/lib/routes.ts`
- Create: `src/lib/i18n.ts`
- Create: `src/lib/theme.ts`
- Create: `src/lib/search.ts`
- Create: `src/lib/toc.ts`
- Create: `src/lib/*.test.ts`

**Interfaces:**
- Produces: reusable content models, localized labels, route constants, search index, TOC extraction.

- [x] Write failing tests for reusable logic.
- [x] Implement minimal reusable logic.
- [x] Run tests and verify pass.

### Task 3: App Shell and Pages

**Files:**
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/layouts/AppLayout.tsx`
- Create: `src/pages/HomePage.tsx`
- Create: `src/pages/ArticleListPage.tsx`
- Create: `src/pages/ArticleDetailPage.tsx`
- Create: `src/pages/QuestionListPage.tsx`
- Create: `src/pages/QuestionDetailPage.tsx`
- Create: `src/pages/SearchPage.tsx`
- Create: `src/pages/NotFoundPage.tsx`

**Interfaces:**
- Consumes: route constants, i18n labels, theme storage, content data, search service, TOC service.
- Produces: complete routable static frontend.

- [x] Build page composition using reusable components.
- [x] Add Chinese routes and redirect-friendly route constants.

### Task 4: Reusable Components and Styling

**Files:**
- Create: `src/components/*.tsx`
- Create: `src/styles/global.css`

**Interfaces:**
- Produces: reusable cards, search box, theme switcher, language switcher, markdown renderer, TOC.

- [x] Implement accessible reusable components.
- [x] Add light/dark CSS tokens and responsive layout.

### Task 5: Verification

**Files:**
- Modify as needed based on failures.

**Interfaces:**
- Produces: verified frontend build.

- [x] Run test suite.
- [x] Run production build.
