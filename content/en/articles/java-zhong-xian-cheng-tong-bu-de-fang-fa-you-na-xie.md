---
title: What Thread Synchronization Methods Are Available in Java?
summary: A practical overview of Java synchronization options, including synchronized, Lock, semaphores, atomic classes, volatile, ThreadLocal, and blocking queues.
author: evan
category: learning
tags: [Learning]
createdAt: 2025-11-16 10:43:02
updatedAt: 2025-11-16 10:43:02
readingMinutes: 5
---
# What Thread Synchronization Methods Are Available in Java?

## 1. The classic choice: the `synchronized` family

This is the most traditional and easiest synchronization approach in Java.

#### 1) Synchronized block:

```Java
synchronized (lock) {
    // critical section code
}
```
- `lock` can be any object.
- The locking granularity is small and flexible.

#### 2) Synchronized method:

```Java
public synchronized void method() {}
```

- It locks the current instance object.
- A static synchronized method locks the `Class` object.

Advantages: simple and direct, quick to write.
Disadvantages: average flexibility and potentially heavy blocking.

## 2. The `Lock` family (more powerful than `synchronized`)

`Lock` in the JUC package (`java.util.concurrent`) is like a more configurable enhanced version of `synchronized`.

#### 1) `ReentrantLock` (reentrant lock) - the most common one

```Java
ReentrantLock lock = new ReentrantLock();
lock.lock();
try {
    // critical section
} finally {
    lock.unlock();
}
```

Advantages:
- Interruptible locking with `lockInterruptibly()`
- Try-lock support with `tryLock()`
- Fair and non-fair lock modes
- Can work with `Condition` for more fine-grained waiting and notification

#### 2) `ReentrantReadWriteLock` (read-write lock)

A great fit for read-heavy, write-light scenarios.

- Concurrent reads are allowed.
- Writes are mutually exclusive.
- Reads and writes are mutually exclusive.

#### 3) `StampedLock` (a higher-performance read-write lock)
- Supports optimistic reads.
- Suitable for scenarios with very frequent reads and very few writes, especially when performance matters a lot.

## 3. Semaphores, latches, and barriers (controlling concurrency and task coordination)

#### 1) `Semaphore`

```Java
Semaphore semaphore = new Semaphore(3);
semaphore.acquire(); // acquire a permit
```
Limits the number of concurrent executions, for example allowing only 3 threads to run at the same time.

#### 2) `CountDownLatch`
One thread waits for multiple threads to finish, for example when the main thread waits for several tasks to complete.

#### 3) `CyclicBarrier`
Multiple threads wait for each other, then continue together once everyone has arrived.

## 4. Atomic classes (the `Atomic` family) - lock-free synchronization

They are based on the CAS (Compare-And-Swap) optimistic locking mechanism.

Common examples:
- `AtomicInteger`
- `AtomicLong`
- `AtomicReference`
- `AtomicBoolean`

Advantages:

They are lighter than locks and usually offer better performance.

## 5. `volatile` (lightweight but limited synchronization)

It is not a lock, but it provides visibility guarantees and prevents instruction reordering.

Typical use cases:

- Double-checked locking (DCL) in the singleton pattern
- State flags

Disadvantage: it cannot guarantee atomicity (`i++` is still unsafe, for example).

## 6. `ThreadLocal` (separate data per thread is also a form of safety)

This is not a traditional lock. Instead, it avoids sharing data, which naturally makes it thread-safe.

Common use cases:

- Each thread maintains its own independent data, such as database connections or formatter objects

## 7. Blocking queues (the most common tool for producer-consumer patterns)

Synchronization is already handled inside JUC queues.

Common examples:

- `ArrayBlockingQueue`
- `LinkedBlockingQueue`
- `SynchronousQueue`
- `DelayQueue`

They let you implement a thread-safe task queue without writing locks manually.

**Summary:**

| Category | Technology | Characteristics |
| --- | --- | --- |
| Built-in lock | `synchronized` | Simplest to use, but average performance |
| Explicit lock | `ReentrantLock` | Most powerful, with strong control |
| Read-write lock | `ReadWriteLock` / `StampedLock` | Best choice for read-heavy workloads |
| Coordination mechanism | `Semaphore` / `CountDownLatch` / `CyclicBarrier` | Controls concurrency and thread coordination |
| Atomic operations | `Atomic` family | CAS-based, lock-free, high performance |
| Memory visibility | `volatile` | Provides visibility, but not atomicity |
| Thread-local variable | `ThreadLocal` | Separate data per thread, no lock needed |
| Concurrent container | `BlockingQueue` | Already synchronized internally |
