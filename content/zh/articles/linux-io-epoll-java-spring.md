---
title: 从操作系统 I/O 到 Spring WebFlux：理解 epoll
summary: 从轮询、中断和 DMA 出发，梳理 I/O 多路复用及其在 Java NIO、Netty 和 Spring WebFlux 中的运行机制。
author: CodeNest
category: learning
tags: [Linux, IO, epoll, Java, Netty, Spring WebFlux]
createdAt: 2026-11-16
updatedAt: 2026-11-16
readingMinutes: 8
---

# 从操作系统 I/O 到 Spring WebFlux：理解 epoll

理解 WebFlux 的事件循环，不能只停留在 Spring API。沿着操作系统、JDK、网络框架向上追踪，才能分清数据搬运、就绪通知与业务执行各自解决的问题。

## CPU 与设备之间的速度差

- 程序轮询：CPU 反复检查设备状态，忙等待会消耗计算资源。
- 中断驱动：设备通过中断通知 CPU 处理事件，CPU 不必持续检查。
- DMA：设备与内存之间的数据搬运由 DMA 机制完成，CPU 负责配置和处理完成事件；中断也可能合并，并非每次传输都必然产生一次中断。

设备驱动屏蔽硬件差异，操作系统通过 open、read、write、close 等接口向应用提供统一抽象。DMA 解决数据搬运问题，而 I/O 多路复用解决多个文件描述符的就绪等待问题，两者不是互相替代的技术。

## 从 select 到 epoll

传统的一连接一线程模型在连接数量很大时，会产生线程栈、调度和上下文切换开销。多路复用允许一个线程等待多个描述符上的事件。

| 机制 | 描述符管理 | 主要代价 |
| --- | --- | --- |
| select | fd_set 位图 | Linux 常见 FD_SETSIZE 为 1024；每次传递集合并扫描 |
| poll | pollfd 数组 | 无 select 的固定集合限制，但仍需传递并扫描数组 |
| epoll | 内核持久化关注集合与就绪队列 | 注册和维护成本、事件驱动编程复杂度；Linux 专有 |

poll 使用数组而非链表，描述符数量仍受系统资源限制。select 和 poll 通常需要 O(n) 扫描；epoll_wait 主要处理返回的就绪事件，但不能据此断言整个 epoll 机制都是 O(1)。

## epoll 的内核机制

epoll 是 Linux 内核提供的系统调用接口，而不是独立运行的程序。典型 Linux 实现中的 eventpoll 对象维护关注集合（红黑树）和就绪链表，并通过等待队列回调感知被监控对象的状态变化。

- epoll_create1：创建 epoll 实例并返回文件描述符。
- epoll_ctl：添加、修改或删除关注的描述符及事件。
- epoll_wait：等待并取出就绪事件。

应用注册 socket 后，网络数据到达并使 socket 可读，内核将相关事件加入就绪队列并唤醒等待者。应用仍需调用 read 或 recv 获取数据。epoll 通知的是就绪，而不是替应用完成读写。

## LT、ET 与事件循环

LT（水平触发）在描述符仍就绪时可以反复报告事件。ET（边缘触发）强调状态变化；通常配合非阻塞 socket，将数据读到 EAGAIN，避免遗漏尚未处理的数据。

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

这是已设为非阻塞的流式 socket 的示意读循环，不是完整服务器。实际还要处理协议分帧、部分写入、输出缓冲区和背压。单个事件循环仍有 CPU 上限；耗时计算或阻塞调用会拖慢同一循环上的其他连接。多个线程共享监听 socket 时还需考虑唤醒竞争，可按场景采用 EPOLLEXCLUSIVE 等机制。

## Java NIO 与 Netty

Java NIO Selector 提供跨平台的就绪事件抽象。在常见 Linux OpenJDK 实现中，EPollSelectorImpl 使用 epoll；其他平台可以使用不同实现，例如 macOS 的 kqueue。

Netty 既可以使用 JDK NIO，也提供 netty-transport-native-epoll 原生传输，通过 JNI 调用 Linux 接口，并提供额外的 Linux socket 特性。是否采用原生传输取决于依赖、平台和配置，不能仅凭框架名称判断性能。

## Spring WebFlux 的运行时

使用默认 Reactor Netty 服务器的 Spring Boot WebFlux 应用，在 Linux 原生传输可用且启用时，通常能看到 reactor-http-epoll-* 线程；否则可能使用 NIO。WebFlux 本身也支持其他服务器。

```text
Spring WebFlux
    -> Reactor Netty
        -> Netty EventLoop
            -> epoll (Linux native transport)
                -> socket readiness
```

可以在 Linux 上检查实际 Java 进程：

```bash
jcmd <PID> Thread.print
```

观察线程名称及 epollWait、Native.epollWait 或 Selector 相关调用栈（具体名称随版本变化）。线程停在 epoll 等待通常是正常的空闲状态，并不意味着死锁。

Spring 的 ApplicationEvent 是 Java 对象之间的事件发布机制，与内核 I/O 就绪通知处于不同层次。Reactive Streams 的背压也不是 epoll 自带的能力。即使网络层使用 epoll，阻塞 JDBC 或远程调用仍可能阻塞事件循环，需要合理隔离或使用非阻塞客户端。

## 总结

epoll 将大量连接的等待成本从逐个扫描转向持久化注册和就绪通知，但没有消除业务处理成本。Java NIO 和 Netty 封装或直接使用这一能力，Spring WebFlux 则在相应服务器实现上构建响应式应用。下一步可以研究 Reactor Netty 的事件循环、ET 写入与背压，以及以完成通知为核心的 io_uring。

## 参考资料

- [Linux epoll(7)](https://man7.org/linux/man-pages/man7/epoll.7.html)
- [Linux poll(2)](https://man7.org/linux/man-pages/man2/poll.2.html)
- [OpenJDK EPollSelectorImpl](https://github.com/openjdk/jdk/blob/master/src/java.base/linux/classes/sun/nio/ch/EPollSelectorImpl.java)
- [Netty native transports](https://netty.io/wiki/native-transports.html)
- [Spring WebFlux](https://docs.spring.io/spring-framework/reference/web/webflux.html)
