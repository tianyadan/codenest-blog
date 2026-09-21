---
title: Monitoring Several Linux Hosts with Beszel
summary: One Beszel Hub and an Agent per host. Notes on the Hub, the local socket Agent, remote probes, LVM disks, offline image transfer, and the alert thresholds I actually use, so the same setup can be repeated later.
author: evan
category: work
tags: [Work Notes, Beszel, Docker, Monitoring, Linux]
createdAt: 2026-09-21
updatedAt: 2026-09-21
readingMinutes: 12
slug: beszel-server-monitoring-deployment
---

# Monitoring Several Linux Hosts with Beszel

Once there are more than a couple of machines, checking `top` and `df` by hand misses two slow failures: a disk that fills over days, and one host whose containers are already tight. I filled that gap with Beszel. It stays small. One Hub holds the UI, history, and alerts. Each Linux host runs an Agent for CPU, memory, disk, and network. Mount the Docker socket read-only and the same Agent also reports container usage. This is the Linux + Docker layout I run now. The external port in the examples is `17777`; change it if the host already uses that port. Addresses, keys, and tokens below are placeholders. Do not commit real KEY or TOKEN values.

## One Hub, not a dashboard on every machine 📡

The management node runs a single Hub. The browser only talks to that one place. Each monitored host runs its own Agent, and each Agent gets its own key. Hub and Agent can share a machine or sit apart. On the same machine I use a Unix socket so there is no extra listen port. Remote hosts use the Agent default, `45876`. Container metrics do not need a separate cAdvisor install. The Agent gets `/var/run/docker.sock` mounted read-only. That socket is privileged, so it stays on the Agent I deploy and is not reused by other containers.

```text
Management node
└─ Beszel Hub :<HUB_PORT>          I use 17777
   └─ optional local Agent (Unix socket)

Monitored node
└─ Beszel Agent
   ├─ CPU / Memory / Disk / Network
   └─ Docker containers (docker.sock, read-only)
```

Inside the container the Hub still listens on `8090`. That is the image's own port. I publish it as `17777` so it does not collide with anything already on 80 or 8080, and so the firewall rule is obvious. The port stays on the internal network, or behind Nginx with HTTPS. It should not be open to the public internet.

## Check which Compose you actually have

```bash
docker --version
docker compose version
docker-compose --version
```

If Docker Compose V2 is installed, use `docker compose up -d`. Some older hosts only have V1, `docker-compose` 1.29.2. That still starts the stack, but recreating a container can fail. The commands below use the V1 form because that is what some of these servers still have. Drop the hyphen if you are on V2.

## Images: pull them, or carry them from a Mac 📦

When the server can reach Docker Hub:

```bash
docker pull henrygd/beszel:latest
docker pull henrygd/beszel-agent:latest
```

When it cannot, I pull on my Mac and copy the tar across. An Apple Silicon Mac will pull arm64 unless told otherwise, and these Linux hosts are x86_64. The image loads and then refuses to start. Pin the platform:

```bash
docker pull --platform=linux/amd64 henrygd/beszel:latest
docker pull --platform=linux/amd64 henrygd/beszel-agent:latest

docker save -o beszel-all-amd64.tar \
  henrygd/beszel:latest \
  henrygd/beszel-agent:latest
```

Copy it to the Hub host and load it there. Use your own account and address:

```bash
scp beszel-all-amd64.tar <USER>@<HUB_IP>:/opt/beszel/

# on the server
docker load -i /opt/beszel/beszel-all-amd64.tar
docker images | grep beszel
```

`docker images` should list `henrygd/beszel` and `henrygd/beszel-agent` before the Compose file is worth writing.

## Bring the Hub up first

```bash
mkdir -p /opt/beszel
cd /opt/beszel
```

The smallest file runs only the Hub. Data stays in `./beszel_data`, which is the directory to back up before an upgrade or a move. The log limit is there so json logs cannot fill the root disk. A monitoring stack that fills the disk it is watching is a bad joke.

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

Open `http://<HUB_IP>:17777` and create the admin user on first visit.

## The Agent on the Hub host uses a socket

In the Hub UI, add a system. If the Agent is on the same machine as the Hub, do not enter an IP. Enter the socket path. Leave the UI port at the default `45876`; traffic actually goes through the socket file.

- Name: something by role, such as `hub-node`, not a hostname that encodes an internal address
- Host/IP: `/beszel_socket/beszel.sock`
- Port: default `45876`

The page issues a KEY and TOKEN for that system only. Do not reuse them on the next host. Extend the Hub Compose file as below. `LISTEN` must match the path entered in the UI. `network_mode: host` makes the Agent see the host's interfaces, not the container network.

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

Recreate the Agent only. Leave the Hub running:

```bash
docker rm -f beszel-agent 2>/dev/null || true
docker-compose up -d beszel-agent
docker logs --tail=100 beszel-agent
```

The system should show Online in the UI before you call this host done.

## One Agent per remote host

Add another system in the Hub, set the host to that server's internal IP, and copy the KEY and TOKEN generated for it. On the target:

```bash
mkdir -p /opt/beszel-agent
cd /opt/beszel-agent
```

A remote Agent does not share the Hub's socket directory, so `LISTEN` is the port `45876`. The port in the Hub UI has to match. The firewall only needs to allow the Hub to reach that port.

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
      KEY: "<THIS_HOST_KEY>"
      TOKEN: "<THIS_HOST_TOKEN>"
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

`curl` only proves this host can reach the Hub. Online in the UI, plus a clean Agent log, is what proves the Agent registered. A container in `Up` is not enough.

## The root filesystem is not the only disk 💾

The Beszel overview emphasizes the root filesystem. Several of these hosts use LVM, so `df` and `lsblk` have to be read together or the wrong device gets monitored:

```bash
df -h
lsblk -o NAME,KNAME,SIZE,TYPE,MOUNTPOINT
```

A common layout is `dm-0` on `/` and `dm-1` on `/home`. The data that actually grows is on `/home`. Watching only `/` looks fine until home is full. Point the Agent at the root device:

```yaml
FILESYSTEM: "dm-0"
```

Extra disks are not another environment variable. Beszel picks them up from a mount under `/extra-filesystems/`, named `device__label`. Create an empty directory on the host and mount it read-only:

```bash
mkdir -p /home/.beszel
```

```yaml
volumes:
  - /home/.beszel:/extra-filesystems/dm-1__Home:ro
```

A line like this in the Agent log means the disk was detected, and `root=false` means it was not mistaken for the root filesystem:

```text
Detected disk name=Home ... io=dm-1 root=false
```

The overview still leads with the root disk. `/home` shows up on that server's detail page. The first time, that looks like the mount did nothing.

## When Compose V1 fails to recreate a container

`docker-compose` 1.29.2 sometimes dies while recreating an existing container:

```text
KeyError: 'ContainerConfig'
```

The image is fine. Old Compose cannot read the current container config. Remove the Agent and create it again. Do not delete the Hub if you did not change it:

```bash
docker ps -a | grep beszel-agent
docker rm -f beszel-agent
docker-compose up -d beszel-agent
```

Hosts that can move to Compose V2 should. Otherwise every env change turns into a delete-and-create.

## Alert thresholds I actually turned on

Tighter is not better. CPU can spike for a moment, so the warning waits 5 minutes. Disk gets a cleanup window: warning at 80%, critical at 90%. Offline is on by itself. A dead Agent matters more than one CPU spike.

| Metric | Warning | Critical |
|--------|---------|----------|
| CPU | ≥ 90% for 5 minutes | add per workload |
| Memory | ≥ 85% | ≥ 90% |
| Disk | ≥ 80% | ≥ 90% |
| System offline | on | — |

## Doing it again

1. Get the images. `docker pull` if the host has Hub access. Otherwise pull on a Mac with `--platform=linux/amd64`, `docker save`, copy, `docker load`.
2. Write the Hub Compose file under `/opt/beszel`, run `docker-compose up -d`, open `http://<HUB_IP>:17777`, create the admin user.
3. Add a system in the UI. Each host gets its own KEY and TOKEN.
4. Local Agent uses the socket. Remote Agents live in `/opt/beszel-agent` and listen on `45876`.
5. Check `docker logs --tail=100 beszel-agent` and wait for Online.
6. Use `df -h` and `lsblk` to find the root device's KNAME and set `FILESYSTEM`. Mount extra disks under `/extra-filesystems`.
7. Enable CPU, memory, disk, and offline alerts. Back up `beszel_data` on a schedule.

Day to day, `docker-compose ps` shows status, `docker logs --tail=100` on `beszel` and `beszel-agent` shows why a host dropped off, and `df -h`, `lsblk`, plus `docker system df` show whether the disk is full of data or of image cache. Keep the admin password, KEY, and TOKEN in your own notes, not in this one.
