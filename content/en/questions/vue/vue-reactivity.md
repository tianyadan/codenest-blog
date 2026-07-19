---
title: How does Vue reactivity work?
description: Explain how dependency tracking and update dispatch drive view refreshes.
tags: [Vue, Reactivity, Frontend]
difficulty: medium
source: Handcrafted
---

## Basic flow

1. Accessing reactive data collects dependencies (effects / watchers)
2. Mutating data re-runs those dependencies
3. Component render functions are scheduled as side effects

## Vue 3 notes

Vue 3 uses Proxy for property access, which handles newly added properties and array mutations more naturally with `ref` / `reactive`.
