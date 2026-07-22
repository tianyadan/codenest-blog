---
title: "FRP 公网服务器（frps）部署 & 开机自启动完整教程"
summary: 目标 ： 在 公网服务器（腾讯云 / 阿里云） 上部署 frps， 实现 开机自启动 + 后台稳定 运行， 为内网服务器提供反向代理入口。 需求 ： 服务...
author: evan
category: learning
tags: [学习]
createdAt: 2026-01-19 22:09:39
updatedAt: 2026-01-19 22:09:39
readingMinutes: 5
---
# FRP 公网服务器（frps）部署 & 开机自启动完整教程

## 适用系统：Ubuntu 20.04 / 22.04 / 24.04

**目标** ：
在 公网服务器（腾讯云 / 阿里云） 上部署 frps，
实现 **开机自启动 + 后台稳定** 运行，
为内网服务器提供反向代理入口。

**需求**：
- 服务器安全组已放行：
- 7000（frps 控制端口）
- 6000（示例：SSH 映射端口，可按需）

### 下载 FRP 安装包（公网服务器）

1. 进入 home 目录

```bash
cd ~
```

2. 下载 frp（以 0.53.2 为例）

```bash
wget https://github.com/fatedier/frp/releases/download/v0.53.2/frp_0.53.2_linux_amd64.tar.gz
```

3. 解压

```bash
tar -zxvf frp_0.53.2_linux_amd64.tar.gz
```

4. 创建安装目录

```bash
mkdir -p /opt/frp
```

5. 拷贝 frp 文件到 /opt/frp

```bash
cp -r ~/frp_0.53.2_linux_amd64/* /opt/frp/
```

6. 配置 frps（公网服务器）

```bash
vim /opt/frp/frps.ini
```

```text
[common]
bind_port = 7000
```

 说明
- 7000：frpc 连接 frps 的控制端口
- 映射端口（如 6000）由 内网 frpc 决定

7. **手动启动 frps**

```bash
cd /opt/frp
```

```bash
./frps -c frps.ini
```

 正常日志：

```text
frps tcp listen on 0.0.0.0:7000
frps started successfully
```

8. 创建 systemd 服务（系统自启动）

```bash
vim /etc/systemd/system/frps.service
```

```text
[Unit]
Description=FRP Server Service
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/frp
ExecStart=/opt/frp/frps -c /opt/frp/frps.ini
Restart=always
RestartSec=5
LimitNOFILE=1048576

[Install]
WantedBy=multi-user.target
```

9. 启动并设置开机自启

- 9.1  重新加载 systemd

```bash
systemctl daemon-reexec
systemctl daemon-reload
```

- 9.2 启动 frps

```
systemctl start frps
```

- 9.3 设置开机自启

```
systemctl enable frps
```

10. 验证 frps 是否运行成功

- 10.1  查看服务状态

```bash
systemctl status frps
```

必须看到：

```text
Active: active (running)
```

- 10.2 查看端口监听

```bash
ss -lntp | grep frps
```

应看到：

```
LISTEN 0 128 0.0.0.0:7000
```

十、最终效果
- frps 在 后台稳定运行
- 服务器重启后 自动启动
- 内网服务器可随时通过 frpc 连接
- 可承载 SSH / Web / API / 多服务映射
