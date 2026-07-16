---
title: Nacos YAML 配置未生效排查记录
summary: 把芋道 Cloud 本地 YAML 迁到 Nacos 后配置绑定失败，最终定位到 DataId 缺少 .yaml 后缀导致 YAML 未被正确解析。
author: evan
category: work
tags: [Nacos, Spring Cloud Alibaba, YAML, ConfigurationProperties, 排查]
createdAt: 2026-07-01 22:16:42
updatedAt: 2026-07-01 22:16:42
readingMinutes: 12
---

# Nacos YAML 配置未生效排查记录

## 问题背景

将芋道 Cloud 的本地 YAML 配置迁移到 Nacos 配置中心后，`system-server` 启动失败。核心错误如下：

```log
APPLICATION FAILED TO START

Binding to target
cn.iocoder.yudao.module.system.framework.sms.config.SmsCodeProperties
failed

Property: yudao.sms-code.expireTimes
Value: "null"
Reason: 过期时间不能为空
```

对应配置类：

```java
@ConfigurationProperties(prefix = "yudao.sms-code")
@Validated
@Data
public class SmsCodeProperties {

    @NotNull(message = "过期时间不能为空")
    private Duration expireTimes;

    @NotNull(message = "短信发送频率不能为空")
    private Duration sendFrequency;

    @NotNull(message = "每日发送最大数量不能为空")
    private Integer sendMaximumQuantityPerDay;

    @NotNull(message = "验证码最小值不能为空")
    private Integer beginCode;

    @NotNull(message = "验证码最大值不能为空")
    private Integer endCode;
}
```

预期从 Nacos 读取：

```yaml
yudao:
  sms-code:
    expire-times: 10m
    send-frequency: 1m
    send-maximum-quantity-per-day: 10
    begin-code: 9999
    end-code: 9999
```

但启动时所有配置项都是 `null`。

## 最终根因

Nacos 中的内容是 YAML，但 DataId 最初没有使用 `.yaml` / `.yml` 后缀。

原始 DataId：

```text
system_yudao_config
```

原始导入配置：

```yaml
spring:
  config:
    import:
      - optional:nacos:system_yudao_config?group=SYSTEM_GROUP&file-extension=yaml
```

虽然日志显示：

```text
[Nacos Config] Load config[dataId=system_yudao_config, group=SYSTEM_GROUP] success
```

这只说明客户端成功下载了该 DataId 的内容，并不代表：

1. 内容已按 YAML 解析
2. YAML 已转换成 Spring 属性
3. 属性已进入 Spring Environment
4. `@ConfigurationProperties` 可以正常绑定

实际打印 Spring PropertySource 后发现，`SYSTEM_GROUP@system_yudao_config` 这个配置源存在，但其中没有任何 `yudao.*`、`aj.*`、`spring.servlet.*` 等属性。

最终确认：无 `.yaml` 后缀的 DataId，在当前 Nacos ConfigData 导入流程中，没有被正确按 YAML 内容解析。

## 修复方式

把 DataId：

```text
system_yudao_config
```

改为：

```text
system_yudao_config.yaml
```

并同步修改导入配置：

```yaml
spring:
  config:
    import:
      - optional:nacos:system_yudao_config.yaml?group=SYSTEM_GROUP
```

修复后日志出现：

```text
来源: SYSTEM_GROUP@system_yudao_config.yaml -> 10m
来源: SYSTEM_GROUP@system_yudao_config.yaml -> 1m
来源: SYSTEM_GROUP@system_yudao_config.yaml -> 9999
```

说明 Nacos 配置已被正确解析并进入 Spring Environment。

Spring Cloud Alibaba 2025.x 使用 `spring.config.import` 导入 Nacos；官方示例也使用带 `.yml` / `.yaml` 后缀的 DataId。

## Nacos 端口与连接确认

排查过程中也核对了端口与连接，避免把「配置解析失败」误判成「连不上 Nacos」。

常见端口含义：

| 端口 | 用途 |
|------|------|
| `8848` | Nacos Server HTTP/API，应用 `server-addr` 使用该端口 |
| `9848` | Nacos Client gRPC 通信端口 |
| `9849` | Nacos Server gRPC 端口 |
| `18080` | Console 控制台端口（容器内常映射到 `8080`） |

本地环境变量示例：

```properties
NACOS_SERVER_ADDR=<NACOS_HOST>:8848
NACOS_USERNAME=nacos
NACOS_PASSWORD=<PASSWORD>
NACOS_NAMESPACE=<NAMESPACE_ID>
```

Spring Nacos 配置示例：

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

启动日志若出现 gRPC 连接成功、注册成功，说明网络、认证和服务注册都正常。此时应继续怀疑「内容是否被正确解析」，而不是连接问题。

结论：

- `server-addr` 应指向 `8848`
- Console 端口（如 `18080`）只用于浏览器访问控制台，不应当作应用连接地址

## `@ConfigurationProperties` 与 `@Validated` 的触发机制

配置类上同时存在：

```java
@ConfigurationProperties(prefix = "yudao.sms-code")
@Validated
```

Spring Boot 启动时大致流程是：

```text
创建 SmsCodeProperties Bean
    ↓
从 Spring Environment 读取 yudao.sms-code.*
    ↓
绑定到 Java 字段
    ↓
执行 @Validated
    ↓
校验 @NotNull
    ↓
字段为 null 时校验失败
    ↓
抛出 BeanCreationException
    ↓
ApplicationContext 启动失败
```

因此 `@NotNull` 不是在业务调用时才检查；配置绑定完成后会立刻触发校验，配置缺失会直接阻止应用启动。

后续日志里出现的 `BeanCreationNotAllowedException: nacosGracefulShutdownDelegate` 通常只是启动失败后的次生异常，真正根因始终是：

```text
SmsCodeProperties 无法从 Environment 中读取 yudao.sms-code.*
```

## 临时绕过：注释 `@Validated`

调试阶段可临时注释 `@Validated`，让应用即使配置为 `null` 也能启动，从而执行 `ApplicationRunner` 调试代码。

注意：这只用于排查。问题修复后必须恢复 `@Validated`，避免配置缺失拖到运行期才暴露。

## PropertySource 调试思路

为了确认 Nacos 配置是否真正进入 Environment，可临时增加 `ApplicationRunner`，重点检查：

1. Nacos PropertySource 是否存在
2. 名称是否是预期 DataId
3. 其中是否存在目标属性
4. `environment.getProperty()` 最终值是什么
5. 目标属性最终来自哪个 PropertySource

错误 DataId 下的典型现象是：

```text
[SYSTEM_GROUP@system_yudao_config] yudao.* 配置数量: 0
yudao.sms-code.expire-times = null
```

即使 Nacos 中已经写了 `aj.captcha.*` 等配置，验证码组件仍会落到默认值。这说明问题不是某一个配置块，而是整份 Nacos YAML 没有被正确解析。

## 最终修复方案

在 Nacos 中新建或修改：

```text
Data ID：system_yudao_config.yaml
Group：SYSTEM_GROUP
格式：YAML
Namespace：<NAMESPACE_ID>
```

本地导入建议统一为带后缀写法：

```yaml
spring:
  config:
    import:
      - optional:nacos:common.yaml?group=DEFAULT_GROUP
      - optional:nacos:system_default.yaml?group=SYSTEM_GROUP
      - optional:nacos:system_yudao_config.yaml?group=SYSTEM_GROUP
```

导入顺序建议：

```text
公共配置
  ↓
模块默认配置
  ↓
模块专属配置
```

后加载的配置可以覆盖前面配置，因此模块专属配置应放在最后。

补充：Spring Cloud Alibaba 2025.x 应通过 `spring.config.import` 导入 Nacos；2025.1.x 不再支持继续依赖 bootstrap 方式接入。

## 修复验证

DataId 改为 `system_yudao_config.yaml` 后，最终读取结果恢复正常：

```text
yudao.sms-code.expire-times = 10m
yudao.sms-code.send-frequency = 1m
yudao.sms-code.send-maximum-quantity-per-day = 10
yudao.sms-code.begin-code = 9999
yudao.sms-code.end-code = 9999
```

监听日志也会变成：

```text
[Nacos Config] Listening config:
dataId=system_yudao_config.yaml,
group=SYSTEM_GROUP
```

完整链路为：

```text
application.yaml
  → spring.config.import
  → Nacos DataId: system_yudao_config.yaml
  → YAML 解析
  → Spring PropertySource
  → Spring Environment
  → @ConfigurationProperties
  → SmsCodeProperties
```

## 排查清单

以后遇到 Nacos 配置不生效，可按这个顺序排查：

1. Nacos Server 是否可访问
2. `server-addr` 是否指向 `8848`
3. Namespace 是否正确
4. Group 是否正确
5. DataId 是否正确
6. `spring.config.import` 是否带 `nacos:` 前缀
7. DataId 与 import 名称是否完全一致
8. YAML 内容是否使用 `.yaml` / `.yml` 后缀
9. Nacos 控制台是否已点击发布
10. YAML 缩进与层级是否正确
11. 临时关闭 `@Validated`，允许应用启动
12. 用 `ApplicationRunner` 打印 PropertySource
13. 用 `environment.getProperty()` 验证最终属性
14. 修复后恢复 `@Validated`
15. 删除临时调试代码

## 核心经验

1. Nacos 日志里的 `Load config success`，不代表 Spring 已成功读取业务配置。
2. PropertySource 存在，不代表 YAML 已被正确解析成属性。
3. `@ConfigurationProperties + @Validated` 会在启动期校验；配置缺失会直接导致启动失败。
4. `ApplicationRunner` 只有在应用启动成功后才会执行；绑定失败时需临时去掉 `@Validated` 才能跑调试逻辑。
5. 打印 PropertySource 比只看 Nacos 日志更可靠，能直接确认配置来源、是否解析、是否被覆盖。
6. Spring Cloud Alibaba 2025.x 应使用 `spring.config.import`，不要继续依赖 bootstrap。
7. YAML 内容的 DataId 统一使用 `.yaml` 后缀，不要混用无后缀与带后缀两种写法。
8. 配置迁移不是「复制内容到 Nacos」就结束，还必须验证 DataId、Group、Namespace、导入路径、格式识别和最终 PropertySource。
