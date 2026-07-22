---
title: 你真的会 git 提交规范吗？
summary: Git 提交规范 = 职业成熟的外显体现 提交记录不是给自己看的，是给整个团队，未来的你、Code Review、自动化流水线、甚至半年后的事故排查用的。...
author: evan
category: work
tags: [工作总结, Git]
createdAt: 2026-03-09 13:58:37
updatedAt: 2026-03-09 13:58:37
readingMinutes: 5
---
# 你真的会 git 提交规范吗？

**Git 提交规范 = 职业成熟的外显体现**

提交记录不是给自己看的，是给整个团队，未来的你、Code Review、自动化流水线、甚至半年后的事故排查用的。

### 当前主流规范 - Conventional Commits 

Conventional Commits是一个轻量级的、用于规范化提交信息的约定。它提供了一个简单的集合规则来创建清晰的提交历史，这使得版本控制和发布管理更加高效。该规范的核心在于提交信息的结构，它要求每个提交消息都有一个明确的意图，包括修复bug、添加新功能、或是进行代码重构等。

**格式如下：**
```
<type>(<scope>): <subject>

<body>

<footer>
```
---

**type（必须）**

| 类型 | 含义 |
| --- | --- |
|  feat | 新功能 |
|  fix | 修复 bug |
|  docs | 文档修改 |
|  style | 代码格式（不影响逻辑） |
|  refactor | 重构（非功能变化） |
|  pref | 性能优化 |
|  test | 测试相关 |
|  build | 构建系统 |
|  ci | CI 配置 |
|  chore | 杂项 |
|  revert | 回滚 |

---

 **scope（推荐**）
 表示影响范围，比如：
 - user
 - order
 - blog
 - auth
 - payment
 - api
 - controller
 - service
 - ui
 
 示例：
 
```
feat(user): add user login api
```

---

**subject（简介说明）**

要求： 

- 不超过 50 个字符
- 用动词开头
- 不加句号
- 用现在时

好的例子：

```
fix(order): handle null pointer in payment callback
```

 错误示范:
 
```
修改了一下订单支付的空指针问题
```

### 真实提交示例：

- 新增接口

```
feat(blog): add article publish api
- implement publish endpoint
- add validation for title and content
- integrate redis cache update

feat(api): add request method for fetching user list
feat(user): add user registration endpoint
feat(controller): add APIs for order management
```

- 修复线上 bug

```
fix(auth): resolve token refresh failure
- fix jwt experation check logic
- add null guard for userd
- improve exception message 
```

- 重构

```
refactor(user): optimize user query logic
- replace manual sql with mybatis-plus wrapper
- extract common validation method
- remove redunant null check 
```

- 性能优化

```
pref(order): reduce db query count in order list api
- merge duplicate queries
- add index on order_status
- cache order summary in redis
```
