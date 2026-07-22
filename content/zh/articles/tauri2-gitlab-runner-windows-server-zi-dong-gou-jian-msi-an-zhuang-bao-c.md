---
title: Tauri2 + GitLab Runner + Windows Server 自动构建 MSI 安装包踩坑实录（WiX 下载失败终极解决方案）
summary: 最近在给 Windows 桌面客户端（Tauri 2 + React）搭建 GitLab CI/CD 流水线，希望实现： 原以为只是安装个 GitLab...
author: evan
category: work
tags: [工作总结, Git, Tauri]
createdAt: 2026-06-09 16:41:25
updatedAt: 2026-06-09 16:41:25
readingMinutes: 11
---
# Tauri2 + GitLab Runner + Windows Server 自动构建 MSI 安装包踩坑实录（WiX 下载失败终极解决方案）

## 前言

最近在给 Windows 桌面客户端（Tauri 2 + React）搭建 GitLab CI/CD 流水线，希望实现：

```text 
git push     
↓ 
GitLab Runner     
↓ 
自动构建 Windows EXE     
↓ 
自动打包 MSI     
↓ 
生成安装包 
```

原以为只是安装个 GitLab Runner 就结束了，结果连续踩了好几个坑：

- Rust 环境找不到
- GitLab Runner 权限问题
- WiX 自动下载失败
- Tauri MSI 打包失败
- LocalSystem 与 Administrator 缓存目录不同
- WiX 工具缓存复用问题

最终成功打通整个流水线。

本文记录完整排查过程。

---

# 一、环境信息

服务器：

```text 
Windows Server 2022 
```

技术栈：

```text
React 19 、Vite 7 、 Tauri 2 、Rust、 Stable、 WiX 、Toolset 3.14 、 GitLab Runner 
```

---

# 二、安装 GitLab Runner

下载：

```powershell 
mkdir C:\GitLab-Runner  
cd C:\GitLab-Runner 
```

注册：

```powershell 
gitlab-runner.exe register 
```

安装服务：

```powershell 
gitlab-runner.exe install gitlab-runner.exe start 
```

查看状态：

```powershell 
sc.exe query gitlab-runner 
```

---

# 三、Rust 环境问题

第一次构建时：

```text 
cargo not found 
```

原因：

GitLab Runner 服务运行时读取不到当前用户环境变量。

验证：

```powershell 
where cargo where rustup 
```

解决：

确保 Rust 安装在：

```text 
C:\Users\Administrator\.cargo\bin 
```

并加入系统环境变量：

重启 Runner：

```powershell 
Restart-Service gitlab-runner 
```

---

# 四、Tauri MSI 打包失败

第一次构建：

```text 
Downloading https://github.com/wixtoolset/wix3/releases/download/wix3141rtm/wix314-binaries.zip  
Peer disconnected 
```

错误：

```text 
failed to bundle project 
```

---

## 原因分析

Tauri 生成 MSI 时依赖：

```text 
WiX Toolset 3.14 
```

如果本地没有缓存：  `WixTools314 `

会自动从 GitHub 下载：wix314-binaries.zip 

服务器访问 GitHub 速度极慢。

最终下载失败。

---

# 五、安装 WiX Toolset

下载安装：

 wix314.exe 

安装后验证：

```powershell 
where candle 
where light 
```

输出：

```text 
C:\Program Files (x86)\WiX Toolset v3.14\bin\candle.exe 
C:\Program Files (x86)\WiX Toolset v3.14\bin\light.exe 
```

说明安装成功。

---

# 六、为什么安装了 WiX 仍然下载 GitHub

即使安装成功：

```powershell 
where candle 
where light
```

都正常。

Tauri 依然会执行：

```text 
Downloading wix314-binaries.zip 
```

原因：

Tauri 优先读取：

```text 
%LOCALAPPDATA%\tauri\WixTools314 
```

而不是系统安装目录。

---

# 七、找到 Tauri 缓存目录

查看：

```powershell 
echo $env:LOCALAPPDATA 
```

得到：

```text 
C:\Users\Administrator\AppData\Local
```

查看：

```powershell 
Get-ChildItem "$env:LOCALAPPDATA\tauri" 
```

发现：

```text 
NSIS WixTools314 
```

---

# 八、本机打包成功但 CI 失败

本机执行：

```powershell 
npm run tauri:build 
```

成功。

CI 执行：

```text 
failed to run 
C:\Windows\system32\config\systemprofile\AppData\Local\tauri\WixTools314\candle.exe 
```

原因：

GitLab Runner 使用：` LocalSystem `账号运行。

其缓存目录：

```text 
C:\Windows\System32\config\systemprofile\AppData\Local\tauri 
```

而本机使用：

```text 
C:\Users\Administrator\AppData\Local\tauri 
```

是两个完全不同的目录。

---

# 九、复用 WiX 缓存

直接复制缓存：

```powershell 
Copy-Item ` "C:\Users\Administrator\AppData\Local\tauri\WixTools314" ` "C:\Windows\System32\config\systemprofile\AppData\Local\tauri\" ` -Recurse ` -Force 
```

验证：

```powershell 
Test-Path ` "C:\Windows\System32\config\systemprofile\AppData\Local\tauri\WixTools314\candle.exe" 
```

返回：True 

说明缓存复用成功。

---

# 十、最终构建成功

日志出现：

```text 
Running candle ... 
Running light ... 
```

然后：

```text 
Built application 
```

生成：

```text 
src-tauri\target\release\bundle\msi\EyunDesk_0.1.0_x64_en-US.msi 
```

至此 MSI 自动构建完成。

---

# 十一、缓存优化

最开始缓存：

```yaml 
node_modules/ 
.cargo/ 
```

导致：

```text 
28000+ 
18000+ 
```

文件压缩。

极慢。

优化后：

```yaml 
cache:   
- .npm/   
- .cargo/registry/   
- .cargo/git/
```

不缓存：

```yaml 
node_modules/ 
target/
```

构建速度明显提升。

---

# 十二、经验总结

## 1. WiX 安装成功 ≠ Tauri 能识别

Tauri 优先读取：

 ```text 
 %LOCALAPPDATA%\tauri\WixTools314 
 ```

缓存。

---

## 2. GitLab Runner 服务用户与当前用户完全隔离

一定确认：

```powershell 
whoami echo $env:LOCALAPPDATA 
```

---

## 3. Windows 上不要缓存 node_modules

文件太碎。

缓存时间可能比安装时间更长。

---

## 4. LocalSystem 有自己的 AppData

目录：

```text 
C:\Windows\System32\config\systemprofile\AppData\Local
```

---

## 5. 最简单的方案

本机打包成功后：

直接复制：

` WixTools314 `

缓存给 Runner 使用。

避免重复下载 GitHub。

---

# 最终成果

实现：

```text 
git push     
↓ 
GitLab CI     
↓ 
npm ci     
↓ 
cargo build --release     
↓ 
tauri build     
↓ 
WiX MSI     
↓ 
生成安装包 
```

成功打通 Windows 桌面应用自动构建流水线。
