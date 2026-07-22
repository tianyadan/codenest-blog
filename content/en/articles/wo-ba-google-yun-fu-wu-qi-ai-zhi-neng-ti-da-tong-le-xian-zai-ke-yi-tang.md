---
title: I Connected My Google Cloud Server and AI Agent, and Now I Can Develop Remotely From My Phone in Bed
summary: Over the past few days, I connected my Google Cloud server, Codex, GitHub, and mobile terminal into one remote development workflow.
author: evan
category: work
tags: [Work Notes]
createdAt: 2026-05-12 10:25:43
updatedAt: 2026-05-12 10:25:43
readingMinutes: 6
---
# I Connected My Google Cloud Server and AI Agent, and Now I Can Develop Remotely From My Phone in Bed

![50B0DE83-EF99-44CE-8CEF-1D790E4A968C](https://codenest.oss-cn-qingdao.aliyuncs.com/images/2026/05/12/1f32a8da-8eb7-4fed-aa8c-357671cf3941.png)

![d5d4d2b5d375cf55d74c9636bde6e2e3](https://codenest.oss-cn-qingdao.aliyuncs.com/images/2026/05/12/89bbb722-edbd-422a-b6b3-bfa8a217680c.jpg)

Over the past few days, I did something especially interesting:

I connected my own Google Cloud server, Codex, GitHub, and mobile terminal into one workflow.

My current setup is basically this:

Even when I am out, or even lying in bed, as long as I open my phone, I can remotely direct AI to modify project code, create branches, commit code, and push to the repository.

It feels like having a private 24-hour AI development assistant.

First, the prerequisites:

1. A Visa card (required for Google Cloud registration)
2. Internet access that can reach Google services

You really need both.

---

## My Overall Workflow

The full workflow is actually not complicated:

```text
Phone -> SSH into Google Cloud server -> Codex agent -> GitHub -> local computer for review
```

The core idea is:

Keep the AI running on a cloud server 24/7 instead of only using it on a local computer.

Because the server is always online.

That means:

- My phone can connect at any time
- AI can work at any time
- Ideas can be turned into reality at any time
- I no longer depend on "having to sit in front of my computer"

The feeling is genuinely different.

---

# How I Did It

## Step 1: Apply for a Google Cloud Server

New Google Cloud users get $300 in credits.

I launched an overseas Ubuntu server.

Its main uses are:

- Running Codex
- Pulling GitHub projects
- Hosting development environments for AI
- Deploying my own AI web panel later

I recommend going straight to Linux here.

The development experience is much better than Windows Server.

---

## Step 2: Install the Development Environment on the Server

I installed the following on the server:

- Node.js
- Git
- Docker
- Codex CLI

Then I put my own projects on it:

- SpringCloud microservices
- React frontend
- Mini program project

I cloned them all to the server.

Now the server has basically become a "cloud development computer."

---

# Step 3: Remote SSH From My Phone

This is the key part.

I installed an SSH tool on my phone.

Then I connected directly to the Google Cloud server.

Now I can do this on my phone:

```bash
ssh google
```

and enter the development environment directly.

I can even run:

- `git pull`
- `git checkout`
- `git merge`
- `docker logs`
- `codex`

All of it works.

The first time I modified a live project from my phone, it was honestly a little shocking.

---

# Step 4: AI Branch-Based Development

My development workflow now looks like this:

## Server

AI:

```text
Create a new branch
↓
Modify code
↓
commit
↓
push to GitHub
```

## Local Computer

I handle:

```text
Review code
↓
merge into main
↓
push to the production repository
```

This has one major advantage:

AI never touches the `main` branch directly.

That is much safer.

---

# What Feels Best About It?

It is the fact that ideas can be implemented immediately.

Before:

When I suddenly thought of a feature:

```text
Wait until I get home
Wait until I turn on the computer
Wait until I open IDEA
```

Now:

I open the terminal on my phone:

```text
"Help me add AI-based tag classification to the question bank system."
```

Then the AI starts making the changes.

By the time I return to my computer, the code is already on GitHub.

This no longer feels like "AI-assisted programming."

It feels more like:

You really have a 24-hour online development assistant.

---

# What I Want to Upgrade Next

My next step is:

## Build My Own Web Console

Right now I still use SSH + terminal.

Later I want this:

```text
Web chat box
↓
Enter requirements
↓
AI automatically modifies code
↓
Git commit
↓
Web diff review
```

And even:

- Online preview
- Automatic deployment to a test environment
- Automatic upload of a mini program preview build
- AI-generated PRs

Connect all of that together.

At that point, a phone could really complete an entire development workflow.

---

# Final Thoughts

I used to think:

AI was just "code completion."

Now I increasingly feel:

AI is more like a "remote engineering execution layer."

What humans really need to do is:

Architecture, direction, review, and decisions.

Honestly, once you get used to this development style, it is hard to go back.
