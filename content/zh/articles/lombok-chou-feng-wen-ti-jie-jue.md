---
title: Lombok 抽风问题解决。
summary: 问题描述 ： 今天在 Idea 中 package 项目，项目启动可以正常启动，但是 compile 和 package 一直疯狂报错，报错内容如下： 上...
author: evan
category: work
tags: [工作总结]
createdAt: 2025-12-15 23:42:16
updatedAt: 2025-12-15 23:42:16
readingMinutes: 12
---
# Lombok 抽风问题解决。

## 正文

**问题描述**：

今天在 Idea 中 package 项目，项目启动可以正常启动，但是 compile 和 package 一直疯狂报错，报错内容如下：

```Bash
[INFO] Scanning for projects...
[INFO] 
[INFO] --------------------------< com.ithw:my-love >--------------------------
[INFO] Building my-love 0.0.1-SNAPSHOT
[INFO]   from pom.xml
[INFO] --------------------------------[ jar ]---------------------------------
[INFO] 
[INFO] --- resources:3.3.1:resources (default-resources) @ my-love ---
[INFO] Copying 1 resource from src/main/resources to target/classes
[INFO] Copying 0 resource from src/main/resources to target/classes
[INFO] 
[INFO] --- compiler:3.14.0:compile (default-compile) @ my-love ---
[INFO] Recompiling the module because of changed source code.
[INFO] Compiling 94 source files with javac [debug parameters release 21] to target/classes
[INFO] /Users/tianhaowen/Desktop/code/my-love-backend/src/main/java/com/ithw/mylove/common/Result.java: 某些输入文件使用了未经检查或不安全的操作。
[INFO] /Users/tianhaowen/Desktop/code/my-love-backend/src/main/java/com/ithw/mylove/common/Result.java: 有关详细信息, 请使用 -Xlint:unchecked 重新编译。
[INFO] -------------------------------------------------------------
[ERROR] COMPILATION ERROR : 
[INFO] -------------------------------------------------------------
[ERROR] /Users/tianhaowen/Desktop/code/my-love-backend/src/main/java/com/ithw/mylove/controller/BackgroundImageController.java:[34,54] 找不到符号
  符号:   方法 builder()
  位置: 类 com.ithw.mylove.entity.BackgroundImage
[ERROR] /Users/tianhaowen/Desktop/code/my-love-backend/src/main/java/com/ithw/mylove/controller/BackgroundImageController.java:[36,29] 方法引用无效
  找不到符号
    符号:   方法 getIsUsed()
    位置: 类 com.ithw.mylove.entity.BackgroundImage
[ERROR] /Users/tianhaowen/Desktop/code/my-love-backend/src/main/java/com/ithw/mylove/controller/BackgroundImageController.java:[40,58] 找不到符号
  符号:   方法 builder()
  位置: 类 com.ithw.mylove.entity.BackgroundImage
[ERROR] /Users/tianhaowen/Desktop/code/my-love-backend/src/main/java/com/ithw/mylove/controller/BackgroundImageController.java:[58,70] 找不到符号
  符号:   方法 getIsDeleted()
  位置: 类型为com.ithw.mylove.entity.BackgroundImage的变量 backgroundImage
[ERROR] /Users/tianhaowen/Desktop/code/my-love-backend/src/main/java/com/ithw/mylove/controller/BackgroundImageController.java:[59,58] 找不到符号
  符号:   方法 builder()
  位置: 类 com.ithw.mylove.vo.BackgroundImageVo
[ERROR] /Users/tianhaowen/Desktop/code/my-love-backend/src/main/java/com/ithw/mylove/controller/BackgroundImageController.java:[60,44] 找不到符号
  符号:   方法 getId()
  位置: 类型为com.ithw.mylove.entity.BackgroundImage的变量 backgroundImage
[ERROR] /Users/tianhaowen/Desktop/code/my-love-backend/src/main/java/com/ithw/mylove/controller/BackgroundImageController.java:[61,55] 找不到符号
  符号:   方法 getBackgroundUrl()
  位置: 类型为com.ithw.mylove.entity.BackgroundImage的变量 backgroundImage
[ERROR] /Users/tianhaowen/Desktop/code/my-love-backend/src/main/java/com/ithw/mylove/controller/BackgroundImageController.java:[62,52] 找不到符号
  符号:   方法 getCreateTime()
  位置: 类型为com.ithw.mylove.entity.BackgroundImage的变量 backgroundImage
[ERROR] /Users/tianhaowen/Desktop/code/my-love-backend/src/main/java/com/ithw/mylove/controller/BackgroundImageController.java:[63,52] 找不到符号
  符号:   方法 getUploadUser()
  位置: 类型为com.ithw.mylove.entity.BackgroundImage的变量 backgroundImage
[ERROR] /Users/tianhaowen/Desktop/code/my-love-backend/src/main/java/com/ithw/mylove/controller/BackgroundImageController.java:[64,48] 找不到符号
  符号:   方法 getIsUsed()
  位置: 类型为com.ithw.mylove.entity.BackgroundImage的变量 backgroundImage
[ERROR] /Users/tianhaowen/Desktop/code/my-love-backend/src/main/java/com/ithw/mylove/controller/BackgroundImageController.java:[66,24] 不兼容的类型: java.util.List<java.lang.Object>无法转换为java.util.List<com.ithw.mylove.vo.BackgroundImageVo>
[ERROR] /Users/tianhaowen/Desktop/code/my-love-backend/src/main/java/com/ithw/mylove/controller/BackgroundImageController.java:[73,21] 方法引用无效
  找不到符号
    符号:   方法 getIsUsed()
    位置: 类 com.ithw.mylove.entity.BackgroundImage
[ERROR] /Users/tianhaowen/Desktop/code/my-love-backend/src/main/java/com/ithw/mylove/controller/BackgroundImageController.java:[77,33] 找不到符号
  符号:   方法 builder()
  位置: 类 com.ithw.mylove.vo.BackgroundImageVo
[ERROR] /Users/tianhaowen/Desktop/code/my-love-backend/src/main/java/com/ithw/mylove/controller/BackgroundImageController.java:[78,47] 找不到符号
  符号:   方法 getBackgroundUrl()
```

上网查询了很多方法，有说要改 Idea-setting-construct 中的编译部分，其实这个错误很离谱，就是 JDK 用错了，用成最新的 25，然后找了 2 个小时问题，换成 JDK21 就解决了问题，**哈哈哈哈 真NC。**
