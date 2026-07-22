---
title: The Difference Between Degradation and Circuit Breaking
summary: Circuit breaking cuts off calls to stop failure spread, while degradation provides simpler fallback behavior to keep the system available.
author: evan
category: diary
tags: [Diary]
createdAt: 2025-08-30 11:58:34
updatedAt: 2025-08-30 11:58:34
readingMinutes: 1
---
# The Difference Between Degradation and Circuit Breaking

## Degradation vs. Circuit Breaking
Circuit breaking does not always require degradation; sometimes it simply cuts off the call. Degradation does not always require circuit breaking either, because even a single failed call can degrade to a fallback.
For example, if a database query fails and the system returns data from memory instead, that is degradation.

- Circuit breaking avoids wasting system resources or allowing failures to spread between services by **cutting off calls** when service conditions are getting worse.
- Degradation means that when system pressure is too high or a service is unreachable, the system provides a simplified fallback solution to preserve availability and user experience.

The two are often used together: circuit breaking is triggered first, and degradation follows.
