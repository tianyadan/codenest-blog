---
title: Differences Between npm, cnpm, pnpm, and npx
summary: npm is Node.js's default package manager, cnpm mirrors npm packages in China, pnpm emphasizes shared package storage, and npx is great for running commands temporarily.
author: evan
category: work
tags: [Work Notes]
createdAt: 2025-09-10 13:00:23
updatedAt: 2025-09-10 13:00:23
readingMinutes: 1
---
# Differences Between npm, cnpm, pnpm, and npx

## Notes

npm is Node.js's default package manager, and it is also the most commonly used one.

cnpm is a mirror maintained by Taobao that copies npm packages from overseas servers to domestic servers in China. It works the same way as npm, but downloads are faster in that network environment.

pnpm stands for high performance. Its biggest difference is that packages can be shared across multiple projects, so they do not need to be downloaded every time, which saves disk space.

npx lets you run commands temporarily without installing the full toolchain globally or permanently. After execution, the temporary package can be removed automatically, which makes it suitable for one-off scenarios.
