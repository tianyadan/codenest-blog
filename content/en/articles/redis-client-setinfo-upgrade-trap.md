---
title: Redis Broke After a Spring Boot Upgrade: The CLIENT SETINFO Protocol Trap
summary: Using spring-data-redis#3071, explain why Spring Boot 3.4 / Lettuce handshake changes can fail against older Redis with ERR unknown command and NOAUTH.
author: evan
category: learning
tags: [Redis, Spring Boot, Lettuce, Upgrade, GitHub Issue]
createdAt: 2026-07-20
updatedAt: 2026-07-20
readingMinutes: 8
---

# Redis Broke After a Spring Boot Upgrade: The CLIENT SETINFO Protocol Trap

Source issue: [spring-projects/spring-data-redis#3071](https://github.com/spring-projects/spring-data-redis/issues/3071)

Second deep dive in the issue-mining series: after a framework upgrade, Redis suddenly fails to connect. The error looks like auth or database misconfiguration, but the root cause is the client handshake protocol.

## Scene: database=0 works, database=1 fails

After moving to Spring Boot 3.4 / Spring Data Redis 3.4, the reporter saw:

- `spring.data.redis.database=0` connected
- `spring.data.redis.database=1` failed
- The chain included `ERR unknown command` for `CLIENT SETINFO`
- Deeper frames also showed `NOAUTH Authentication required`
- The same app worked on Spring Data Redis 3.2
- Redis server was older than 7.2 (5.0 in the issue)

It looks like a wrong DB index or broken password. The real trigger: **the new client handshake changed, and the old Redis does not understand the new commands.**

## Why CLIENT SETINFO appears

Newer Lettuce uses a more modern handshake path (related to `HELLO` / RESP3 and connection metadata). `CLIENT SETINFO` is supported from Redis 7.2 onward.

Version combo becomes:

```text
New Spring Data Redis + new Lettuce
        ↓
Handshake sends CLIENT SETINFO / HELLO-related commands
        ↓
Old Redis (< 7.2) replies ERR unknown command
        ↓
Auth and SELECT timing get disrupted
        ↓
Symptoms: cannot connect / NOAUTH / database switch fails
```

The maintainer’s verdict was blunt: this is a driver behavior change, not mysterious business code breakage.

## Practical mitigations

### Option A: Force RESP2 (compatible with older Redis)

```java
@Bean
public LettuceConnectionFactory redisConnectionFactory(RedisStandaloneConfiguration serverConfig) {
    LettuceClientConfiguration clientConfig = LettuceClientConfiguration.builder()
        .clientOptions(ClientOptions.builder()
            .protocolVersion(ProtocolVersion.RESP2)
            .build())
        .build();

    return new LettuceConnectionFactory(serverConfig, clientConfig);
}
```

Forcing RESP2 keeps authentication on the classic `AUTH` path and avoids unsupported handshake commands.

### Option B: Upgrade Redis to 7.2+

If infrastructure allows, upgrade the server so `CLIENT SETINFO` is a valid command. That is the cleaner long-term fix.

### Option C: Align the client fix version

The issue notes Lettuce 6.5 improved this via [lettuce#3035](https://github.com/redis/lettuce/pull/3035). When upgrading the Spring stack, check the Lettuce version explicitly—do not only watch the Boot major version.

## Upgrade checklist

Before release, verify at least:

1. **Redis server minor version**: is it < 7.2?
2. **Lettuce version**: will it default to the new handshake?
3. **Non-zero database**: probe connectivity with `database=1`
4. **Auth path**: ensure password setups do not send unsupported commands before AUTH

A simple probe:

```bash
# Immediately after app startup, verify non-zero DB access
redis-cli -n 1 PING
```

Also add an application startup health check that `PING`s the target database and fails fast if it cannot.

## Takeaways

1. **Framework upgrades can change client handshakes, not only APIs**
2. **Success on `database=0` does not prove `database=1` works**
3. **The visible error may be `NOAUTH` while the earlier fault was unknown command**
4. **When keeping old middleware, keep an escape hatch to force the old protocol**

That is the value of mining issues: you can write the upgrade landmine into your checklist before production finds it for you.
