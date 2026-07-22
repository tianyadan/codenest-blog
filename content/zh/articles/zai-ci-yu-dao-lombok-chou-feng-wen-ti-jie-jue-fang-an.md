---
title: 再次遇到 lombok 抽风问题解决方案
summary: 不知道为什么 idea 总是自动改我本地的 java 编译版本 。明明是选的 17 就自己变成了 25 . 然后lombok 就疯狂编译失败 ，compi...
author: evan
category: work
tags: [工作总结]
createdAt: 2026-03-23 23:05:16
updatedAt: 2026-03-23 23:05:16
readingMinutes: 2
---
# 再次遇到 lombok 抽风问题解决方案

## 正文

不知道为什么 idea 总是自动改我本地的 java 编译版本 。明明是选的 17 就自己变成了 25 . 然后lombok 就疯狂编译失败 ，compile 失败 ，package 失败 ... 折腾了大半天 ，最终还是问题锁定在 
编译的 java 版本要一致 。 

![截屏2026-03-23 23.03.57](https://codenest.oss-cn-qingdao.aliyuncs.com/images/2026/03/23/0b61da1e-0793-431e-beeb-f34ae2c8c119.png)

![截屏2026-03-23 23.04.07](https://codenest.oss-cn-qingdao.aliyuncs.com/images/2026/03/23/dd0f977e-feb7-48bb-9bfc-ce0940c34881.png)

都改成 17 不要用 25 就编译过了 ... 又是抽风的一天 。
