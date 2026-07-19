---
title: What persistence options does Redis provide?
description: Compare RDB and AOF principles, trade-offs, and typical choices.
tags: [Redis, Persistence, Cache]
difficulty: medium
source: Handcrafted
---

## Two options

- **RDB**: Periodic memory snapshots. Fast recovery, but may lose data after the latest snapshot.
- **AOF**: Logs write commands. Better durability, usually larger files, with tunable fsync policies like `everysec`.

## Guidance

Prefer RDB when recovery speed matters more than minimal data loss; enable AOF when durability matters more, or combine both.
