---
title: Tauri 2 + GitLab Runner + Windows Server: Hard-Won Notes on Automatically Building MSI Installers (The Final Fix for WiX Download Failures)
summary: "I recently built a GitLab CI/CD pipeline for a Windows desktop client based on Tauri 2 and React. What looked simple at first turned into a chain of pitfalls: missing Rust tools, GitLab Runner permission issues, WiX download failures, and LocalSystem cache path surprises."
author: evan
category: work
tags: [Work Notes, Git, Tauri]
createdAt: 2026-06-09 16:41:25
updatedAt: 2026-06-09 16:41:25
readingMinutes: 11
---
# Tauri 2 + GitLab Runner + Windows Server: Hard-Won Notes on Automatically Building MSI Installers (The Final Fix for WiX Download Failures)

## Introduction

Recently I was setting up a GitLab CI/CD pipeline for a Windows desktop client built with Tauri 2 + React. The goal was:

```text
git push
    ↓
GitLab Runner
    ↓
Automatically build Windows EXE
    ↓
Automatically package MSI
    ↓
Generate installer
```

At first I thought installing GitLab Runner would be the end of it, but I hit several issues in a row:

- Rust environment not found
- GitLab Runner permission problems
- WiX automatic download failure
- Tauri MSI packaging failure
- Different cache directories for `LocalSystem` and `Administrator`
- WiX tool cache reuse problems

In the end, the whole pipeline worked.

This article records the full troubleshooting process.

---

# 1. Environment Information

Server:

```text
Windows Server 2022
```

Tech stack:

```text
React 19, Vite 7, Tauri 2, Rust, Stable, WiX Toolset 3.14, GitLab Runner
```

---

# 2. Install GitLab Runner

Download location:

```powershell
mkdir C:\GitLab-Runner
cd C:\GitLab-Runner
```

Register:

```powershell
gitlab-runner.exe register
```

Install the service:

```powershell
gitlab-runner.exe install
gitlab-runner.exe start
```

Check status:

```powershell
sc.exe query gitlab-runner
```

---

# 3. Rust Environment Problem

On the first build:

```text
cargo not found
```

Reason:

The GitLab Runner service could not read the current user's environment variables at runtime.

Verification:

```powershell
where cargo
where rustup
```

Solution:

Make sure Rust is installed in:

```text
C:\Users\Administrator\.cargo\bin
```

and added to the system environment variables.

Restart Runner:

```powershell
Restart-Service gitlab-runner
```

---

# 4. Tauri MSI Packaging Failure

On the first build:

```text
Downloading https://github.com/wixtoolset/wix3/releases/download/wix3141rtm/wix314-binaries.zip
Peer disconnected
```

Error:

```text
failed to bundle project
```

---

## Root Cause Analysis

When Tauri generates an MSI, it depends on:

```text
WiX Toolset 3.14
```

If the local cache does not contain `WixTools314`, it automatically downloads:

`wix314-binaries.zip`

from GitHub.

The server accessed GitHub very slowly.

The download eventually failed.

---

# 5. Install WiX Toolset

Download and install:

```text
wix314.exe
```

Verify after installation:

```powershell
where candle
where light
```

Output:

```text
C:\Program Files (x86)\WiX Toolset v3.14\bin\candle.exe
C:\Program Files (x86)\WiX Toolset v3.14\bin\light.exe
```

This showed that WiX was installed successfully.

---

# 6. Why Tauri Still Downloaded from GitHub After WiX Was Installed

Even though:

```powershell
where candle
where light
```

both worked normally, Tauri still executed:

```text
Downloading wix314-binaries.zip
```

Reason:

Tauri checks:

```text
%LOCALAPPDATA%\tauri\WixTools314
```

before it checks the system installation directory.

---

# 7. Find Tauri's Cache Directory

Check:

```powershell
echo $env:LOCALAPPDATA
```

Result:

```text
C:\Users\Administrator\AppData\Local
```

Then inspect:

```powershell
Get-ChildItem "$env:LOCALAPPDATA\tauri"
```

You will find:

```text
NSIS
WixTools314
```

---

# 8. Local Packaging Succeeded but CI Failed

Running locally:

```powershell
npm run tauri:build
```

succeeded.

But CI failed with:

```text
failed to run
C:\Windows\system32\config\systemprofile\AppData\Local\tauri\WixTools314\candle.exe
```

Reason:

GitLab Runner was running as the `LocalSystem` account.

Its cache directory was:

```text
C:\Windows\System32\config\systemprofile\AppData\Local\tauri
```

while the local build used:

```text
C:\Users\Administrator\AppData\Local\tauri
```

These are completely different directories.

---

# 9. Reuse the WiX Cache

Copy the cache directly:

```powershell
Copy-Item `
  "C:\Users\Administrator\AppData\Local\tauri\WixTools314" `
  "C:\Windows\System32\config\systemprofile\AppData\Local\tauri\" `
  -Recurse `
  -Force
```

Verify:

```powershell
Test-Path `
  "C:\Windows\System32\config\systemprofile\AppData\Local\tauri\WixTools314\candle.exe"
```

It returns: `True`

That means the cache reuse worked.

---

# 10. Final Build Success

The log now showed:

```text
Running candle ...
Running light ...
```

Then:

```text
Built application
```

Generated file:

```text
src-tauri\target\release\bundle\msi\EyunDesk_0.1.0_x64_en-US.msi
```

At this point, MSI automatic packaging was fully working.

---

# 11. Cache Optimization

At first, the cache configuration included:

```yaml
node_modules/
.cargo/
```

This caused:

```text
28000+
18000+
```

files to be compressed, which was extremely slow.

After optimization:

```yaml
cache:
  - .npm/
  - .cargo/registry/
  - .cargo/git/
```

Do not cache:

```yaml
node_modules/
target/
```

Build speed improved significantly.

---

# 12. Lessons Learned

## 1. WiX installed successfully != Tauri can detect it

Tauri prioritizes the cache directory:

```text
%LOCALAPPDATA%\tauri\WixTools314
```

---

## 2. The GitLab Runner service user is completely isolated from the current user

Always verify:

```powershell
whoami
echo $env:LOCALAPPDATA
```

---

## 3. Do not cache `node_modules` on Windows

There are too many small files.

Caching can take longer than installing.

---

## 4. `LocalSystem` has its own AppData directory

Path:

```text
C:\Windows\System32\config\systemprofile\AppData\Local
```

---

## 5. The simplest solution

After a successful local build:

Directly copy the `WixTools314` cache for Runner to use.

This avoids repeated GitHub downloads.

---

# Final Result

Achieved:

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
Generate installer
```

The automated build pipeline for the Windows desktop application is now fully working.
