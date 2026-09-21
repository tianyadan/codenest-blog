---
title: 帆软 FDL 生产崩溃排查：进程没了，最后定位到 JVM Heap OOM
summary: 生产上的帆软 FDL 突然访问不了，Java 进程直接消失。排除 Linux OOM Killer 之后，日志指向 Spark 预览触发的 Java heap space。机器还有十几 GB 空闲，但这套服务一直在用 Java 8 默认堆，上限大约只有 4GB。
author: evan
category: work
tags: [工作总结, FDL, JVM, Tomcat, Spark]
createdAt: 2026-09-21
updatedAt: 2026-09-21
readingMinutes: 12
slug: fdl-jvm-heap-oom-troubleshooting
---

# 帆软 FDL 生产崩溃排查：进程没了，最后定位到 JVM Heap OOM

早上生产环境的帆软 FDL 突然打不开。第一反应容易往接口超时、页面卡死、某个线程堵住这几个方向想，但这次连 Java 进程都找不到了。后面顺着启动脚本、日志和 JVM 参数往下看，问题其实很具体：不是整机内存被吃光，而是 Spark 做数据预览时把 Java 堆打满了。机器有 15GB 内存，这套 FDL 却一直在用 Java 8 的默认堆，上限大约只有 3.5 到 4GB。

环境比较普通。非 Docker，Linux 上直接跑，版本是 FDL 5.0.13.3，JDK 是安装包自带的 OpenJDK 1.8.0_402，底下是 Tomcat。为了不把机器账号写进文章，后面的安装目录统一记成 `<FDL_HOME>`。下面按当天的实际顺序记，下次再遇到 Java 进程自己消失，可以少绕一点。

## 先确认服务是不是真的没了 🔍

故障发生后先看进程：

```bash
ps -ef | grep java
```

输出里只剩 grep 自己，没有真正的 java。这说明不是页面卡一下那么简单，进程已经退出了。不过只搜 java 还不够，进程名可能不带 java，也可能其实挂在 systemd 下面，只是单元名看不出来。

```bash
ps -ef | grep -i fine
ps -ef | grep -i report
systemctl list-units --type=service | grep -Ei 'fine|report|tomcat|java'
```

这几条都没有帆软、Tomcat 或 Java 相关服务。两个结论可以先定下来：服务确实不在跑；这套 FDL 也不是注册成 systemd 服务启动的。后面就不用在 `systemctl status` 上耗时间了，转去找安装目录、启动脚本和日志。

## 启动方式其实就是 Tomcat 脚本

常见启动脚本用 find 扫一遍就够，深度限制一下，不必把整台机器翻到底：

```bash
find / -maxdepth 5 -type f \( \
  -name "startup.sh" -o \
  -name "shutdown.sh" -o \
  -name "start.sh" -o \
  -name "stop.sh" \
\) 2>/dev/null
```

找到的是安装目录下的 `bin/startup.sh` 和 `bin/shutdown.sh`。打开 `startup.sh` 看前半段，可执行文件指向 `catalina.sh`，最后是一句：

```bash
exec "$PRGDIR"/"$EXECUTABLE" start "$@"
```

也就是 `startup.sh` 转给 `catalina.sh start`，Tomcat 起来后再加载 FDL 的 Web 应用。日志该看哪里也就清楚了，优先 `catalina.out`、`fanruan.log`，再加上 GC 日志。

## 先看日志，先别重启 ✋

生产上进程已经没了，最想做的往往是立刻拉起来。这次先忍住。直接重启有可能冲掉还没滚动完的日志，文件时间也会被改掉，后面就不好把异常时间和业务操作对上。

先把安装目录里最近动过的日志找出来：

```bash
find <FDL_HOME> -maxdepth 4 -type f \
  \( -name "*.log" -o -name "*.out" -o -name "hs_err_pid*.log" \) \
  -printf '%TY-%Tm-%Td %TH:%TM:%TS %p\n' 2>/dev/null \
  | sort -r | head -50
```

当天值得看的主要是 `logs/catalina.out`、按日期切开的 `catalina.2026-09-21.log`、`logs/fanruan.log`、`logs/quartz/quartz.log`、`logs/localhost.2026-09-21.log`，以及 `logs/FineLog/gclogs/fanruan.gc.log`。优先看前两份应用日志和 GC 日志。没有 `hs_err_pid*.log`，至少说明不是典型的 JVM 原生崩溃把 hs_err 打出来那种情况。

## Linux 有没有把 Java 杀掉

Java 进程突然消失，很常见的一种解释是整机内存不够，OOM Killer 直接把 java 杀掉。这个和后面看到的 Java heap OOM 不是一回事，所以要先查掉，不然很容易在两个结论之间来回晃。

```bash
dmesg -T | grep -Ei 'oom|out of memory|killed process|java|segfault'
```

结果是空的，没有 `Out of memory: Killed process ... (java)` 这种内核日志。基本可以排除操作系统因为内存不足把进程杀掉。这里要留一句：dmesg 为空只说明 Killer 没动手，不代表 Java 自己没有内存问题。

## 应用日志把原因说清楚了 💥

接着在 `fanruan.log` 里把严重异常捞出来：

```bash
grep -iE 'error|exception|fatal|outofmemory|heap|killed|shutdown|failed' \
  <FDL_HOME>/logs/fanruan.log | tail -100
```

2026-09-21 09:34:10 附近有一条最关键的记录：获取预览数据失败，Spark 执行错误，信息就是 `Java heap space`。根异常是：

```text
Caused by: java.lang.OutOfMemoryError: Java heap space
```

到这里方向就变了。不是 Linux 内存耗尽，是 JVM 堆到了自己的上限。日志往后还能看到一串线程被中断，event center 的 consumer、lineage，还有 checker 线程都报 interrupted。接着是模块停不干净，`pipeline-develop` 和 `base-executor` 都出现了 stop failed。调用栈进了 `CatalinaShutdownHook.run`。串起来就是：堆 OOM 之后，FDL 内部模块开始异常，Tomcat 走进停止流程，进程退出，外面就表现为服务不可访问。

`catalina.out` 里同时还刷了大量 ThreadLocal 相关的提示，涉及 `SparkSession`、`ThreadLocal`、`CurrentOrigin`。大意是 webroot 这个应用创建了 ThreadLocal，停止时没清掉，Tomcat 认为有内存泄漏风险。这段不能单独当成根因。它是应用关闭过程中，Tomcat 检查残留线程和 ThreadLocal 时打出来的，说明关闭时确实有泄漏风险，也可能是长期内存压力的一部分，但时间点是在 shutdown，不是 OOM 的第一现场。真正把堆打满的那条，仍然是 `java.lang.OutOfMemoryError: Java heap space`。

## 机器还有十几 GB，为什么 Java 会 OOM 🤔

当时 `free -h` 大概是这样：

```text
               total        used        free      shared  buff/cache   available
Mem:            15Gi       727Mi       9.1Gi       588Ki       6.2Gi        14Gi
Swap:          4.0Gi       2.3Mi       4.0Gi
```

available 还有 14GB 左右，看起来很宽裕。容易产生的疑问是：操作系统都这么空，Java 为什么还会报堆溢出。原因是堆有自己的天花板，由 `-Xmx` 决定。操作系统剩多少，和 JVM 允许堆长到多大，是两套账。Metaspace、直接内存、线程栈、Spark 的堆外内存、SkyWalking Agent，都不算在这个堆上限里面。

接着在安装目录里搜 `-Xms`、`-Xmx`、`MaxRAMPercentage`。`bin` 和 `conf` 里没有实际生效的配置。扩大到整个安装目录，搜到的 `-Xmx` 基本都是 JDK 自带文档，不是这次进程用的参数。`catalina.sh` 里能看到的 `CATALINA_OPTS` 是引导类路径，外加 SkyWalking 的 javaagent，没有 `-Xms` 和 `-Xmx`。Tomcat 启动时会尝试加载 `$CATALINA_BASE/bin/setenv.sh` 或 `$CATALINA_HOME/bin/setenv.sh`，服务器上这个文件当时不存在。所以这套生产 FDL 没有显式配堆，用的是 Java 8 的默认值。

用安装包自带的 JDK 把默认堆打出来：

```bash
<FDL_HOME>/jdk/bin/java \
  -XX:+PrintFlagsFinal -version \
  | grep -E 'InitialHeapSize|MaxHeapSize'
```

结果是 `InitialHeapSize := 262144000`，`MaxHeapSize := 4192206848`。换算一下，初始堆大约 250MB，最大堆大约 3.9GB。再看估算值：

```bash
<FDL_HOME>/jdk/bin/java -XshowSettings:vm -version
```

`Max. Heap Size (Estimated)` 大约 3.47G。15GB 的机器，堆上限却停在 4GB 附近。Spark 做一次数据预览，把这个上限用穿了，就抛出 `Java heap space`。

整条链路可以收成这样：

```text
FDL 正常运行
    ↓
数据预览 / Spark ETL 需要大量堆
    ↓
JVM 最大堆默认只有大约 4GB
    ↓
java.lang.OutOfMemoryError: Java heap space
    ↓
FDL 模块异常，Tomcat 进入 shutdown
    ↓
Java 进程退出，服务不可访问
```

## 堆加大，但不要加到贴着物理内存 ⚙️

15GB 内存不能直接 `-Xmx14g`。堆外面还有 Metaspace、直接内存、线程栈、Spark native memory、SkyWalking，以及系统自己的 page cache。堆占太满，很容易从 Java heap OOM 换成 Linux OOM Killer，故障形态变了，更难查。这次取得比较保守：`-Xms4g -Xmx8g`。初始堆抬到 4GB，避免一开始就在很小的堆上频繁扩容；上限 8GB，给操作系统和非堆区域留出余量。

不建议改 `catalina.sh`。它是 Tomcat 自带脚本，下次升级 FDL 很容易被覆盖。Tomcat 本来就预留了 `setenv.sh` 用来放自定义 JVM 参数，升级时一般也不会动这个文件。

```bash
cat > <FDL_HOME>/bin/setenv.sh <<'EOF'
#!/bin/sh

export CATALINA_OPTS="$CATALINA_OPTS -Xms4g -Xmx8g"
EOF

chmod +x <FDL_HOME>/bin/setenv.sh
```

这里用 `CATALINA_OPTS="$CATALINA_OPTS ..."` 是为了把原有参数接上，而不是整段覆盖。`catalina.sh` 里原来的 bootclasspath 和 SkyWalking agent 还要保留。写完用 `cat` 再看一眼，确认文件里就是这两行参数，没有把引号写破。

## 拉起来之后要核对参数，不只看进程在不在

进到 `bin` 目录执行 `./startup.sh`。启动输出里能看到 `Using CATALINA_OPTS`，后面已经带上 `-Xms4g -Xmx8g`，说明 `setenv.sh` 被吃进去了。同时会有一句现有 PID 文件还在，然后把它清掉。上次是异常退出，Java 已经不在了，`tomcat.pid` 还留着，Tomcat 发现进程不存在就会清掉这个过期文件。这是预期行为，不是又启动失败。

验证做三件事就够。先 `ps` 确认 Java 进程还在，再用 `ss -lntp` 看监听。这套环境不是默认 8080，文章里把端口记成 `<FDL_PORT>`，对一下 java 和这个端口是否都在听。然后读 `<FDL_HOME>/tomcat.pid`，用安装包里的 jcmd 看真实参数：

```bash
<FDL_HOME>/jdk/bin/jcmd <PID> VM.flags
```

预期是 `InitialHeapSize` 大约 4GB，`MaxHeapSize` 大约 8GB。启动日志里出现参数，和进程里真的带上这些 flag，不是一回事，所以这一步值得做。

## 8GB 不是终点

把上限从大约 4GB 调到 8GB，解决的是默认堆太小。它不能证明业务侧没有问题。后面还是要盯 GC 和业务日志，Full GC 是否频繁，堆是不是很快又顶上去，同一次 Spark 预览会不会再次 OOM，同一个任务是不是每次都吃掉特别大的内存。

```bash
tail -f <FDL_HOME>/logs/FineLog/gclogs/fanruan.gc.log
tail -f <FDL_HOME>/logs/fanruan.log
```

如果 8GB 之后还是 `Java heap space`，就不要继续无脑加内存。该看的是数据量是不是异常、有没有一次把全量读进来、Spark 分区是否合理、预览是不是拉了过多数据、缓存有没有释放，以及插件或 `SparkSession`、ThreadLocal 有没有长期残留。

## 几个容易看错的点

`free` 里还有很多 available，不代表 Java 不会 OOM。堆溢出和操作系统杀进程是两件事。dmesg 里没有 OOM，也只说明 Killer 没触发，Java 自己仍然可以抛 `OutOfMemoryError`。ThreadLocal 那串 “probable memory leak” 要和 OOM 时间、shutdown 时间、GC 日志、当时正在做的预览放在一起看。单独看到关闭日志就下结论，很容易把 Tomcat 的泄漏检查当成根因。JVM 参数优先放 `setenv.sh`，不要为了省事直接改 `catalina.sh`。

以后再遇到 Java 服务突然挂掉，顺序可以固定成这样：先看进程和端口，再判断是 systemd、Docker 还是脚本启动。找到安装目录后先看日志，不要第一时间重启。应用日志里找 `OutOfMemoryError`，再用 dmesg 或 journalctl 区分 Linux OOM、Java heap OOM、JVM crash、人为 shutdown、端口冲突，还是应用自己退出。然后对一下 JVM 参数、机器内存和 GC，改配置，重启，核对 PID、端口和堆大小，最后继续看 GC 和具体业务任务。

这次最有用的一点是：Java 报 OOM 时，不能只看服务器还剩多少内存。操作系统内存、堆、直接内存、Metaspace 是不同的区域，得确认进程实际的 `-Xmx`。Spark、Flink、Tomcat、Spring Boot、Elasticsearch 上都很容易遇到同一类误判。
