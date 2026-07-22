---
title: Utility Method: Get the Client IP
summary: Adapted from the original CodeNest article: Utility Method: Get the Client IP.
author: evan
category: work
tags: [Work Notes]
createdAt: 2025-10-28 22:00:00
updatedAt: 2025-10-28 22:00:00
readingMinutes: 2
---

# Utility Method: Get the Client IP

## Main Content

```java
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
    // Handle multi-level proxy scenarios
    if (ip != null && ip.contains(",")) {
        ip = ip.split(",")[0].trim();
    }
    return ip != null ? ip : "unknown";
}

```
