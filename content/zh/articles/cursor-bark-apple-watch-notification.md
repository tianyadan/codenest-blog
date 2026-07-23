---
title: 从 0 到 1 搭建 AI Agent 完成通知系统：Cursor Hook + Bark + Apple Watch
summary: 使用 Cursor Hook、Shell 脚本和 Bark，将 AI 编程任务完成状态推送到 iPhone 和 Apple Watch。
author: CodeNest
category: backend
tags: [AI Agent, Cursor, Bark, Apple Watch, Shell, Automation]
createdAt: 2026-07-23
updatedAt: 2026-07-23
readingMinutes: 10
slug: cursor-bark-apple-watch-notification
---

# 从 0 到 1 搭建 AI Agent 完成通知系统：Cursor Hook + Bark + Apple Watch

最近越来越多的开发工作开始交给 AI 编程助手完成。

例如：

- Cursor Agent 重构一个模块；
- Codex 执行一个大型代码修改；
- AI 自动运行测试；
- AI 批量修改多个文件。

但是有一个问题：

> 当 AI 在后台执行几十分钟甚至几个小时任务时，我不知道它什么时候完成。

以前的方式：

```
提交任务

↓

一直盯着电脑

↓

等待 AI 返回结果
```

这种方式非常浪费时间。

于是我想实现：

```
把任务交给 AI

↓

离开电脑

↓

Apple Watch 提醒我任务完成
```

最终实现效果：

```
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

# 一、为什么选择 Bark？

实现通知有很多方式：

- 企业微信机器人
- 邮件
- Telegram Bot
- Server Chan
- PushPlus

但是对于个人开发场景，我选择 Bark。

原因：

1. iOS 原生通知体验好；
2. 支持 Apple Watch；
3. 提供简单 HTTP API；
4. Shell、Java、Python 都可以调用。

Bark 的工作流程：

```
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

# 二、安装 Bark

打开 App Store。

搜索：

```
Bark
```

安装后打开。

首页会显示你的推送地址：

例如：

```
https://api.day.app/xxxxxxxx/
```

其中：

```
xxxxxxxx
```

就是你的设备 Key。

它相当于你的通知身份。

注意：

不要提交到 GitHub。

---

# 三、第一次测试 Bark

Mac 执行：

```bash
curl \
'https://api.day.app/你的Key/测试通知/我的Mac发送了一条消息'
```

如果成功：

iPhone 会收到：

```
测试通知

我的Mac发送了一条消息
```

同时 Apple Watch 会同步提醒。

---

# 四、踩坑：代理导致 Bark 注册失败

这里记录一个真实踩坑。

第一次配置 Bark 时：

我的 iPhone 开启了代理软件。

然后使用：

```bash
curl
```

测试推送。

返回：

```
failed to get device token from database
```

看起来像 Key 错误。

实际上：

不是 Key 错。

原因：

Bark App 第一次启动时，需要向官方服务器注册设备。

代理环境导致注册流程异常。

解决方法：

1. 关闭 iPhone 代理；
2. 完全退出 Bark；
3. 重新打开 Bark；
4. 等待设备重新注册；
5. 获取新的 Device Key；
6. 再重新开启代理。

之后：

```
Mac

↓

api.day.app

↓

Apple Push

↓

Apple Watch
```

链路正常。

如果遇到类似问题：

优先检查代理。

---

# 五、给 Cursor 设置专属 Logo

Bark 支持：

```json
{
    "icon":"图片URL"
}
```

所以可以给不同 Agent 使用不同图标。

例如：

Cursor：

```
https://my-love-xg.oss-cn-qingdao.aliyuncs.com/cursor.png
```

以后：

```
Cursor    cursor.png

Codex     codex.png

Jenkins   jenkins.png
```

这样通知中心可以快速区分来源。

---

# 六、编写 AI 通知脚本

为了让 Cursor、Codex 共用。

创建：

```bash
mkdir -p ~/bin

vim ~/bin/ai-notify.sh
```

内容：

```bash
#!/usr/bin/env bash

set -euo pipefail


if [ -z "${BARK_KEY:-}" ]; then
    echo "BARK_KEY missing"
    exit 1
fi


AGENT="${1:-cursor}"
STATUS="${2:-success}"
TASK="${3:-任务完成}"


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


if git rev-parse --is-inside-work-tree >/dev/null 2>&1
then

PROJECT=$(basename "$(git rev-parse --show-toplevel)")

BRANCH=$(git branch --show-current)

FILES=$(git status --short | wc -l | tr -d ' ')

fi



BODY=$(cat <<EOF
任务:
$TASK

项目:
$PROJECT

分支:
$BRANCH

状态:
$STATUS

修改:
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
device_key:$key,
title:$title,
body:$body,
group:$group,
icon:$icon
}
')



curl \
-X POST \
"https://api.day.app/push" \
-H "Content-Type: application/json" \
-d "$PAYLOAD"
```

增加权限：

```bash
chmod +x ~/bin/ai-notify.sh
```

---

# 七、配置 Bark Key

编辑：

```bash
vim ~/.zshrc
```

添加：

```bash
export BARK_KEY="你的Key"
```

刷新：

```bash
source ~/.zshrc
```

---

# 八、测试通知

进入项目：

```bash
cd your-project
```

执行：

```bash
~/bin/ai-notify.sh \
cursor \
success \
"Calendar MQ 通知模块重构完成"
```

收到：

```
Cursor Agent

任务:
Calendar MQ 通知模块重构完成

项目:
kfi-cloud

分支:
develop

状态:
success

修改:
12 files
```

---

# 九、接入 Cursor Hook

手动调用脚本存在一个问题：

AI 可能忘记调用。

所以使用 Hook。

Hook 可以理解为：

> 当 Cursor 生命周期事件发生时，自动执行命令。

例如：

```
Cursor Agent 完成

↓

stop hook

↓

执行脚本

↓

发送通知
```

---

创建：

```
~/.cursor/hooks.json
```

配置：

```json
{
  "version":1,
  "hooks":{
    "stop":[
      {
        "command":"$HOME/bin/cursor-stop-hook.sh"
      }
    ]
  }
}
```

---

创建：

```bash
vim ~/bin/cursor-stop-hook.sh
```

内容：

```bash
#!/usr/bin/env bash


~/bin/ai-notify.sh \
cursor \
success \
"Cursor Agent任务完成"
```

权限：

```bash
chmod +x ~/bin/cursor-stop-hook.sh
```

---

# 十、最终架构

最终：

```
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

现在：

你可以：

- 给 AI 一个复杂任务；
- 离开电脑；
- 去吃饭或者开会；
- 等 Apple Watch 提醒。

---

# 十一、未来扩展

这个方案不仅适用于 Cursor。

还可以扩展：

## Codex

```
Codex Hook

↓

ai-notify.sh codex
```

## Jenkins

```
CI Build完成

↓

Bark通知
```

## 企业 Agent

例如：

- 日报 Agent
- PPT Agent
- 知识库 Agent
- 数据分析 Agent

统一接入通知中心。


# 总结

AI Agent 时代，开发者需要关注的不只是：

> AI 能不能写代码。

还包括：

> AI 工作完成后，如何及时知道结果。

通过：

```
Cursor Hook

+

Shell Script

+

Bark

+

Apple Watch
```

可以构建一个简单、稳定、完全属于自己的 AI Agent 通知系统。
