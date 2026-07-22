---
title: Windows 运行 npm 脚本失败问题
summary: 如果经常用 Node / npm，可以设置为当前用户允许脚本运行： 然后输入： PowerShell 默认策略是： • 禁止执行 .ps1 脚本（包括 n...
author: evan
category: work
tags: [工作总结]
createdAt: 2026-04-01 21:41:47
updatedAt: 2026-04-01 21:41:47
readingMinutes: 1
---
# Windows 运行 npm 脚本失败问题

## 记录

如果经常用 Node / npm，可以设置为当前用户允许脚本运行：

```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```
然后输入：

```powershell
Y
```

PowerShell 默认策略是：
	•	禁止执行 .ps1 脚本（包括 npm.ps1）
	•	npm 在 Windows 下其实是通过 npm.ps1 启动的
