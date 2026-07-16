---
title: A Complete Online JVM OOM Troubleshooting Walkthrough
summary: From monitoring alerts to Heap Dump and MAT analysis, a practical end-to-end flow for investigating online JVM OutOfMemoryError cases.
author: evan
category: learning
tags: [JVM, OOM, MAT, Grafana, Troubleshooting]
createdAt: 2026-06-16 22:33:05
updatedAt: 2026-06-16 22:33:05
readingMinutes: 10
---

# A Complete Online JVM OOM Troubleshooting Walkthrough

I recently studied JVM OutOfMemoryError (OOM) troubleshooting in a more systematic way. In the past, my default response to memory issues was restarting the service or simply increasing JVM heap size. Now the principle is clearer: observe first, locate next, and fix only after the root cause is understood.

Here is a quick overview of the full flow:

![JVM OOM troubleshooting overview](https://codenest.oss-cn-qingdao.aliyuncs.com/images/2026/06/16/823e5135-d26f-47e2-8d9a-9e460bcaf62f.png)

## Step 1: Detect the anomaly

Online issues usually start from monitoring alerts or user feedback:

- Slower responses
- API timeouts
- Sustained high CPU
- Frequent restarts
- Docker containers killed by the OS
- JVM throwing `OutOfMemoryError`

![Common anomaly symptoms](https://codenest.oss-cn-qingdao.aliyuncs.com/images/2026/06/16/2888ad55-59c6-49f3-bdc1-4b34683daadf.png)

Log into the host first and check CPU, memory, and load with `top`. Focus on:

- Whether a Java process dominates memory usage
- Whether CPU stays high
- Whether the host is under memory pressure
- Whether Load Average keeps rising

If multiple containers run on the host, use `docker stats` to inspect container memory, CPU, network, and IO:

![Docker resource usage](https://codenest.oss-cn-qingdao.aliyuncs.com/images/2026/06/16/45da2369-1625-4a80-a27d-f4e048884682.png)

This quickly tells you whether one Java service is unhealthy or the whole machine is short on resources.

## Step 2: Enter the container and inspect the JVM

After identifying the suspicious service, enter its container. A Spring Boot app often has only one Java process inside the container, so the JVM PID is frequently `1`. Then continue with JVM diagnostic tools.

## Step 3: Use jstat to inspect GC

`jstat` is good for a fast health check. Watch:

- Eden usage
- Old generation usage
- Young GC count
- Full GC count
- Total GC time

If Old Gen keeps growing and barely drops after Full GC, or Full GC keeps increasing, common causes include:

- Memory leaks
- Too many long-lived objects
- Caches that never expire
- Improper ThreadLocal usage
- Accumulation of large objects

At that point you need trend data and deeper analysis.

## Step 4: Review trends with Prometheus and Grafana

`jstat` shows the current state, not history. Production systems usually rely on Prometheus + Grafana.

Key panels:

### JVM Heap

Healthy heap usage rises and then drops after GC, forming a sawtooth curve:

![Healthy heap sawtooth curve](https://codenest.oss-cn-qingdao.aliyuncs.com/images/2026/06/16/b6bcf798-eb60-46f4-848e-85df5700884e.png)

If heap keeps rising and Full GC cannot bring it down, a leak is likely.

### JVM Non Heap

Watch Metaspace and class loading. Continuous Metaspace growth may point to excessive dynamic proxies or abnormal class loading.

### GC count and pause time

Frequent Full GC usually means the JVM is already in danger. Longer and longer Full GC pauses will hurt latency even before an OOM happens.

### Thread count / CPU / Load

Rising thread counts may indicate thread leaks, bad pool configuration, or many blocked threads. High CPU plus frequent GC often means GC pressure, not necessarily pure business CPU cost.

## Step 5: Export a Heap Dump

Once memory abnormality is confirmed, capture a Heap Dump. Production setups usually dump automatically on OOM; you can also dump manually.

A Heap Dump is a memory snapshot: objects, counts, sizes, and references. It is the most important evidence for memory analysis.

## Step 6: Analyze the dump with MAT

Open the `hprof` file in Eclipse MAT and focus on:

- **Histogram**: which objects consume the most memory
- **Dominator Tree**: who retains those objects
- **Leak Suspects**: MAT's automatic leak hypotheses
- **GC Roots**: why objects cannot be collected, often ending at static fields, ThreadLocal, Spring beans, or caches

![MAT analysis overview](https://codenest.oss-cn-qingdao.aliyuncs.com/images/2026/06/16/1391dcd6-7a27-4c85-83fd-06a5725f2700.png)

## Step 7: Trace back to code

Common root causes and fixes:

1. **Too much query data**: loading hundreds of thousands of rows into a `List` → paginate
2. **Bad file handling**: reading entire files into huge `byte[]` → stream instead
3. **Unbounded caches**: maps grow forever → add size limits and TTL
4. **ThreadLocal not cleaned**: reused pool threads retain old data → `remove()` in `finally`
5. **Scheduled jobs load full tables** → process in batches
6. **MQ consumer backlog**: batches too large or concurrency too high → limit batch size and concurrency

## Step 8: Validate the fix

Do not ship immediately. Verify in a test environment:

- Heap stabilizes
- GC / Full GC decreases
- CPU recovers
- API latency returns to normal

Use load tests when needed.

## Step 9: Observe after release

Keep watching Grafana for at least one full business cycle: Heap, Full GC, GC pause time, CPU, and thread count must all stay healthy.

## Summary

A practical online JVM troubleshooting path:

1. Find the unhealthy service with `top` / `docker stats`
2. Inspect GC with `jstat`
3. Review long-term trends in Prometheus / Grafana
4. Export a Heap Dump
5. Analyze with MAT
6. Trace the retaining path back to code
7. Fix, verify under load, and keep observing

The core loop stays the same:

**Detect → Analyze → Preserve evidence → Find root cause → Fix and verify → Keep watching**
