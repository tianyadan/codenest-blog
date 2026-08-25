---
title: RocketMQ DLQ 死信队列监听与企微告警实践
summary: 记录任务通知模块中 RocketMQ 消费失败、进入 DLQ、监听死信并通过企业微信通知管理员的完整实现思路。
author: CodeNest
category: work
tags: [RocketMQ, DLQ, Java, SpringBoot, 企业微信, 消息队列]
createdAt: 2026-08-25
updatedAt: 2026-08-25
readingMinutes: 6
slug: rocketmq-dlq-wecom-alarm
---

---

# RocketMQ DLQ 死信队列监听与企微告警实践

在任务通知模块中，我原本已经使用 RocketMQ 来处理任务创建、提交、驳回、验收通过、删除和编辑等通知。

正常情况下，消费者消费消息后会发送企业微信通知。

但这里存在一个问题：

> 如果消息连续消费失败，超过 RocketMQ 最大重试次数后进入死信队列，我怎么第一时间知道？

如果只依赖 RocketMQ Dashboard，需要管理员主动去查看，实际生产环境中很容易漏掉。

因此，我增加了一套简单的 DLQ 监听和企微告警机制。

整体流程如下：

```text
Producer
   ↓
goals-notification
   ↓
GoalNotifyConsumer
   ↓
消费失败
   ↓
RocketMQ 自动重试
   ↓
超过最大重试次数
   ↓
DLQ 死信队列
   ↓
GoalNotifyDlqConsumer
   ↓
GoalNotifyAlarmService
   ↓
企业微信通知管理员
```

## 1. 正常消费者配置

原来的任务通知消费者如下：

```java
@RocketMQMessageListener(
        topic = GoalNotifyMessage.TOPIC,
        consumerGroup = GoalNotifyMessage.TOPIC + "_CONSUMER",
        selectorExpression = "*",
        messageModel = MessageModel.CLUSTERING,
        maxReconsumeTimes = 5
)
public class GoalNotifyConsumer
        implements RocketMQListener<GoalNotifyMessage> {
}
```

其中比较关键的是：

```java
maxReconsumeTimes = 5
```

表示消息消费失败后，RocketMQ 会继续进行重试。

当消息超过最大重试次数后，会进入当前 Consumer Group 对应的死信队列。

当前 Consumer Group 为：

```text
goals-notification_CONSUMER
```

因此对应的 DLQ Topic 为：

```text
%DLQ%goals-notification_CONSUMER
```

RocketMQ 的死信 Topic 本质上就是：

```text
%DLQ% + ConsumerGroup
```

## 2. 新增 DLQ 消费者

接下来新增一个专门监听死信队列的消费者：

```java
@Component
@Slf4j
@ConditionalOnProperty(
        prefix = "goals.notification.rocketmq",
        name = "enabled",
        havingValue = "true"
)
@RocketMQMessageListener(
        topic = "%DLQ%" + GoalNotifyMessage.TOPIC + "_CONSUMER",
        consumerGroup = "goals-notification-dlq-alarm_CONSUMER",
        selectorExpression = "*",
        messageModel = MessageModel.CLUSTERING
)
public class GoalNotifyDlqConsumer
        implements RocketMQListener<GoalNotifyMessage> {

    @Resource
    private GoalNotifyAlarmService goalNotifyAlarmService;

    @Override
    public void onMessage(GoalNotifyMessage message) {

        log.error(
                "[onMessage][任务通知进入死信队列] goalId={}, type={}, operatorId={}, tenantId={}, message={}",
                message.getGoalId(),
                message.getType(),
                message.getOperatorId(),
                message.getTenantId(),
                message
        );

        try {

            goalNotifyAlarmService.sendDlqAlarm(message);

        } catch (Exception e) {

            log.error(
                    "[onMessage][死信消息管理员企微告警处理失败] goalId={}, type={}",
                    message.getGoalId(),
                    message.getType(),
                    e
            );
        }
    }
}
```

这里需要注意：

DLQ Consumer 必须使用一个新的 Consumer Group：

```java
consumerGroup = "goals-notification-dlq-alarm_CONSUMER"
```

不能继续使用：

```text
goals-notification_CONSUMER
```

否则正常消费者和 DLQ 消费者的订阅关系就混在一起了。

## 3. 为什么 DLQ Consumer 不自动重新执行业务

一开始很容易想到一种实现：

```text
消息进入 DLQ
→ DLQ Consumer 收到
→ 再调用一次业务通知方法
```

但这种方式并不好。

因为如果真正的问题还没有解决，例如企业微信接口仍然不可用，那么流程可能变成：

```text
正常消息失败
↓
重试 5 次
↓
进入 DLQ
↓
DLQ Consumer 再次发送
↓
继续失败
↓
继续重试
```

这样就失去了死信队列的意义。

因此我的 DLQ Consumer 只负责：

```text
发现死信
+
通知管理员
```

真正的消息重试由管理员确认问题修复后再人工处理。

## 4. 新增企微告警服务

DLQ Consumer 收到死信消息后，调用：

```java
goalNotifyAlarmService.sendDlqAlarm(message);
```

我单独增加了一个：

```text
GoalNotifyAlarmService
```

负责系统级 MQ 告警。

核心代码如下：

```java
@Service
@Slf4j
public class GoalNotifyAlarmService {

    /**
     * 系统管理员用户 ID
     */
    private static final List<Long> ALARM_ADMIN_USER_IDS = List.of(
            197L,
            1013L
    );

    private static final String DLQ_DASHBOARD_URL =
            "http://192.168.184.248:28088/#/dlqMessage";

    @Resource
    private AdminUserApi adminUserApi;

    @Resource
    private GoalWeComNotifier weComNotifier;

    @Resource
    private GoalsMapper goalsMapper;

    public void sendDlqAlarm(GoalNotifyMessage message) {

        if (message == null) {
            log.warn("[sendDlqAlarm][死信消息为空，跳过告警]");
            return;
        }

        // 查询任务信息，仅用于补充告警内容
        GoalsDO goalsDO = null;

        if (message.getGoalId() != null) {
            try {
                goalsDO = goalsMapper.selectById(message.getGoalId());
            } catch (Exception e) {
                log.error(
                        "[sendDlqAlarm][查询任务信息失败，仍继续发送死信告警] goalId={}",
                        message.getGoalId(),
                        e
                );
            }
        }

        String eventType = resolveEventType(message.getType());

        String goalName = goalsDO != null
                ? valueOf(goalsDO.getName())
                : "任务不存在或已删除";

        String detail =
                "任务ID：" + valueOf(message.getGoalId()) + "\n"
                        + "任务名称：" + goalName + "\n"
                        + "消息类型：" + eventType + "\n"
                        + "消息类型Code：" + valueOf(message.getType()) + "\n"
                        + "接收人ID：" + valueOf(message.getReceiverId()) + "\n"
                        + "操作人ID：" + valueOf(message.getOperatorId()) + "\n"
                        + "租户ID：" + valueOf(message.getTenantId());

        String description = weComNotifier.buildCardDescription(
                "任务通知消息多次消费失败，已进入 RocketMQ 死信队列",
                detail,
                "请及时检查 goals-service 日志及 RocketMQ Dashboard"
        );

        for (Long adminUserId : ALARM_ADMIN_USER_IDS) {

            try {

                AdminUserRespDTO admin = adminUserApi
                        .getUser(adminUserId)
                        .getCheckedData();

                if (admin == null) {
                    log.warn(
                            "[sendDlqAlarm][告警管理员不存在] adminUserId={}",
                            adminUserId
                    );
                    continue;
                }

                boolean weComOk = weComNotifier.sendTextCard(
                        admin,
                        "RocketMQ 死信告警",
                        description,
                        DLQ_DASHBOARD_URL
                );

                if (!weComOk) {

                    log.error(
                            "[sendDlqAlarm][死信企微告警发送失败] adminUserId={}, goalId={}, type={}",
                            adminUserId,
                            message.getGoalId(),
                            message.getType()
                    );

                    continue;
                }

                log.info(
                        "[sendDlqAlarm][死信企微告警发送成功] adminUserId={}, goalId={}, type={}",
                        adminUserId,
                        message.getGoalId(),
                        message.getType()
                );

            } catch (Exception e) {

                log.error(
                        "[sendDlqAlarm][发送死信企微告警异常] adminUserId={}, goalId={}, type={}",
                        adminUserId,
                        message.getGoalId(),
                        message.getType(),
                        e
                );
            }
        }
    }

    private String resolveEventType(Integer typeCode) {

        if (typeCode == null) {
            return "UNKNOWN";
        }

        GoalNotifyEventTypeEnum type =
                GoalNotifyEventTypeEnum.getByCode(typeCode);

        return type != null
                ? type.name()
                : "UNKNOWN";
    }

    private String valueOf(Object value) {

        return value != null
                ? String.valueOf(value)
                : "-";
    }
}
```

## 5. 为什么给多个管理员分别 try-catch

当前系统管理员为：

```java
private static final List<Long> ALARM_ADMIN_USER_IDS = List.of(
        197L,
        1013L
);
```

发送时没有把整个循环放到一个 `try-catch` 中，而是每个管理员单独处理：

```java
for (Long adminUserId : ALARM_ADMIN_USER_IDS) {

    try {
        // 查询用户
        // 发送企业微信

    } catch (Exception e) {
        // 当前管理员失败
    }
}
```

这样做的目的是避免：

```text
197 发送失败
↓
整个方法直接结束
↓
1013 也收不到
```

现在变成：

```text
197 发送失败
↓
记录 ERROR
↓
继续发送 1013
```

管理员之间互不影响。

## 6. 为什么查询任务失败不能直接 return

为了让告警内容更直观，我增加了：

```java
goalsMapper.selectById(message.getGoalId());
```

用于查询：

```text
任务名称
任务信息
```

但是这里不能写：

```java
if (goalsDO == null) {
    return;
}
```

因为系统本身存在 DELETE 类型消息。

例如：

```text
删除任务
↓
数据库任务已经删除
↓
DELETE 通知发送失败
↓
进入 DLQ
↓
查询 GoalsDO
↓
查不到
```

这时候如果直接 `return`，管理员反而永远收不到 DELETE 类型的死信告警。

因此这里遵循一个原则：

> MQ Message 中的数据属于核心告警信息，数据库查询只用于补充信息。

即使数据库查询失败，也应该继续告警。

```text
查询成功
→ 带任务名称发送告警

查询失败
→ 显示“任务不存在或已删除”
→ 仍然发送告警
```

## 7. 为什么 DLQ 告警发送失败不继续抛异常

正常的业务消费者中：

```text
企微发送失败
↓
throw Exception
↓
RocketMQ 重试
```

这是合理的。

但 DLQ 告警消费者不能继续使用同样的策略。

如果这里继续：

```java
throw new IllegalStateException();
```

可能形成：

```text
业务消息消费失败
↓
DLQ
↓
告警 Consumer
↓
企业微信告警失败
↓
继续抛异常
↓
告警 Consumer 自己再次重试
```

因此 DLQ 告警采用：

```text
发送失败
↓
记录 ERROR 日志
↓
结束
```

不会继续扩大异常链。

## 8. 企业微信直接跳转 RocketMQ Dashboard

企微告警卡片中增加：

```java
private static final String DLQ_DASHBOARD_URL =
        "http://192.168.184.248:28088/#/dlqMessage";
```

发送：

```java
weComNotifier.sendTextCard(
        admin,
        "RocketMQ 死信告警",
        description,
        DLQ_DASHBOARD_URL
);
```

管理员收到告警后，可以直接点击卡片进入：

```text
RocketMQ Dashboard
→ DLQ Message
```

需要注意，这里使用的是：

```text
192.168.x.x
```

内网地址。

因此只有处于公司内网或者 VPN 环境下才能访问。

RocketMQ Dashboard 本身属于基础设施管理后台，我也不建议为了方便直接暴露到公网。

## 9. 最终运行流程

最终整套链路如下：

```text
任务业务
   ↓
Producer
   ↓
goals-notification
   ↓
GoalNotifyConsumer
   ↓
发送企业微信通知
   ↓
成功
   └──────────────→ 消费完成

失败
   ↓
抛出异常
   ↓
RocketMQ 自动重试
   ↓
超过最大重试次数
   ↓
%DLQ%goals-notification_CONSUMER
   ↓
GoalNotifyDlqConsumer
   ↓
GoalNotifyAlarmService
   ↓
197 + 1013
   ↓
收到企业微信告警
   ↓
点击 RocketMQ Dashboard
   ↓
查看 DLQ Message
   ↓
排查真实故障
   ↓
修复问题
   ↓
人工重新投递消息
```

## 10. 这次改造解决的问题

增加 DLQ 监听后，任务通知系统的异常处理链路从原来的：

```text
消费失败
→ RocketMQ 重试
→ 进入 DLQ
→ 没人知道
```

变成了：

```text
消费失败
→ 自动重试
→ DLQ
→ 主动告警
→ 管理员排查
→ 人工恢复
```

对于消息队列来说，Producer 和 Consumer 只是最基础的一层。

真正进入生产环境后，还需要继续考虑：

```text
重试
死信队列
告警
日志
幂等
监控
人工恢复
```

这次 DLQ 监听的实现虽然代码量并不大，但至少补齐了“消息彻底失败之后谁来发现”的问题，也让整个 RocketMQ 通知链路更加完整。
