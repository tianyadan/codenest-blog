---
title: Work Notes and Lessons Learned (Ongoing)
summary: Ongoing notes on Git habits, automation, coding conventions, reuse, documentation, and keeping code simple and maintainable.
author: evan
category: work
tags: [Work Notes]
createdAt: 2025-08-20 08:57:00
updatedAt: 2025-08-20 08:57:00
readingMinutes: 2
topOrder: 1
---
# Work Notes and Lessons Learned (Ongoing)

### Git
- 1. Before pushing a Git repository, pull the latest code first to avoid conflicts. If conflicts do happen, resolve them manually and then rebase. Remember: you do not need an extra commit, because rebasing is essentially replaying commits.
- 2. Use `.gitkeep` and `.gitignore` properly to keep the repository from becoming bloated.

### Operations
- 1. Automate builds whenever possible. If a script can do it, use a script. It saves a lot of time and is much more convenient.

### Formatting Standards
- 1. Leave a space after `//` in code comments so the compiler or tools can parse them correctly.
- 2. Install a formatter in your IDE. Do not add spaces and line breaks randomly; that is not a professional workflow.
- 3. Do not hardcode certain variables. Put them in environment variables so they are easier to control.
- 4. Reuse code whenever possible instead of reinventing the wheel.
- 5. Write documentation regularly and think ahead, so you are not left without docs when handoff time comes.
- 6. Simplify code whenever you can. As long as robustness and stability are preserved, simpler is better.
