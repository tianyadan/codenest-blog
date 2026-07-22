---
title: RocketMQ + Docker 网络踩坑实录（MacOS + SpringCloud Alibaba）
summary: 在开发一个用户注册功能时，需要基于 RocketMQ 实现“注册成功后发送消息通知”。 技术栈如下： 本地环境：MacOS 后端：SpringCloud...
author: evan
category: work
tags: [工作总结, Spring, Docker, RocketMQ]
createdAt: 2026-03-21 19:25:01
updatedAt: 2026-03-21 19:25:01
readingMinutes: 16
---
# RocketMQ + Docker 网络踩坑实录（MacOS + SpringCloud Alibaba）

## 问题背景：

在开发一个用户注册功能时，需要基于 RocketMQ 实现“注册成功后发送消息通知”。

技术栈如下：

- 本地环境：MacOS
- 后端：SpringCloud Alibaba
- RocketMQ：Docker 部署（Namesrv / Broker / Console）

场景很简单：
`用户注册 → 发送 USER_REGISTERED 消息 → 控制台查看 & 后续消费`

但实际情况是：
❌ SpringBoot 连不上 Broker
❌ Console 连不上 Broker
❌ 消息发出去了但 Console 看不到
❌ 有时候直接发送失败

**一句话总结：网络互通彻底混乱**

## 核心问题本质

**问题的本质其实就一句话：宿主机（SpringBoot）和 Docker 容器之间的网络“认知不一致”**

关键点在于这个地址：

```txt
host.docker.internal
```

它在不同环境中的表现：

| 环境 | 是否支持 | 说明 |
| --- | --- | ---|
| Docker 容器内 | ✅ | Docker 自动注入，指向宿主机 |
| Mac / Windows 宿主机 | 不一定 | 有些版本不会自动解析|
| linux  |  不支持❌ | 需要手动配置 |

### 问题触发点（重点）

在 broker.conf 里写了这一行：

```conf
brokerIP1 = host.docker.internal
```

这一步其实是关键中的关键：

**它决定了：Broker 对外“报自己地址”时用的是什么 ， 客户端（SpringBoot / Console）是否能连上它。**

如果这里配置错了，会发生什么？

| 场景 | 结果 |
| --- | --- |
| 写容器 IP |  宿主机访问不到 |
| 写 localhost  |  容器访问不到 |
| 写错误 host.docker.internal |  全都炸 |

  
## controller 方法

```java
@RestController
@RequestMapping("/user")
@RequiredArgsConstructor
public class UserRegisterController {

    private final UserRegisterService userRegisterService;

    @GetMapping("/register/{name}")
    public String register(@PathVariable("name") String name) {
        return userRegisterService.register(name);  // 只调用 Service
    }

}
```

## Service （发送 MQ 消息）

```java
/**
 * 用户注册服务 - 注册完成后发送 USER_REGISTERED 事件
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class UserRegisterService {

    private final StreamBridge streamBridge;

    private static final String OUTPUT_CHANNEL = "user-register-output";

    /**
     * 注册用户并发送 MQ 事件（当前为 mock 实现）
     */
    public String register(String name) {
        // 1. Mock 注册逻辑：生成 userId（实际应从数据库插入后获取）
        long userId = System.currentTimeMillis() % 100000;
        log.info("用户注册成功: userId={}, name={}", userId, name);

        // 2. 构建事件并发送到 RocketMQ
        UserRegisteredEvent event = UserRegisteredEvent.of(userId, name);

        // 在 Service 中使用 streamBridge 发送消息
        boolean sent = streamBridge.send(OUTPUT_CHANNEL, event);

        if (sent) {
            log.info("USER_REGISTERED 事件已发送: {}", event);
        } else {
            log.warn("USER_REGISTERED 事件发送失败: {}", event);
        }

        return "注册成功，userId=" + userId;
    }
}
```

### application.yml 配置文件

```yml
server:
  port: 8081

# SCA 2023.x 要求：必须声明 spring.config.import，否则启动失败
# optional:nacos: 表示 Nacos 配置可选，本地无远程配置时也能启动
spring:
  config:
    import: optional:nacos:user-service.yaml
  application:
    name: user-service
  cloud:
    nacos:
      discovery:
        server-addr: 127.0.0.1:8848
        namespace: public
      config:
        server-addr: 127.0.0.1:8848
        file-extension: yaml
        namespace: public
    # rocketMQ 配置
    stream:
      rocketmq:
        binder:
          # rocketMQ 名字地址
          name-server: 127.0.0.1:9876
      bindings:
        user-register-output:  #  一个“消息通道”（channel）
          destination: USER_EVENTS  # Topic
          content-type: application/json # 默认消息格式
```

**这里其实没问题，问题不在业务代码**

## 展示docker-compose 配置文件:

 用于启动 RocketMQ 等中间件 ...

```yaml
services:
  nacos:
    image: nacos/nacos-server:v2.3.2
    platform: linux/amd64
    container_name: volunteer-nacos
    environment:
      MODE: standalone
      JVM_XMS: 256m
      JVM_XMX: 256m
    ports:
      - "8848:8848"
      - "9848:9848"
    networks:
      - volunteer-net

  rocketmq-namesrv:
    image: apache/rocketmq:5.1.4
    platform: linux/amd64
    container_name: volunteer-rocketmq-namesrv
    command: sh mqnamesrv
    ports:
      - "9876:9876"
    networks:
      - volunteer-net

  rocketmq-broker:
    image: apache/rocketmq:5.1.4
    platform: linux/amd64
    container_name: volunteer-rocketmq-broker
    # 增加 extra_hosts 确保 broker 能解析 host.docker.internal (虽然 Docker Desktop 通常默认支持)
    extra_hosts:
      - "host.docker.internal:host-gateway"
      #  尤其要注意这一行 ，就是这一行最能出岔子了
    command: sh mqbroker -n rocketmq-namesrv:9876 -c /home/rocketmq/rocketmq-5.1.4/conf/broker.conf
    # 必须要外挂一个配置文件
    volumes:
      - ./broker.conf:/home/rocketmq/rocketmq-5.1.4/conf/broker.conf
    ports:
      - "10909:10909"
      - "10911:10911"
    depends_on:
      - rocketmq-namesrv
    networks:
      - volunteer-net

  rocketmq-console:
    image: styletang/rocketmq-console-ng
    platform: linux/amd64
    container_name: volunteer-rocketmq-console
    environment:
      JAVA_OPTS: "-Drocketmq.namesrv.addr=rocketmq-namesrv:9876"
    ports:
      - "8380:8080"
    depends_on:
      - rocketmq-namesrv
    networks:
      - volunteer-net

  sentinel-dashboard:
    image: bladex/sentinel-dashboard:1.8.6
    platform: linux/amd64
    container_name: volunteer-sentinel
    ports:
      - "8858:8858"
    networks:
      - volunteer-net

networks:
  volunteer-net:
    driver: bridge
```

## broker.conf 配置文件 

 外挂配置:
```conf
brokerClusterName = DefaultCluster
brokerName = broker-a
brokerId = 0

# 让宿主机能连到 Broker（宿主机访问 127.0.0.1:10911 -> 容器 10911）
# 重点注意这行，必须要用这个地址，docker提供的地址。
brokerIP1 = host.docker.internal   

# 自动创建 Topic
autoCreateTopicEnable = true

# 建议加上这个，防止监听端口绑定问题
listenPort = 10911
```

## 解决方案：

### macos

如果是 macos 系统 要去修改 `/etc/hosts` 这个文件，必须让 127.0.0.1 指定解析 host.docker.internal 这个地址，不然 docker 提供的这个地址始终无法被解析 ，SpringBoot 程序始终无法访问到容器内的 broker。

最快的命令:

```bash
echo "127.0.0.1 host.docker.internal" | sudo tee -a /etc/hosts
```

 直接输入密码，解决，然后使用 ping 测试一下：
 
 
```bash
ping host.docker.internal
```
测试结果:

```bash
PING host.docker.internal (127.0.0.1): 56 data bytes
64 bytes from 127.0.0.1: icmp_seq=0 ttl=64 time=0.045 ms
...
```

说明本地可以找到这个地址了，SpringBoot 能够访问到容器内的地址 ，而且 console 也能够访问到容器内的 broker。 消息能够正常发出 ，console 也能正常发现。

### 针对 Windows 用户：

找到: `C:\Windows\System32\drivers\etc\hosts`

手动添加一行 `127.0.0.1 host.docker.internal`

## 最终网络拓扑

```txt
SpringBoot（宿主机）
        ↓ 127.0.0.1:9876
RocketMQ Namesrv（容器）
        ↓
Broker（对外宣称：host.docker.internal）
        ↓
Console（容器内访问 OK）
```

> 在 Docker 部署 RocketMQ 时，Broker 的 brokerIP1 必须配置为宿主机可访问地址；在 MacOS 上需要手动将 host.docker.internal 映射到 127.0.0.1，否则会导致 SpringBoot 与 Broker 网络不通，从而出现消息发送失败或 Console 无法查看的问题。
