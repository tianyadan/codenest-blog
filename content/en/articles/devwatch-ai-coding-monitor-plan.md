---
title: DevWatch: Building an AI Coding Agent Progress Monitor on Apple Watch
summary: A development plan for building an AI coding assistant monitor using Apple Watch, Python Agent, and SpringBoot.
category: Learning
tags:
  - AI
  - Apple Watch
  - Swift
  - Python
  - Agent
date: 2026-08-04
---

# DevWatch: Building an AI Coding Agent Progress Monitor on Apple Watch

## Background

With the rise of AI coding tools such as Claude Code, Codex, and Cursor, AI Agents are becoming an important part of daily software development.

However, these tools mainly run on computers. When developers leave their desks, they cannot easily know whether an AI Agent is working, what task it is performing, or whether it has completed the job.

Therefore, I plan to build a developer-focused Apple Watch tool:

**DevWatch — bringing AI coding assistant status to your wrist.**

## Project Goal

The target architecture:

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

Goal: Define the system modules and data flow.

Three core modules:

- Mac Agent: Collect AI tool status
- Backend: Store and provide APIs
- Apple Watch: Display information

---

## Day 2: Build Mac Agent

Goal: Let the Mac collect AI working status automatically.

Technology:

- Python
- File monitoring
- Shell commands
- HTTP requests

Unified output format:

```json
{
  "agent": "Claude",
  "status": "RUNNING",
  "task": "Refactor Service",
  "progress": 70
}
```

---

## Day 3: Develop SpringBoot Service

Goal: Build the synchronization service.

Features:

- Receive Agent status
- Store latest status
- Provide query API

API design:

```text
POST /api/watch/status
GET  /api/watch/latest
```

---

## Day 4: Build Apple Watch App

Goal: Create the first watch display page.

Technology:

- Swift
- SwiftUI
- WatchKit

Display:

```text
10:30

🤖 Claude

Coding...

Progress 70%
```

---

## Day 5: Improve Watch Experience

Add:

- Dynamic progress display
- Agent icons
- Dark theme
- Animations

Make it closer to a developer dashboard.

---

## Day 6: Extend Developer Data

Add more information:

- Git commits
- Docker status
- AI token usage
- Server resources

---

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
