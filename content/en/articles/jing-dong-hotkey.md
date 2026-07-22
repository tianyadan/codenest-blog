---
title: JD Hotkey
summary: An introduction to JD Hotkey, how it detects hot keys automatically, and how it helps cache high-frequency data under sudden traffic spikes.
author: evan
category: learning
tags: [Learning]
createdAt: 2025-08-25 09:07:24
updatedAt: 2025-08-25 09:07:24
readingMinutes: 4
---
# JD Hotkey

## Automatically cache hot data

Source article: [Programming Navigation](https://www.codefather.cn/) for learning purposes only.

#### Background requirement:
A newly launched project can suddenly receive a large amount of traffic. Sometimes we cannot predict which data will become hot, and the system can fail under the pressure. This is the hot-data problem.

For example, something may suddenly become a trending topic on Douyin. If humans have to identify and configure hot data manually, the system may already collapse. In that situation, the system needs to discover the hot data automatically and apply multi-level caching so it can withstand heavy traffic.

#### Returning to the requirement:
Any article accessed 10 times or more within 5 seconds should be cached locally for 10 minutes. After that, every request should read from the cache to reduce database pressure.

#### Solution design:
Automatically caching hot articles requires five steps:

1. Record visits: each user visit increments the count by one.
2. Count visits: measure how many times the article is accessed within a time window.
3. Threshold check: once access frequency exceeds a threshold, the data becomes hot.
4. Cache the data: store hot data in the cache.
5. Read the data: for subsequent requests, fetch it from the cache.

#### Tool used:
[*JD Hotkey*](https://gitee.com/jd-platform-opensource/hotkey)

Tool overview: a lightweight hot-key detection middleware that has been battle-tested during JD's 618 and Double 11 shopping festivals.

Core components
Its main core components are as follows:

1) `Etcd` cluster

As a high-performance configuration center, `Etcd` provides efficient watch-and-subscribe capabilities with very low resource usage. It is mainly used to store rule configurations, worker IP addresses, detected hot keys, manually added hot keys, and related metadata.

`Etcd` is commonly used as both a configuration center and a service registry.

2) Client-side JAR package

This is the dependency introduced into the service. After adding it, you can conveniently determine whether a given key is a hot key. At the same time, the JAR reports keys, listens for changes to rules in `Etcd`, worker information, and hot-key updates, and performs local `Caffeine` caching for hot keys.

3) Worker cluster

The worker side is an independently deployed Java program. After startup, it connects to `Etcd` and periodically reports its IP information so the client side can obtain addresses and establish long connections. Its main job is to accumulate counts for candidate keys reported by clients. Once a key reaches the threshold defined in `Etcd`, the worker pushes that hot key to each client.

4) Dashboard console

The console is a Java program with a visual UI. It also connects to `Etcd`, where you configure key rules for each app, such as treating a key as hot if it appears 20 times within 2 seconds. After a worker detects a hot key, it writes that key to `Etcd`. The dashboard also listens for hot-key events, saves them to the database, and keeps records. At the same time, the dashboard can manually add or remove hot keys for all clients to listen to.
