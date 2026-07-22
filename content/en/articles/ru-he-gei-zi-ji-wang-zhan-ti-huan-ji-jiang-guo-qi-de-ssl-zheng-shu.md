---
title: How to Replace an SSL Certificate That Is About to Expire on Your Website
summary: Apply for a new SSL certificate from a cloud provider, locate the mounted nginx certificate files on your server, replace them, and restart the nginx container.
author: evan
category: work
tags: [Work Notes]
createdAt: 2025-11-16 20:43:31
updatedAt: 2025-11-16 20:43:31
readingMinutes: 1
---
# How to Replace an SSL Certificate That Is About to Expire on Your Website

## Notes

1. Apply for a free SSL certificate from a third-party cloud provider.

2. Download the nginx certificate, then search the server globally:

```bash
find / -type f -name "xxxx.com.cn.key" 2>/dev/null
```

```bash
find / -type f -name "xxxx.com.cn.pem" 2>/dev/null
```

3. Find the directory on the server where the certificate is mounted, then delete the old certificate and its corresponding `.bak` backup files.

4. Upload the new certificate and restart the nginx container.
