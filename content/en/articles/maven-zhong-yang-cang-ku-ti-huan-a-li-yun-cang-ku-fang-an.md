---
title: Replacing Maven Central with the Aliyun Maven Mirror
summary: On macOS, create a settings.xml file under ~/.m2, add the Aliyun mirror, and force Maven to update with IPv4 preferred.
author: evan
category: work
tags: [Work Notes]
createdAt: 2025-12-18 16:26:48
updatedAt: 2025-12-18 16:26:48
readingMinutes: 2
---
# Replacing Maven Central with the Aliyun Maven Mirror

## Main Text

**macOS**:

1. Enter the directory:

```bash
cd ~/.m2/
```
2. Create `settings.xml`

```bash
touch ~/.m2/settings.xml
```

3. Copy the following content:

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

4. Force an update and disable IPv6 for safety:

```bash
mvn clean install -U -Djava.net.preferIPv4Stack=true
```
