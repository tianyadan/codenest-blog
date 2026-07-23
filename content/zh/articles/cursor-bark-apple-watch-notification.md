---
title: 使用 Cursor Hook + Bark 打造 AI 编程任务完成通知系统
summary: 将 Cursor Agent 的任务完成事件通过 Hook 自动推送到 iPhone 和 Apple Watch。
author: CodeNest
category: learning
tags: [Cursor, AI Agent, Bark, Apple Watch, Shell]
createdAt: 2026-07-23
updatedAt: 2026-07-23
readingMinutes: 8
slug: cursor-bark-apple-watch-notification
---

# 使用 Cursor Hook + Bark 打造 AI 编程任务完成通知系统

随着 Cursor、Codex 等 AI 编程工具越来越强，开发者开始把复杂任务交给 Agent 执行。

但是新的问题出现了：

- Agent 运行几十分钟后完成，你不知道。
- Agent 等待确认时，你可能已经离开电脑。
- 测试失败时，回来才发现任务没有真正结束。

因此，我希望构建一个简单可靠的通知链路：

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

## 为什么选择 Bark

Bark 是一个 iOS 推送工具，它提供 HTTP API。

任何程序只需要发送一个 HTTP 请求，就可以给自己的手机发送通知。

相比一些黑盒 AI 监控工具，这种方案更加透明：

- 自己控制通知内容。
- 可以接入 Cursor、Codex、Jenkins 等任意系统。
- 不依赖复杂同步服务。

## 安装 Bark

在 App Store 搜索 Bark，安装完成后复制设备推送地址：

```text
https://api.day.app/你的Key/
```

其中 Key 是你的设备标识。

测试：

```bash
curl 'https://api.day.app/你的Key/测试通知/来自Mac的消息'
```

## 给通知添加 AI Logo

Bark 支持 icon 参数。

例如 Cursor 图标：

```text
https://your-oss-domain/cursor.png
```

后续可以分别配置：

- cursor.png
- codex.png
- claude.png

实现不同 Agent 使用不同头像。

## 编写通用通知脚本

创建：

```bash
~/bin/ai-notify.sh
```

核心逻辑：

```bash
#!/usr/bin/env bash

set -euo pipefail

curl -X POST 'https://api.day.app/push' \\
-H 'Content-Type: application/json' \\
-d '{
  "device_key":"YOUR_KEY",
  "title":"Cursor Agent",
  "body":"任务完成",
  "group":"Cursor"
}'
```

实际项目中建议使用 jq 生成 JSON，避免中文、换行导致 JSON 解析失败。

## 使用 Cursor Hook 自动触发

手动执行脚本还不够，因为 AI 可能忘记调用。

Hook 可以在 Cursor 生命周期结束时自动执行命令。

配置：

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

创建：

```bash
~/bin/cursor-stop-hook.sh
```

内容：

```bash
#!/usr/bin/env bash

~/bin/ai-notify.sh cursor success "Cursor Agent任务完成"
```

之后 Cursor 每次完成任务都会自动发送通知。

## 最终效果

当你让 Cursor：

```text
重构 Calendar MQ 通知模块
```

执行完成后，Apple Watch 会收到：

```text
Cursor Agent

任务完成
项目:kfi-cloud
状态:success
```

## 总结

AI 编程时代，开发者不仅需要让 AI 会写代码，也需要知道 AI 什么时候完成。

通过 Hook + Script + Bark，可以搭建一个属于自己的 AI Agent 通知系统。

未来还可以扩展到：

- Codex
- Claude Code
- Jenkins
- GitHub Actions
- 企业内部 Agent
