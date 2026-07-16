---
title: What Is a Ring Counter (Sliding Window)?
summary: A plain-language explanation of sliding windows and ring counters, and how they help with rate limiting and real-time metrics.
author: evan
category: learning
tags: [Sliding Window, Ring Counter, Rate Limiting, Metrics]
createdAt: 2025-09-08
updatedAt: 2025-09-08
readingMinutes: 4
---

# What Is a Ring Counter (Sliding Window)?

In rate limiting and monitoring systems, you often hear two terms used together: **sliding window** and **ring counter**. They are related, but they are not the same thing:

- A **sliding window** is a concept: count only the data from a recent time range.
- A **ring counter** is an efficient way to implement that sliding window.

## The Regular Window Metaphor

Imagine you work at a highway toll booth and need to know how many cars passed in the last 10 minutes.

If you store every car timestamp in one growing bucket, the dataset keeps expanding and becomes expensive to query. A sliding window takes a different approach: keep only the last 10 minutes of data, drop anything older, and always work with a fresh sample set.

That gives you a stable, real-time view of recent traffic without carrying unbounded history.

## The Ring Counter Metaphor

Now change the requirement to "count cars in the last 60 seconds." Picture a clock face divided into 60 slots, one slot per second:

1. When a car passes, increment the slot for the current second.
2. As time moves forward, the hand advances to the next slot.
3. When the hand wraps around to a used slot, clear it first, then start counting again.

This design has two practical advantages:

- Memory stays fixed because the same 60 slots are reused forever.
- To get traffic for the last 10 seconds, just sum the most recent 10 slots.

That is the key idea behind a ring counter: a circular array that overwrites old data as time advances, so the window slides naturally.

## Quick Summary

- **Sliding window**: focus on statistics over a time range, such as the last 10 seconds, 10 minutes, or 100 requests.
- **Ring counter**: store window data in a fixed circular array and overwrite stale slots to keep the window moving with constant memory.

## Common Uses

- API rate limiting: for example, allow at most 100 requests per second.
- Real-time analytics: for example, active users in the last 5 minutes.
- Traffic and log monitoring: track recent metrics without retaining every historical event forever.
