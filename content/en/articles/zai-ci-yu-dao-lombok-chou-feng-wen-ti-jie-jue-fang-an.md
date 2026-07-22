---
title: Fixing Another Lombok Meltdown
summary: IDEA kept changing the local Java compilation version from 17 to 25, which caused Lombok, compile, and package failures until all versions were aligned.
author: evan
category: work
tags: [Work Notes]
createdAt: 2026-03-23 23:05:16
updatedAt: 2026-03-23 23:05:16
readingMinutes: 2
---
# Fixing Another Lombok Meltdown

## Main Text

I have no idea why, but IDEA kept automatically changing my local Java compilation version.

I clearly selected 17, but it kept switching itself to 25.

Then Lombok started failing like crazy, `compile` failed, `package` failed... After fighting with it for most of the day, I finally narrowed the issue down to one thing:

The Java versions used for compilation all need to be consistent.

![截屏2026-03-23 23.03.57](https://codenest.oss-cn-qingdao.aliyuncs.com/images/2026/03/23/0b61da1e-0793-431e-beeb-f34ae2c8c119.png)

![截屏2026-03-23 23.04.07](https://codenest.oss-cn-qingdao.aliyuncs.com/images/2026/03/23/dd0f977e-feb7-48bb-9bfc-ce0940c34881.png)

Once I changed everything back to 17 instead of 25, the project compiled successfully... another chaotic day.
