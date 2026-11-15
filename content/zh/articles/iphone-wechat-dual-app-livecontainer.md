---
title: 不越狱在 iPhone 上双开微信：AltStore、LiveContainer 与 FChat 实战
summary: 2026 年 11 月在 iPhone 上实测完成微信双开，记录 AltServer 侧载、LiveContainer 导入 FChat IPA、运行原理、免费签名配额与后台推送限制。
author: evan
category: learning
tags: [iOS, iPhone, 微信双开, LiveContainer, AltStore, IPA, FChat, 侧载]
createdAt: 2026-11-15
updatedAt: 2026-11-15
readingMinutes: 12
slug: iphone-wechat-dual-app-livecontainer
---

# 不越狱在 iPhone 上双开微信：AltStore、LiveContainer 与 FChat 实战

**先说结果：成功了。** 2026 年 11 月 15 日，我在自己的 iPhone 上保留 App Store 安装的官方微信，又通过 LiveContainer 运行 FChat，登录了**第二个独立微信账号**。整个过程没有越狱，也没有给 iPhone 安装 Android。

这篇文章记录从找安装包、侧载、配置运行环境，到最终双开的完整过程，以及事后查明的原理。它是我的一次实测记录，**不承诺所有 iPhone、所有微信版本都能复现**。尤其要说明：成功登录不代表后台推送可靠，我没有完成长期稳定性、语音通话和锁屏消息到达率测试。

## 一、为什么折腾

iPhone 上的微信没有 Android 手机里常见的“应用分身”入口。微信自带的切换账号，只能切换登录状态，满足不了“手机里保留两个不同微信登录环境”的需要。

一开始我甚至研究过在 iPhone 上安装 Android。GitHub 上确实有针对旧 iPhone 的 Android 移植研究，但对当前系统版本的日用 iPhone 来说，这远不是一条现实的微信双开路线。

后来找到 [LiveContainer](https://github.com/LiveContainer/LiveContainer)。它的思路完全不同：不运行第二套操作系统，而是把其他 iOS 应用作为 Guest App 装载到自己的运行环境中。

## 二、本次使用的工具

| 组件 | 作用 | 本次情况 |
|---|---|---|
| iPhone / iOS | 真机运行环境 | iOS 26.2 |
| Mac | 安装工具与签名配合 | 已有 Xcode 开发环境 |
| [AltServer / AltStore](https://altstore.io/) | 侧载 LiveContainer，管理免费开发签名 | 已成功安装 |
| [LiveContainer](https://github.com/LiveContainer/LiveContainer) | 导入、承载并启动 Guest App | 已成功安装 |
| [FChat IPA](https://github.com/Taosky/unsigned-ipa-cn/releases/tag/fchat) | 修改版微信安装包 | 使用 `fchat_8.0.71.ipa` |
| 官方微信 | 第一个账号 | 保留 App Store 版本 |

FChat 不是腾讯官方发行的微信客户端，是第三方修改过的 IPA。我使用它完成了实验，但不建议把来源不明的修改包当作安全可信的日常客户端。

## 三、实操过程

### 1. 在 Mac 上安装 AltServer

先从 [AltStore 官网](https://altstore.io/) 下载适用于 macOS 的 AltServer，也可以阅读 [macOS 官方安装说明](https://faq.altstore.io/altstore-classic/how-to-install-altstore-macos)。

解压后启动 AltServer，它会常驻 Mac 顶部菜单栏。第一次点击 `Install AltStore` 时，我看到的是 `No Connected Devices`，这表示 AltServer 尚未识别到 iPhone。

处理方法是使用数据线连接 iPhone，解锁手机，在弹出的信任提示里选择信任，再打开 Mac 的 Finder，确认左侧“位置”里能看到这台 iPhone。设备识别成功后，从菜单栏选择：

```text
AltServer
  └── Install AltStore
        └── <Your iPhone>
```

按安装向导完成 Apple 账户签名。不要把 Apple ID 密码或签名证书密码交给第三方 IPA 发布者。

### 2. 在 iPhone 上安装 AltStore

AltStore 安装后，如果系统提示需要信任开发者应用，进入：

```text
设置 → 通用 → VPN 与设备管理
```

找到对应的开发者应用并按系统提示信任。如果系统要求开启开发者模式，则在“设置 → 隐私与安全性 → 开发者模式”完成操作。

这里有两个容易混淆的概念：**AltServer 是 Mac 上配合安装的服务端工具，AltStore 才是 iPhone 上负责安装 IPA 的 App。**

### 3. 下载并安装 LiveContainer

我从 [LiveContainer Releases](https://github.com/LiveContainer/LiveContainer/releases) 下载普通版：

```text
LiveContainer.ipa
```

没有选 `LiveContainer+SideStore.ipa`，因为我已经走通的是 AltServer + AltStore 路线。

将文件传到 iPhone 后，打开 AltStore 的 `My Apps`，点击 `+`，选择下载的 IPA。安装完成后，iPhone 上出现 LiveContainer 图标。

### 4. 配置 LiveContainer 的签名及启动环境

打开 LiveContainer，在设置页面按版本界面提示导入来自 AltStore 的签名证书，并进行 JIT-Less 相关诊断。界面文字和配置方式可能随版本变化，优先对照 [LiveContainer 官方文档](https://livecontainer.github.io/docs/) 操作。

注意，**安装 LiveContainer 成功，不代表导入的所有 IPA 都能启动**。运行 Guest App 还会受到 IPA 加密状态、代码签名、动态库、系统权限以及应用自检逻辑的影响。

### 5. 下载 FChat IPA

这里我先查看了两个 GitHub 项目：

- [missuo / Inject-IPA](https://github.com/missuo/Inject-IPA/releases)：提供微信 8.0.42 等旧版修改包，带有第三方插件。
- [Taosky / unsigned-ipa-cn](https://github.com/Taosky/unsigned-ipa-cn/releases/tag/fchat)：提供 FChat 多开包和项目作者的修改说明。

最终我选择后者的：

```text
fchat_8.0.71.ipa
```

该文件在 GitHub Release 中的上传日期为 2026 年 6 月 2 日。**它是修改版，不是“官方纯净微信”**。不要把文件名中的新版本号理解为安全保证，也不要从不明网盘、私聊链接购买所谓“稳定微信多开证书”。

### 6. 导入并启动 FChat

下载 IPA 到 iPhone 的“文件”App 后：

```text
LiveContainer → Apps → + → 选择 fchat_8.0.71.ipa
                         → 导入 → 启动 FChat
```

我没有删除官方微信。最终在 FChat 里登录第二个独立微信号，**两套登录环境成功共存**。

需要特别区分“共存”和“两个 iOS 原生进程长期后台运行”：我验证的是**两套应用登录环境可以使用**，没有验证两个微信同时在后台独立运行或持续接收系统推送。

## 四、底层原理：为什么不越狱也能运行

整个链路可以概括为：

```text
macOS: AltServer
        │ Apple 开发签名 / 安装
        ▼
iPhone: AltStore
        │ 安装 IPA
        ▼
        LiveContainer（iOS 安装的宿主 App）
        │ 装载 Guest App / 调整运行时环境
        └── FChat（修改版微信）
                └── 微信账号 B

iPhone: 官方微信（独立安装）
        └── 微信账号 A
```

这里有三个不同层面的工作。

**第一层，代码签名。** AltStore 通过 Apple 开发者签名体系把 LiveContainer 安装到 iPhone，解决宿主 App 的安装问题。它不是 Android 模拟器，也不会解除 iOS 所有安全限制。

**第二层，应用装载。** LiveContainer 通过修改和加载 Mach-O 二进制、调整应用运行时环境，使部分 IPA 的可执行代码作为 Guest App 在宿主里运行。技术关键词包括 `Mach-O`、`MH_EXECUTE`、`MH_DYLIB`、`dlopen` 和运行时 Hook。实际实现不只是简单调用一次 `dlopen()`，还涉及签名、入口点、Bundle 信息、文件路径等兼容处理。

**第三层，应用身份和数据。** 官方微信通常使用 Bundle ID `com.tencent.xin`，而 FChat 的 Release 说明明确将包名修改为 `com.tencent.fchat`，还修改了图标和 URL Scheme，并注入 iPad 登录相关插件。LiveContainer 则提供独立数据容器，避免把两个微信的登录数据直接混在一起。

值得注意的是，**Bundle ID 改名本身并不等于完成了整个双开**。FChat 解决一部分应用身份冲突，LiveContainer 解决 Guest App 装载及数据环境问题，两者作用不同。

## 五、FChat 做了哪些修改

根据 [Taosky 的 FChat Release 说明](https://github.com/Taosky/unsigned-ipa-cn/releases/tag/fchat)，作者提到：

| 修改项 | 作用 |
|---|---|
| 使用已解密的 IPA | 便于重新打包 |
| 删除 `plugins`、`watch` 目录 | 调整应用扩展组成 |
| 修改图标和 Bundle ID | 区分应用，使用 `com.tencent.fchat` |
| 调整 URL Scheme | 支持 `fchat://`，降低协议冲突 |
| 注入 iPad 登录插件 | 提供 iPad 登录选项 |

这些是**仓库作者的公开描述**，不是我对 `fchat_8.0.71.ipa` 完成的完整二进制审计，不能据此断言安装包里不存在其他修改。第三方动态库如果加载到微信进程内，理论上有机会访问运行时消息和账户数据。

## 六、名额、签名和后台推送的限制

**免费签名名额。** Apple 免费 Personal Team 通常存在每台设备最多 3 个开发签名 App、临时签名约 7 天有效等限制。本次的 AltStore、LiveContainer，以及我通过 Xcode 安装的自研 App Atolla，都可能计入限制；具体还要看实际使用的开发团队和 App ID。LiveContainer 内部导入一个 Guest IPA，通常不等同于额外向 iOS 安装一个独立签名 App。

**付费 Apple Developer。** 付费会员能够提供更完整的签名和分发能力，但**不会自动让 LiveContainer 里的 FChat 获得独立 APNs 推送资格**。购买开发者账号不是解决后台消息通知的万能钥匙。

**后台推送。** LiveContainer 官方对 Guest App 远程推送存在明确限制，FChat Release 也注明无正常后台推送。也就是说，打开 FChat 看得到消息，不等于锁屏后消息还能像官方微信一样送达。这是目前不应该忽略的实际体验差异。

**安全和账号风险。** FChat 是非官方修改版，注入插件可能影响隐私、兼容性和账号安全。建议使用低风险测试账号，不要在未经审计的安装包里直接登录重要账号或进行支付操作。测试前备份重要聊天数据。

## 七、踩过的坑和怎么排查

| 现象 | 排查方向 |
|---|---|
| AltServer 显示 `No Connected Devices` | 先查数据线、iPhone 信任提示、Finder 是否识别 |
| AltStore 安装后打不开 | 检查 VPN 与设备管理、开发者模式 |
| LiveContainer 装好但 Guest App 启动失败 | 核对证书、JIT-Less 诊断、IPA 是否已解密 |
| 导入 IPA 后闪退 | 查看系统版本、签名、依赖动态库及 IPA 自身兼容性 |
| 微信能打开但登录失败 | 可能有旧版本限制、修改包检测或服务端校验，不能一概认定为签名问题 |
| 前台能收消息，后台收不到 | LiveContainer / FChat 已知推送限制 |
| 想再导入其他 IPA | LiveContainer 支持多个 Guest App，但不代表都能长期同时后台运行 |

排查时最好一次只改变一个变量：先验证普通测试 IPA 能否启动，再验证 FChat，最后再测登录、消息、通知与稳定性。

## 八、这次折腾最终证明了什么

我验证成功的是：

- 通过 AltServer + AltStore，在未越狱 iPhone 上安装 LiveContainer。
- 将第三方修改的 `fchat_8.0.71.ipa` 导入 LiveContainer。
- 保留官方微信，并在 FChat 登录第二个**独立微信账号**。

我**没有验证或证明**的是：全天后台可靠推送、双实例长期并行运行、全部系统权限正常、安装包不存在风险，或者方案对所有 iOS 版本通用。

这次最大的收获是弄清楚了：**iOS 微信双开不一定需要第二套系统。宿主 App 动态装载 + 数据容器 + 应用身份修改，就能在部分条件下实现。**

接下来如果继续研究，我更想拆 LiveContainer 的 Mach-O 加载过程，以及 FChat 注入的动态库，而不是继续收集更多陌生的魔改微信 IPA。

## 参考资料

- [AltStore 官网](https://altstore.io/)
- [AltStore 的 macOS 安装文档](https://faq.altstore.io/altstore-classic/how-to-install-altstore-macos)
- [LiveContainer 源码](https://github.com/LiveContainer/LiveContainer)
- [LiveContainer 官方文档](https://livecontainer.github.io/docs/)
- [Taosky / unsigned-ipa-cn — FChat Release](https://github.com/Taosky/unsigned-ipa-cn/releases/tag/fchat)
- [Taosky / unsigned-ipa-cn — README](https://github.com/Taosky/unsigned-ipa-cn)
- [missuo / Inject-IPA](https://github.com/missuo/Inject-IPA/releases)
