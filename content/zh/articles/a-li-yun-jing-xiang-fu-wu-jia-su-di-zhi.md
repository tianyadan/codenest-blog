---
title: 阿里云镜像服务加速地址
summary: "访问 ：https://cr.console.aliyun.com/cn beijing/instances/mirrors 去申请。 针对Docker客..."
author: evan
category: work
tags: [工作总结]
createdAt: 2026-04-09 11:08:28
updatedAt: 2026-04-09 11:08:28
readingMinutes: 1
---
# 阿里云镜像服务加速地址

## 正文

访问 ：https://cr.console.aliyun.com/cn-beijing/instances/mirrors 去申请。 
 
针对Docker客户端版本大于 1.10.0 的用户

您可以通过修改daemon配置文件/etc/docker/daemon.json来使用加速器
```bash
sudo mkdir -p /etc/docker
sudo tee /etc/docker/daemon.json <<-'EOF'
{
  "registry-mirrors": ["https://xxxxx.mirror.aliyuncs.com"] 
}
EOF
sudo systemctl daemon-reload
sudo systemctl restart docker
```
