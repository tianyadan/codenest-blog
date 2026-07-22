---
title: Do You Really Understand Git Commit Conventions?
summary: Git commit conventions reflect professional maturity. A good commit history serves your team, your future self, code review, automation, and incident analysis.
author: evan
category: work
tags: [Work Notes, Git]
createdAt: 2026-03-09 13:58:37
updatedAt: 2026-03-09 13:58:37
readingMinutes: 5
---
# Do You Really Understand Git Commit Conventions?

**Git commit conventions are an outward sign of professional maturity**

Commit history is not just for yourself. It is for the entire team, for your future self, for code review, for automated pipelines, and even for troubleshooting incidents six months later.

### The current mainstream convention: Conventional Commits

Conventional Commits is a lightweight convention for standardizing commit messages. It provides a simple set of rules for creating a clear commit history, which makes version control and release management more efficient. The core idea is the structure of the commit message: every commit should express a clear intent, such as fixing a bug, adding a feature, or refactoring code.

**The format is:**
```
<type>(<scope>): <subject>

<body>

<footer>
```
---

**type (required)**

| Type | Meaning |
| --- | --- |
| feat | New feature |
| fix | Bug fix |
| docs | Documentation change |
| style | Code formatting only, no logic changes |
| refactor | Refactoring without functional changes |
| pref | Performance optimization |
| test | Test-related changes |
| build | Build system changes |
| ci | CI configuration |
| chore | Miscellaneous chores |
| revert | Revert |

---

**scope (recommended)**

It represents the affected area, for example:

- user
- order
- blog
- auth
- payment
- api
- controller
- service
- ui

Example:

```
feat(user): add user login api
```

---

**subject (short description)**

Requirements:

- No more than 50 characters
- Start with a verb
- Do not add a period
- Use present tense

Good example:

```
fix(order): handle null pointer in payment callback
```

Incorrect example:

```
fixed the order payment null pointer issue a bit
```

### Real commit examples:

- Add a new API

```
feat(blog): add article publish api
- implement publish endpoint
- add validation for title and content
- integrate redis cache update

feat(api): add request method for fetching user list
feat(user): add user registration endpoint
feat(controller): add APIs for order management
```

- Fix a production bug

```
fix(auth): resolve token refresh failure
- fix jwt experation check logic
- add null guard for userd
- improve exception message
```

- Refactoring

```
refactor(user): optimize user query logic
- replace manual sql with mybatis-plus wrapper
- extract common validation method
- remove redunant null check
```

- Performance optimization

```
pref(order): reduce db query count in order list api
- merge duplicate queries
- add index on order_status
- cache order summary in redis
```
