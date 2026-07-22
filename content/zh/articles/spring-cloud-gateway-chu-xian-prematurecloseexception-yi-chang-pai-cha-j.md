---
title: Spring Cloud Gateway 出现 PrematureCloseException 异常排查记录
summary: 在生产环境中，Spring Cloud Gateway 网关服务偶发出现如下异常： reactor.netty.http.client.Premature...
author: evan
category: work
tags: [工作总结, Spring, Gateway]
createdAt: 2026-06-03 16:28:09
updatedAt: 2026-06-03 16:28:09
readingMinutes: 11
---
# Spring Cloud Gateway 出现 PrematureCloseException 异常排查记录

## 一、问题背景

在生产环境中，Spring Cloud Gateway 网关服务偶发出现如下异常：

reactor.netty.http.client.PrematureCloseException: Connection prematurely closed BEFORE response 

完整日志如下：

2026-06-03 14:24:41 [reactor-http-epoll-1] WARN reactor.netty.http.client.HttpClientConnect  The connection observed an error  reactor.netty.http.client.PrematureCloseException: Connection prematurely closed BEFORE response  2026-06-03 14:24:41 [reactor-http-epoll-1] ERROR AbstractErrorWebExceptionHandler  500 Server Error for HTTP GET "/admin/system-alert/count" 

异常接口：

 GET /admin/system-alert/count 

---

## 二、现象分析

从 Gateway 日志中发现：

L:/172.17.0.2:58332 R:121.4.x.x:8180 

含义：

L：Gateway 容器地址 R：User-Service 服务地址 

异常说明：

Gateway 已成功连接到 User-Service， 但 User-Service 在返回响应之前关闭了连接。 

因此问题并非出现在：

- Gateway 路由配置
- JWT 鉴权
- Spring Security

而是在：

Gateway 与 User-Service 的 HTTP 连接层 

---

## 三、初步怀疑方向

### 方向一：User-Service 服务异常

怀疑：

 OOM 服务重启 线程池耗尽 数据库异常 Redis 超时 

查看对应时间段日志：

bash docker logs user \ --since "2026-06-03T07:10:00" \ --until "2026-06-03T07:20:00" 

结果：

 AI 模型状态巡检完成 无异常日志 无 OOM 无重启 无数据库异常 

排除：

 User-Service 崩溃 User-Service 重启 业务代码异常 

---

### 方向二：Nacos 服务发现异常

Gateway 启动后发现：

text No servers available for service: codenest-user-service 

怀疑：

 Nacos 服务注册失败 服务名配置错误 

验证：

bash curl -i http://127.0.0.1:8080/admin/system-alert/count 

返回：

http 401 Unauthorized 

说明：

 Gateway 已找到 User-Service 请求已到达 User-Service 只是缺少 Token 

进一步携带 JWT 测试：

bash curl -i http://127.0.0.1:8080/admin/system-alert/count \ -H "Authorization: Bearer xxxxx" 

返回：

json {   "code": 200,   "data": 0,   "message": "操作成功" } 

证明：

 Gateway 正常 LoadBalancer 正常 Nacos 正常 JWT 正常 

排除：

 服务发现问题 路由问题 鉴权问题 

---

## 四、最终定位

经过分析，最符合现象的是：

 Gateway 连接池复用了已经失效的 KeepAlive 连接。 

### 原理

User-Service 使用 Tomcat：

Tomcat KeepAlive 超时 
↓ 
Tomcat 主动关闭空闲连接 
↓ 
Gateway 连接池仍然保留该连接 
↓ 
下一次请求复用旧连接 
↓ 
连接已失效 
↓ 
PrematureCloseException 

这也是 Reactor Netty 最常见的问题之一。

---

## 五、解决方案

### Gateway 增加连接池配置

修改：

```yaml
spring:   
    cloud:     
        gateway:       
            httpclient:         
                connect-timeout: 5000         
                response-timeout: 30s          
            pool:           
                type: elastic            
                # 空闲连接最大存活时间           
                max-idle-time: 15s            
                # 连接最大生命周期           
                max-life-time: 60s 
```

---

### User-Service 增加 Tomcat 配置

修改：

```yaml
server:   
    tomcat:     
        keep-alive-timeout: 30s     
        connection-timeout: 10s 
```

---

### 配置原则

确保：

Gateway max-idle-time < Tomcat keep-alive-timeout 

例如：

 Gateway：15s Tomcat：30s 

这样 Gateway 会提前清理空闲连接，不会拿已经被 Tomcat 关闭的连接继续使用。

---

## 六、验证过程

### 测试一

访问接口：

bash curl -i http://127.0.0.1:8080/admin/system-alert/count 

返回：

http 401 Unauthorized 

说明路由正常。

---

### 测试二

携带 JWT：

bash curl -i http://127.0.0.1:8080/admin/system-alert/count \ -H "Authorization: Bearer xxxxx" 

返回：

http 200 OK 

说明链路正常。

---

### 测试三

间隔数分钟再次访问：

bash curl -i http://127.0.0.1:8080/admin/system-alert/count 

未再出现：

 `PrematureCloseException `

初步验证成功。

---

## 七、环境特殊说明

本项目采用：

 Gateway 服务器 User-Service 服务器 Content-Service 服务器 Interview-Service 服务器 

分别部署在不同云服务器。

因此 Nacos 注册的是：

公网 IP 

例如：

 121.4.xx.xx:8180 

而非：

 Docker 内网 IP 172.xx.xx.xx 

因此：

 Gateway 
 ↓ 
 公网 TCP 
 ↓ 
 User-Service 

相比单机 Docker 网络更容易受到：

- TCP KeepAlive
- NAT
- 云厂商连接回收
- 网络抖动

等因素影响。

所以连接池参数配置尤为重要。

---

##  八、最终结论

本次异常根因：

 <span class="md-inline-color md-inline-color--e74c3c">Gateway 连接池复用了已经失效的 KeepAlive 连接。 </span>

解决方式：

- 1. Gateway 配置连接池 max-idle-time 
- 2. Tomcat 配置 keep-alive-timeout 
- 3. 保证 Gateway 清理连接时间早于 Tomcat 

最终配置：

```yaml
# Gateway 
spring:   
    cloud:     
        gateway:       
            httpclient:         
                connect-timeout: 5000         
                response-timeout: 30s         
            pool:           
                type: elastic           
                max-idle-time: 15s           
                max-life-time: 60s 
```
```yaml
 # User-Service 
 server:   
     tomcat:     
         keep-alive-timeout: 30s     
         connection-timeout: 10s 
```

经过验证，异常未再复现，问题得到解决。
