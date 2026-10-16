---
title: Mac 外接 AOC 1080P 显示器，折腾出 2560×1440 桌面实录
summary: 记录我如何用 macOS 虚拟屏和 HiDPI 脚本把 AOC 27B30H 的桌面拓宽，以及 60Hz 刷新率问题和恢复原生模式的方法。
author: evan
category: learning
tags: [macOS, AOC, HiDPI, 显示器, Shell]
createdAt: 2026-10-16
updatedAt: 2026-10-16
readingMinutes: 6
slug: macos-aoc-hidpi-2560x1440-scaling
---

# Mac 外接 AOC 1080P 显示器，折腾出 2560×1440 桌面实录

最近用 Mac 接了一台 AOC 27B30H，原生分辨率是 1920×1080，最高支持 100Hz。

平时写代码，IDE、终端、浏览器一起开，1080P 的桌面空间确实不太够。我就在想：不换显示器，能不能让 Mac 的桌面显示得更宽敞一点？

最后成功运行了这条命令：

```bash
~/.hidpi-scale/set-scale.sh large
```

终端返回：

```text
Monitor scaled: looks like 2560x1440
```

这篇记录我具体怎么做的、遇到了什么坑，以及后面怎么恢复。先说清楚：**这不是把一块 1080P 面板变成真正的 2K 面板**，只是改变 macOS 的逻辑桌面空间。

## 一、先说我的设备

| 项目 | 配置 |
| --- | --- |
| 电脑 | Apple Silicon Mac |
| 显示器 | AOC 27B30H |
| 原生分辨率 | 1920×1080 |
| 最高刷新率 | 100Hz |
| EDID VendorID | 1507 |
| EDID ProductID | 9987 |
| 目标效果 | 看起来像 2560×1440 |

物理分辨率是屏幕真实的像素数量，脚本改不了。逻辑分辨率是系统用来摆放窗口的坐标空间，可以通过缩放调整。

所以这套方案的重点是 **多显示一些内容**，不是让屏幕画质凭空升级。反过来说，文字有可能变小，细腻程度也不会等同于原生 2K 屏。

## 二、我用的是什么方案？

我的 Mac 上已经安装了放在 `/.hidpi-scale` 目录中的脚本。

它的思路是通过**虚拟显示器、HiDPI 缩放和多屏布局**来调整逻辑桌面，再映射到真实的 AOC 屏幕。脚本中可以看到一些显示器配置项：

```text
id:... res:... hz:... scaling:on origin:(...) degree:0
```

这里的 `id` 指显示器标识，`res` 指设置的分辨率，`hz` 是请求的刷新率，`scaling:on` 是缩放设置，`origin` 是显示器在虚拟桌面中的位置。

脚本还会处理多个虚拟屏幕的位置，不是单纯调用系统 API 把外接屏从 1080P 改成 2K。

**注意**：以下命令针对我本机已有的脚本。没有安装同样工具的电脑，不能直接运行。也不要随意运行来源不明的 Shell 脚本。

## 三、先让脚本识别 AOC

这台 AOC 对应的配置是：

```text
1507:9987:1920x1080
```

我使用的型号配置文件是：

```bash
~/.hidpi-scale/models.conf
```

先检查文件，避免重复追加：

```bash
cat ~/.hidpi-scale/models.conf
```

如果没有对应的一行，再执行：

```bash
echo "1507:9987:1920x1080" >> ~/.hidpi-scale/models.conf
```

随后重新加载对应的用户级服务：

```bash
launchctl kickstart -k gui/$(id -u)/com.hidpiscale
```

这个服务属于当前脚本方案，并不是 macOS 自带的通用服务。如果提示找不到服务，需要先检查工具是否安装成功。

## 四、正式把桌面拓宽

这套脚本提供了三个模式：

```bash
~/.hidpi-scale/set-scale.sh medium
~/.hidpi-scale/set-scale.sh large
~/.hidpi-scale/set-scale.sh native
```

我想要更大的桌面空间，所以运行：

```bash
~/.hidpi-scale/set-scale.sh large
```

得到：

```text
Monitor scaled: looks like 2560x1440
```

看起来像 2560×1440，意味着逻辑桌面空间增加了。对于 IDE、浏览器和终端并排显示很有用。

但这只是脚本反馈的结果。是否成功输出了预期的画面，以及最终的刷新率是多少，仍然要看系统的显示模式和实际显示效果。

## 五、踩坑：100Hz 屏幕，脚本里却有一堆 60Hz

我的 AOC 最高支持 100Hz，结果排查脚本时发现里面写死了不少 `hz:60`。

我当时运行的排查命令：

```bash
grep -RnE 'refreshRate:60|hz:60|60Hz' \
  ~/.hidpi-scale \
  --include='*.sh' \
  --include='*.m'
```

找到过这些位置：

```text
set-scale.sh:102: ... hz:60 scaling:on ...
set-scale.sh:103: ... hz:60 scaling:on ...
set-scale.sh:104: ... hz:60 scaling:on ...
set-scale.sh:105: ... hz:60 scaling:on ...
set-scale.sh:121: ... hz:100 scaling:on ...
```

也就是说，脚本里 **60Hz 和 100Hz 是混用的**。

曾考虑过直接把所有 60Hz 替换为 100Hz。不过这里要特别提醒：**物理屏支持 100Hz，不代表脚本中的每块虚拟屏都支持 100Hz。** 全局替换可能造成模式不兼容，甚至黑屏。

动手前，先备份：

```bash
cp ~/.hidpi-scale/set-scale.sh ~/.hidpi-scale/set-scale.sh.bak
```

再检查原脚本：

```bash
grep -n 'hz:60' ~/.hidpi-scale/set-scale.sh
```

如果已经确认对应模式支持 100Hz，可以修改相应的行。此前考虑的批量替换命令是：

```bash
sed -i '' 's/hz:60/hz:100/g' ~/.hidpi-scale/set-scale.sh
```

**不建议未经检查直接执行上面的批量替换。** 更稳妥的做法，是先分清哪些是 AOC 物理屏配置、哪些是虚拟屏配置，再按实际支持的模式修改。

修改后，重新执行：

```bash
~/.hidpi-scale/set-scale.sh large
```

检查显示模式：

```bash
displayplacer list
```

同时打开 **系统设置 → 显示器**，查看 macOS 当前允许选择的刷新率。

我这次的操作记录能确认两件事：脚本里出现过 60Hz / 100Hz 混用；运行 large 后，终端返回了「looks like 2560x1440」。但还没有足够的实际输出数据，能证明这个模式最终稳定运行在 100Hz。这里就不硬说成功了。

## 六、怎么恢复到原来的状态？

这部分非常重要，建议先了解恢复方法，再动刷新率和分辨率。

### 方式一：切回原生模式

```bash
~/.hidpi-scale/set-scale.sh native
```

这是当前脚本提供的恢复入口，目标是回到原生显示模式。执行后再检查系统设置，确认 AOC 是否回到 1920×1080。

这次发出来的日志只展示了 `large` 的执行结果，并没有展示 `native` 的恢复结果，因此恢复效果还需要在实际设备上确认。

### 方式二：从 macOS 系统设置恢复

打开：

```text
系统设置 → 显示器 → AOC 显示器
```

选择原生 1920×1080 模式，刷新率选择系统列出的、显示器支持的模式。

如果突然黑屏，先不要盲目重复运行脚本。可以断开外接显示器，利用 Mac 内建屏幕检查配置，再重新连接 AOC。

### 方式三：撤销对脚本的改动

前面如果备份过 `set-scale.sh.bak`，就可以把修改过的脚本还原：

```bash
cp ~/.hidpi-scale/set-scale.sh.bak ~/.hidpi-scale/set-scale.sh
~/.hidpi-scale/set-scale.sh native
```

如果打算彻底卸载当前方案，安装目录里还提供了：

```bash
~/.hidpi-scale/uninstall.sh
```

卸载之前最好先检查脚本内容，弄清楚它会清理哪些服务和配置。**恢复分辨率不等于必须卸载工具**。

## 七、为什么终端一直出现「恢复于……」？

我后面的终端日志还出现了几次：

```text
[恢复于2026年10月16日 08:44:01]
Last login: Fri Oct 16 08:43:57 on console
Restored session: 2026年10月16日 星期五 08时38分56秒 CST
```

刚看到时，我也容易把它和显示器切换联系起来。

实际上，这类信息是 **macOS 终端登录及会话恢复记录**，不是 HiDPI 脚本的输出。仅凭这些内容，不能判断是屏幕发生了重置，也不能证明脚本导致系统异常。如果终端频繁重启，还需要另外排查进程、用户会话和系统日志。

## 八、最后总结

这次最有用的就是下面三个命令：

```bash
# 让桌面空间更宽敞
~/.hidpi-scale/set-scale.sh large

# 换成中等缩放
~/.hidpi-scale/set-scale.sh medium

# 恢复原生模式
~/.hidpi-scale/set-scale.sh native
```

我的实际结果是：运行 `large` 后脚本报告「looks like 2560x1440」，达到了调整逻辑桌面尺寸的目的。

如果你也是 1080P 外接屏，想让 IDE、浏览器、终端同时摆得下，这类方案值得研究。不过，**先保证清晰度和显示稳定，再去追求刷新率**。折腾半天让桌面变大，结果字看不清、100Hz 还变成 60Hz，就有点得不偿失了。

后面如果补齐实际刷新率和显示输出的验证结果，我会继续更新这篇记录。
