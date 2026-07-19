---
title: How do goroutines and channels work together?
description: Explain the basic idea of communication and synchronization in Go concurrency.
tags: [Go, Goroutine, Channel]
difficulty: medium
source: Handcrafted
---

## Core idea

Go prefers sharing memory by communicating. Channels pass data and signals between goroutines.

## Common patterns

- Producer / consumer
- Fan-in / fan-out
- Using `select` for timeouts and multiplexing
