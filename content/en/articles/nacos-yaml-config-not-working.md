---
title: Troubleshooting Nacos YAML Config That Never Took Effect
summary: After migrating YuDao Cloud local YAML into Nacos, property binding failed because the DataId lacked a .yaml suffix and was not parsed as YAML.
author: evan
category: work
tags: [Nacos, Spring Cloud Alibaba, YAML, ConfigurationProperties, Troubleshooting]
createdAt: 2026-07-01 22:16:42
updatedAt: 2026-07-01 22:16:42
readingMinutes: 12
---

# Troubleshooting Nacos YAML Config That Never Took Effect

## Background

After migrating YuDao Cloud local YAML into Nacos Config, `system-server` failed to start. The core error looked like this:

```log
APPLICATION FAILED TO START

Binding to target
cn.iocoder.yudao.module.system.framework.sms.config.SmsCodeProperties
failed

Property: yudao.sms-code.expireTimes
Value: "null"
Reason: expire time must not be null
```

The configuration class was:

```java
@ConfigurationProperties(prefix = "yudao.sms-code")
@Validated
@Data
public class SmsCodeProperties {

    @NotNull(message = "expire time must not be null")
    private Duration expireTimes;

    @NotNull(message = "send frequency must not be null")
    private Duration sendFrequency;

    @NotNull(message = "daily max send count must not be null")
    private Integer sendMaximumQuantityPerDay;

    @NotNull(message = "min code must not be null")
    private Integer beginCode;

    @NotNull(message = "max code must not be null")
    private Integer endCode;
}
```

The expected Nacos YAML was:

```yaml
yudao:
  sms-code:
    expire-times: 10m
    send-frequency: 1m
    send-maximum-quantity-per-day: 10
    begin-code: 9999
    end-code: 9999
```

At startup, every field was still `null`.

## Root Cause

The Nacos content was YAML, but the DataId originally had no `.yaml` / `.yml` suffix.

Original DataId:

```text
system_yudao_config
```

Original import:

```yaml
spring:
  config:
    import:
      - optional:nacos:system_yudao_config?group=SYSTEM_GROUP&file-extension=yaml
```

Logs showed:

```text
[Nacos Config] Load config[dataId=system_yudao_config, group=SYSTEM_GROUP] success
```

That only proves the client downloaded the DataId content. It does **not** prove:

1. the content was parsed as YAML
2. YAML was converted into Spring properties
3. properties entered the Spring Environment
4. `@ConfigurationProperties` could bind successfully

After printing PropertySources, `SYSTEM_GROUP@system_yudao_config` existed, but it contained no `yudao.*`, `aj.*`, or similar keys.

Conclusion: with the current Nacos ConfigData import flow, a DataId without a `.yaml` suffix was not parsed as YAML content.

## Fix

Rename the DataId from:

```text
system_yudao_config
```

to:

```text
system_yudao_config.yaml
```

And update the import:

```yaml
spring:
  config:
    import:
      - optional:nacos:system_yudao_config.yaml?group=SYSTEM_GROUP
```

After the fix, logs showed values coming from the expected source:

```text
source: SYSTEM_GROUP@system_yudao_config.yaml -> 10m
source: SYSTEM_GROUP@system_yudao_config.yaml -> 1m
source: SYSTEM_GROUP@system_yudao_config.yaml -> 9999
```

Spring Cloud Alibaba 2025.x imports Nacos through `spring.config.import`, and official examples also use DataIds with `.yml` / `.yaml` suffixes.

## Confirming Nacos Connectivity

During the investigation, ports and connectivity were also verified so a parsing issue would not be mistaken for a connection issue.

Common ports:

| Port | Purpose |
|------|---------|
| `8848` | Nacos Server HTTP/API; use this in `server-addr` |
| `9848` | Nacos Client gRPC port |
| `9849` | Nacos Server gRPC port |
| `18080` | Console UI port (often mapped from container `8080`) |

Example env vars:

```properties
NACOS_SERVER_ADDR=<NACOS_HOST>:8848
NACOS_USERNAME=nacos
NACOS_PASSWORD=<PASSWORD>
NACOS_NAMESPACE=<NAMESPACE_ID>
```

Example Spring config:

```yaml
spring:
  cloud:
    nacos:
      server-addr: ${NACOS_SERVER_ADDR}
      username: ${NACOS_USERNAME}
      password: ${NACOS_PASSWORD}
      discovery:
        enabled: true
        register-enabled: true
        namespace: ${NACOS_NAMESPACE}
        group: DEFAULT_GROUP
      config:
        server-addr: ${NACOS_SERVER_ADDR}
        namespace: ${NACOS_NAMESPACE}
        group: SYSTEM_GROUP
        enabled: true
```

If gRPC connection and service registration succeed, network/auth are fine. Continue investigating whether the content was parsed correctly.

Key takeaway:

- `server-addr` should point to `8848`
- Console ports such as `18080` are only for browser access

## How `@ConfigurationProperties` + `@Validated` Fail Fast

With:

```java
@ConfigurationProperties(prefix = "yudao.sms-code")
@Validated
```

startup roughly follows:

```text
create SmsCodeProperties bean
  → read yudao.sms-code.* from Environment
  → bind fields
  → run @Validated
  → fail @NotNull when fields are null
  → BeanCreationException
  → ApplicationContext fails to start
```

So `@NotNull` is not checked at business-call time. Missing config fails the whole boot process.

Secondary exceptions such as `BeanCreationNotAllowedException: nacosGracefulShutdownDelegate` usually appear during shutdown after the real failure. The true root cause remains:

```text
SmsCodeProperties could not read yudao.sms-code.* from the Environment
```

## Temporary Workaround: Comment Out `@Validated`

During debugging, commenting out `@Validated` lets the app start even when values are `null`, so an `ApplicationRunner` can inspect the Environment.

Important: restore `@Validated` after the fix. Otherwise missing config may only surface at runtime.

## PropertySource Debugging Focus

A temporary `ApplicationRunner` should answer:

1. Does the Nacos PropertySource exist?
2. Is the name the expected DataId?
3. Are target properties present?
4. What does `environment.getProperty()` return?
5. Which PropertySource finally provides each key?

Typical bad-case output:

```text
[SYSTEM_GROUP@system_yudao_config] yudao.* count: 0
yudao.sms-code.expire-times = null
```

Even configs like `aj.captcha.*` fell back to defaults. That proved the whole YAML document was not parsed, not just one property block.

## Final Fix Pattern

Create or update in Nacos:

```text
Data ID: system_yudao_config.yaml
Group: SYSTEM_GROUP
Format: YAML
Namespace: <NAMESPACE_ID>
```

Prefer suffix-based imports everywhere:

```yaml
spring:
  config:
    import:
      - optional:nacos:common.yaml?group=DEFAULT_GROUP
      - optional:nacos:system_default.yaml?group=SYSTEM_GROUP
      - optional:nacos:system_yudao_config.yaml?group=SYSTEM_GROUP
```

Recommended order:

```text
common config
  → module defaults
  → module-specific config
```

Later imports can override earlier ones, so module-specific config should come last.

Also note: Spring Cloud Alibaba 2025.x should use `spring.config.import`; 2025.1.x no longer relies on bootstrap-style Nacos access.

## Verification

After renaming to `system_yudao_config.yaml`, final values became:

```text
yudao.sms-code.expire-times = 10m
yudao.sms-code.send-frequency = 1m
yudao.sms-code.send-maximum-quantity-per-day = 10
yudao.sms-code.begin-code = 9999
yudao.sms-code.end-code = 9999
```

Listener logs also switched to the suffixed DataId, confirming the full chain:

```text
application.yaml
  → spring.config.import
  → Nacos DataId: system_yudao_config.yaml
  → YAML parsing
  → Spring PropertySource
  → Spring Environment
  → @ConfigurationProperties
  → SmsCodeProperties
```

## Checklist for Next Time

1. Can Nacos Server be reached?
2. Does `server-addr` point to `8848`?
3. Is the Namespace correct?
4. Is the Group correct?
5. Is the DataId correct?
6. Does `spring.config.import` use the `nacos:` prefix?
7. Do DataId and import name match exactly?
8. Does the YAML DataId use `.yaml` / `.yml`?
9. Was the config published in the console?
10. Is YAML indentation/hierarchy correct?
11. Temporarily disable `@Validated` if needed for debugging
12. Print PropertySources with an `ApplicationRunner`
13. Verify final values with `environment.getProperty()`
14. Restore `@Validated` after the fix
15. Remove temporary debug code

## Key Lessons

1. `Load config success` does not mean Spring successfully bound business properties.
2. A PropertySource existing does not mean YAML was parsed into keys.
3. `@ConfigurationProperties + @Validated` validates at startup and can fail boot entirely.
4. `ApplicationRunner` runs only after successful startup; remove `@Validated` temporarily if you need debug hooks.
5. PropertySource inspection is more reliable than Nacos load logs alone.
6. Prefer `spring.config.import` on Spring Cloud Alibaba 2025.x instead of bootstrap.
7. Keep YAML DataIds consistently suffixed with `.yaml`.
8. Migration is not finished after copying content into Nacos; verify DataId, Group, Namespace, import path, format detection, and final PropertySources.
