---
title: "From Operating System I/O to Spring WebFlux: Understanding epoll"
summary: Trace polling, interrupts, DMA, and I/O multiplexing through Java NIO, Netty, and Spring WebFlux.
author: CodeNest
category: learning
tags: [Linux, IO, epoll, Java, Netty, Spring WebFlux]
createdAt: 2026-11-16
updatedAt: 2026-11-16
readingMinutes: 8
---

# From Operating System I/O to Spring WebFlux: Understanding epoll

Understanding WebFlux event loops requires looking beyond Spring APIs. Following the stack from the operating system through the JDK and networking frameworks separates data movement, readiness notification, and business execution.

## Bridging the CPU-device speed gap

- Programmed polling repeatedly checks device status; busy waiting consumes CPU resources.
- Interrupt-driven I/O lets devices notify the CPU instead of requiring continuous checks.
- DMA moves data between devices and memory with less CPU involvement. The CPU configures transfers and handles completion events; interrupts may be coalesced rather than generated for every transfer.

Device drivers hide hardware differences, while the OS exposes abstractions such as open, read, write, and close. DMA addresses data movement; multiplexing addresses waiting for readiness across multiple descriptors. They are complementary mechanisms.

## From select to epoll

A thread-per-connection architecture incurs stack memory, scheduling, and context-switch overhead at scale. Multiplexing lets one thread wait for events on many descriptors.

| Mechanism | Descriptor representation | Main cost |
| --- | --- | --- |
| select | fd_set bitmap | Common Linux FD_SETSIZE of 1024; repeated set transfer and scanning |
| poll | pollfd array | No fixed select-style set limit, but repeated array transfer and scanning |
| epoll | Persistent kernel interest set and ready queue | Registration and maintenance costs, event-driven complexity; Linux-specific |

poll uses an array, not a linked list. System resource limits still apply. select and poll generally scan O(n) entries; epoll_wait primarily processes returned ready events, but this does not make the entire epoll mechanism O(1).

## Inside epoll

epoll is a Linux kernel system-call interface, not a standalone program. Typical Linux implementations maintain an eventpoll object containing an interest set (a red-black tree) and a ready list, with wait-queue callbacks tracking readiness changes.

- epoll_create1 creates an instance and returns its descriptor.
- epoll_ctl adds, modifies, or removes monitored descriptors and events.
- epoll_wait waits for and retrieves ready events.

When incoming network data makes a registered socket readable, the kernel queues the corresponding event and wakes a waiter. The application still calls read or recv to obtain data. epoll reports readiness, not completed application reads or writes.

## LT, ET, and event loops

Level-triggered (LT) mode can repeatedly report a descriptor while it remains ready. Edge-triggered (ET) mode emphasizes state changes; nonblocking sockets are normally drained until EAGAIN to avoid leaving data unprocessed.

```c
for (;;) {
    ssize_t n = read(fd, buf, sizeof(buf));
    if (n > 0) {
        handle_data(buf, n);
    } else if (n == 0) {
        close_connection(fd);
        break;
    } else if (errno == EINTR) {
        continue;
    } else if (errno == EAGAIN || errno == EWOULDBLOCK) {
        break;
    } else {
        close_connection(fd);
        break;
    }
}
```

This illustrates a read loop for an already nonblocking stream socket, not a complete server. Real servers also handle framing, partial writes, output buffers, and backpressure. An event loop has a CPU ceiling; expensive computation or blocking calls delay other connections on that loop. Threads sharing a listening socket may face wake-up contention; mechanisms such as EPOLLEXCLUSIVE can help in appropriate scenarios.

## Java NIO and Netty

Java NIO Selector provides a cross-platform readiness abstraction. Common Linux OpenJDK implementations use epoll through EPollSelectorImpl; other platforms can use different mechanisms, such as kqueue on macOS.

Netty supports JDK NIO and offers netty-transport-native-epoll, which calls Linux interfaces through JNI and exposes additional Linux socket features. Native transport selection depends on dependencies, platform, and configuration. Framework choice alone does not establish performance.

## Spring WebFlux at runtime

A Spring Boot WebFlux application using the default Reactor Netty server typically exposes reactor-http-epoll-* threads when Linux native transport is available and enabled; otherwise it may use NIO. WebFlux also supports other servers.

```text
Spring WebFlux
    -> Reactor Netty
        -> Netty EventLoop
            -> epoll (Linux native transport)
                -> socket readiness
```

Inspect the actual Java process on Linux:

```bash
jcmd <PID> Thread.print
```

Look for thread names and stack frames such as epollWait, Native.epollWait, or Selector-related calls; names vary by version. A thread waiting in epoll is often normally idle, not deadlocked.

Spring ApplicationEvent publishes events between Java objects. It operates at a different layer from kernel readiness notification. Reactive Streams backpressure is not an epoll feature either. Even with epoll, blocking JDBC or remote calls can stall an event loop; isolate blocking work appropriately or use nonblocking clients.

## Conclusion

epoll replaces repeated descriptor scanning with persistent registration and readiness notification, but it does not eliminate business-processing costs. Java NIO and Netty wrap or directly use this capability, while Spring WebFlux builds reactive applications on compatible server implementations. Further topics include Reactor Netty event loops, ET writes and backpressure, and completion-oriented io_uring.

## References

- [Linux epoll(7)](https://man7.org/linux/man-pages/man7/epoll.7.html)
- [Linux poll(2)](https://man7.org/linux/man-pages/man2/poll.2.html)
- [OpenJDK EPollSelectorImpl](https://github.com/openjdk/jdk/blob/master/src/java.base/linux/classes/sun/nio/ch/EPollSelectorImpl.java)
- [Netty native transports](https://netty.io/wiki/native-transports.html)
- [Spring WebFlux](https://docs.spring.io/spring-framework/reference/web/webflux.html)
