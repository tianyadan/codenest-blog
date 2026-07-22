---
title: What Is a CDN?
summary: A CDN is a global acceleration layer that makes websites load faster and more reliably by serving resources from nodes that are closer to the user instead of always hitting the origin server.
author: evan
category: learning
tags: [Learning, CDN]
createdAt: 2025-10-10 09:42:29
updatedAt: 2025-10-10 09:42:29
readingMinutes: 3
---
# What Is a CDN?

# CDN (Content Delivery Network)

## One-sentence explanation

A CDN is a global acceleration technology that makes websites load faster and more reliably.

## Its core idea is:

"Let users fetch resources from the server closest to them, instead of downloading everything from the origin server every time."

## How it works

Suppose your blog is deployed on a server in Qingdao.
If a user visits from Beijing, the speed may still be acceptable.
But if a user visits from the United States, it can become slow because of the long distance and more complex network path.

This is where a CDN comes in:

1. Your static assets such as pages, images, CSS, and JS are cached on CDN nodes distributed across a country or even globally.
2. When a user visits the site, the CDN uses smart DNS resolution to route the request to the node closest to the user.
3. The user fetches content from the nearest node instead of directly from the Qingdao origin server, which significantly reduces latency.

## What does a CDN usually cache?

- Static assets such as JS, CSS, images, videos, and font files
- Sometimes dynamic content too, such as JSON returned by an API, if the caching strategy is configured appropriately

## Why it matters to frontend developers

- Faster static asset delivery: React/Vue build output can be served through a CDN to improve loading speed
- Lower server pressure: the CDN handles most static requests
- Better resistance to attacks: the CDN layer can absorb a large amount of malicious traffic
- Better SEO: faster page loads are more search-engine friendly

## Full logical chain

| Module | Responsibility | Deployment location |
| --- | --- | --- |
| Frontend (React + Vite build output) | Static assets such as HTML, JS, CSS, and images | Upload to Alibaba Cloud OSS and connect it to a CDN acceleration domain |
| Backend (SpringBoot + MyBatisPlus) | API services, database interaction, permission checks, business logic | Deploy to your own cloud server (ECS) |
| Database (MySQL) | Store business data | Can run on the same machine as the backend or on a separate database instance |
| CDN (Content Delivery Network) | Distribute frontend static assets to nodes across the country or around the world | Automatically caches content and accelerates access |
