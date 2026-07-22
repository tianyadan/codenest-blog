---
title: The Underlying Principles of RPC
summary: RPC (Remote Procedure Call) is about calling remote services as if they were local methods, while serialization, transport, dispatch, and response handling happen underneath.
author: evan
category: learning
tags: [Learning]
createdAt: 2026-04-04 08:22:34
updatedAt: 2026-04-04 08:22:34
readingMinutes: 4
---
# The Underlying Principles of RPC

# The essence of RPC

The core idea of RPC (Remote Procedure Call) is:
<span style="color:#e74c3c">make remote service calls feel like local method calls</span>.

For example:

```java
userService.getUserById(1); // It looks like a local call, but behind the scenes it may be calling another server.
```

# What does RPC actually do underneath?

RPC essentially includes:

1) Caller (Client): serialize the method name and arguments into JSON, Protobuf, or similar formats

2) Network transport: send the request out through some protocol (<span style="color:#e74c3c">not necessarily HTTP</span>)

3) Server: deserialize the request and invoke the corresponding method

4) Return result: serialize it again and send it back to the client

![Screenshot 2026-04-04 08.10.23](https://codenest.oss-cn-qingdao.aliyuncs.com/images/2026/04/04/3cb2a134-c32c-405b-aa6e-10aa6b3350e2.jpg)

# Where does HTTP fit in?

**RPC can use HTTP, but it does not have to.**

Common implementation approaches:

| Method | use_http? | Example |
| --- | --- | --- |
| HTTP + JSON | Yes | Traditional REST API |
| HTTP + Protobuf | Yes | gRPC |
| Custom TCP protocol | No | Dubbo |
| Netty long-lived connection | No | High-performance RPC |

# Key difference: RPC vs HTTP API

1) HTTP (REST): "operate on resources"

```http
GET /users/1
```

2) RPC: "call a method"

```java
getUserById(1)
```

**The essential differences:**

| Dimension | RPC | HTTP |
| --- | --- | --- |
| Abstraction | Method call | Resource operation |
| Developer experience | Feels like a local function | Feels like an interface request |
| Performance | Higher, can use binary protocols | Relatively lower, often text-based |

# Why are RPC frameworks preferred in microservices?

**Put simply:**

## HTTP is relatively heavy

- Large headers
- Redundant JSON payloads
- No long-lived connection by default

## RPC fits internal services better

- High performance (Protobuf)
- Long-lived connections (Netty)
- Service governance (service registry, load balancing)

# Interview-ready answer

If an interviewer asks:

> Is RPC based on HTTP underneath?

You can answer like this:

> RPC is essentially a remote invocation model and does not depend on any specific protocol. It can be implemented over HTTP, such as gRPC, but it can also be implemented over custom TCP-based protocols, such as Dubbo. So HTTP is only one possible transport for RPC, not the essence of RPC itself.
