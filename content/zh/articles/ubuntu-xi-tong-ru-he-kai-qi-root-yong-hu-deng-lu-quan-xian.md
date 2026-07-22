---
title: Ubuntu 系统如何开启 root 用户登录权限
summary: 1. 先使用ubuntu 用户登录服务器 2. 给 root 用户设置密码 ： sudo passwd root 3. 编辑 SSH 配置文件 sudo...
author: evan
category: work
tags: [工作总结, Ubuntu]
createdAt: 2026-01-19 17:21:02
updatedAt: 2026-01-19 17:21:02
readingMinutes: 1
---
# Ubuntu 系统如何开启 root 用户登录权限

## 记录

1.  先使用ubuntu 用户登录服务器

2. 给 root 用户设置密码 ：`sudo passwd root`

3. 编辑 SSH 配置文件 

- sudo vim /etc/ssh/sshd_config

找到这一行：`#PermitRootLogin prohibit-password`

替换成：`PermitRootLogin yes `

4. 重启 SSH 服务 ：` sudo systemctl restart ssh `
