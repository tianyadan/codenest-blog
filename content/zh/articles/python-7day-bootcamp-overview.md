---
title: Python 7 天训练营总览｜Java 开发者从 0 到 Web / 数据清洗 / 爬虫
summary: 面向会 Java / Spring Boot 的同学，用对比学习法 7 天掌握 Python 语法，并落地 Web、数据清洗与爬虫三条主线。
author: CodeNest
category: syntax
tags: [语法学习, Python专项, Python, 7天训练营, Java对比]
createdAt: 2026-07-29
updatedAt: 2026-08-01
readingMinutes: 12
topOrder: 1
slug: python-7day-bootcamp-overview
---


# Python 7 天训练营总览｜Java 开发者从 0 到 Web / 数据清洗 / 爬虫

> 适合人群：编程小白心态起步，但已会 **Java 基础**、了解 **Java 并发**、用过 **Spring Boot**。  
> 学习方式：**Java 对照 + 可运行示例 + 每日练习题**。  
> 目标终点：7 天后能独立写小脚本、做简单数据清洗、写基础爬虫、搭一个最小 Web API。

---

## 为什么你适合「对比着学」

你不是从零学「编程思维」，而是在换一门更轻、更快的工具语言。

| 维度 | Java / Spring Boot | Python |
|------|--------------------|--------|
| 类型系统 | 编译期静态类型 | **动态强类型**（运行时检查） |
| 代码块 | `{}` | **缩进即语法** |
| 入口 | `public static void main` | 脚本直接执行，或 `if __name__ == "__main__"` |
| 依赖管理 | Maven / Gradle | **pip + venv**（可类比虚拟环境） |
| Web 框架 | Spring Boot | Flask / FastAPI |
| 数据场景 | 偏业务服务 | **脚本、清洗、爬虫、分析**更顺手 |

记住一句话：**Java 教你把系统盖结实，Python 帮你把事情做快点。**

---

## 学习原则（每天都遵守）

1. **先跑通，再记概念**：每个知识点至少亲手敲一遍。
2. **对照 Java 记忆**：看到新语法，先问「Java 里谁对应它」。
3. **题必须自己写**：看懂案例不算会，独立写出答案才算过关。
4. **每天有交付物**：一个 `.py` 文件能独立运行。
5. **关键点加粗复习**：文中加粗内容，睡前扫一眼。

推荐环境：

- Python **3.10+**（本课程示例按 3.12 思路编写）
- 编辑器：VS Code / Cursor + Python 插件
- 官方文档（中文）：[Python 教程](https://docs.python.org/zh-cn/3/tutorial/index.html)

---

## 7 天路线图（从语法到三条实战线）

```text
Day1 环境 + 变量/类型/运算符/输入输出
  ↓
Day2 流程控制 + 字符串深挖
  ↓
Day3 列表 / 元组 / 字典 / 集合（数据容器）
  ↓
Day4 函数 / 模块 / 异常（工程化起步）
  ↓
Day5 面向对象 + 文件读写
  ↓
Day6 数据清洗（pandas）+ 爬虫入门（requests / BeautifulSoup）
  ↓
Day7 Web 开发（FastAPI）综合小项目收官
```

### Day 1｜环境与语法地基

- 安装 Python、venv、pip
- Hello World 与 Java `main` 对比
- **缩进、变量、基本类型、运算符、`print` / `input`**
- 交付：能独立运行 3 道练习题

阅读：[第一天训练营](/articles/python-7day-bootcamp-day01)

### Day 2｜流程控制与字符串

- `if / elif / else`、`for`、`while`、`break / continue`
- 字符串切片、格式化（f-string）
- Java：`if`、`for-each`、`String` API 对照
- 交付：成绩评级脚本 + 文本处理小练习

阅读：[第二天训练营](/articles/python-7day-bootcamp-day02)

### Day 3｜四大容器：list / tuple / dict / set

- 增删查改与常用方法
- 可变 vs 不可变（和 Java 引用思维对照）
- 推导式初识
- 交付：用字典统计词频 / 名单去重

阅读：[第三天训练营](/articles/python-7day-bootcamp-day03)

### Day 4｜函数、模块与异常

- `def`、参数、返回值、`*args / **kwargs`
- 模块导入、`if __name__ == "__main__"`
- `try / except / finally`（对照 Java 异常）
- 交付：拆成多文件的小工具脚本

阅读：[第四天训练营](/articles/python-7day-bootcamp-day04)

### Day 5｜面向对象与文件 I/O

- `class`、`__init__`、`self`（对照 Java 构造器 / this）
- 读写文本 / CSV
- 路径与编码注意点
- 交付：读 CSV → 简单对象列表 → 写结果文件

> 状态：待补全

### Day 6｜数据清洗 + 爬虫入门

- pandas：读表、筛选、缺失值、导出
- requests 发 HTTP；BeautifulSoup 解析 HTML
- 合规与礼貌爬取（频率、robots、仅练手站）
- 交付：抓取公开页面字段 → 清洗 → 导出 CSV

> 状态：待补全

### Day 7｜Web 开发收官（FastAPI）

- 路由、请求参数、JSON 响应（对照 Spring `@RestController`）
- 把 Day6 的清洗结果做成查询 API
- 本地启动、用浏览器 / curl 验证
- 交付：一个可运行的迷你后端 + README

> 状态：待补全

---

## 每日学习节奏建议（约 3～4 小时）

| 时段 | 做什么 | 时长 |
|------|--------|------|
| 学 | 读教案 + 敲示例 | 90 分钟 |
| 练 | 独立完成练习题 | 60～90 分钟 |
| 复盘 | 对照答案、整理 Java↔Python 对照表 | 30 分钟 |
| 输出 | 提交当天 `.py` 文件（可放个人笔记仓库） | 15 分钟 |

---

## 验收标准：7 天后你能做到什么

- [ ] 不查资料写出：变量、分支、循环、函数、字典操作
- [ ] 读懂别人的小脚本，并改出自己的版本
- [ ] 用 pandas 完成一次「脏数据 → 干净 CSV」
- [ ] 写一个合规的小爬虫，输出结构化数据
- [ ] 用 FastAPI 暴露至少 2 个查询接口

---

## 课程导航导航

| 天数 | 文章 | 状态 |
|------|------|------|
| 总览 | [本文](/articles/python-7day-bootcamp-overview) | 已发布 |
| Day 1 | [环境与语法地基](/articles/python-7day-bootcamp-day01) | 已发布 |
| Day 2 | [流程控制与字符串](/articles/python-7day-bootcamp-day02) | 已发布 |
| Day 3 | [四大容器](/articles/python-7day-bootcamp-day03) | 已发布 |
| Day 4 | [函数 / 模块 / 异常](/articles/python-7day-bootcamp-day04) | 已发布 |
| Day 5 | OOP + 文件 | 待写 |
| Day 6 | 清洗 + 爬虫 | 待写 |
| Day 7 | FastAPI Web 收官 | 待写 |

---

## 参考资料（建议收藏）

- [Python 官方教程（中文）](https://docs.python.org/zh-cn/3/tutorial/index.html)
- [Python 标准库一览](https://docs.python.org/zh-cn/3/library/index.html)
- [PEP 8 代码风格](https://peps.python.org/pep-0008/)
- FastAPI 文档、pandas 用户指南、Beautiful Soup 文档（Day6/7 再用）

下一篇可按顺序阅读：

- **[Day 1｜环境搭建与语法地基](/articles/python-7day-bootcamp-day01)**
- **[Day 2｜流程控制与字符串](/articles/python-7day-bootcamp-day02)**
- **[Day 3｜四大容器 list / tuple / dict / set](/articles/python-7day-bootcamp-day03)**
- **[Day 4｜函数、模块与异常](/articles/python-7day-bootcamp-day04)**
