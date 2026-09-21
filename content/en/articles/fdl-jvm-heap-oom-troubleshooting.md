---
title: FineReport FDL Production Crash: The Process Was Gone, and It Was a JVM Heap OOM
summary: Production FDL suddenly became unreachable and the Java process was gone. Linux OOM Killer was not involved. Spark preview hit Java heap space because Java 8's default max heap was only about 4GB on a 15GB host.
author: evan
category: work
tags: [Work Notes, FDL, JVM, Tomcat, Spark]
createdAt: 2026-09-21
updatedAt: 2026-09-21
readingMinutes: 12
slug: fdl-jvm-heap-oom-troubleshooting
---

# FineReport FDL Production Crash: The Process Was Gone, and It Was a JVM Heap OOM

Production FineReport FDL stopped responding one morning. The usual guesses are a slow API, a stuck page, or one blocked thread. This time `ps` could not find a Java process at all. Following the startup scripts, logs, and JVM flags, the failure was narrower than it first looked: the machine was not out of RAM. A Spark preview filled the Java heap. The host had 15GB, but this FDL install was still on Java 8's default heap, capped at roughly 3.5 to 4GB.

The setup is ordinary. No Docker, a Linux host, FDL 5.0.13.3, the bundled OpenJDK 1.8.0_402, and Tomcat underneath. The install path is written as `<FDL_HOME>` below so the account name stays out of the post. This is the order that actually worked that day.

## The service was really down 🔍

The first check was the process list:

```bash
ps -ef | grep java
```

The only hit was grep itself. That already ruled out a hung request. The process had exited. Searching for `java` alone is not enough, though. The process name might not contain it, or the unit might be registered under systemd with a name that does not look like Tomcat.

```bash
ps -ef | grep -i fine
ps -ef | grep -i report
systemctl list-units --type=service | grep -Ei 'fine|report|tomcat|java'
```

Nothing came back for FineReport, Tomcat, or Java. Two things were clear: the service was not running, and this FDL was not a systemd unit. There was no point staying on `systemctl status`. The next step was the install directory, the start script, and the logs.

## It starts from Tomcat's own scripts

A shallow find is enough for the usual start and stop scripts:

```bash
find / -maxdepth 5 -type f \( \
  -name "startup.sh" -o \
  -name "shutdown.sh" -o \
  -name "start.sh" -o \
  -name "stop.sh" \
\) 2>/dev/null
```

That landed on `bin/startup.sh` and `bin/shutdown.sh` under the FDL install. The important part of `startup.sh` sets the executable to `catalina.sh` and finishes with:

```bash
exec "$PRGDIR"/"$EXECUTABLE" start "$@"
```

So `startup.sh` hands off to `catalina.sh start`, Tomcat comes up, and then it loads the FDL webapp. The logs that matter are `catalina.out`, `fanruan.log`, and the GC log.

## Read the logs before restarting ✋

When a production process is already gone, the impulse is to start it again. That can rotate or overwrite logs and change file timestamps, which makes it harder to line the crash up with what someone was doing in the product. Leave the process down until the logs have been read.

Recent files under the install directory:

```bash
find <FDL_HOME> -maxdepth 4 -type f \
  \( -name "*.log" -o -name "*.out" -o -name "hs_err_pid*.log" \) \
  -printf '%TY-%Tm-%Td %TH:%TM:%TS %p\n' 2>/dev/null \
  | sort -r | head -50
```

The useful ones from that day were `logs/catalina.out`, `logs/catalina.2026-09-21.log`, `logs/fanruan.log`, `logs/quartz/quartz.log`, `logs/localhost.2026-09-21.log`, and `logs/FineLog/gclogs/fanruan.gc.log`. Start with `catalina.out`, `fanruan.log`, and the GC log. There was no `hs_err_pid*.log`, so this was not the usual native JVM crash that leaves an hs_err file behind.

## Did Linux kill Java?

A Java process that vanishes is often the OOM Killer. The kernel runs out of memory and shoots the process. That is a different failure from a Java heap OOM, and it is worth ruling out before reading application stack traces.

```bash
dmesg -T | grep -Ei 'oom|out of memory|killed process|java|segfault'
```

The output was empty. There was no `Out of memory: Killed process ... (java)`. Linux had not killed the process for lack of RAM. An empty `dmesg` only means the killer did not run. The JVM can still throw its own out-of-memory error.

## The application log named the error 💥

Severe lines in `fanruan.log`:

```bash
grep -iE 'error|exception|fatal|outofmemory|heap|killed|shutdown|failed' \
  <FDL_HOME>/logs/fanruan.log | tail -100
```

Around 2026-09-21 09:34:10 the important line was a failed preview: Spark execution error, `Java heap space`. The root cause was:

```text
Caused by: java.lang.OutOfMemoryError: Java heap space
```

That changed the diagnosis. The host was not out of memory. The JVM heap had hit its own limit. After that, a run of threads reported interruption: the event-center consumer, the lineage consumer, and the checker thread. Then FDL modules failed to stop, including `pipeline-develop` and `base-executor`. The stack entered `CatalinaShutdownHook.run`. Heap OOM, module failures, Tomcat shutdown, process exit, and the service looks unreachable from the outside.

`catalina.out` also printed a lot of ThreadLocal warnings around `SparkSession`, `ThreadLocal`, and `CurrentOrigin`. Tomcat said the webroot application created a ThreadLocal and failed to remove it on stop, so it called it a probable memory leak. Those lines are easy to over-read. Tomcat prints them while the webapp is stopping, when it scans leftover threads and ThreadLocals. They mean a leak risk showed up at shutdown, and they might be part of longer-term pressure, but they are not the first evidence of this crash. The line that actually filled the heap is still `java.lang.OutOfMemoryError: Java heap space`.

## The host still had memory. Java OOM'd anyway 🤔

`free -h` at the time looked like this:

```text
               total        used        free      shared  buff/cache   available
Mem:            15Gi       727Mi       9.1Gi       588Ki       6.2Gi        14Gi
Swap:          4.0Gi       2.3Mi       4.0Gi
```

About 14GB available. That looks comfortable, which is why the heap error feels wrong at first. The heap has its own ceiling, set by `-Xmx`. Free RAM on the host does not raise that ceiling. Metaspace, direct memory, thread stacks, Spark off-heap memory, and the SkyWalking agent sit outside it.

A search for `-Xms`, `-Xmx`, and `MaxRAMPercentage` under `bin` and `conf` found nothing that was actually applied. Widening the search across the install mostly hit JDK documentation, not the flags this process used. In `catalina.sh`, `CATALINA_OPTS` only added the boot classpath and the SkyWalking `-javaagent`. There was no `-Xms` or `-Xmx`. Tomcat will load `$CATALINA_BASE/bin/setenv.sh` or `$CATALINA_HOME/bin/setenv.sh` if either file exists. Neither did. This production FDL was on the Java 8 default heap.

The bundled JDK prints those defaults:

```bash
<FDL_HOME>/jdk/bin/java \
  -XX:+PrintFlagsFinal -version \
  | grep -E 'InitialHeapSize|MaxHeapSize'
```

```text
InitialHeapSize := 262144000
MaxHeapSize     := 4192206848
```

That is about 250MB initial and about 3.9GB max. `java -XshowSettings:vm -version` reported an estimated max heap of about 3.47G. A 15GB machine, and the heap stopped near 4GB. One Spark preview crossed that line and threw `Java heap space`.

The chain looks like this:

```text
FDL running normally
    ↓
A preview / Spark ETL needs a large heap
    ↓
Default max heap is only about 4GB
    ↓
java.lang.OutOfMemoryError: Java heap space
    ↓
FDL modules fail, Tomcat shuts down
    ↓
The Java process exits and the service is unreachable
```

## Raise the heap, but do not pin it to physical RAM ⚙️

`-Xmx14g` on a 15GB host is a bad trade. Outside the heap there is still Metaspace, direct memory, thread stacks, Spark native memory, SkyWalking, and the OS page cache. Fill the heap to the edge of RAM and the next incident is often the Linux OOM Killer, which is a worse thing to debug. The conservative choice here was `-Xms4g -Xmx8g`. A 4GB initial heap avoids growing out of a tiny heap on every spike. An 8GB max leaves room for the OS and for memory that is not the Java heap.

Do not edit `catalina.sh` for this. It is Tomcat's own script, and an FDL upgrade can replace it. Tomcat already loads `setenv.sh` for local JVM options, and upgrades usually leave that file alone.

```bash
cat > <FDL_HOME>/bin/setenv.sh <<'EOF'
#!/bin/sh

export CATALINA_OPTS="$CATALINA_OPTS -Xms4g -Xmx8g"
EOF

chmod +x <FDL_HOME>/bin/setenv.sh
```

Appending to `CATALINA_OPTS` matters. Replacing the variable would drop the boot classpath and the SkyWalking agent that `catalina.sh` already sets. After writing the file, `cat` it once and check that the quotes survived.

## After startup, check the flags, not just the process

From `<FDL_HOME>/bin`, `./startup.sh` printed `Using CATALINA_OPTS` with `-Xms4g -Xmx8g` on the list, so `setenv.sh` was loaded. It also reported an existing PID file and removed it. The previous exit was unclean: Java was gone, `tomcat.pid` was still there, and Tomcat cleared the stale file because the old process was not alive. That message is expected. It is not a failed start.

Three checks are enough. `ps` should show Java. `ss -lntp` should show it listening. This install is not on 8080; the port is written here as `<FDL_PORT>`. Then read `<FDL_HOME>/tomcat.pid` and ask the running JVM what flags it actually has:

```bash
<FDL_HOME>/jdk/bin/jcmd <PID> VM.flags
```

`InitialHeapSize` should be about 4GB and `MaxHeapSize` about 8GB. Flags printed at startup and flags attached to the live process are not the same check.

## 8GB is not the end of it

Moving the cap from about 4GB to 8GB fixes a default that was too small. It does not prove the job itself is healthy. Keep watching the GC log and `fanruan.log` for frequent full GCs, a heap that climbs back to the ceiling quickly, another OOM on the same Spark preview, or one task that always uses a huge amount of memory.

```bash
tail -f <FDL_HOME>/logs/FineLog/gclogs/fanruan.gc.log
tail -f <FDL_HOME>/logs/fanruan.log
```

If `Java heap space` comes back at 8GB, do not keep adding RAM. Look at whether the data volume is abnormal, whether the job reads the full dataset in one shot, whether the Spark partitioning makes sense, whether preview pulls too many rows, whether caches are released, and whether a plugin, `SparkSession`, or ThreadLocal is sticking around.

## Easy misreads

Plenty of available memory in `free` does not mean Java cannot OOM. A Java heap OOM and the Linux OOM Killer are different events. An empty `dmesg` only means the killer did not fire. `OutOfMemoryError` can still come from the JVM. The ThreadLocal "probable memory leak" lines need the OOM timestamp, the shutdown timestamp, the GC log, and whatever preview was running. Taking the shutdown scan as the root cause is the usual mistake. Put JVM flags in `setenv.sh` instead of editing `catalina.sh` to save a minute.

The next time a Java service disappears, the order can stay fixed. Check the process and the port. Decide whether it is systemd, Docker, or a shell script. Find the install directory and read logs before restarting. Search for `OutOfMemoryError`, then use `dmesg` or `journalctl` to separate Linux OOM, Java heap OOM, a JVM crash, a manual shutdown, a port conflict, and an application exit. Compare JVM flags, host RAM, and GC. Change the config, restart, and confirm PID, port, and heap size. Then keep watching GC and the actual job.

The useful part of this incident is simple. When Java reports OOM, leftover RAM on the server is not the whole story. OS memory, the heap, direct memory, and Metaspace are different pools, and the live `-Xmx` has to be checked. The same mix-up shows up on Spark, Flink, Tomcat, Spring Boot, and Elasticsearch.
