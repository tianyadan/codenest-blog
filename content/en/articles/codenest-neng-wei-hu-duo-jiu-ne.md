---
title: How Long Can I Keep CodeNest Going?
summary: A personal reflection on building CodeNest, chasing ever more complex architecture, and wondering how long I can keep maintaining it.
author: evan
category: diary
tags: [Diary]
createdAt: 2026-05-15 23:48:33
updatedAt: 2026-05-15 23:48:33
readingMinutes: 3
---

# How Long Can I Keep CodeNest Going?

## Main Content

CodeNest started on 2025.08.14 as a sudden idea for a personal blog. At first, I just wanted a place to record what I was learning every day. But after I started working, I realized I really did not have that much time to write blog posts.

Later, I found Programming Navigation and kept learning new things. I moved from monolithic architecture to microservices. When I could not find a suitable project, I sorted out the requirements myself and split the system into microservices on my own. Starting from a single starter project, I gradually broke it into `user-service`, `gateway-service`, `common`, `interview-service`, `question-service`, and `content-service`. As the business kept expanding, the service cluster kept growing too. My servers went from one 2c2g machine to two 2c4g machines and one 4c4g machine. After nearly a year of nonstop tinkering, I started asking myself: what exactly have I built? A technical community? If it is a community, very few people actually use it. A job-hunting platform? It does have mock interviews, online resumes, and a study question bank, and I have to admit those features really helped. But I still have not found a way to grow the user base. Promoting on Xiaohongshu got rate-limited. Running a public account brought almost no readers. Now I am even experimenting with illustrated interview-note content to see whether that works.

I have been working for a year now, and from the first day on the job I have been pushing myself hard. I have been learning what Java really is, how Spring works internally, why Spring Boot simplifies the startup process, why high concurrency exists, why distributed locks exist, why message queues exist, and more. The architecture keeps getting more advanced step by step. But do we really need all of that? For a back-office management system or a ToB product, is the user scale really that large? A few days ago someone asked me, "Are you doing microservices just for the sake of microservices?" I said yes. At that moment, I could not avoid facing my real thoughts. It is true: your architecture should match your actual user scale. Is all this effort really worth the constant churn?

No matter whether these choices are right or wrong, I still think they are better than wasting time on games or spending every day wandering around shopping malls. At least that is how I see it. I do not want my days to pass by for nothing. I want every day to mean something. It has been half a year, and I cannot remember the last time I fell asleep before 11 p.m. I have almost gone numb to it.

Maybe if I keep going a little longer, something good will come of it.
