---
title: Troubleshooting PrematureCloseException in Spring Cloud Gateway
summary: "In production, a Spring Cloud Gateway service intermittently threw reactor.netty.http.client.PrematureCloseException: Connection prematurely closed BEFORE response. This write-up tracks the investigation and the final fix."
author: evan
category: work
tags: [Work Notes, Spring, Gateway]
createdAt: 2026-06-03 16:28:09
updatedAt: 2026-06-03 16:28:09
readingMinutes: 11
---
# Troubleshooting PrematureCloseException in Spring Cloud Gateway

## 1. Background

In production, the Spring Cloud Gateway service intermittently threw the following exception:

`reactor.netty.http.client.PrematureCloseException: Connection prematurely closed BEFORE response`

Full log:

```text
2026-06-03 14:24:41 [reactor-http-epoll-1] WARN reactor.netty.http.client.HttpClientConnect  The connection observed an error  reactor.netty.http.client.PrematureCloseException: Connection prematurely closed BEFORE response  2026-06-03 14:24:41 [reactor-http-epoll-1] ERROR AbstractErrorWebExceptionHandler  500 Server Error for HTTP GET "/admin/system-alert/count"
```

Affected API:

```text
GET /admin/system-alert/count
```

---

## 2. Symptom Analysis

From the Gateway logs, I found:

```text
L:/172.17.0.2:58332 R:121.4.x.x:8180
```

Meaning:

- `L`: Gateway container address
- `R`: User-Service address

What this means:

Gateway had already connected to User-Service successfully, but User-Service closed the connection before returning a response.

So the problem was not in:

- Gateway route configuration
- JWT authentication
- Spring Security

Instead, it was in:

- The HTTP connection layer between Gateway and User-Service

---

## 3. Initial Suspicions

### Direction 1: User-Service failure

Suspicions:

```text
OOM
Service restart
Thread pool exhaustion
Database exception
Redis timeout
```

I checked the logs for the corresponding time range:

```bash
docker logs user \
  --since "2026-06-03T07:10:00" \
  --until "2026-06-03T07:20:00"
```

Result:

```text
AI model status inspection completed
No abnormal logs
No OOM
No restart
No database exception
```

Ruled out:

```text
User-Service crash
User-Service restart
Business code exception
```

---

### Direction 2: Nacos service discovery issue

After Gateway started, I saw:

```text
No servers available for service: codenest-user-service
```

Suspicions:

```text
Nacos service registration failure
Wrong service name configuration
```

Verification:

```bash
curl -i http://127.0.0.1:8080/admin/system-alert/count
```

Response:

```http
401 Unauthorized
```

This showed:

- Gateway had found User-Service
- The request had reached User-Service
- It just lacked a token

Further test with JWT:

```bash
curl -i http://127.0.0.1:8080/admin/system-alert/count \
  -H "Authorization: Bearer xxxxx"
```

Response:

```json
{ "code": 200, "data": 0, "message": "Operation successful" }
```

That proved:

- Gateway was working normally
- LoadBalancer was working normally
- Nacos was working normally
- JWT was working normally

Ruled out:

```text
Service discovery issue
Routing issue
Authentication issue
```

---

## 4. Final Root Cause

After the analysis, the explanation that best matched the symptoms was:

The Gateway connection pool was reusing an expired Keep-Alive connection.

### How it happens

User-Service uses Tomcat:

```text
Tomcat Keep-Alive timeout
↓
Tomcat proactively closes the idle connection
↓
Gateway's connection pool still keeps that connection
↓
The next request reuses the stale connection
↓
The connection is already invalid
↓
PrematureCloseException
```

This is also one of the most common issues with Reactor Netty.

---

## 5. Solution

### Add connection pool settings in Gateway

Change the configuration to:

```yaml
spring:
  cloud:
    gateway:
      httpclient:
        connect-timeout: 5000
        response-timeout: 30s
        pool:
          type: elastic
          # Maximum idle lifetime of a connection
          max-idle-time: 15s
          # Maximum lifetime of a connection
          max-life-time: 60s
```

---

### Add Tomcat settings in User-Service

Change the configuration to:

```yaml
server:
  tomcat:
    keep-alive-timeout: 30s
    connection-timeout: 10s
```

---

### Configuration rule

Make sure:

`Gateway max-idle-time < Tomcat keep-alive-timeout`

For example:

`Gateway: 15s, Tomcat: 30s`

This way, Gateway clears idle connections earlier and will not keep reusing connections that Tomcat has already closed.

---

## 6. Validation Process

### Test 1

Access the API:

```bash
curl -i http://127.0.0.1:8080/admin/system-alert/count
```

Response:

```http
401 Unauthorized
```

This showed that routing was normal.

---

### Test 2

Send the request with JWT:

```bash
curl -i http://127.0.0.1:8080/admin/system-alert/count \
  -H "Authorization: Bearer xxxxx"
```

Response:

```http
200 OK
```

This showed the full request path was healthy.

---

### Test 3

Wait a few minutes and call the API again:

```bash
curl -i http://127.0.0.1:8080/admin/system-alert/count
```

The `PrematureCloseException` no longer appeared.

Initial verification succeeded.

---

## 7. Environment-Specific Notes

This project uses separate servers for:

```text
Gateway server
User-Service server
Content-Service server
Interview-Service server
```

They are deployed on different cloud servers.

So the addresses registered in Nacos are:

```text
Public IPs
```

For example:

```text
121.4.xx.xx:8180
```

instead of:

```text
Docker private IPs such as 172.xx.xx.xx
```

So the real path is:

```text
Gateway
  ↓
Public TCP
  ↓
User-Service
```

Compared with a single-machine Docker network, this setup is more easily affected by:

- TCP KeepAlive
- NAT
- Cloud vendor connection recycling
- Network jitter

So connection pool tuning is especially important.

---

## 8. Final Conclusion

Root cause of the incident:

<span class="md-inline-color md-inline-color--e74c3c">The Gateway connection pool reused an expired Keep-Alive connection.</span>

Fix:

1. Configure `max-idle-time` for the Gateway connection pool
2. Configure `keep-alive-timeout` in Tomcat
3. Ensure Gateway clears connections earlier than Tomcat

Final configuration:

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

After verification, the exception did not reappear and the issue was resolved.
