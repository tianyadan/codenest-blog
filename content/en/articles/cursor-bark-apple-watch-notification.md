---
title: Build AI Coding Completion Notifications with Cursor Hook and Bark
summary: Send Cursor Agent completion events to iPhone and Apple Watch using hooks and Bark.
author: CodeNest
category: learning
tags: [Cursor, AI Agent, Bark, Apple Watch, Shell]
createdAt: 2026-07-23
updatedAt: 2026-07-23
readingMinutes: 8
slug: cursor-bark-apple-watch-notification
---

# Build AI Coding Completion Notifications with Cursor Hook and Bark

AI coding assistants such as Cursor can now handle large development tasks. However, a new problem appears: developers do not always know when an Agent task finishes.

Common situations:

- A task runs for 30 minutes after you leave your desk.
- The Agent waits for confirmation while you are away.
- Tests fail and you only notice later.

This article builds a simple notification pipeline:

```text
Cursor Agent
    ↓
Cursor Hook
    ↓
Shell Script
    ↓
Bark
    ↓
iPhone
    ↓
Apple Watch
```

## Why Bark

Bark is an iOS notification tool that provides an HTTP API.

Any program can send an HTTP request and push a notification to your phone.

Advantages:

- Simple and transparent.
- Works with Cursor, Codex, Jenkins, and other systems.
- You control the notification content.

## Install Bark

Install Bark from the App Store and copy your device URL:

```text
https://api.day.app/your-key/
```

Test it:

```bash
curl 'https://api.day.app/your-key/test/hello from mac'
```

## Add Agent Icons

Bark supports custom icons through the `icon` parameter.

For example:

```text
https://your-oss-domain/cursor.png
```

You can prepare different icons:

- cursor.png
- codex.png
- claude.png

## Create a Notification Script

Create:

```bash
~/bin/ai-notify.sh
```

Example:

```bash
#!/usr/bin/env bash

curl -X POST 'https://api.day.app/push' \\
-H 'Content-Type: application/json' \\
-d '{
  "device_key":"YOUR_KEY",
  "title":"Cursor Agent",
  "body":"Task completed",
  "group":"Cursor"
}'
```

For production usage, generate JSON with jq to safely handle Unicode and multiline content.

## Automate with Cursor Hooks

Calling the script manually is not reliable because an AI assistant may forget.

Hooks allow Cursor to execute commands automatically when an event happens.

Example configuration:

```json
{
  "version": 1,
  "hooks": {
    "stop": [
      {
        "command": "$HOME/bin/cursor-stop-hook.sh"
      }
    ]
  }
}
```

Create:

```bash
~/bin/cursor-stop-hook.sh
```

Example:

```bash
#!/usr/bin/env bash

~/bin/ai-notify.sh cursor success "Cursor Agent task completed"
```

Now every completed Cursor task can trigger a notification automatically.

## Final Result

When Cursor performs a task:

```text
Refactor Calendar MQ notification module
```

Your Apple Watch receives:

```text
Cursor Agent

Task completed
Project:kfi-cloud
Status:success
```

## Conclusion

In the AI development era, developers need not only capable coding agents, but also reliable feedback loops.

With Hook + Script + Bark, you can build your own AI Agent notification system.

The same architecture can later support:

- Codex
- Claude Code
- Jenkins
- GitHub Actions
- Internal company agents
