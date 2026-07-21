---
title: Redis Returned keyB for keyA: Connection Sharing Lessons from a Spring Data Redis Issue
summary: Using spring-data-redis#3077, unpack why shareNativeConnection can surface as value mix-ups under concurrency or after abnormal recovery.
author: evan
category: learning
tags: [Redis, Spring Data Redis, Lettuce, Connection Sharing, GitHub Issue]
createdAt: 2026-07-20
updatedAt: 2026-07-20
readingMinutes: 10
---

# Redis Returned keyB for keyA: Connection Sharing Lessons from a Spring Data Redis Issue

Source issues:

- [spring-projects/spring-data-redis#3077](https://github.com/spring-projects/spring-data-redis/issues/3077)
- Related discussion: [redis/lettuce#3117](https://github.com/redis/lettuce/issues/3117)
- Duplicate report: [spring-data-redis#3083](https://github.com/spring-projects/spring-data-redis/issues/3083)

This is the first deep dive in the "mining GitHub issues" series: the symptom looks like business data corruption, but the lesson sits in the client connection model.

## The scene looks terrifying

In a Spring Boot + WebFlux setup with the default `LettuceConnectionFactory`, reporters saw:

- Query `key1`, but deserialization consumed unrelated bytes
- Sometimes the payload was the literal `OK`
- Sometimes it was JSON belonging to another key
- Extremely intermittent, often suspected under high concurrency or after abnormal events
- Setting `shareNativeConnection=false` made the issue disappear

The failure was not "key missing". It was "this request read bytes that should not belong to it":

```text
Could not read JSON: ... [Source: (byte[])"OK"; ...]
Expected to obtain a policy model but got OK
```

and:

```text
Cannot deserialize value of type ArrayList<Policy> from Object value
[Source: (byte[])"{"name":"123","age":16,...}"]
```

The first blame usually lands on Jackson, cache wrappers, or Redis itself. The control experiment—"disable shared connection, problem gone"—points at connection reuse.

## The hidden default

`LettuceConnectionFactory` shares a native connection by default. In short:

- Each `getConnection()` returns a new `LettuceConnection` wrapper
- Wrappers share one thread-safe native connection by default
- With `shareNativeConnection=true`, regular commands use the shared connection; blocking/tx ops take separate ones
- The shared native connection is usually not closed by `LettuceConnection`, so validation is off by default

Simplified:

```text
App threads A / B / C
    ↓
Multiple LettuceConnection wrappers
    ↓
One shared Lettuce native connection (default)
    ↓
Redis Server
```

Sharing saves resources and handshakes. The trade-off: if responses get out of order or connection state goes bad, the symptom can look like "I read someone else's reply".

## The valuable clues in the thread

Maintainer @mp911de highlighted two points:

1. Without a stable reproducer, it is hard to pin Spring Data Redis versus Lettuce
2. Responses may get out of order in Lettuce; Spring Data Redis deserializes its own `byte[]` and does not use Lettuce `RedisCodec`

The reporter later added a more important detail:

> The problem may appear some time after an OOM.

That shifts the story from "pure business concurrency bug" to "connection health after abnormal recovery". The issue was labeled `for: external-project` and followed up on the Lettuce side.

## Why it disguises itself as a serializer bug

Value mix-ups are excellent mimics:

| What you see | What it may really be |
|--------------|------------------------|
| JSON parse failure | Someone else's payload |
| Type mismatch | Another business model |
| Hard-to-reproduce flakes | Shared connection unhealthy after faults |
| Fixed by disabling sharing | Isolation stops reply cross-talk |

Suggested triage order:

1. Verify whether the raw bytes belong to the requested key
2. Inspect whether the factory shares a native connection and whether multiple templates share factories incorrectly
3. Align the timeline with OOM, reconnects, or timeout storms
4. Only then dig deep into business serializers

## Practical responses

### 1. Stop the bleeding: disable shared native connection

```java
@Bean
public LettuceConnectionFactory redisConnectionFactory(RedisStandaloneConfiguration config) {
    LettuceConnectionFactory factory = new LettuceConnectionFactory(config);
    // Prefer correctness first
    factory.setShareNativeConnection(false);
    return factory;
}
```

Expect higher connection/handshake cost. Use this as a stopgap, then reassess capacity.

### 2. If you must keep sharing: tighten boundaries

- Do not manually close the shared native connection
- Consider `setValidateConnection(true)` when faults are frequent (extra round trips)
- For multiple Redis hosts / templates, confirm factory and connection lifecycles are not crossed

### 3. Upgrade and observe

- Keep Spring Data Redis and Lettuce versions aligned; watch client-side ordering/recovery fixes
- Log key, raw-bytes digest, factory settings, and whether an OOM/reconnect just happened
- Load-test the recovery window after fault injection, not only steady-state QPS

## What to take away

This issue is not teaching "Redis is untrustworthy". It teaches:

1. **Default performance optimizations can reduce fault isolation**
2. **Value mix-ups deserve connection/protocol suspicion before serializer blame**
3. **Correctness flakes after OOM/reconnect are often more dangerous than steady-state latency**
4. **One comment in an issue thread can be worth more than a full stack dump**

That is why GitHub issues are worth mining: you are not collecting drama, you are collecting tuition someone else already paid.
