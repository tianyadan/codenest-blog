---
title: Maven 中央仓库替换阿里云仓库方案
summary: mac ： 1. 进入目录： 2. 创建 settings.xml 3. copy 4. 强制更新 + 禁 IPv6（保险起见）
author: evan
category: work
tags: [工作总结]
createdAt: 2025-12-18 16:26:48
updatedAt: 2025-12-18 16:26:48
readingMinutes: 2
---
# Maven 中央仓库替换阿里云仓库方案

## 正文

**mac** ：

1. 进入目录：

```bash
cd ~/.m2/
```
2. 创建 settings.xml

```bash
touch ~/.m2/settings.xml
```

3. copy

```XML
<settings xmlns="http://maven.apache.org/SETTINGS/1.0.0"
          xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
          xsi:schemaLocation="http://maven.apache.org/SETTINGS/1.0.0
                              https://maven.apache.org/xsd/settings-1.0.0.xsd">
    <mirrors>
        <mirror>
            <id>aliyun</id>
            <mirrorOf>*</mirrorOf>
            <name>Aliyun Maven</name>
            <url>https://maven.aliyun.com/repository/public</url>
        </mirror>
    </mirrors>
</settings>
```

4. 强制更新 + 禁 IPv6（保险起见）

```bash
mvn clean install -U -Djava.net.preferIPv4Stack=true
```
