---
title: Schedule Drawer Busy Timeline
summary: Build a draggable busy timeline in a schedule create/edit drawer with two-way sync to start/end fields.
author: evan
category: frontend
tags: [Vue3, Timeline, Drag, Schedule]
createdAt: 2026-07-20
updatedAt: 2026-07-20
---

# Schedule Drawer Busy Timeline

## Copy-ready prompt

```text
You are a frontend engineer experienced with Vue 3 + TypeScript. Implement a PC “Busy Timeline” inside a schedule create/edit drawer, with two-way sync to the left-hand form.

# Goal
Besides DatePickers, users can drag the top/bottom edges of a blue selection block to adjust the range, while seeing attendee busy blocks to avoid conflicts.

# Layout
- Desktop: two columns — form left, timeline right.
- Mobile: no timeline; edit time only via DatePickers.

# Timeline interactions
1. Vertical hour axis for the anchored day; fixed px per hour (default 48).
2. Blue selection covers startTime ~ endTime; top edits start, bottom edits end.
3. Convert pointer Y to time; snap to 15 minutes; start < end with at least one step.
4. End may drag past day bottom (cross-day allowed).
5. Prev / Today / Next day controls; scroll selection into view when it changes.

# Data binding
- Two-way bind startTime / endTime; keep anchorDate.
- Normalize as `YYYY-MM-DD HH:mm:ss` in UI; convert to millis before submit.

# Busy overlay
- Debounce busy API when attendees or visible range change.
- Translucent per-person blocks: name + range + title; show “Busy” if unauthorized.
- Legend focus / busy-only filter; blocks are read-only.
- Pass excludeEventId when editing to avoid self-conflict.

# Acceptance
Blue block ↔ DatePickers stay in sync; snapping works; cross-day works; mobile hides timeline.
```

## Tips

Share stack + drawer paths first, then this prompt, then the busy API contract and design refs.
