---
title: 用 Beszel 接好多台 Linux 服务器的监控
summary: 一套 Beszel Hub 管多台 Agent。记录 Hub 部署、本机套接字接入、远程探针、LVM 磁盘、离线导镜像，以及我实际在用的告警阈值，方便以后按同样方式再装一套。
author: evan
category: work
tags: [工作总结, Beszel, Docker, 监控, Linux]
createdAt: 2026-09-21
updatedAt: 2026-09-21
readingMinutes: 12
slug: beszel-server-monitoring-deployment
---

# 用 Beszel 接好多台 Linux 服务器的监控

机器一多，靠临时登录看 `top` 和 `df` 会漏掉两件事：磁盘是慢慢满的，容器是某一台先打满的。我用 Beszel 把这层补上。它比较轻，一个 Hub 负责页面、历史和告警，每台 Linux 上跑一个 Agent，采集 CPU、内存、磁盘、网络，挂上 Docker socket 之后还能看到容器占用。下面按我现在这套 Linux + Docker 的接法写，默认对外端口是 `17777`，换环境时改掉即可。文里的地址、密钥都是占位符，真实的 KEY 和 TOKEN 不要进仓库。

## 为什么是一套 Hub，而不是每台各看各的 📡

管理节点只放一个 Hub，浏览器只打开这一处。被监控的机器各自跑 Agent，互不共用密钥。Hub 和 Agent 可以在同一台，也可以分开。同一台时走 Unix socket，少开一个端口；远程机器走 Agent 默认的 `45876`。容器指标不是额外再装一套 cAdvisor，而是把 `/var/run/docker.sock` 以只读方式挂进 Agent。这个 socket 权限不低，只给自己部署的 Agent，不给别的容器复用。

结构就是这样：

```text
管理节点
└─ Beszel Hub :<HUB_PORT>          默认我用 17777
   └─ 可选：本机 Agent（Unix socket）

被监控节点
└─ Beszel Agent
   ├─ CPU / Memory / Disk / Network
   └─ Docker 容器（只读挂载 docker.sock）
```

Hub 容器里面仍然听 `8090`，这是镜像自己的端口。对外我映射成 `17777`，避免和别的服务抢 80 或 8080，也方便在防火墙上单独放行内网。

## 装之前先看 Compose 是哪一版

```bash
docker --version
docker compose version
docker-compose --version
```

有 Docker Compose V2 就用 `docker compose up -d`。有些老机器只剩 V1 的 `docker-compose` 1.29.2，命令换成 `docker-compose up -d` 也能跑，但重建容器时会踩坑，后面单独写。下面的命令按 V1 来写，因为我这边有的服务器还是这个版本；有 V2 的话把中间的横线去掉即可。

## 镜像：能拉就拉，不能拉就从 Mac 转 📦

服务器能访问 Docker Hub 时直接拉：

```bash
docker pull henrygd/beszel:latest
docker pull henrygd/beszel-agent:latest
```

不能访问时，我在自己的 Mac 上拉好再传过去。Apple Silicon 默认会拉 arm64，Linux 服务器是 x86_64，不指定平台的话，传上去也起不来。必须带 `linux/amd64`：

```bash
docker pull --platform=linux/amd64 henrygd/beszel:latest
docker pull --platform=linux/amd64 henrygd/beszel-agent:latest

docker save -o beszel-all-amd64.tar \
  henrygd/beszel:latest \
  henrygd/beszel-agent:latest
```

传到 Hub 机器再导入。账号和 IP 用自己的，不要把 root 和内网地址写死在文档里：

```bash
scp beszel-all-amd64.tar <USER>@<HUB_IP>:/opt/beszel/

# 在服务器上
docker load -i /opt/beszel/beszel-all-amd64.tar
docker images | grep beszel
```

`docker images` 里能看到 `henrygd/beszel` 和 `henrygd/beszel-agent`，再继续写 Compose。

## 先把 Hub 拉起来

```bash
mkdir -p /opt/beszel
cd /opt/beszel
```

最小配置只跑 Hub，数据落在当前目录，升级或迁移时备份 `beszel_data` 即可。日志限制写在这里，是为了避免 json 日志把根分区写满，监控自己把盘打满就本末倒置了。

```yaml
services:
  beszel:
    image: henrygd/beszel:latest
    container_name: beszel
    restart: unless-stopped
    environment:
      APP_URL: "http://<HUB_IP>:17777"
    ports:
      - "17777:8090"
    volumes:
      - ./beszel_data:/beszel_data
      - ./beszel_socket:/beszel_socket
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"
```

```bash
docker-compose up -d
docker ps | grep beszel
docker logs --tail=100 beszel
```

浏览器打开 `http://<HUB_IP>:17777`，第一次进去创建管理员。这个端口只放内网，或者前面再加 Nginx 和 HTTPS，不要直接对公网开。

## 同一台机器上的 Agent 走 socket

Hub 页面里点「添加系统」。Agent 就在 Hub 这台机器上时，主机不要填 IP，填 socket 路径，端口保持页面默认的 `45876` 即可，真正通信走的是文件：

- 名称：按角色起，例如 `hub-node`，不要用带内网编号的主机名
- 主机/IP：`/beszel_socket/beszel.sock`
- 端口：默认 `45876`

页面会给出这一台专用的 KEY 和 TOKEN。每台系统各一把，不能互相拷贝。把 Hub 的 Compose 扩成下面这样，注意 `LISTEN` 和页面里填的路径一致，`network_mode: host` 让 Agent 看到宿主机的网卡和端口，而不是容器自己的网卡。

```yaml
services:
  beszel:
    image: henrygd/beszel:latest
    container_name: beszel
    restart: unless-stopped
    environment:
      APP_URL: "http://<HUB_IP>:17777"
    ports:
      - "17777:8090"
    volumes:
      - ./beszel_data:/beszel_data
      - ./beszel_socket:/beszel_socket
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"

  beszel-agent:
    image: henrygd/beszel-agent:latest
    container_name: beszel-agent
    restart: unless-stopped
    network_mode: host
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - ./beszel_agent_data:/var/lib/beszel-agent
      - ./beszel_socket:/beszel_socket
    environment:
      LISTEN: "/beszel_socket/beszel.sock"
      KEY: "<KEY>"
      TOKEN: "<TOKEN>"
      HUB_URL: "http://<HUB_IP>:17777"
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"
```

只重建 Agent，不必把 Hub 也重启掉：

```bash
docker rm -f beszel-agent 2>/dev/null || true
docker-compose up -d beszel-agent
docker logs --tail=100 beszel-agent
```

页面上这一台变成 Online，本机才算接上。

## 远程机器一台一个 Agent

在 Hub 里再添加系统，主机填那台服务器的内网 IP，复制这一台自己的 KEY 和 TOKEN。到目标机器上：

```bash
mkdir -p /opt/beszel-agent
cd /opt/beszel-agent
```

远程没有和 Hub 共享 socket 目录，所以 `LISTEN` 用端口 `45876`，Hub 页面里填的端口要和这里一致。防火墙只需要允许 Hub 访问这个端口，不必对所有来源开放。

```yaml
services:
  beszel-agent:
    image: henrygd/beszel-agent:latest
    container_name: beszel-agent
    restart: unless-stopped
    network_mode: host
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - ./beszel_agent_data:/var/lib/beszel-agent
    environment:
      LISTEN: "45876"
      KEY: "<该服务器的 KEY>"
      TOKEN: "<该服务器的 TOKEN>"
      HUB_URL: "http://<HUB_IP>:17777"
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"
```

```bash
docker-compose up -d
docker ps | grep beszel-agent
docker logs --tail=100 beszel-agent
curl -I http://<HUB_IP>:17777
```

`curl` 只是确认这台机器能访问 Hub。Agent 是否真的连上，以页面 Online 和 Agent 日志为准，不要只看容器是 Up。

## 磁盘不能只看默认的根分区 💾

Beszel 首页默认突出根分区。我这边不少机器是 LVM，`df -h` 和 `lsblk` 对一下才能知道该监控哪块：

```bash
df -h
lsblk -o NAME,KNAME,SIZE,TYPE,MOUNTPOINT
```

常见情况是 `dm-0` 挂在 `/`，`dm-1` 挂在 `/home`。数据其实在 `/home`，只盯根分区会误判。根分区用环境变量指给 Agent：

```yaml
FILESYSTEM: "dm-0"
```

`/home` 要额外挂进去。Beszel 认的是挂载点名字，不是再配一行环境变量。先准备一个空目录，再挂到 `/extra-filesystems/`，名字用 `设备名__展示名`：

```bash
mkdir -p /home/.beszel
```

```yaml
volumes:
  - /home/.beszel:/extra-filesystems/dm-1__Home:ro
```

Agent 日志里出现类似下面这一行，说明这块盘被认出来了。它不会冒充根分区，`root=false`：

```text
Detected disk name=Home ... io=dm-1 root=false
```

首页仍然以根分区为主，`/home` 要进这台服务器的详情页看。这个差异第一次很容易当成没生效。

## Compose V1 重建失败时怎么处理

`docker-compose` 1.29.2 在重建已有容器时，有时会直接报：

```text
KeyError: 'ContainerConfig'
```

这不是镜像坏了，是旧版 Compose 读现有容器配置时的兼容问题。删掉旧 Agent 再创建即可，Hub 如果没动就不要一起删：

```bash
docker ps -a | grep beszel-agent
docker rm -f beszel-agent
docker-compose up -d beszel-agent
```

能升级的机器还是换到 Compose V2，省得每次改环境变量都走一遍删除。

## 告警我按这个阈值开

阈值不是越紧越好。CPU 短时打满很常见，所以要求持续 5 分钟；磁盘留出清理窗口，80% 先警告，90% 再严重。系统离线单独打开，Agent 挂了比某一次 CPU 尖峰更值得马上看。

| 指标 | Warning | Critical |
|------|---------|----------|
| CPU | ≥ 90%，持续 5 分钟 | 按业务再加 |
| 内存 | ≥ 85% | ≥ 90% |
| 磁盘 | ≥ 80% | ≥ 90% |
| 系统离线 | 开启 | — |

## 下次再装一套，按这个顺序

1. 准备镜像。能上网就 `docker pull`；不能上网就在 Mac 上加 `--platform=linux/amd64`，`docker save` 之后传到服务器 `docker load`。
2. 在 `/opt/beszel` 写 Hub 的 Compose，`docker-compose up -d`，浏览器打开 `http://<HUB_IP>:17777` 建管理员。
3. 页面里「添加系统」，每台单独的 KEY / TOKEN，不要复用。
4. 本机 Agent 用 socket；远程机器在 `/opt/beszel-agent` 听 `45876`。
5. 看 `docker logs --tail=100 beszel-agent`，页面要是 Online。
6. `df -h` 和 `lsblk` 确认根分区的 KNAME，写进 `FILESYSTEM`。额外磁盘挂到 `/extra-filesystems`。
7. 打开 CPU、内存、磁盘和离线告警。`beszel_data` 定期备份。

平时排障就这几条：`docker-compose ps` 看状态，`docker logs --tail=100 beszel` 和 `beszel-agent` 看日志，`df -h`、`lsblk`、`docker system df` 看是系统盘满了还是镜像缓存占的。KEY、TOKEN 和 Hub 管理员密码留在自己的记录里，不要写进这份能公开的笔记。
