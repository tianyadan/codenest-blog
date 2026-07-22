---
title: Fixing a Weird Lombok Issue
summary: A misleading compile and package failure turned out not to be Lombok at all, but an incorrect JDK version in the IDE.
author: evan
category: work
tags: [Work Notes]
createdAt: 2025-12-15 23:42:16
updatedAt: 2025-12-15 23:42:16
readingMinutes: 12
---
# Fixing a Weird Lombok Issue

## Main Text

**Problem description:**

Today I tried to package a project in IntelliJ IDEA. The application could start normally, but `compile` and `package` kept failing with a flood of errors like the following:

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
[INFO] /Users/tianhaowen/Desktop/code/my-love-backend/src/main/java/com/ithw/mylove/common/Result.java: Some input files use unchecked or unsafe operations.
[INFO] /Users/tianhaowen/Desktop/code/my-love-backend/src/main/java/com/ithw/mylove/common/Result.java: Recompile with -Xlint:unchecked for details.
[INFO] -------------------------------------------------------------
[ERROR] COMPILATION ERROR :
[INFO] -------------------------------------------------------------
[ERROR] /Users/tianhaowen/Desktop/code/my-love-backend/src/main/java/com/ithw/mylove/controller/BackgroundImageController.java:[34,54] cannot find symbol
  symbol:   method builder()
  location: class com.ithw.mylove.entity.BackgroundImage
[ERROR] /Users/tianhaowen/Desktop/code/my-love-backend/src/main/java/com/ithw/mylove/controller/BackgroundImageController.java:[36,29] invalid method reference
  cannot find symbol
    symbol:   method getIsUsed()
    location: class com.ithw.mylove.entity.BackgroundImage
[ERROR] /Users/tianhaowen/Desktop/code/my-love-backend/src/main/java/com/ithw/mylove/controller/BackgroundImageController.java:[40,58] cannot find symbol
  symbol:   method builder()
  location: class com.ithw.mylove.entity.BackgroundImage
[ERROR] /Users/tianhaowen/Desktop/code/my-love-backend/src/main/java/com/ithw/mylove/controller/BackgroundImageController.java:[58,70] cannot find symbol
  symbol:   method getIsDeleted()
  location: variable backgroundImage of type com.ithw.mylove.entity.BackgroundImage
[ERROR] /Users/tianhaowen/Desktop/code/my-love-backend/src/main/java/com/ithw/mylove/controller/BackgroundImageController.java:[59,58] cannot find symbol
  symbol:   method builder()
  location: class com.ithw.mylove.vo.BackgroundImageVo
[ERROR] /Users/tianhaowen/Desktop/code/my-love-backend/src/main/java/com/ithw/mylove/controller/BackgroundImageController.java:[60,44] cannot find symbol
  symbol:   method getId()
  location: variable backgroundImage of type com.ithw.mylove.entity.BackgroundImage
[ERROR] /Users/tianhaowen/Desktop/code/my-love-backend/src/main/java/com/ithw/mylove/controller/BackgroundImageController.java:[61,55] cannot find symbol
  symbol:   method getBackgroundUrl()
  location: variable backgroundImage of type com.ithw.mylove.entity.BackgroundImage
[ERROR] /Users/tianhaowen/Desktop/code/my-love-backend/src/main/java/com/ithw/mylove/controller/BackgroundImageController.java:[62,52] cannot find symbol
  symbol:   method getCreateTime()
  location: variable backgroundImage of type com.ithw.mylove.entity.BackgroundImage
[ERROR] /Users/tianhaowen/Desktop/code/my-love-backend/src/main/java/com/ithw/mylove/controller/BackgroundImageController.java:[63,52] cannot find symbol
  symbol:   method getUploadUser()
  location: variable backgroundImage of type com.ithw.mylove.entity.BackgroundImage
[ERROR] /Users/tianhaowen/Desktop/code/my-love-backend/src/main/java/com/ithw/mylove/controller/BackgroundImageController.java:[64,48] cannot find symbol
  symbol:   method getIsUsed()
  location: variable backgroundImage of type com.ithw.mylove.entity.BackgroundImage
[ERROR] /Users/tianhaowen/Desktop/code/my-love-backend/src/main/java/com/ithw/mylove/controller/BackgroundImageController.java:[66,24] incompatible types: java.util.List<java.lang.Object> cannot be converted to java.util.List<com.ithw.mylove.vo.BackgroundImageVo>
[ERROR] /Users/tianhaowen/Desktop/code/my-love-backend/src/main/java/com/ithw/mylove/controller/BackgroundImageController.java:[73,21] invalid method reference
  cannot find symbol
    symbol:   method getIsUsed()
    location: class com.ithw.mylove.entity.BackgroundImage
[ERROR] /Users/tianhaowen/Desktop/code/my-love-backend/src/main/java/com/ithw/mylove/controller/BackgroundImageController.java:[77,33] cannot find symbol
  symbol:   method builder()
  location: class com.ithw.mylove.vo.BackgroundImageVo
[ERROR] /Users/tianhaowen/Desktop/code/my-love-backend/src/main/java/com/ithw/mylove/controller/BackgroundImageController.java:[78,47] cannot find symbol
  symbol:   method getBackgroundUrl()
```

I searched online and found a lot of suggestions, including changing IntelliJ IDEA compiler settings. But the real cause was much more ridiculous: I was using the wrong JDK version. I had accidentally switched to the latest JDK 25. After spending two hours debugging, I changed it back to JDK 21 and the problem was solved. What a painfully silly mistake.
