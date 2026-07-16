---
title: 一次完整的线上 JVM OOM 排查流程总结
summary: 从监控告警到 Heap Dump 与 MAT 分析，梳理一套线上 JVM 内存溢出的系统排查流程。
author: evan
category: learning
tags: [JVM, OOM, MAT, Grafana, 排查]
createdAt: 2026-06-16 22:33:05
updatedAt: 2026-06-16 22:33:05
readingMinutes: 10
---

# 一次完整的线上 JVM OOM 排查流程总结

最近系统学习了 JVM 内存溢出（OOM）的排查方法，对线上问题定位有了更完整的认识。过去遇到内存问题时，更多是直接重启服务，或简单调大 JVM 内存；现在逐渐理解线上故障应遵循「先观察、再定位、最后修复」的原则。

先用一张图快速复习整体流程：

![JVM OOM 排查总览](https://codenest.oss-cn-qingdao.aliyuncs.com/images/2026/06/16/823e5135-d26f-47e2-8d9a-9e460bcaf62f.png)

## 第一步：发现异常

线上问题往往最先来自监控或用户反馈，例如：

- 服务响应变慢
- 接口超时
- CPU 持续升高
- 服务频繁重启
- Docker 容器被系统杀死
- JVM 抛出 `OutOfMemoryError`

![异常现象示意](https://codenest.oss-cn-qingdao.aliyuncs.com/images/2026/06/16/2888ad55-59c6-49f3-bdc1-4b34683daadf.png)

此时先登录服务器，用 `top` 查看 CPU、内存和负载，重点关注：

- Java 进程是否占用大量内存
- CPU 是否持续过高
- 系统是否内存不足
- Load Average 是否持续升高

如果机器上跑了多个容器，再用 `docker stats` 观察容器内存、CPU、网络和 IO：

![Docker 资源占用](https://codenest.oss-cn-qingdao.aliyuncs.com/images/2026/06/16/45da2369-1625-4a80-a27d-f4e048884682.png)

这一层能快速判断：问题是某个 Java 服务异常，还是整机资源不足。

## 第二步：进入容器查看 JVM 状态

确认问题服务后，进入对应容器。通常一个 Spring Boot 服务在容器内只有一个 Java 进程，JVM PID 往往为 `1`。确认 PID 后，再使用 JVM 自带工具诊断。

## 第三步：使用 jstat 查看 GC

`jstat` 适合快速判断当前 JVM 是否异常，重点看：

- Eden 区使用率
- Old 区使用率
- Young GC 次数
- Full GC 次数
- GC 总耗时

如果出现老年代持续增长、Full GC 后无法明显回落，或 Full GC 次数持续增加，通常意味着：

- 存在内存泄漏
- 存在大量长生命周期对象
- 缓存未及时释放
- ThreadLocal 使用不当
- 存在大对象堆积

此时需要结合更细的数据和趋势继续分析。

## 第四步：结合 Prometheus 与 Grafana 看趋势

`jstat` 只能看当前状态，看不到历史趋势，因此线上通常会接入 Prometheus + Grafana。

重点关注：

### JVM Heap

正常情况下，堆内存会上升，并在 GC 后下降，形成锯齿状曲线：

![正常堆内存锯齿曲线](https://codenest.oss-cn-qingdao.aliyuncs.com/images/2026/06/16/b6bcf798-eb60-46f4-848e-85df5700884e.png)

如果堆内存持续上升，且 Full GC 后也无法回落，就很像内存泄漏。

### JVM Non Heap

观察 Metaspace 与 Class 信息。若 Metaspace 持续增长，可能存在动态代理过多或类加载异常。

### GC 次数与耗时

关注 Young GC、Full GC。Full GC 开始频繁，通常说明 JVM 已进入危险状态；若 Full GC 停顿越来越长，即使尚未 OOM，系统性能也会明显下降。

### Thread Count / CPU / Load

线程数持续上涨，可能是线程泄漏、线程池配置不合理，或存在大量阻塞线程。若 CPU 很高且 GC 也很频繁，问题可能来自频繁 GC，而不一定是业务代码本身。

## 第五步：导出 Heap Dump

确认存在内存异常后，需要进一步分析堆内存。线上通常提前配置 OOM 时自动生成 Heap Dump；也可以手动导出。

Heap Dump 是某一时刻的内存快照，记录了对象、数量、大小和引用关系，是分析内存问题最重要的证据。

## 第六步：使用 MAT 分析内存快照

拿到 `hprof` 后，可用 Eclipse MAT 分析，重点看：

- **Histogram**：哪些对象占用最多内存
- **Dominator Tree**：谁持有这些对象，释放谁能释放最多内存
- **Leak Suspects**：MAT 自动怀疑的泄漏点
- **GC Roots**：对象为何无法被回收，最终落到静态变量、ThreadLocal、Spring Bean、缓存等

![MAT 分析示意](https://codenest.oss-cn-qingdao.aliyuncs.com/images/2026/06/16/1391dcd6-7a27-4c85-83fd-06a5725f2700.png)

## 第七步：定位具体代码

常见问题与对应方向：

1. **查询数据过多**：一次加载几十万条到 List → 改为分页
2. **文件处理不当**：整文件读入巨大 `byte[]` → 改为流式读取
3. **缓存无限增长**：Map 无上限、无过期 → 加容量限制和过期时间
4. **ThreadLocal 未清理**：线程池复用后旧数据无法释放 → 在 `finally` 中 `remove`
5. **定时任务全表加载**：内存持续上涨 → 分批处理
6. **MQ 消费堆积**：批量过大、消费跟不上 → 限制批量大小和并发

## 第八步：验证修复结果

修改后不要直接上线，先在测试环境验证：

- 堆内存是否稳定
- GC / Full GC 是否下降
- CPU 是否恢复
- 接口响应是否正常

必要时配合压测。

## 第九步：上线观察

修复后继续观察 Grafana，至少覆盖一个完整业务周期，确认 Heap、Full GC、GC 耗时、CPU、线程数都回到正常区间。

## 总结

线上 JVM 排查可以收敛为一条清晰链路：

1. 用 `top` / `docker stats` 发现异常服务
2. 进入容器用 `jstat` 观察 GC
3. 用 Prometheus / Grafana 看长期趋势
4. 导出 Heap Dump
5. 用 MAT 分析 Histogram、Dominator Tree、GC Roots、Leak Suspects
6. 回到代码定位接口、缓存、线程池或定时任务
7. 修复后压测验证，并持续观察

核心原则始终是：

**发现问题 → 分析现象 → 保留现场 → 定位根因 → 修复验证 → 持续观察**
