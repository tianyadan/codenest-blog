---
title: Complete Guide to Deploying FRP Server (frps) on a Public Server with Auto-Start
summary: Deploy `frps` on a public cloud server, configure it to run stably in the background, and enable startup on boot for reverse proxy access from an internal network.
author: evan
category: learning
tags: [Learning]
createdAt: 2026-01-19 22:09:39
updatedAt: 2026-01-19 22:09:39
readingMinutes: 5
---

# Complete Guide to Deploying FRP Server (frps) on a Public Server with Auto-Start

## Supported Systems: Ubuntu 20.04 / 22.04 / 24.04

**Goal**:
Deploy `frps` on a public server such as Tencent Cloud or Alibaba Cloud,
make it **start automatically on boot and run stably in the background**,
and provide a reverse proxy entry point for internal network servers.

**Requirements**:

- The server security group has already opened:
- `7000` (`frps` control port)
- `6000` (example SSH mapping port, adjust as needed)

### Download the FRP Package (Public Server)

1. Go to the home directory

```bash
cd ~
```

2. Download `frp` (using `0.53.2` as an example)

```bash
wget https://github.com/fatedier/frp/releases/download/v0.53.2/frp_0.53.2_linux_amd64.tar.gz
```

3. Extract it

```bash
tar -zxvf frp_0.53.2_linux_amd64.tar.gz
```

4. Create the installation directory

```bash
mkdir -p /opt/frp
```

5. Copy the `frp` files into `/opt/frp`

```bash
cp -r ~/frp_0.53.2_linux_amd64/* /opt/frp/
```

6. Configure `frps` on the public server

```bash
vim /opt/frp/frps.ini
```

```text
[common]
bind_port = 7000
```

Notes:

- `7000`: control port used by `frpc` to connect to `frps`
- Mapping ports such as `6000` are determined by the internal `frpc` side

7. Start `frps` manually

```bash
cd /opt/frp
```

```bash
./frps -c frps.ini
```

Expected normal logs:

```text
frps tcp listen on 0.0.0.0:7000
frps started successfully
```

8. Create a `systemd` service for boot startup

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

9. Start it and enable auto-start

- 9.1 Reload `systemd`

```bash
systemctl daemon-reexec
systemctl daemon-reload
```

- 9.2 Start `frps`

```bash
systemctl start frps
```

- 9.3 Enable startup on boot

```bash
systemctl enable frps
```

10. Verify that `frps` is running successfully

- 10.1 Check service status

```bash
systemctl status frps
```

You must see:

```text
Active: active (running)
```

- 10.2 Check port listening

```bash
ss -lntp | grep frps
```

You should see:

```text
LISTEN 0 128 0.0.0.0:7000
```

## Final Result

- `frps` runs stably in the background
- It starts automatically after server reboot
- Internal network servers can connect through `frpc` at any time
- It can carry mappings for SSH, Web, API, and multiple other services
