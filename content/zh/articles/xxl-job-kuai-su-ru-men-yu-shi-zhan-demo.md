---
title: XXL-Job 快速入门与实战 Demo
summary: "XXL Job 是一个分布式任务调度平台。 它可以理解为： Spring @Scheduled 的企业级增强版 除了支持定时任务之外，还支持： Web 后..."
author: evan
category: learning
tags: [学习, XXL-Job]
createdAt: 2026-06-11 21:19:07
updatedAt: 2026-06-11 21:19:07
readingMinutes: 16
---
# XXL-Job 快速入门与实战 Demo

## 什么是 XXL-Job

XXL-Job 是一个分布式任务调度平台。

它可以理解为：

`Spring @Scheduled 的企业级增强版` 

除了支持定时任务之外，还支持：

- Web 后台管理
- 任务执行日志
- 失败重试
- 任务监控
- 多节点执行
- 分片任务
- 广播任务
- 手动触发任务

在微服务项目中应用非常广泛。

---

# XXL-Job 架构

XXL-Job 主要由两部分组成：
```text
     ┌─────────────────┐ 
     │ XXL-Job Admin   │ 
     │ 调度中心         │ 
     └────────┬────────┘          
              │ HTTP          
              ▼ 
     ┌─────────────────┐ 
     │ SpringBoot      │ 
     │ Executor执行器   │ 
     └─────────────────┘ 
```
职责：

 XXL-Job Admin 负责管理任务  SpringBoot Executor 负责执行任务 

---

# Docker 启动 XXL-Job Admin

## 1. 创建数据库

创建数据库：

```sql 
CREATE DATABASE xxl_job DEFAULT CHARACTER SET utf8mb4; 
```

导入官方 SQL：

```text 
doc/db/tables_xxl_job.sql 
```

---

## 2. 启动 MySQL

例如：

```bash 
docker run -d \ 
--name mysql \ 
-p 3306:3306 \ 
-e MYSQL_ROOT_PASSWORD=<PASSWORD> \ 
mysql:8 
```
---

## 3. 启动 XXL-Job Admin

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

访问：

```text 
http://localhost:8080/xxl-job-admin
```

默认账号：<span class="md-inline-color md-inline-color--e74c3c">admin</span> <span class="md-inline-color md-inline-color--27ae60">123456</span> 

---

# SpringBoot 集成 XXL-Job

## 添加依赖

```xml 
    <dependency>     
        <groupId>com.xuxueli</groupId>     
        <artifactId>xxl-job-core</artifactId>     
        <version>2.4.1</version> 
    </dependency> 
```

---

# application.yml 配置

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

参数说明：

| 参数 | 说明 |
|--------|--------|
| admin.addresses | 调度中心地址 |
| accessToken | 通讯 Token |
| executor.appname | 执行器名称 |
| executor.port | 执行器端口 |
| logpath | 日志目录 |
| logretentiondays | 日志保留天数 |

---

# 注册 XXL-Job Bean

创建配置类：

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
           XxlJobSpringExecutor executor = new XxlJobSpringExecutor();               executor.setAdminAddresses(adminAddresses);         
           executor.setAppname(appname);         
           executor.setAccessToken(accessToken);         
           executor.setPort(port);          
           return executor;     
           } } 
```

启动后：

```text 
Spring  
↓ 
扫描 Bean  
↓ 
注册执行器  
↓ 
向 XXL-Job Admin 注册 
```

---

# 编写任务

创建任务类：

```java 

@Component 
@Slf4j 
public class DemoJobHandler { 

    @XxlJob("demoJobHandler")     
    public void demoJobHandler() {  
    
    log.info("执行 XXL-Job 任务");  
    
    }  } 
```

其中：

```java 
    @XxlJob("demoJobHandler") 
```

表示：

```text 
任务名称 
↓↓↓  
demoJobHandler 
```

后续 Admin 就是通过这个名称找到方法并执行。

---

# XXL-Job 执行原理

Spring 启动：

```text 扫描 
@XxlJob  
↓ 
注册到 Map  
↓ 
等待调度 
```

内部类似：

```java 
Map<String, Method> 
```

例如：

```java 
{     
    "demoJobHandler"        ->     DemoJobHandler#demoJobHandler 
    } 
```

当调度中心下发任务：

```json 

{   
    "executorHandler":"demoJobHandler" 
} 
    
```

执行器：

```java 
method.invoke(bean); 
```

通过反射执行目标方法。

---

# 后台注册执行器

进入：

```text 
执行器管理 
```

新增：

```text 
AppName： 
demo-job-executor

名称： 
测试执行器  

注册方式： 
自动注册 
```

---

# 创建任务

进入：

```text 
任务管理 
```

新增任务：

```text 
执行器： 
demo-job-executor  

JobHandler： demoJobHandler  
调度类型： 

CRON  Cron： 0/10 * * * * ? 
```

表示：

```text 
每10秒执行一次 
```

---

# 获取任务参数

后台配置：

```text 
执行参数： 2026-06 
```

代码：

```java 

@XxlJob("reportJob") 
public void reportJob() {      
        String param = XxlJobHelper.getJobParam();      
        System.out.println(param);  
        
        } 
```

输出：

```text  
2026-06
```

---

# XXL-Job 不只是定时任务

很多人认为：

```text 
XXL-Job = 定时任务 
```

实际上：

```text 
XXL-Job = 分布式任务调度平台 
```

---

## 1. 定时任务

例如：

```text 
每天同步 ERP 每天生成报表 清理日志 扫描订单 
```

---

## 2. 手动执行任务

后台：

```text 
任务管理  
↓ 
执行一次 
```

立即执行。

适用于：

```text 
知识库同步 
缓存刷新 
数据修复 
```

---

## 3. 任务参数

同一个任务：

```text 
生成6月报表 
生成7月报表 
生成8月报表 
```

只需要修改参数即可。

---

## 4. 分片任务

例如：

```text 
100万用户同步 
```

部署：

```text 
机器1 
机器2 
机器3 
```

自动切分：

```text 
机器1 0~33万  
机器2 33~66万  
机器3 66~100万 
```

代码：

```java 
int shardIndex = XxlJobHelper.getShardIndex();  
int shardTotal = XxlJobHelper.getShardTotal(); 
```

---

## 5. 广播任务

例如：

```text 
刷新本地缓存 
删除临时文件 
加载配置 
```

所有节点同时执行。

---

## 6. Shell 脚本执行

支持：

```text 
Shell Python PowerShell NodeJS 
```

例如：

```bash 
docker restart nginx 
```

直接后台执行。

---

## 7. 数据补偿

例如：

```text 
RocketMQ 消息失败 
```

XXL-Job：

```text 
每5分钟扫描  
↓ 
重新发送 
```

属于企业常见用法。

---

## 8. AI 场景

知识库同步：

```text 
扫描文件  
↓ 
解析 PDF  
↓ 
Embedding  
↓ 
向量库 
```

---

AI 日报：

```text 
统计用户行为  
↓ 
生成日报  
↓ 
发送邮件 
```

---

Agent 巡检：

```text 
检查服务状态  
↓ 
发现异常  
↓ 
发送告警 
```

---

# XXL-Job 与 @Scheduled 对比

| 功能 | @Scheduled | XXL-Job |
|--------|--------|--------|
| 定时执行 | √ | √ |
| 后台管理 | × | √ |
| 执行日志 | × | √ |
| 失败重试 | × | √ |
| 手动触发 | × | √ |
| 多节点执行 | × | √ |
| 分片任务 | × | √ |
| 广播任务 | × | √ |
| 监控告警 | × | √ |

---

# 总结

XXL-Job 的核心思想：

```text 
统一调度 
统一执行 
统一监控 
统一日志 
统一重试 
```

在企业项目中：

```text 
SpringBoot 负责业务  
RocketMQ 负责异步  
Redis 负责缓存  
Nacos 负责配置  
Sentinel 负责限流  
XXL-Job 负责调度 
```

如果只是简单定时任务：

```java 
@Scheduled 
```

即可。

如果涉及：

```text 
多服务 
多机器 
任务监控 
任务日志 
失败重试 
人工触发 
```

推荐使用 XXL-Job。
