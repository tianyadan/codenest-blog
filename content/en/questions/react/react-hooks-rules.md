---
title: Why must React Hooks not be called conditionally?
description: Explain the rule through Hook call order and state correspondence.
tags: [React, Hooks, Frontend]
difficulty: medium
source: Handcrafted
---

## Reason

React matches state and effects by Hook call order. Conditional branches can shuffle that order and misalign state.

## Correct approach

Always call Hooks at the top level of a component. Put conditionals inside Hooks, or split into smaller components.
