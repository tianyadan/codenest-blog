---
title: RocketMQ + Docker Networking Pitfalls on MacOS (SpringCloud Alibaba)
summary: While building a user registration flow with RocketMQ, Docker networking between the host, containers, Broker, and Console caused connection failures until brokerIP1 and host resolution were fixed correctly.
author: evan
category: work
tags: [Work Notes, Spring, Docker, RocketMQ]
createdAt: 2026-03-21 19:25:01
updatedAt: 2026-03-21 19:25:01
readingMinutes: 16
---
# RocketMQ + Docker Networking Pitfalls on MacOS (SpringCloud Alibaba)

## Background

While building a user registration feature, I needed to use RocketMQ so that a "registration successful" message could be sent afterward.

The stack was:

- Local environment: MacOS
- Backend: SpringCloud Alibaba
- RocketMQ: deployed with Docker (`Namesrv / Broker / Console`)

The scenario looked simple:
`User registration -> send USER_REGISTERED message -> view it in the console -> consume it later`

But the reality was:

- SpringBoot could not connect to the Broker
- The Console could not connect to the Broker
- Messages were sent, but the Console could not see them
- Sometimes sending failed directly

**One-line summary: networking connectivity was completely inconsistent**

## The core issue

The essence of the problem can be summarized in one sentence:

**The host machine (SpringBoot) and the Docker containers had inconsistent "awareness" of the network address.**

The key address was:

```txt
host.docker.internal
```

Its behavior varies across environments:

| Environment | Supported? | Notes |
| --- | --- | --- |
| Inside Docker containers | Yes | Docker injects it automatically to point to the host |
| Mac / Windows host | Not always | Some versions do not resolve it automatically |
| Linux | No | Needs manual configuration |

### The trigger point

This line was written in `broker.conf`:

```conf
brokerIP1 = host.docker.internal
```

This is the key detail above all others:

**It determines which address the Broker advertises as its own external address, and whether clients such as SpringBoot and the Console can connect to it.**

What happens if this is configured incorrectly?

| Scenario | Result |
| --- | --- |
| Use container IP | The host cannot access it |
| Use localhost | The container cannot access it |
| Use an incorrect `host.docker.internal` | Everything breaks |

## Controller method

```java
@RestController
@RequestMapping("/user")
@RequiredArgsConstructor
public class UserRegisterController {

    private final UserRegisterService userRegisterService;

    @GetMapping("/register/{name}")
    public String register(@PathVariable("name") String name) {
        return userRegisterService.register(name);  // Only call the Service
    }

}
```

## Service (sending an MQ message)

```java
/**
 * User registration service - sends a USER_REGISTERED event after registration completes
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class UserRegisterService {

    private final StreamBridge streamBridge;

    private static final String OUTPUT_CHANNEL = "user-register-output";

    /**
     * Register the user and send an MQ event (currently a mock implementation)
     */
    public String register(String name) {
        // 1. Mock registration logic: generate a userId (in reality it should come from the database insert result)
        long userId = System.currentTimeMillis() % 100000;
        log.info("User registration succeeded: userId={}, name={}", userId, name);

        // 2. Build the event and send it to RocketMQ
        UserRegisteredEvent event = UserRegisteredEvent.of(userId, name);

        // Use streamBridge in the Service to send the message
        boolean sent = streamBridge.send(OUTPUT_CHANNEL, event);

        if (sent) {
            log.info("USER_REGISTERED event sent: {}", event);
        } else {
            log.warn("USER_REGISTERED event failed to send: {}", event);
        }

        return "Registration succeeded, userId=" + userId;
    }
}
```

### `application.yml` configuration

```yml
server:
  port: 8081

# SCA 2023.x requires spring.config.import to be declared, otherwise startup fails
# optional:nacos: means the Nacos config is optional, so the app can still start locally without remote config
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
    # RocketMQ configuration
    stream:
      rocketmq:
        binder:
          # RocketMQ NameServer address
          name-server: 127.0.0.1:9876
      bindings:
        user-register-output:  # A message channel
          destination: USER_EVENTS  # Topic
          content-type: application/json # Default message format
```

**There is actually nothing wrong here. The problem is not in the business code.**

## docker-compose configuration

Used to start RocketMQ and other middleware:

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
    # Add extra_hosts so the broker can resolve host.docker.internal
    # (Docker Desktop usually supports this by default, but it is safer to be explicit)
    extra_hosts:
      - "host.docker.internal:host-gateway"
      # Pay special attention to this area; this is where things often go wrong
    command: sh mqbroker -n rocketmq-namesrv:9876 -c /home/rocketmq/rocketmq-5.1.4/conf/broker.conf
    # You must mount an external configuration file
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

## `broker.conf` configuration

Mounted external config:

```conf
brokerClusterName = DefaultCluster
brokerName = broker-a
brokerId = 0

# Allow the host machine to connect to the Broker
# (host access: 127.0.0.1:10911 -> container 10911)
# Pay close attention to this line. This address must be used.
brokerIP1 = host.docker.internal

# Automatically create Topic
autoCreateTopicEnable = true

# It is recommended to add this to avoid port binding issues
listenPort = 10911
```

## Solution

### macOS

If you are on macOS, you need to edit `/etc/hosts` so that `127.0.0.1` resolves `host.docker.internal`. Otherwise, even though Docker provides this address, it may still fail to resolve on the host, and the SpringBoot application will not be able to access the Broker inside the container.

Fastest command:

```bash
echo "127.0.0.1 host.docker.internal" | sudo tee -a /etc/hosts
```

Enter your password, then test it with `ping`:

```bash
ping host.docker.internal
```

Test result:

```bash
PING host.docker.internal (127.0.0.1): 56 data bytes
64 bytes from 127.0.0.1: icmp_seq=0 ttl=64 time=0.045 ms
...
```

That confirms the host can now resolve the address. SpringBoot can access the Broker inside the container, the Console can access it too, messages can be sent normally, and the Console can see them.

### For Windows users

Find this file:

`C:\Windows\System32\drivers\etc\hosts`

Manually add this line:

`127.0.0.1 host.docker.internal`

## Final network topology

```txt
SpringBoot (host)
        -> 127.0.0.1:9876
RocketMQ NameServer (container)
        ->
Broker (advertises itself as: host.docker.internal)
        ->
Console (container access OK)
```

> When deploying RocketMQ with Docker, the Broker's `brokerIP1` must be configured as an address reachable by the host. On MacOS, you need to manually map `host.docker.internal` to `127.0.0.1`; otherwise SpringBoot and the Broker cannot communicate correctly, which leads to message send failures or the Console being unable to inspect messages.
