---
title: Build an AI Agent Completion Notification System from Scratch with Cursor Hook, Bark, and Apple Watch
summary: Use Cursor Hooks, a shell script, and Bark to push AI task completion notifications to your iPhone and Apple Watch.
author: CodeNest
category: backend
tags: [AI Agent, Cursor, Bark, Apple Watch, Shell, Automation]
createdAt: 2026-07-23
updatedAt: 2026-07-23
readingMinutes: 10
slug: cursor-bark-apple-watch-notification
---

# Build an AI Agent Completion Notification System from Scratch with Cursor Hook, Bark, and Apple Watch

More and more development tasks can now be delegated to AI coding agents.

For example:

- Cursor Agent can refactor a module for you.
- Codex can apply a large multi-file change.
- An AI workflow can run tests automatically.
- A scripting agent can update batches of files in the background.

But that creates a new problem:

> When an AI task runs for 30 minutes, an hour, or even longer, how do I know exactly when it finishes?

The old workflow looks like this:

```text
Submit the task

↓

Keep staring at the computer

↓

Wait for the AI to return
```

That is a poor use of time.

What I really wanted was this:

```text
Hand the task to the AI

↓

Leave the computer

↓

Let Apple Watch tell me when it is done
```

The final notification pipeline looks like this:

```text
Cursor Agent
      ↓
Cursor Hook
      ↓
Shell Notification Script
      ↓
Bark Push
      ↓
iPhone
      ↓
Apple Watch
```

---

## 1. Why I Chose Bark

There are many ways to deliver notifications:

- WeCom bots
- Email
- Telegram bots
- Server Chan
- PushPlus

For a personal developer workflow, I chose Bark.

Why?

1. It provides a native iOS notification experience.
2. It can forward notifications to Apple Watch.
3. It exposes a very simple HTTP API.
4. It is easy to call from Shell, Java, or Python.

At a high level, Bark works like this:

```text
Shell Script
      ↓
HTTP POST
      ↓
Bark Server
      ↓
Apple Push Notification Service
      ↓
iPhone
      ↓
Apple Watch
```

---

## 2. Install Bark

Open the App Store and search for:

```text
Bark
```

After installation, launch the app.

On the home screen, Bark shows your push URL, for example:

```text
https://api.day.app/xxxxxxxx/
```

The `xxxxxxxx` part is your device key.

That key is effectively your notification identity, so treat it like a secret and do not commit it to GitHub.

---

## 3. Send the First Bark Test Notification

Run this command on your Mac:

```bash
curl \
  'https://api.day.app/your-key/Test Notification/Sent from my Mac'
```

If everything is working, your iPhone will receive:

```text
Test Notification

Sent from my Mac
```

And if your Apple Watch is paired correctly, it will mirror the same alert.

---

## 4. A Real Pitfall: Proxy Broke Bark Registration

This was the first issue I ran into, and it is worth documenting because the error message is misleading.

During my first Bark setup, my iPhone had a proxy tool enabled.

Then I tested Bark with `curl` and got this response:

```text
failed to get device token from database
```

At first glance, it looks like the device key is wrong.

But in my case, the key was not the real problem.

The actual issue was this:

When Bark launches for the first time, it needs to register the device with its upstream service. The proxy interfered with that registration step, so Bark never completed initialization correctly.

The fix was:

1. Disable the proxy on the iPhone.
2. Fully quit Bark.
3. Open Bark again.
4. Wait for the device to register successfully.
5. Copy the new device key.
6. Re-enable the proxy if you still need it.

After that, the push path worked normally again:

```text
Mac
↓
api.day.app
↓
Apple Push
↓
Apple Watch
```

If you see similar Bark errors, check your proxy setup before assuming the key is invalid.

---

## 5. Give Cursor Its Own Notification Icon

Bark supports a custom icon field:

```json
{
  "icon": "https://example.com/cursor.png"
}
```

That means you can assign different icons to different agents.

For example, Cursor can use:

```text
https://my-love-xg.oss-cn-qingdao.aliyuncs.com/cursor.png
```

Later, you can extend the same pattern:

```text
Cursor   -> cursor.png
Codex    -> codex.png
Jenkins  -> jenkins.png
```

This makes it much easier to identify the source of a notification inside Notification Center.

---

## 6. Write a Reusable AI Notification Script

To make the setup reusable for both Cursor and Codex, create a shared script:

```bash
mkdir -p ~/bin
vim ~/bin/ai-notify.sh
```

Use the following content:

```bash
#!/usr/bin/env bash

set -euo pipefail

if [ -z "${BARK_KEY:-}" ]; then
    echo "BARK_KEY missing"
    exit 1
fi

AGENT="${1:-cursor}"
STATUS="${2:-success}"
TASK="${3:-Task completed}"

case "$AGENT" in
cursor)
    TITLE="Cursor Agent"
    GROUP="Cursor"
    ICON="https://my-love-xg.oss-cn-qingdao.aliyuncs.com/cursor.png"
    ;;
codex)
    TITLE="Codex Agent"
    GROUP="Codex"
    ICON="https://my-love-xg.oss-cn-qingdao.aliyuncs.com/codex.png"
    ;;
*)
    TITLE="AI Agent"
    GROUP="AI"
    ICON=""
    ;;
esac

PROJECT="unknown"
BRANCH="unknown"
FILES=0

if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    PROJECT=$(basename "$(git rev-parse --show-toplevel)")
    BRANCH=$(git branch --show-current)
    FILES=$(git status --short | wc -l | tr -d ' ')
fi

BODY=$(cat <<EOF
Task:
$TASK

Project:
$PROJECT

Branch:
$BRANCH

Status:
$STATUS

Changes:
$FILES files
EOF
)

PAYLOAD=$(jq -n \
  --arg key "$BARK_KEY" \
  --arg title "$TITLE" \
  --arg body "$BODY" \
  --arg group "$GROUP" \
  --arg icon "$ICON" \
  '
  {
    device_key: $key,
    title: $title,
    body: $body,
    group: $group,
    icon: $icon
  }
  ')

curl \
  -X POST \
  "https://api.day.app/push" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD"
```

Then make it executable:

```bash
chmod +x ~/bin/ai-notify.sh
```

This script does a few useful things:

- validates that `BARK_KEY` exists;
- supports multiple agent names;
- reads project and branch information from Git;
- counts local file changes;
- builds JSON safely with `jq`;
- sends a structured Bark notification.

---

## 7. Configure the Bark Key

Edit your shell profile:

```bash
vim ~/.zshrc
```

Add:

```bash
export BARK_KEY="your-key"
```

Reload the profile:

```bash
source ~/.zshrc
```

If you use Bash instead of Zsh, place the same export in `~/.bashrc` or the profile file you normally load.

---

## 8. Test the Notification Script

Move into your project:

```bash
cd your-project
```

Then run:

```bash
~/bin/ai-notify.sh \
  cursor \
  success \
  "Calendar MQ notification module refactor completed"
```

You should receive something like this:

```text
Cursor Agent

Task:
Calendar MQ notification module refactor completed

Project:
kfi-cloud

Branch:
develop

Status:
success

Changes:
12 files
```

At this point, the basic Bark notification pipeline is already working.

---

## 9. Connect It to Cursor Hooks

Manually calling the script has one obvious weakness:

AI agents may forget to call it.

That is why Hooks matter.

You can think of a Hook like this:

> When a specific Cursor lifecycle event happens, Cursor automatically runs a command for you.

For example:

```text
Cursor Agent finishes
↓
stop hook fires
↓
script executes
↓
notification is sent
```

Create this file:

```text
~/.cursor/hooks.json
```

Add the following configuration:

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

Then create:

```bash
vim ~/bin/cursor-stop-hook.sh
```

Use this content:

```bash
#!/usr/bin/env bash

~/bin/ai-notify.sh \
  cursor \
  success \
  "Cursor Agent task completed"
```

And make it executable:

```bash
chmod +x ~/bin/cursor-stop-hook.sh
```

Now every time Cursor finishes a task and triggers the `stop` hook, your script can send the notification automatically.

---

## 10. Final Architecture

The final setup looks like this:

```text
Cursor Agent
      |
      |
Cursor Stop Hook
      |
      |
ai-notify.sh
      |
      |
Bark API
      |
      |
iPhone
      |
      |
Apple Watch
```

That means you can now:

- give the AI a complex task;
- leave the computer;
- go to lunch or step into a meeting;
- wait for your Apple Watch to tell you the work is done.

---

## 11. Future Extensions

This pattern is not limited to Cursor.

You can expand it to:

### Codex

```text
Codex Hook
↓
ai-notify.sh codex
```

### Jenkins

```text
CI build completed
↓
Bark notification
```

### Internal Company Agents

For example:

- daily report agents
- presentation agents
- knowledge base agents
- data analysis agents

All of them can report into the same notification center.

---

## Conclusion

In the AI agent era, developers do not only need to ask:

> Can the AI write code?

They also need to ask:

> How do I know as soon as the AI work is finished?

By combining:

```text
Cursor Hook
+
Shell Script
+
Bark
+
Apple Watch
```

you can build a simple, reliable, and fully self-owned completion notification system for AI coding workflows.
