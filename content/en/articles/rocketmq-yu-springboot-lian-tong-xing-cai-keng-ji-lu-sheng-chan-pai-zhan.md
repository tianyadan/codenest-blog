---
title: RocketMQ and SpringBoot Connectivity Troubleshooting (Production Postmortem)
summary: After a production release, RocketMQTemplate.syncSend() kept failing because of NameServer port mismatches, incorrect Broker registration addresses, and security group rules that blocked Broker traffic.
author: evan
category: work
tags: [Work Notes, Spring, RocketMQ]
createdAt: 2026-04-16 15:49:55
updatedAt: 2026-04-16 15:49:55
readingMinutes: 8
---
# RocketMQ and SpringBoot Connectivity Troubleshooting (Production Postmortem)

## Background

After one production deployment, a SpringBoot service kept throwing errors when calling `RocketMQTemplate.syncSend()`, which caused asynchronous business flows to fail.
This write-up records the troubleshooting path and fix so the same problems are not repeated later.

---

## 1. Symptoms

### 1) First-stage error: unable to connect to NameServer

Typical errors:

- `RemotingConnectException: connect to null failed`
- `syncSend failed`

Business behavior:

- The application started normally
- Message sending failed immediately when triggered

### 2) Second-stage error: send timeout

After fixing the NameServer issue, a new error appeared:

- `RemotingTooMuchRequestException: sendDefaultImpl call timeout`

Business behavior:

- NameServer connectivity was restored
- But sending timed out at the Broker stage

---

## 2. Core root causes

This was not a single-point issue, but a two-stage problem:

### Root cause 1: the NameServer public port did not match the application configuration

- The NameServer inside the container listened on `9876`
- The host exposed it on a different port (for example `19876 -> 9876`)
- But SpringBoot was still configured to use host port `9876`
- Result: the client could not connect to the NameServer

### Root cause 2: the Broker registered an internal container address

- The Broker did not load `broker.conf` correctly
- The address registered in NameServer was an internal container address such as `172.x.x.x:10911`
- After getting the route info, the producer could not access that address, which caused send timeouts

### Root cause 3: the cloud security group did not allow the Broker port

- The NameServer port was reachable
- The Broker port (`10911`) was not allowed, or the allowed source was configured incorrectly
- Result: NameServer worked, but actual sending still timed out

---

## 3. Correct configuration (recommended template)

### 1) SpringBoot configuration (client side)

The client should configure only NameServer, not Broker:

```yaml
rocketmq:
  name-server: <MQ_HOST>:<NAMESRV_PUBLIC_PORT>
```

Notes:

- This should be the **public host port exposed for NameServer**
- Do not put `10911` into `rocketmq.name-server` (`10911` is the Broker port)

### 2) Broker configuration (server side)

Key items in `broker.conf`:

```properties
brokerIP1=<SERVER_PUBLIC_OR_PRIVATE_IP>
listenPort=10911
autoCreateTopicEnable=true
```

Notes:

- `brokerIP1` is required to prevent registration of an internal container address
- It is recommended that `listenPort` match the exposed port, which makes troubleshooting easier

### 3) Key Docker Compose points

- NameServer, Broker, and Dashboard should use the same Docker network
- The Broker startup command should include `-c /home/rocketmq/conf/broker.conf`
- The Broker should connect to NameServer by service name, such as `rmqnamesrv:9876`
- Set `restart: unless-stopped`
- If the server spec is small, reduce JVM memory settings to avoid OOM kills

---

## 4. Cloud security group strategy (minimum privilege)

It is recommended to allow access only from application servers that actually need MQ:

- `19876` (public NameServer port): allow only application server sources
- `10911` (main Broker port): allow only application server sources (required)
- `10909` (another Broker port): you can allow only application servers first, then tighten later as needed
- `18080` (Dashboard): do not expose it publicly, or restrict it to an office IP allowlist

---

## 5. Standard troubleshooting flow (10-minute version)

### Step 1: confirm whether the client configuration is correct

- Check whether `rocketmq.name-server` points to the NameServer public port
- Check whether the config center (for example Nacos) matches the local config

### Step 2: test connectivity from inside the application container

```bash
nc -zv <MQ_HOST> <NAMESRV_PORT>
nc -zv <MQ_HOST> 10911
```

Interpretation:

- If NameServer is unreachable, fix the port mapping or configuration first
- If NameServer is reachable but `10911` is not, focus on the security group or firewall

### Step 3: inspect the Broker's actual registered address

- Check whether the Broker startup log contains something like `broker-a, <HOST_IP>:10911 boot success`
- If you see a `172.x` address, `brokerIP1` did not take effect

### Step 4: confirm whether the Broker loaded `broker.conf`

- The startup command must include: `-c /home/rocketmq/conf/broker.conf`
- The mounted file path on the host must exist and contain the correct content

---

## 6. Final fix checklist

- Correct SpringBoot `rocketmq.name-server` to point to the NameServer public port
- Correct the Broker startup parameters so `broker.conf` is actually loaded
- Explicitly configure `brokerIP1` in `broker.conf`
- Align and verify port mappings (it is recommended to keep host and container Broker ports the same)
- Open the required security group ports (at minimum NameServer + `10911`)
- After restart, verify with both logs and `nc`

---

## 7. Postmortem conclusion

These kinds of problems are easy to misdiagnose as "code issues" or "dependency version issues", but in most cases they are caused by inconsistent deployment-layer networking and registration information.

Following these principles will greatly reduce the failure rate:

- The client connects only to NameServer
- The Broker must set `brokerIP1`
- Port mappings and security group rules must be maintained together
- After every change, verify container-side connectivity

---

## 8. Reusable pre-release checklist

- [ ] `rocketmq.name-server` points to the NameServer public port
- [ ] The Broker startup command includes `-c broker.conf`
- [ ] `broker.conf` contains the correct `brokerIP1`
- [ ] The security group allows the required NameServer and Broker ports
- [ ] `nc` verification succeeds inside the application container
- [ ] Send a test message and confirm end-to-end success
