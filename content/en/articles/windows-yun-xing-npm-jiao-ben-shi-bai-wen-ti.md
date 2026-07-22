---
title: Fixing npm Script Execution Failures on Windows
summary: If you use Node.js and npm often on Windows, allow script execution for the current user so PowerShell can run npm.ps1 normally.
author: evan
category: work
tags: [Work Notes]
createdAt: 2026-04-01 21:41:47
updatedAt: 2026-04-01 21:41:47
readingMinutes: 1
---
# Fixing npm Script Execution Failures on Windows

## Notes

If you use Node.js / npm frequently, you can allow script execution for the current user:

```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

Then enter:

```powershell
Y
```

PowerShell's default policy is:

- It blocks execution of `.ps1` scripts, including `npm.ps1`
- On Windows, `npm` is actually launched through `npm.ps1`
