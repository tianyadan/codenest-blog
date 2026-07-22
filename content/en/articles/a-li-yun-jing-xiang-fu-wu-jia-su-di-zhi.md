---
title: Alibaba Cloud Registry Mirror Acceleration URL
summary: Apply for an Alibaba Cloud registry mirror and configure Docker to use it as an accelerator.
author: evan
category: work
tags: [Work Notes]
createdAt: 2026-04-09 11:08:28
updatedAt: 2026-04-09 11:08:28
readingMinutes: 1
---

# Alibaba Cloud Registry Mirror Acceleration URL

## Main Content

Visit: https://cr.console.aliyun.com/cn-beijing/instances/mirrors to apply for a mirror.

For Docker client versions later than 1.10.0, you can enable the accelerator by updating the daemon config file `/etc/docker/daemon.json`:

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
