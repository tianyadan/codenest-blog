---
title: DevWatch: Building an AI Coding Agent Progress Monitor on Apple Watch
summary: A one-week development plan for building an AI coding assistant monitor using Apple Watch, Python Agent, and SpringBoot.
category: Learning
tags:
  - AI
  - Apple Watch
  - Swift
  - Python
  - Agent
date: 2026-08-04
updated: 2026-08-04 11:53
---

# DevWatch: Building an AI Coding Agent Progress Monitor on Apple Watch

## Background

With AI coding tools such as Claude Code, Codex, and Cursor becoming part of daily development workflows, developers increasingly rely on AI Agents for analysis, refactoring, and testing.

However, these tools mainly run on computers. When developers leave their desks, they cannot easily know whether an AI Agent is running, what task it is performing, or whether the task is completed.

Therefore, I plan to build a developer-focused Apple Watch tool:

**DevWatch — bringing AI coding assistant status to your wrist.**

## Project Goal

Architecture:

```text
Claude Code / Codex / Cursor
            |
            |
        Mac Agent
            |
            |
       SpringBoot API
            |
            |
       Apple Watch
```

The Apple Watch will display:

- AI Agent status
- Current task
- Coding progress
- Git status
- Server status

Example:

```text
🤖 Claude Code

Task:
Refactor GoalNotifyPushJob

Progress:
███████░░ 70%

Status:
Running
```

# One Week Development Plan

## Day 1: Design Architecture

Define three core modules:

- Mac Agent: Collect AI tool status
- SpringBoot Backend: Store data and provide APIs
- Apple Watch: Display information

## Day 2: Build Mac Agent

Goal: Collect AI working status automatically.

Technology:

- Python
- File monitoring
- Shell commands
- HTTP requests

## Day 3: Develop SpringBoot Service

Goal: Build synchronization APIs.

Features:

- Receive Agent status
- Store latest status
- Provide query APIs

API:

```text
POST /api/watch/status
GET  /api/watch/latest
```

## Day 4: Build Apple Watch App

Goal: Create the first watch dashboard.

Technology:

- Swift
- SwiftUI
- WatchKit

## Day 5: Improve Watch Experience

Add:

- Dynamic progress display
- Agent icons
- Dark theme
- Animations

## Day 6: Extend Developer Data

Add:

- Git commits
- Docker status
- AI token usage
- Server resources

## Day 7: Documentation

Complete:

- README
- Architecture documentation
- Usage guide
- Open source preparation

# Future Plans

Possible extensions:

- iPhone Widget
- Mac Menu Bar App
- Enterprise WeChat notifications
- AI work summaries
- Multi-agent management

DevWatch is not only an Apple Watch application. It is an exploration of how developers may work with AI in the future.
