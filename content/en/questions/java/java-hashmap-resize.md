---
title: Why is HashMap not thread-safe?
description: Explain HashMap risks from resizing, linked lists/red-black trees, and concurrent writes.
tags: [Java, Collections, Concurrency]
difficulty: medium
source: Handcrafted
---

## Root cause

HashMap has no synchronization. Concurrent puts may overwrite entries or corrupt the structure during resize migration.

## Production advice

Use ConcurrentHashMap in concurrent scenarios. Do not casually wrap HashMap with locks unless lock scope and lifecycle are very clear.
