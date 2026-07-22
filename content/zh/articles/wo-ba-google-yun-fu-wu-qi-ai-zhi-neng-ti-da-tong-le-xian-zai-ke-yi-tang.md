---
title: 我把 Google 云服务器 + AI 智能体打通了，现在可以躺床上用手机远程开发
summary: 这几天我做了一件特别有意思的事： 我把自己的 Google 云服务器、Codex、GitHub、手机终端全部串起来了。 现在的状态基本是： 我人在外面，甚...
author: evan
category: work
tags: [工作总结]
createdAt: 2026-05-12 10:25:43
updatedAt: 2026-05-12 10:25:43
readingMinutes: 6
---
# 我把 Google 云服务器 + AI 智能体打通了，现在可以躺床上用手机远程开发

![50B0DE83-EF99-44CE-8CEF-1D790E4A968C](https://codenest.oss-cn-qingdao.aliyuncs.com/images/2026/05/12/1f32a8da-8eb7-4fed-aa8c-357671cf3941.png)

![d5d4d2b5d375cf55d74c9636bde6e2e3](https://codenest.oss-cn-qingdao.aliyuncs.com/images/2026/05/12/89bbb722-edbd-422a-b6b3-bfa8a217680c.jpg)

这几天我做了一件特别有意思的事：

我把自己的 Google 云服务器、Codex、GitHub、手机终端全部串起来了。

现在的状态基本是：

我人在外面，甚至躺床上，只要打开手机，就能远程指挥 AI 改项目代码、开分支、提交代码、推送仓库。

有种“私人 24 小时 AI 开发助理”的感觉。

先说必要条件：

1. Visa 卡（Google Cloud 注册需要）
2. 科学上网

这两个缺一个都不太行。

---

## 我的整体链路

整个链路其实不复杂：

text 手机 → SSH 连接 Google 云服务器 → Codex 智能体 → GitHub → 本地电脑 Review 

核心思路是：

把 AI 放到云服务器上 24 小时运行，而不是只在本地电脑里使用。

因为服务器永远在线。

这意味着：

- 手机随时能连
- AI 随时能工作
- 想法可以随时落地
- 不再依赖“必须坐在电脑前”

这个感觉真的不一样。

---

# 我具体是怎么做的

## 第一步：申请 Google Cloud 服务器

Google Cloud 新用户会送 300 美元额度。

我开了一台 Ubuntu 的国外服务器。

主要用途：

- 跑 Codex
- 拉 GitHub 项目
- 给 AI 挂开发环境
- 后续部署自己的 AI Web 面板

这里我建议直接 Linux。

开发体验比 Windows Server 好太多。

---

## 第二步：服务器安装开发环境

我在服务器里安装了：

- Node.js
- Git
- Docker
- Codex CLI

然后把自己的项目：

- SpringCloud 微服务
- React 前端
- 小程序项目

全部 clone 到服务器。

现在服务器已经变成一个“云端开发电脑”。

---

# 第三步：手机远程 SSH

重点来了。

我手机装了 SSH 工具。

然后直接连接 Google 云服务器。

现在我在手机上就能：

bash ssh google 

直接进入开发环境。

甚至：

- git pull
- git checkout
- git merge
- docker logs
- codex

全部都能操作。

第一次用手机改线上项目的时候，真的有点震撼。

---

# 第四步：AI 分支开发

现在我的开发流程是：

## 服务器

AI：

text 创建新分支 ↓ 修改代码 ↓ commit ↓ push 到 github 

## 本地电脑

我负责：

text review 代码 ↓ merge main ↓ push 正式仓库 

这样有个很大的好处：

AI 永远碰不到 main 主分支。

安全很多。

---

# 最爽的地方是什么？

是“想法可以立刻落地”。

以前：

突然想到一个功能：

text 等回家 等开电脑 等打开 IDEA 

现在：

手机打开终端：

text “帮我给题库系统增加 AI 标签分类” 

然后 AI 就开始改。

等我回电脑的时候，代码已经在 GitHub 里了。

这种体验已经不是“AI 辅助编程”了。

更像：

你真的拥有了一个 24 小时在线的开发助手。

---

# 我后面还想继续升级

下一步我准备：

## 做自己的 Web 控制台

现在还是 SSH + 终端。

后面我准备：

text 网页聊天框 ↓ 输入需求 ↓ AI 自动改代码 ↓ Git 提交 ↓ 网页 Diff Review 

甚至：

- 在线预览
- 自动部署测试环境
- 小程序自动上传体验版
- AI 自动生成 PR

全部串起来。

到那时候，手机真的能完成一整套开发流程。

---

# 最后的感受

以前总觉得：

AI 只是“代码补全”。

现在越来越觉得：

AI 更像是“远程工程执行层”。

而人类真正需要做的：

是架构、方向、Review 和决策。

说实话，这种开发方式一旦习惯，很难再回去。
