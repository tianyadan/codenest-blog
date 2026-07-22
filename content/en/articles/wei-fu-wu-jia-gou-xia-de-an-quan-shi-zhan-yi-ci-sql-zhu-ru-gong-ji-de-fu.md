---
title: "Security in a Microservices Architecture: Postmortem and Defense After an SQL Injection Attack"
summary: "On the morning of 2026-04-21, a feature test exposed abnormal errors in the logs. This post reviews how the attack was identified, why it failed, and how to strengthen layered defenses afterward."
author: evan
category: work
tags: [Work Notes, Microservices, SQL]
createdAt: 2026-04-21 10:10:54
updatedAt: 2026-04-21 10:10:54
readingMinutes: 6
---
# Security in a Microservices Architecture: Postmortem and Defense After an SQL Injection Attack

# What Triggered the Incident

**On the morning of 2026-04-21, I noticed errors while testing a feature and went to inspect the exception logs.**

As a maintainer of a microservices architecture, I am used to checking service health regularly. While reviewing the logs for `exam-service`, I noticed a dense burst of exception stacks.

Unlike normal business errors, these logs showed a highly mechanical pattern: the same endpoint was being hit at very high frequency within an extremely short period of time, and the requests were accompanied by a large number of `MethodArgumentTypeMismatchException` errors.

My instinct told me this was not normal business traffic, but an automated attack against the system.

## Investigation: Reconstructing What Happened

To understand the situation, I logged into the server, entered the container with `docker exec`, and inspected the raw log files directly under `/app/logs`.

1. **Identifying the attack pattern**

By analyzing the request parameters in the logs, I found that the attacker was injecting strings containing SQL keywords into parameters such as `id` and `year`, which should have been numeric values. Examples included:

- `' union select 1--`
- `2026" union select md5(3141592657)--`  # used to test whether the database executes functions
- `4 union select 1,2--` # used to test the number of columns

These are classic SQL injection payloads. In particular, `md5(3141592657)` is a recognizable probe often associated with automated scanning tools such as SQLMap.

2. **How the attack worked**

The attacker's intent was obvious: use SQL's `UNION` operator to append malicious queries to the original database query and try to extract schema information or sensitive data.

This relied on an error-based injection strategy: send single quotes `'` or double quotes `"` to break the original SQL structure, then infer whether a vulnerability exists by observing the system's error messages.

3. **Why the attack failed**

This attack did not lead to data leakage, mainly because of two layers of defense:

- **Type safety at the framework layer**: my backend API defines these parameters as `Integer` or `Long`. When Spring Boot receives a string such as `' union select...`, it throws a conversion error before the request ever reaches the database layer. The payload is blocked by application-layer type validation first.

- **Traffic scrubbing at the gateway layer**: although the logs looked noisy, most of the high-frequency traffic had already been intercepted by Sentinel rate-limiting rules at the gateway layer. The logs I saw were only the requests that slipped through.

## Outcome: No Real Damage

After investigation, I confirmed that there was no data leakage, database connectivity remained normal, and business functionality was unaffected.

- **Attack source**: an automated internet-wide botnet scan
- **Impact**: none, other than some noisy log entries
- **Current status**: the system remains stable, and the attack behavior is still ongoing, but it is being effectively blocked

Although this incident did not cause losses, it exposed weaknesses in our security monitoring and the granularity of our defenses.

# Next Steps: Build a Defense-in-Depth System

To move from passive defense to proactive resilience, I planned improvements in three areas:

1. **Detection layer: build real-time alerts**

Pain point: right now, attacks are discovered only by manually reviewing logs, which is too slow.

Improvement: upgrade `GlobalExceptionHandler`. When it catches a parameter type error and the content contains SQL keywords such as `union`, `select`, or `drop`, treat it as malicious traffic.

Action: trigger an asynchronous alert through a DingTalk or WeCom bot, including the attacker's IP, URL, and payload, so detection happens within seconds.

2. **Defense layer: more precise rate limiting**

Pain point: existing rate limiting is based on overall QPS and is not granular enough.

Improvement: use Sentinel's hotspot-parameter rate limiting.

Strategy: monitor key parameters such as `id` and `userId`. If one parameter value frequently triggers exceptions or contains suspicious special characters, block it directly at the gateway layer and ban the corresponding IP from reaching downstream business services.

3. **Code layer: eliminate hidden risks completely**

Pain point: even though the framework blocked this attack, security should not rely on luck.

Improvement:

- **Comprehensive review**: search the codebase for SQL string concatenation patterns such as MyBatis `${}` and replace them with prepared-statement placeholders such as `#{}`
- **Parameter validation**: introduce `@Valid` and regex checks at the controller layer. For ID-like parameters, strictly restrict input to numeric values so illegal characters are rejected at the source

# Summary

<span class="md-inline-color md-inline-color--e74c3c">Cybersecurity is a game with no finish line. This incident reminded me that "secure by default" is a critical design principle. Even without a heavily customized WAF, good engineering practices such as strong typing and sound architecture choices such as gateway rate limiting can become a solid shield when it matters most.</span>
