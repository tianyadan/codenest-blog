---
title: RocketMQ 与 SpringBoot 连通性踩坑记录（生产排障复盘）
summary: 某次上线后，SpringBoot 服务在调用 RocketMQTemplate.syncSend() 时持续报错，导致异步业务流程失败。 本记录用于沉淀排...
author: evan
category: work
tags: [工作总结, Spring, RocketMQ]
createdAt: 2026-04-16 15:49:55
updatedAt: 2026-04-16 15:49:55
readingMinutes: 8
---
# RocketMQ 与 SpringBoot 连通性踩坑记录（生产排障复盘）

## 背景

某次上线后，SpringBoot 服务在调用 `RocketMQTemplate.syncSend()` 时持续报错，导致异步业务流程失败。  
本记录用于沉淀排查路径与修复方案，避免后续重复踩坑。

---

## 一、故障现象

### 1) 第一阶段报错：无法连接 NameServer

典型报错：

- `RemotingConnectException: connect to null failed`
- `syncSend failed`

业务表现：

- 应用启动正常
- 触发消息发送时立即失败

### 2) 第二阶段报错：发送超时

修复 NameServer 后，出现新报错：

- `RemotingTooMuchRequestException: sendDefaultImpl call timeout`

业务表现：

- 能连接 NameServer
- 但消息发送到 Broker 阶段超时

---

## 二、核心根因

这次不是单点问题，而是两段式问题：

### 根因 1：NameServer 对外端口与应用配置不一致

- 容器内 NameServer 监听 `9876`
- 宿主机对外映射是其他端口（例如 `19876 -> 9876`）
- 但 SpringBoot 仍配置成宿主机 `9876`
- 结果：客户端连 NameServer 失败

### 根因 2：Broker 注册地址是容器内网地址

- Broker 未正确加载 `broker.conf`
- NameServer 中注册的是容器内网地址（如 `172.x.x.x:10911`）
- 生产者拿到路由后无法访问该地址，导致发送超时

### 根因 3：云安全组未放通 Broker 端口

- NameServer 端口可达
- Broker 端口（`10911`）未放通或来源限制错误
- 结果：NameServer 可连，实际发送仍超时

---

## 三、正确配置（建议模板）

### 1) SpringBoot 配置（客户端）

客户端只配 NameServer，不配 Broker：

```yaml
rocketmq:
  name-server: <MQ_HOST>:<NAMESRV_PUBLIC_PORT>
```

说明：

- 这里应填写 **NameServer 的宿主机对外端口**
- 不要把 `10911` 写到 `rocketmq.name-server`（`10911` 是 Broker 端口）

### 2) Broker 配置（服务端）

`broker.conf` 关键项：

```properties
brokerIP1=<SERVER_PUBLIC_OR_PRIVATE_IP>
listenPort=10911
autoCreateTopicEnable=true
```

说明：

- `brokerIP1` 必填，避免注册容器内网地址
- `listenPort` 与对外映射建议保持一致（排查更简单）

### 3) Docker Compose 关键点

- NameServer、Broker、Dashboard 使用同一 Docker 网络
- Broker 启动命令使用 `-c /home/rocketmq/conf/broker.conf`
- Broker 通过服务名连接 NameServer（如 `rmqnamesrv:9876`）
- 设置 `restart: unless-stopped`
- 机器规格较小时下调 JVM（避免被 OOM Kill）

---

## 四、云安全组策略（最小权限）

建议只对“需要访问 MQ 的应用服务器”开放：

- `19876`（NameServer 对外端口）：只放行应用服务器来源
- `10911`（Broker 主端口）：只放行应用服务器来源（必须）
- `10909`（Broker 另一个端口）：可先放行应用服务器，稳定后按需收紧
- `18080`（Dashboard）：建议不对公网开放，或只对白名单办公 IP 开放

---

## 五、标准排查流程（10 分钟版）

### Step 1：确认客户端配置是否正确

- 检查 `rocketmq.name-server` 是否指向 NameServer 对外端口
- 检查配置中心（如 Nacos）与本地配置是否一致

### Step 2：从应用容器内测连通性

```bash
nc -zv <MQ_HOST> <NAMESRV_PORT>
nc -zv <MQ_HOST> 10911
```

判定：

- NameServer 不通：先修端口映射/配置
- NameServer 通、10911 不通：重点查安全组/防火墙

### Step 3：检查 Broker 实际注册地址

- 查看 Broker 启动日志是否类似：`broker-a, <HOST_IP>:10911 boot success`
- 若出现 `172.x` 地址，说明 `brokerIP1` 未生效

### Step 4：确认 Broker 是否加载了 broker.conf

- 启动命令必须包含：`-c /home/rocketmq/conf/broker.conf`
- 宿主机挂载文件路径必须存在且内容正确

---

## 六、最终修复动作清单

- 修正 SpringBoot `rocketmq.name-server` 指向 NameServer 对外端口
- 修正 Broker 启动参数，确保加载 `broker.conf`
- 在 `broker.conf` 显式配置 `brokerIP1`
- 统一并校验端口映射（建议 Broker 端口宿主机与容器一致）
- 放通安全组必需端口（至少 NameServer + 10911）
- 重启后用日志 + `nc` 双重验证

---

## 七、复盘结论

这类问题最容易误判为“代码问题”或“依赖版本问题”，但多数情况下是部署层网络与注册信息不一致导致。  
遵循以下原则可显著降低故障率：

- 客户端只连 NameServer
- Broker 必配 `brokerIP1`
- 端口映射与安全组策略同步维护
- 每次变更后做容器内连通性验证

---

## 八、可复用自检清单（上线前）

- [ ] `rocketmq.name-server` 指向 NameServer 对外端口  
- [ ] Broker 启动命令包含 `-c broker.conf`  
- [ ] `broker.conf` 包含正确 `brokerIP1`  
- [ ] 安全组放行 NameServer 与 Broker 必需端口  
- [ ] 应用容器内 `nc` 验证通过  
- [ ] 发送一条测试消息验证端到端成功
