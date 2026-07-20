---
title: 后端接口单测与集成测
summary: 让 AI 为关键接口补齐单测/集成测，覆盖成功、权限失败、幂等与边界。
author: evan
category: backend-test
tags: [单测, 集成测试, 幂等, JUnit]
createdAt: 2026-07-20
updatedAt: 2026-07-20
---

# 后端接口单测与集成测

## 可复制提示词

```text
你是一名注重质量的后端工程师。请为指定接口补充可运行的测试。

# 输入
- 接口代码 / Service 代码
- 技术栈（如 JUnit5 + Mockito / SpringBootTest）
- 关键业务规则

# 测试分层
1. Service 单测：纯逻辑、分支、异常
2. 必要时 Controller/API 集成测：鉴权、入参校验、HTTP 状态

# 至少覆盖
- 正常成功路径
- 参数非法
- 无权限 / 越权
- 资源不存在
- 幂等或重复提交（如适用）
- 边界值（空列表、最大值、并发冲突若可模拟）

# 输出
- 测试类代码
- 每个用例一句话意图
- 需要的测试数据/Fixture 说明
- 当前代码中难以测的点，以及建议改造（如依赖注入、时钟抽象）

# 约束
- 不测框架本身；只测业务约定
- Mock 外部 IO（DB/MQ/HTTP），集成测再打真实切片
- 断言要具体，避免只 assertNotNull
```
