---
title: 如何给自己网站替换即将过期的SSL 证书？
summary: "1. 前往第三方云服务商申请免费的 SSL 证书。 2. 下载 nginx 证书，去个人开发服务器全局搜索 : 3. 找到证书挂载的服务器目录，删除证书以..."
author: evan
category: work
tags: [工作总结]
createdAt: 2025-11-16 20:43:31
updatedAt: 2025-11-16 20:43:31
readingMinutes: 1
---
# 如何给自己网站替换即将过期的SSL 证书？

## 记录

1. 前往第三方云服务商申请免费的 SSL 证书。

2. 下载 nginx 证书，去个人开发服务器全局搜索 :

```bash
find / -type f -name "xxxx.com.cn.key" 2>/dev/null
```

```bash
find / -type f -name "xxxx.com.cn.pem" 2>/dev/null
```

3.  找到证书挂载的服务器目录，删除证书以及对应的 bak 备份文件。

4. 上传新证书，重启nginx 镜像即可。
