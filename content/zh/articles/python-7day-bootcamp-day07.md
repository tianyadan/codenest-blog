---
title: Python 7 天训练营 Day7｜FastAPI Web 收官（Java / Spring Boot 对照详解版）
summary: 用 Spring Boot 对照学会 FastAPI：路由、查询参数、路径参数、JSON 响应；把 Day6 清洗结果做成可查询迷你 API，含练习与验收。
author: CodeNest
category: syntax
tags: [语法学习, Python专项, Python, 7天训练营, Day7, Java对比, FastAPI, Web]
createdAt: 2026-08-06
updatedAt: 2026-08-06
readingMinutes: 55
topOrder: 8
slug: python-7day-bootcamp-day07
---

# Python 7 天训练营 Day7｜FastAPI Web 收官（Java / Spring Boot 对照详解版）

> 系列总览：[Python 7 天训练营总览](/articles/python-7day-bootcamp-overview)  
> 上一篇：[Day6｜数据清洗与爬虫入门](/articles/python-7day-bootcamp-day06)  
> 今天目标：用 **FastAPI** 把清洗后的 CSV 做成查询 API，对照 Spring Boot 完成 7 天收官。

七天路线收束到这里：

```text
语法地基 → 容器/函数/OOP/文件 → 清洗+爬虫 → Web API 对外提供数据
```

---

## 0. 今日地图

| 时段 | 内容 | 交付 |
|------|------|------|
| 1 | FastAPI 是什么、和 Spring Boot 怎么比 | 建立对照表 |
| 2 | 安装、最小 Hello API | 本地跑通 `/health` |
| 3 | 路径参数 / 查询参数 / JSON | 写出 2～3 个接口 |
| 4 | 读 Day6 CSV 并提供查询 | `/students`、`/students/{name}` |
| 5 | 自动文档 Swagger | 浏览器点一点验证 |
| 6 | 练习 + 总验收 | 完成收官项目 |

**今日关键词：路由函数 ≈ Controller 方法；类型注解驱动参数校验；`uvicorn` 负责启动；Swagger 免费附送。**

推荐目录：

```text
python-bootcamp/day07/
├── requirements.txt
├── data/
│   └── clean_students.csv     # 可用 Day6 产物，文中也给样例
├── app/
│   ├── __init__.py
│   ├── main.py                # FastAPI 入口
│   └── repository.py          # 读 CSV / 查询
└── README.md
```

---

## 1. FastAPI 是什么？（给 Spring Boot 同学）

FastAPI 是 Python 里偏现代的 Web 框架，特点：

- 写起来像普通函数，却能自动生成 OpenAPI 文档
- 用 **类型注解** 做参数解析与基础校验
- 默认返回 JSON，很适合做小 API / 内部工具服务

| 维度 | Spring Boot | FastAPI |
|------|-------------|---------|
| 控制器 | `@RestController` | `APIRouter` / 路由函数 |
| 映射 | `@GetMapping("/x")` | `@app.get("/x")` |
| 入参 | `@RequestParam` / `@PathVariable` | 函数参数 + 类型注解 |
| JSON | Jackson 自动序列化 | 默认 dict / Pydantic 模型 |
| 文档 | springdoc / knife4j | **自带 `/docs`** |
| 启动 | 内嵌 Tomcat | **uvicorn** |

一句话：**Spring Boot 适合完整业务系统；FastAPI 适合快速把数据/脚本能力“接口化”。**

---

## 2. 安装与最小可运行服务

```bash
cd python-bootcamp/day07
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install fastapi uvicorn
```

`requirements.txt`：

```text
fastapi>=0.111
uvicorn>=0.30
```

最小示例 `hello_main.py`：

```python
"""最小 FastAPI。运行：uvicorn hello_main:app --reload"""
from fastapi import FastAPI

# 创建应用实例（有点像 Spring Boot 的 Application）
app = FastAPI(title="CodeNest Day7", version="1.0.0")


@app.get("/health")
def health():
    """健康检查：对照 Spring 的 /actuator/health 思路。"""
    return {"status": "ok"}
```

启动：

```bash
uvicorn hello_main:app --reload --port 8000
```

验证：

```bash
curl http://127.0.0.1:8000/health
# {"status":"ok"}
```

浏览器打开自动文档：

- Swagger UI：`http://127.0.0.1:8000/docs`
- ReDoc：`http://127.0.0.1:8000/redoc`

**`--reload` 改代码自动重启，开发期很香（别用在生产当唯一方案）。**

---

## 3. 路由参数：路径参数 vs 查询参数

### 3.1 路径参数（Path Variable）

```java
// Spring
@GetMapping("/students/{name}")
public Student get(@PathVariable String name) { ... }
```

```python
from fastapi import FastAPI

app = FastAPI()


@app.get("/students/{name}")
def get_student(name: str):
    # name 来自路径 /students/Alice
    return {"name": name}
```

### 3.2 查询参数（RequestParam）

```java
@GetMapping("/students")
public List<Student> list(@RequestParam(required = false) String city,
                          @RequestParam(defaultValue = "0") int minScore) { ... }
```

```python
from typing import Optional
from fastapi import FastAPI

app = FastAPI()


@app.get("/students")
def list_students(city: Optional[str] = None, min_score: int = 0):
    # /students?city=Shanghai&min_score=80
    return {"city": city, "min_score": min_score}
```

**有默认值或 `Optional` 的参数通常是查询参数；路径里 `{xxx}` 对应路径参数。**

### 3.3 状态码与 404

```python
from fastapi import FastAPI, HTTPException

app = FastAPI()


@app.get("/items/{item_id}")
def read_item(item_id: int):
    if item_id < 0:
        # 对照 ResponseEntity.status(404)
        raise HTTPException(status_code=404, detail="item not found")
    return {"item_id": item_id}
```

---

## 4. 准备数据：Day6 清洗结果

若你还没跑 Day6，先手写一份 `data/clean_students.csv`：

```csv
name,score,city,level
Alice,88,Shanghai,良好
Carol,95,Shanghai,优秀
Dave,73,Guangzhou,及格
Erin,100,Beijing,优秀
Bob,55,Beijing,不及格
```

---

## 5. 收官项目：把 CSV 做成查询 API

### 5.1 `app/repository.py`

```python
"""数据访问：从 CSV 加载学生并提供查询。"""
from __future__ import annotations

import csv
from pathlib import Path
from typing import Optional


DATA_FILE = Path(__file__).resolve().parent.parent / "data" / "clean_students.csv"


def load_students() -> list[dict]:
    """读取 CSV，把分数转成 int。"""
    if not DATA_FILE.exists():
        raise FileNotFoundError(f"找不到数据文件: {DATA_FILE}")

    rows: list[dict] = []
    with DATA_FILE.open("r", encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            rows.append({
                "name": (row.get("name") or "").strip(),
                "score": int(float(row.get("score") or 0)),
                "city": (row.get("city") or "").strip(),
                "level": (row.get("level") or "").strip(),
            })
    return rows


def list_students(
    city: Optional[str] = None,
    min_score: int = 0,
    level: Optional[str] = None,
) -> list[dict]:
    """按条件过滤学生列表。"""
    result = load_students()
    if city:
        city_lower = city.lower()
        result = [s for s in result if s["city"].lower() == city_lower]
    if level:
        result = [s for s in result if s["level"] == level]
    if min_score > 0:
        result = [s for s in result if s["score"] >= min_score]
    return result


def get_student(name: str) -> Optional[dict]:
    """按姓名精确查找（忽略大小写）。"""
    key = name.strip().lower()
    for student in load_students():
        if student["name"].lower() == key:
            return student
    return None


def summary() -> dict:
    """汇总统计。"""
    students = load_students()
    if not students:
        return {"count": 0, "avg_score": 0, "pass_count": 0}
    scores = [s["score"] for s in students]
    pass_count = sum(1 for s in students if s["score"] >= 60)
    return {
        "count": len(students),
        "avg_score": round(sum(scores) / len(scores), 1),
        "pass_count": pass_count,
    }
```

### 5.2 `app/main.py`

```python
"""
Day7 FastAPI 入口。
运行（在 day07 目录）：
  uvicorn app.main:app --reload --port 8000
"""
from typing import Optional

from fastapi import FastAPI, HTTPException, Query

from app.repository import get_student, list_students, summary

app = FastAPI(
    title="CodeNest Student API",
    description="Python 7天训练营 Day7：把清洗后的学生数据做成查询 API",
    version="1.0.0",
)


@app.get("/health")
def health():
    """健康检查。"""
    return {"status": "ok"}


@app.get("/summary")
def get_summary():
    """汇总：人数 / 平均分 / 及格人数。"""
    return summary()


@app.get("/students")
def api_list_students(
    city: Optional[str] = Query(default=None, description="城市，精确匹配"),
    min_score: int = Query(default=0, ge=0, le=100, description="最低分"),
    level: Optional[str] = Query(default=None, description="等级：优秀/良好/及格/不及格"),
):
    """
    学生列表查询。
    示例：/students?city=Shanghai&min_score=80
    """
    items = list_students(city=city, min_score=min_score, level=level)
    return {"total": len(items), "items": items}


@app.get("/students/{name}")
def api_get_student(name: str):
    """按姓名查询单个学生。"""
    student = get_student(name)
    if student is None:
        raise HTTPException(status_code=404, detail=f"student not found: {name}")
    return student
```

### 5.3 空的 `app/__init__.py`

```python
# 让 app 成为包
```

### 5.4 启动与验证

```bash
cd python-bootcamp/day07
uvicorn app.main:app --reload --port 8000
```

```bash
# 健康检查
curl http://127.0.0.1:8000/health

# 汇总
curl http://127.0.0.1:8000/summary

# 列表 + 过滤
curl "http://127.0.0.1:8000/students?city=Shanghai&min_score=80"

# 详情
curl http://127.0.0.1:8000/students/Alice

# 不存在
curl http://127.0.0.1:8000/students/Nobody
```

也强烈建议打开：`http://127.0.0.1:8000/docs`，用界面点查询。

---

## 6. README 模板（今天交付物之一）

保存为 `day07/README.md`：

```md
# CodeNest Student API（Day7）

## 启动

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

## 接口

- `GET /health`
- `GET /summary`
- `GET /students?city=&min_score=&level=`
- `GET /students/{name}`

## 文档

- Swagger: http://127.0.0.1:8000/docs
```

---

## 7. 和 Spring Boot 再对照一次（强化记忆）

```java
@RestController
@RequestMapping("/students")
public class StudentController {
    @GetMapping
    public Map<String, Object> list(
        @RequestParam(required = false) String city,
        @RequestParam(defaultValue = "0") int minScore
    ) { ... }

    @GetMapping("/{name}")
    public Student detail(@PathVariable String name) { ... }
}
```

```python
@app.get("/students")
def api_list_students(city: Optional[str] = None, min_score: int = 0):
    ...

@app.get("/students/{name}")
def api_get_student(name: str):
    ...
```

差异提醒：

- FastAPI **函数即接口**，不一定先建 class
- 校验常靠类型注解 + `Query(ge=0)`
- 文档几乎零配置就有

---

## 8. 今日练习题

### 题目 1｜Hello + Health（easy）

**要求：**

- 创建 FastAPI 应用
- 提供 `GET /health` 返回 `{"status":"ok"}`
- 提供 `GET /hello?name=evan` 返回 `{"message":"你好, evan"}`
- `name` 默认值为 `world`

**参考答案：**

```python
# 练习1
from fastapi import FastAPI

app = FastAPI()


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/hello")
def hello(name: str = "world"):
    return {"message": f"你好, {name}"}
```

### 题目 2｜按等级过滤（easy/medium）

**要求：**

- 基于收官项目 CSV
- 增加或使用 `GET /students?level=优秀`
- 只返回优秀学生，响应包含 `total` 与 `items`

**参考答案（核心逻辑）：**

```python
# 练习2：调用已有 list_students(level="优秀")
items = list_students(level="优秀")
return {"total": len(items), "items": items}
```

完整可直接复用正文 `api_list_students`。

### 题目 3｜城市统计接口（medium）

**要求：**

- 新增 `GET /stats/by-city`
- 返回每个城市的人数与平均分，例如：

```json
{
  "items": [
    {"city": "Shanghai", "count": 2, "avg_score": 91.5},
    {"city": "Beijing", "count": 2, "avg_score": 77.5}
  ]
}
```

**参考答案：**

```python
# 练习3：按城市统计
from collections import defaultdict
from fastapi import FastAPI
from app.repository import load_students

app = FastAPI()


@app.get("/stats/by-city")
def stats_by_city():
    groups: dict[str, list[int]] = defaultdict(list)
    for s in load_students():
        groups[s["city"]].append(s["score"])

    items = []
    for city, scores in groups.items():
        items.append({
            "city": city,
            "count": len(scores),
            "avg_score": round(sum(scores) / len(scores), 1),
        })
    # 按平均分降序，好看一点
    items.sort(key=lambda x: x["avg_score"], reverse=True)
    return {"items": items}
```

### 题目 4｜加餐：Pydantic 响应模型（optional）

**要求：**

- 定义 `StudentOut` 模型（name/score/city/level）
- 让 `/students/{name}` 的 `response_model=StudentOut`

```python
from pydantic import BaseModel, Field
from fastapi import FastAPI, HTTPException
from app.repository import get_student

app = FastAPI()


class StudentOut(BaseModel):
    name: str
    score: int = Field(ge=0, le=100)
    city: str
    level: str


@app.get("/students/{name}", response_model=StudentOut)
def api_get_student(name: str):
    student = get_student(name)
    if student is None:
        raise HTTPException(status_code=404, detail="not found")
    return student
```

---

## 9. 7 天总验收（今天一起勾完）

- [ ] 能独立写出变量、分支、循环、函数、字典操作
- [ ] 能读懂并修改别人的小脚本
- [ ] 会用 pandas 完成脏数据清洗并导出
- [ ] 会做合规的小解析/爬虫并落盘
- [ ] FastAPI 至少提供 2 个查询接口（列表 + 详情）
- [ ] 能用 `/docs` 或 curl 验证接口
- [ ] 项目里有 README，别人能按步骤启动

---

## 10. 今日对照表

| 想做的事 | Spring Boot | FastAPI |
|----------|-------------|---------|
| 定义 GET 接口 | `@GetMapping` | `@app.get` |
| 路径参数 | `@PathVariable` | `/x/{id}` + 函数参数 |
| 查询参数 | `@RequestParam` | 函数参数 / `Query()` |
| 返回 JSON | 返回对象 | 返回 dict / model |
| 404 | 抛异常 / ResponseEntity | `HTTPException(404)` |
| 本地启动 | `mvn spring-boot:run` | `uvicorn app.main:app` |
| 接口文档 | 额外集成 | **内置 `/docs`** |

---

## 11. 打卡清单

- [ ] 安装 fastapi / uvicorn 成功
- [ ] 跑通 `/health`
- [ ] 跑通 `/students` 与 `/students/{name}`
- [ ] 会用查询参数过滤
- [ ] 打开过 Swagger `/docs`
- [ ] 独立完成练习 1～3
- [ ] 写好 README

---

## 12. 常见报错急救

| 报错 / 现象 | 常见原因 | 怎么处理 |
|-------------|----------|----------|
| `ModuleNotFoundError: fastapi` | 虚拟环境没装 / 没激活 | 激活 venv 后重装 |
| `No module named app` | 启动目录不对 | 在 `day07` 根目录执行 uvicorn |
| `Address already in use` | 8000 端口占用 | 换 `--port 8001` |
| 一直 404 | 路径写错 / 函数未挂装饰器 | 对照 `/docs` 看真实路由 |
| CSV 读不到 | 相对路径错误 | 用 `Path(__file__)` 拼绝对路径 |
| 详情接口总是 404 | 姓名大小写/空格 | 查询时 `strip` + lower 比较 |

---

## 13. 结营后怎么继续

你已经具备「脚本能力 + 数据处理 + 最小 Web」。下一步可按兴趣选一条：

1. **Web**：FastAPI + 数据库（SQLAlchemy）+ 简单前端  
2. **数据**：pandas 进阶、可视化、定时清洗任务  
3. **爬虫**：多页翻页、增量更新、任务队列（先继续合规）  
4. **工程**：把 Day7 项目补测试、Dockerfile、配置分离  

返回系列：

- [Day6](/articles/python-7day-bootcamp-day06)  
- [总览](/articles/python-7day-bootcamp-overview)
