---
title: What problem does Spring IoC solve?
description: Explain the value of the IoC container through dependency inversion and inversion of control.
tags: [Spring, IoC, Dependency Injection]
difficulty: easy
source: Handcrafted
---

## Core value

IoC moves object creation and wiring into the container. Business code declares what it needs instead of manually constructing dependencies.

## Common forms

- Constructor / setter injection
- `@Autowired` / `@Resource` wiring
- Unified bean lifecycle management by the container
