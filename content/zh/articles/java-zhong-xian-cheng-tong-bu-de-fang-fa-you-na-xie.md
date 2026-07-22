---
title: Java 中线程同步的方法有哪些？
summary: 这是 Java 最传统、最容易上手的同步手段。 lock 可以是任意对象 粒度小，灵活性高 锁住的是 当前实例对象。 静态同步方法锁住的是 Class 对...
author: evan
category: learning
tags: [学习]
createdAt: 2025-11-16 10:43:02
updatedAt: 2025-11-16 10:43:02
readingMinutes: 5
---
# Java 中线程同步的方法有哪些？

## 一、最经典的：Synchronized 系列

这是 Java 最传统、最容易上手的同步手段。

#### 1 )  同步代码块：

```Java
synchronized (lock) {
    // 临界区代码
}
```
- lock 可以是任意对象
- 粒度小，灵活性高

#### 2 ) 同步方法：

```Java
public synchronized void method() {}
```

- 锁住的是 当前实例对象。

- 静态同步方法锁住的是 Class 对象。

优点： 简单粗暴，写的快
缺点：灵活性一般、可能阻塞严重。

## 二、Lock 系列（比 synchronized 更强的家族）

JUC 包（java.util.concurrent）里的 Lock，相当于 synchronized 的“可配置加强版”。

#### 1 ） ReentrantLock（重入锁）—— 最常用

```Java
ReentrantLock lock = new ReentrantLock();
lock.lock();
try {
    // 临界区
} finally {
    lock.unlock();
}
```

优势：
- 可中断锁lockInterruptibly()
- 可尝试加锁tryLock()
- 公平与非公平
- 配合 Condition 可实现更精细的等待/通知机制

#### 2 ）ReentrantReadWriteLock（读写锁）

读多写少的场景神器。

- 读读并发
- 写写互斥
- 读写互斥

#### 3 ） StampedLock (更高性能的读写锁)
 - 支持乐观读
 - 适用于读非常多、写非常少的场景，对性能有极致追求时使用。

## 三、信号量 / 屏障 / 栅栏（控制并发数量和任务协作）

#### 1 ）Semaphore (信号量)

```Java 
Semaphore semaphore = new Semaphore(3);
semaphore.acquire(); // 获得许可证
```
 限制“并发数量”，比如允许同时执行 3 个线程。
 
#### 2 ）CountDownLatch(倒计时门阀)
一个线程等待多个线程完成，例如"主线程等待多个任务执行完"。

#### 3 ) CyclicBarrier (循环栅栏）

多个线程互相等待，集齐后一起往下走。

## 四、原子类（Atomic 系列）—— 无锁但实现同步

属于 CAS(Compare-And-Swap)乐观锁机制。

常见：
- AtomicInteger

- AtomicLong

- AtomicReference

- AtomBoolean

 优点：
 
 比锁轻量，性能更好。
 
 ## 五 volatile （轻量但有限的同步）
 
 不是锁，但能实现可见性和禁止指令重排。
 
 典型用法：
 
 - 单例模式的双重检查 DCL
 
 - 状态标识位

缺点：不能保证原子性（例如 i++仍然不安全）。

## 六、ThreadLocal （各玩各的也是一种同步）

不是传统意义上的锁，而是 “不共享数据 -> 天然线程安全”

常用于：

- 每个线程维护独立数据（比如数据库链接、Format 格式化对象）

 ## 七、阻塞队列（生产者消费者最常用）
 
  JUC 的队列内部已经做了同步。
  
  常见：
  
  - ArrayBlockingQueue
  - LinkedBlockingQueue
  - SynchronousQueue
  - DelayQueue

让你无需手动写锁就能实现线程安全的任务队列。

**总结：**

| 类别 |技术 | 特点 |
| --- | ---| --- |
| 内置锁 | synchorized | 最简单，但性能一般|  
| 显式锁 | ReentrantLock | 功能最强，控制力高| 
| 读写锁 | ReadWriteLock/StampedLock | 高读业务首选| 
| 协作机制 | Semaphore/CountDownLock/CyclicBarrier | 控制并发与线程协作| 
| 原子操作 | Atmoic 系列 | CAS，无锁高性能| 
| 内存可见性 | volatile | 但无原子性| 
| 本地线程变量 | ThreadLocal | 各玩各的，无需锁|
| 并发容器 | BlockingQueue |内部已同步，不用操心|
