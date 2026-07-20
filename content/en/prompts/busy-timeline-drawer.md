---
title: Schedule Drawer Busy Timeline — Reusable Prompt
summary: A reusable AI prompt for building a PC busy timeline in a schedule create/edit drawer, with drag-to-resize selection, two-way form sync, and attendee busy blocks.
author: evan
category: frontend
tags: [Vue3, Schedule, Timeline, Interaction]
createdAt: 2026-07-20
updatedAt: 2026-07-20
---

# Schedule Drawer Busy Timeline — Reusable Prompt

When creating or editing a schedule, users fine-tune time with DatePickers on the left and visually drag a selected range on a busy timeline on the right, while seeing attendees’ existing events. Below is a cleaned-up, reusable prompt you can paste into an AI coding assistant.

## How to use

1. First share your stack (e.g. Vue 3 + TS + Ant Design Vue + drawer file paths).
2. Paste the full “Reusable prompt”.
3. Append real API contracts, field names, and repo conventions.

## Reusable prompt (copy-ready)

```text
You are a frontend engineer experienced with Vue 3 + TypeScript. Implement a PC “Busy Timeline” inside a schedule create/edit drawer, with two-way sync to the left-hand form.

# Goal
Besides DatePickers for precise start/end input, users can drag the top/bottom edges of a blue selection block on the right timeline to adjust the range, while seeing attendee busy blocks to avoid conflicts.

# Layout & platform differences
- Desktop: two-column drawer. Left = form (title, owner, start/end DatePickers, attendees, room, etc.). Right = timeline.
- Mobile: do not show the timeline; time is edited only via DatePickers. Optional: tap a busy avatar to open a slot popup.

# Timeline interactions (core)
1. Vertical axis = hours of the anchored day; fixed pixel height per hour (default 48px, configurable).
2. A blue “current selection” rectangle covers startTime ~ endTime.
3. Drag handles on top and bottom:
   - Drag top → change startTime
   - Drag bottom → change endTime
4. Convert pointer Y relative to the track into time; snap to 15-minute steps (step configurable).
5. Constraints: start < end, and the gap must be at least one snap step.
6. End time may be dragged past the bottom of the day (cross-day allowed).
7. Header controls: previous day / today / next day to change anchorDate; when the selection changes, scroll it into view when possible.
8. Hint copy: “Drag the blue block edges to adjust start/end; click a legend item to focus one person’s busy slots.”

# Data binding
- Timeline and form startTime / endTime are two-way bound (v-model).
- Also keep anchorDate (display day), preferably synced with the calendar day of startTime.
- Inside the component, normalize times as `YYYY-MM-DD HH:mm:ss`; convert to epoch millis (or your API’s format) only before submit.

# Busy overlay
1. When attendees or the visible range change, debounce a “participant busy” API request.
2. Overlay translucent blocks: one color per person; show name + time range + title; if unauthorized, show “Busy”.
3. Support “busy only” mode and focusing one person via legend clicks.
4. Busy blocks are read-only references; they must not change the selection. Only the blue block edits time.
5. When editing an existing event, pass excludeEventId so the current event is not treated as a conflict.

# Suggested component split
- ScheduleDrawer: shell + two-column layout
- ScheduleForm: left form
- BusyTimeline: right timeline (ticks, selection, busy layer, day switcher, legend)
- Pure helpers: yToTime / timeToY / snapToStep / clampRange / clipBusyToDay

# Non-functional requirements
- Support both mouse and touch.
- Accept multiple backend time formats: millis, strings, LocalDateTime arrays.
- All-day / cross-day busy blocks must be clipped to the visible track for the anchored day.
- Vue 3 + TS + `<script setup>`; clear responsibilities; brief comments on drag math / coordinate conversion.
- Reuse the project’s existing UI kit (e.g. Ant Design Vue) and date utilities; avoid unrelated heavy deps.

# Acceptance criteria
- Dragging the blue block edges updates the left DatePickers.
- Changing DatePickers moves/resizes the blue block.
- 15-minute snapping works; start/end never cross.
- With attendees present, busy blocks render and can be filtered to one person.
- Cross-day end times work; day switching keeps selection + scroll behavior correct.
- Mobile does not render the timeline; the form alone can still create/edit.

First propose the component tree, key props/emits, and coordinate-conversion pseudocode; then implement runnable code. Do not dump everything into one giant file.
```

## What this prompt tightens

| Area | Improvement |
|------|-------------|
| Role & scope | States stack, delivery shape, and “no giant single file” |
| Interaction rules | Hard constraints for snap, min duration, cross-day, scroll |
| Data contract | One string format in UI; convert at submit boundary |
| Responsibilities | Asks for Timeline / helper split for review and unit tests |
| Acceptance | Replace vague “good UX” with checkable behaviors |

## Context worth appending

Add these after the prompt for much higher hit rate:

- Existing drawer/form paths and field names
- Busy API URL, request params, and a sample response
- Meaning of `excludeEventId` and permission fields
- Design refs (column ratio, palette, typography)
- Whether dayjs / date-fns already exists in the repo

## Takeaway

A useful prompt is not the longest one — it is the one that states **interaction constraints, data contracts, platform differences, and acceptance checks** once and clearly. Strong-interaction widgets like a schedule timeline benefit most from a “rules list + acceptance list” style brief.
