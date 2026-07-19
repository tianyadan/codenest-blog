---
title: Why can a MySQL index become ineffective?
description: Explain how functions, implicit conversions, leftmost prefix rules, and range queries affect index usage.
tags: [MySQL, Index, SQL Optimization]
difficulty: medium
source: Handcrafted
---

## Common causes

- Applying functions on indexed columns
- Implicit type conversion on string fields
- Breaking the leftmost prefix of a composite index
- Columns after a range condition cannot fully use the index

## How to investigate

Use EXPLAIN and inspect type, key, rows, and Extra. Watch for full table scans.
