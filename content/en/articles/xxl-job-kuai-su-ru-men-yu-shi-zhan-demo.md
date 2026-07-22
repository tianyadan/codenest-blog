---
title: XXL-Job Quick Start and Practical Demo
summary: XXL-Job is a distributed task scheduling platform with admin management, execution logs, retries, monitoring, sharding, broadcasting, and more.
author: evan
category: learning
tags: [Learning, XXL-Job]
createdAt: 2026-06-11 21:19:07
updatedAt: 2026-06-11 21:19:07
readingMinutes: 16
---
# XXL-Job Quick Start and Practical Demo

## What Is XXL-Job

XXL-Job is a distributed task scheduling platform.

You can think of it as:

`an enterprise-grade enhancement of Spring @Scheduled`

In addition to scheduled tasks, it also supports:

- Web admin management
- Task execution logs
- Failed-task retries
- Task monitoring
- Multi-node execution
- Sharded tasks
- Broadcast tasks
- Manual task triggering

It is widely used in microservice projects.

---

# XXL-Job Architecture

XXL-Job mainly consists of two parts:

```text
     ┌─────────────────┐
     │ XXL-Job Admin   │
     │ Scheduling Hub  │
     └────────┬────────┘
              │ HTTP
              ▼
     ┌─────────────────┐
     │ SpringBoot      │
     │ Executor        │
     └─────────────────┘
```

Responsibilities:

XXL-Job Admin is responsible for managing tasks, while the SpringBoot Executor is responsible for executing them.

---

# Start XXL-Job Admin with Docker

## 1. Create the Database

Create the database:

```sql
CREATE DATABASE xxl_job DEFAULT CHARACTER SET utf8mb4;
```

Import the official SQL:

```text
doc/db/tables_xxl_job.sql
```

---

## 2. Start MySQL

For example:

```bash
docker run -d \
--name mysql \
-p 3306:3306 \
-e MYSQL_ROOT_PASSWORD=<PASSWORD> \
mysql:8
```

---

## 3. Start XXL-Job Admin

```bash
docker run -d \
--name xxl-job-admin \
-p 8080:8080 \
-e PARAMS="\
--spring.datasource.url=jdbc:mysql://192.168.1.100:3306/xxl_job?useUnicode=true&characterEncoding=UTF-8&serverTimezone=Asia/Shanghai \
--spring.datasource.username=root \
--spring.datasource.password=<PASSWORD>" \
xuxueli/xxl-job-admin:2.4.1
```

Visit:

```text
http://localhost:8080/xxl-job-admin
```

Default account: <span class="md-inline-color md-inline-color--e74c3c">admin</span> <span class="md-inline-color md-inline-color--27ae60">123456</span>

---

# Integrating XXL-Job with SpringBoot

## Add the Dependency

```xml
    <dependency>
        <groupId>com.xuxueli</groupId>
        <artifactId>xxl-job-core</artifactId>
        <version>2.4.1</version>
    </dependency>
```

---

# application.yml Configuration

```yaml
server:
     port: 9001
spring:
     application:
        name: demo-job
xxl:
     job:
        admin:
           addresses: http://127.0.0.1:8080/xxl-job-admin
        accessToken: default_token
        executor:
           appname: demo-job-executor
           address:
           ip:
           port: 9999
           logpath: /data/applogs/xxl-job
           logretentiondays: 30
```

Parameter descriptions:

| Parameter | Description |
|--------|--------|
| admin.addresses | Scheduling center address |
| accessToken | Communication token |
| executor.appname | Executor name |
| executor.port | Executor port |
| logpath | Log directory |
| logretentiondays | Log retention days |

---

# Register the XXL-Job Bean

Create a configuration class:

```java
@Configuration
public class XxlJobConfig {

    @Value("${xxl.job.admin.addresses}")
    private String adminAddresses;

    @Value("${xxl.job.accessToken}")
    private String accessToken;

    @Value("${xxl.job.executor.appname}")
    private String appname;

    @Value("${xxl.job.executor.port}")
    private int port;

    @Bean
    public XxlJobSpringExecutor xxlJobExecutor() {
           XxlJobSpringExecutor executor = new XxlJobSpringExecutor();
           executor.setAdminAddresses(adminAddresses);
           executor.setAppname(appname);
           executor.setAccessToken(accessToken);
           executor.setPort(port);
           return executor;
           } }
```

After startup:

```text
Spring starts
↓
Scans Beans
↓
Registers the executor
↓
Registers with XXL-Job Admin
```

---

# Writing a Task

Create a task class:

```java

@Component
@Slf4j
public class DemoJobHandler {

    @XxlJob("demoJobHandler")
    public void demoJobHandler() {

    log.info("Execute XXL-Job task");

    }  }
```

Here:

```java
    @XxlJob("demoJobHandler")
```

means:

```text
Task name
↓↓↓
demoJobHandler
```

Later, Admin finds the method by this name and executes it.

---

# How XXL-Job Executes Tasks

When Spring starts:

```text
Scan
@XxlJob
↓
Register to Map
↓
Wait for scheduling
```

Internally it is similar to:

```java
Map<String, Method>
```

For example:

```java
{
    "demoJobHandler"        ->     DemoJobHandler#demoJobHandler
    }
```

When the scheduling center sends a task:

```json

{
    "executorHandler":"demoJobHandler"
}

```

The executor runs:

```java
method.invoke(bean);
```

It executes the target method through reflection.

---

# Register the Executor in the Admin Console

Go to:

```text
Executor Management
```

Add a new one:

```text
AppName:
demo-job-executor

Name:
Test Executor

Registration method:
Automatic registration
```

---

# Create a Task

Go to:

```text
Task Management
```

Add a new task:

```text
Executor:
demo-job-executor

JobHandler: demoJobHandler
Scheduling type:

CRON  Cron: 0/10 * * * * ?
```

This means:

```text
Run once every 10 seconds
```

---

# Get Task Parameters

Configure in the admin console:

```text
Execution parameter: 2026-06
```

Code:

```java

@XxlJob("reportJob")
public void reportJob() {
        String param = XxlJobHelper.getJobParam();
        System.out.println(param);

        }
```

Output:

```text
2026-06
```

---

# XXL-Job Is More Than Just Scheduled Tasks

Many people think:

```text
XXL-Job = scheduled tasks
```

In reality:

```text
XXL-Job = distributed task scheduling platform
```

---

## 1. Scheduled Tasks

For example:

```text
Daily ERP synchronization
Generate daily reports
Clean up logs
Scan orders
```

---

## 2. Manual Task Execution

In the admin console:

```text
Task Management
↓
Run once
```

It runs immediately.

Suitable for:

```text
Knowledge base synchronization
Cache refresh
Data repair
```

---

## 3. Task Parameters

For the same task:

```text
Generate June report
Generate July report
Generate August report
```

You only need to modify the parameters.

---

## 4. Sharded Tasks

For example:

```text
Synchronize 1 million users
```

Deployment:

```text
Machine 1
Machine 2
Machine 3
```

Automatic split:

```text
Machine 1 0-330k
Machine 2 330k-660k
Machine 3 660k-1M
```

Code:

```java
int shardIndex = XxlJobHelper.getShardIndex();
int shardTotal = XxlJobHelper.getShardTotal();
```

---

## 5. Broadcast Tasks

For example:

```text
Refresh local cache
Delete temporary files
Load configuration
```

All nodes execute at the same time.

---

## 6. Shell Script Execution

Supports:

```text
Shell Python PowerShell NodeJS
```

For example:

```bash
docker restart nginx
```

Run directly from the admin console.

---

## 7. Data Compensation

For example:

```text
RocketMQ message failed
```

XXL-Job:

```text
Scan every 5 minutes
↓
Resend
```

This is a common enterprise use case.

---

## 8. AI Scenarios

Knowledge base synchronization:

```text
Scan files
↓
Parse PDF
↓
Embedding
↓
Vector database
```

AI daily report:

```text
Collect user behavior
↓
Generate daily report
↓
Send email
```

Agent inspection:

```text
Check service status
↓
Detect anomalies
↓
Send alerts
```

---

# XXL-Job vs @Scheduled

| Feature | @Scheduled | XXL-Job |
|--------|--------|--------|
| Scheduled execution | √ | √ |
| Admin console management | × | √ |
| Execution logs | × | √ |
| Failed-task retries | × | √ |
| Manual triggering | × | √ |
| Multi-node execution | × | √ |
| Sharded tasks | × | √ |
| Broadcast tasks | × | √ |
| Monitoring and alerts | × | √ |

---

# Summary

The core idea of XXL-Job is:

```text
Unified scheduling
Unified execution
Unified monitoring
Unified logging
Unified retries
```

In enterprise projects:

```text
SpringBoot handles business logic
RocketMQ handles async messaging
Redis handles caching
Nacos handles configuration
Sentinel handles rate limiting
XXL-Job handles scheduling
```

If you only need simple scheduled tasks:

```java
@Scheduled
```

is enough.

But if the scenario involves:

```text
Multiple services
Multiple machines
Task monitoring
Task logs
Failed-task retries
Manual triggering
```

then XXL-Job is recommended.
