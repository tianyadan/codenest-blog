---
title: Rpc 的底层原理
summary: "ROC(Remote Procedure Call) 核心思想是 ： <span style=\"color: e74c3c\" 让你像调用本地方法一样，去调..."
author: evan
category: learning
tags: [学习]
createdAt: 2026-04-04 08:22:34
updatedAt: 2026-04-04 08:22:34
readingMinutes: 4
---
# Rpc 的底层原理

# RPC 的本质
ROC(Remote Procedure Call) 核心思想是 ： <span style="color:#e74c3c">让你像调用本地方法一样，去调用远程服务</span>。

比如：

```Java
userService.getUserById(1); // 看起来像本地调用，其实背后可能是在调用另一台服务器。
```

# RPC底层到底做了什么

RPC 本质包含:

1 ） 调用方(Client): 把方法名,参数 -> 序列化(JSON/Protobuf 等)

2 ) 网络传输： 通过某种协议发出去（<span style="color:#e74c3c">不一定是 HTTP</span>）

3 ) 服务端(Server) ：反序列化 -> 找到对应方法执行

4 ）返回结果： 再序列化 -> 传回客户端 

![截屏2026-04-04 08.10.23](https://codenest.oss-cn-qingdao.aliyuncs.com/images/2026/04/04/3cb2a134-c32c-405b-aa6e-10aa6b3350e2.jpg)

# HTTP在哪

**RPC 可以用 HTTP，但不一定**

常见几种实现方式：

| Method | use_http ?   | instance |
| --- | ---  | --- |
| HTTP+JSON  | ✅ | 传统 REST API|
| HTTP+Protobuf  | ✅ | gRPC|
| TCP 自定义协议  | ❌ | Dubbo|
| Netty 长连接 | ❌ | 高性能 RPC|

# 重点区别: RPC vs HTTP API

1 ) HTTP(REST): “操作资源”

```http
GET /users/1
```

2 ) RPC: “调用方法”

```java
getUserById(1)
```

**本质区别:**

| 维度 | RPC | HTTP|
| --- | --- | ---|
| 抽象 | 方法调用 | 资源操作|
| 使用体验 | 像本地函数 | 像接口请求|
| 性能 | 更高（可用二进制） | 相对低（文本）|

# 为什么微服务下更喜欢RPC ？

**通俗来讲** ：

## HTTP 太“笨重”

- Header 大
- JSON 冗余
- 无长链接（默认）

## RPC更适合内部服务

- 高性能(Protobuf)
- 长连接(Netty)
- 服务治理(注册中心，负载均衡)

# 面试标准答案

如果面试官问你：

> RPC 底层是不是 HTTP？

可以这样说：

> RPC 本质是一种远程调用模型，不依赖于具体协议。它可以基于 HTTP 实现，比如 gRPC，但也可以基于 TCP 自定义协议，比如 Dubbo。因此 HTTP 只是 RPC 的一种实现方式，而不是 RPC 的本质。
