---
title: LRU Algorithm
summary: A short note on the Least Recently Used cache eviction strategy and the intuition behind keeping recently accessed data close.
author: evan
category: diary
tags: [Diary]
createdAt: 2026-04-07 08:46:20
updatedAt: 2026-04-07 08:46:20
readingMinutes: 1
---
# LRU Algorithm

## Notes

LRU, short for Least Recently Used, is a very classic cache eviction strategy. Its core idea comes from the principle of locality: if a piece of data was accessed recently, it is more likely to be accessed again in the near future. The essence is: "whoever paid attention to me recently gets kept close, and whoever ignored me gets kicked out." It sounds suspiciously like some people's dating strategy.
