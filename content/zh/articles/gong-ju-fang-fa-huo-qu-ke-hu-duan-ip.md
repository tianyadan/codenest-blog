---
title: 工具方法：获取客户端 IP
summary: 整理自 CodeNest 原文：工具方法：获取客户端 IP。
author: evan
category: work
tags: [工作总结]
createdAt: 2025-10-28 22:00:00
updatedAt: 2025-10-28 22:00:00
readingMinutes: 2
---
# 工具方法：获取客户端 IP

## 正文

```Java
private String getClientIP() {
    ServletRequestAttributes attributes = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
    if (attributes == null) {
        return "unknown";
    }
    HttpServletRequest request = attributes.getRequest();
    String ip = request.getHeader("X-Forwarded-For");
    if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
        ip = request.getHeader("X-Real-IP");
    }
    if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
        ip = request.getRemoteAddr();
    }
    // 处理多级代理的情况
    if (ip != null && ip.contains(",")) {
        ip = ip.split(",")[0].trim();
    }
    return ip != null ? ip : "unknown";
}

```
