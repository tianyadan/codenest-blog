---
title: Python 7 天训练营 Day5｜面向对象与文件读写（Java 对照详解版）
summary: 详细对照 Java 讲解 class/__init__/self、继承与魔法方法，以及文本/CSV 文件读写与编码；含完整可运行项目与练习题。
author: CodeNest
category: syntax
tags: [语法学习, Python专项, Python, 7天训练营, Day5, Java对比, OOP, 文件IO]
createdAt: 2026-08-03
updatedAt: 2026-08-03
readingMinutes: 55
topOrder: 6
slug: python-7day-bootcamp-day05
---

# Python 7 天训练营 Day5｜面向对象与文件读写（Java 对照详解版）

> 系列总览：[Python 7 天训练营总览](/articles/python-7day-bootcamp-overview)  
> 上一篇：[Day4｜函数、模块与异常](/articles/python-7day-bootcamp-day04)  
> 今天目标：用 **类** 建模数据，用 **文件 I/O** 读写文本/CSV，完成「读入 → 处理 → 写出」闭环。

今天会写得更细：每个概念都给 **Java 对照 + 可运行示例 + 易错点**。建议边看边在本地建目录敲代码。

---

## 0. 今日地图与学习节奏

| 时段 | 内容 | 交付 |
|------|------|------|
| 1 | 类、对象、`__init__`、`self` | 能写一个 `Student` 类 |
| 2 | 实例方法 / 类方法 / 静态方法 | 知道三种方法怎么选 |
| 3 | 继承、重写、`super()` | 能写子类扩展父类 |
| 4 | 常用魔法方法 | `__str__` / `__repr__` |
| 5 | 文件读写、`with`、编码 | 会读会写 `.txt` |
| 6 | CSV 读写（标准库） | 会做成绩表导入导出 |
| 7 | 综合项目 + 练习题 | 跑通完整小项目 |

**今日关键词：`self` ≈ `this`；`__init__` ≈ 构造器；`with open` 自动关文件；读写默认指定 `encoding="utf-8"`。**

推荐目录：

```text
python-bootcamp/day05/
├── student.py          # 类定义练习
├── io_demo.py          # 文本读写演示
├── csv_demo.py         # CSV 演示
├── project/
│   ├── students.csv    # 输入数据
│   ├── models.py       # Student 类
│   ├── io_csv.py       # 读写工具
│   └── main.py         # 入口
└── out/                # 输出目录（运行后生成）
```

---

## 1. 为什么今天要学 OOP + 文件？

前面四天你已经会：变量、分支循环、容器、函数。  
真实脚本（清洗、爬虫落盘、Web 读配置）几乎都是：

```text
外部文件 / 网络
    ↓ 读入
对象 / 字典列表（内存中的结构化数据）
    ↓ 处理
再写回文件 / 数据库 / API
```

Java 里你习惯 `class` + `FileInputStream` / `Files`；  
Python 更轻，但思想一样：**用类表达领域对象，用文件做持久化边界。**

---

## 2. 类与对象：从 Java 平移过来

### 2.1 最小对比

```java
// Java
public class Student {
    private String name;
    private int score;

    public Student(String name, int score) {
        this.name = name;
        this.score = score;
    }

    public String level() {
        return score >= 60 ? "及格" : "不及格";
    }
}
```

```python
# Python
class Student:
    """学生：姓名 + 分数。"""

    def __init__(self, name, score):
        # self 指向「当前这个对象」，类似 Java 的 this
        self.name = name
        self.score = score

    def level(self):
        """实例方法：第一个参数必须是 self。"""
        return "及格" if self.score >= 60 else "不及格"


# 创建对象（不必写 new）
s = Student("Alice", 88)
print(s.name, s.level())  # Alice 及格
```

记住三件事：

1. **创建对象不写 `new`**：`Student(...)` 即可  
2. **`__init__` 不是构造器全部，但承担「初始化属性」**  
3. **实例方法第一个参数约定叫 `self`**（名字可改，但别改）

### 2.2 `self` 到底是什么？

调用：

```python
s.level()
```

Python 实际大致相当于：

```python
Student.level(s)
```

所以方法里要通过 `self.xxx` 访问该对象自己的数据。

**漏写 `self` 是 Day5 第一高频报错来源。**

```python
class Bad:
    def __init__(self, name):
        name = name  # 错：只创建了局部变量，对象上没有 name

    def hello(self):
        print(self.name)  # AttributeError
```

正确：

```python
class Good:
    def __init__(self, name):
        self.name = name
```

### 2.3 属性默认值与校验

```python
class Student:
    def __init__(self, name: str, score: int):
        if not name:
            raise ValueError("name 不能为空")
        if score < 0 or score > 100:
            raise ValueError("score 必须在 0~100")
        self.name = name
        self.score = score

    def is_pass(self) -> bool:
        return self.score >= 60
```

这和 Java 构造器里做参数校验是同一习惯。

---

## 3. 三种方法：实例 / 类 / 静态

先看一张表，再看代码。

| 类型 | 装饰器 | 第一个参数 | 典型用途 | Java 感觉 |
|------|--------|------------|----------|-----------|
| 实例方法 | 无 | `self` | 读写对象自己的数据 | 普通实例方法 |
| 类方法 | `@classmethod` | `cls` | 备用构造器、工厂方法 | 有点像静态工厂 |
| 静态方法 | `@staticmethod` | 无 | 工具函数，但放在类命名空间下 | `static` 方法 |

```python
class Student:
    school = "CodeNest学院"  # 类属性：所有实例共享这份「默认学校名」

    def __init__(self, name, score):
        self.name = name
        self.score = score

    # 1) 实例方法
    def level(self):
        if self.score >= 90:
            return "优秀"
        if self.score >= 60:
            return "及格"
        return "不及格"

    # 2) 类方法：常用作「换一种方式创建对象」
    @classmethod
    def from_pair(cls, text):
        """从 'Alice:88' 这种字符串创建 Student。"""
        name, score = text.split(":")
        return cls(name.strip(), int(score))

    # 3) 静态方法：不依赖 self/cls
    @staticmethod
    def is_valid_score(score):
        return 0 <= score <= 100


s1 = Student("Bob", 70)
s2 = Student.from_pair("Carol:95")
print(s1.level(), s2.level())
print(Student.is_valid_score(120))  # False
print(s1.school, Student.school)
```

**什么时候用类方法？**  
当你想写多个「构造入口」时（从 CSV 行创建、从 dict 创建……），用 `@classmethod` 比堆一堆模块级函数更清晰。

**什么时候用静态方法？**  
逻辑上属于这个类的工具，但不需要读实例状态。也可以直接写成模块函数；放进类主要是为了命名归类。

---

## 4. 继承与 `super()`（够用版）

```python
class Person:
    def __init__(self, name):
        self.name = name

    def intro(self):
        return f"我是 {self.name}"


class Student(Person):
    def __init__(self, name, score):
        # 先初始化父类部分（类似 Java 的 super(...)）
        super().__init__(name)
        self.score = score

    def intro(self):
        # 重写父类方法，同时复用父类逻辑
        base = super().intro()
        return f"{base}，分数 {self.score}"


s = Student("Dave", 91)
print(s.intro())  # 我是 Dave，分数 91
print(isinstance(s, Student), isinstance(s, Person))  # True True
```

对照：

| Java | Python |
|------|--------|
| `extends` | `class Sub(Base):` |
| `super(name)` | `super().__init__(name)` |
| `@Override` | 直接同名定义即可 |
| `instanceof` | `isinstance(obj, Cls)` |

今天不深入多继承、MRO；知道 **单继承 + `super()`** 就够完成后续项目。

---

## 5. 常用魔法方法（先掌握 2 个）

```python
class Student:
    def __init__(self, name, score):
        self.name = name
        self.score = score

    def __str__(self):
        """给用户看的友好字符串（print 时常用）。"""
        return f"Student(name={self.name}, score={self.score})"

    def __repr__(self):
        """给开发者看的表达，调试/列表里更有用。"""
        return f"Student({self.name!r}, {self.score})"


s = Student("Erin", 86)
print(s)            # 走 __str__
print([s])          # 列表里常走 __repr__
```

以后还会见到 `__eq__`、`__len__`、`__iter__` 等；**今天把 `__str__` / `__repr__` 写好，调试体验会好很多。**

---

## 6. 文件读写基础（文本）

### 6.1 为什么必须用 `with`？

Java 里你用 try-with-resources；Python 对应 **上下文管理器**：

```python
# 推荐：with 结束自动 close，即使中途异常也会关
with open("demo.txt", "w", encoding="utf-8") as f:
    f.write("第一行\n")
    f.write("第二行\n")

with open("demo.txt", "r", encoding="utf-8") as f:
    content = f.read()
    print(content)
```

不推荐：

```python
f = open("demo.txt", "w", encoding="utf-8")
f.write("hi")
f.close()  # 若中间异常，可能忘记关闭
```

### 6.2 常用模式

| 模式 | 含义 |
|------|------|
| `"r"` | 读（文件必须存在） |
| `"w"` | 写（覆盖；不存在则创建） |
| `"a"` | 追加 |
| `"x"` | 独占创建（已存在则报错） |
| `"rb"` / `"wb"` | 二进制读写 |

### 6.3 按行处理（大文件友好）

```python
with open("demo.txt", "r", encoding="utf-8") as f:
    for line in f:
        # 去掉行尾换行
        print(line.rstrip("\n"))
```

或：

```python
with open("demo.txt", "r", encoding="utf-8") as f:
    lines = f.readlines()  # 一次读入所有行（小文件 OK）
```

### 6.4 编码：Windows 同学特别注意

**明确写 `encoding="utf-8"`**，不要依赖系统默认编码。  
否则中文在部分 Windows 环境会乱码或报 `UnicodeDecodeError`。

```python
with open("data.txt", "r", encoding="utf-8") as f:
    ...
```

### 6.5 路径：推荐 `pathlib`

```python
from pathlib import Path

base = Path("python-bootcamp") / "day05"
base.mkdir(parents=True, exist_ok=True)

file_path = base / "hello.txt"
file_path.write_text("你好，文件！\n", encoding="utf-8")
print(file_path.read_text(encoding="utf-8"))
print(file_path.exists(), file_path.resolve())
```

对照 Java：`Path` / `Files.readString` 一类 API。

---

## 7. CSV 读写（标准库 `csv`）

CSV 是爬虫、清洗、简单数据交换的「普通话」。今天先用标准库，Day6 再上 pandas。

### 7.1 写 CSV

```python
import csv
from pathlib import Path

out = Path("out")
out.mkdir(exist_ok=True)
path = out / "students.csv"

rows = [
    ["name", "score"],
    ["Alice", 88],
    ["Bob", 59],
    ["Carol", 95],
]

with path.open("w", encoding="utf-8", newline="") as f:
    # newline="" 是官方推荐，避免 Windows 多余空行
    writer = csv.writer(f)
    writer.writerows(rows)

print("已写入", path)
```

### 7.2 读 CSV（DictReader 更香）

```python
import csv
from pathlib import Path

path = Path("out") / "students.csv"

with path.open("r", encoding="utf-8", newline="") as f:
    reader = csv.DictReader(f)
    for row in reader:
        # row 是字典：{'name': 'Alice', 'score': '88'}
        # 注意：CSV 读出来默认都是字符串！
        name = row["name"]
        score = int(row["score"])
        print(name, score)
```

**关键坑：CSV 里的数字读进来是 `str`，要自己 `int()` / `float()`。**

### 7.3 用 DictWriter 写回

```python
import csv
from pathlib import Path

path = Path("out") / "passed.csv"
fieldnames = ["name", "score", "level"]

data = [
    {"name": "Alice", "score": 88, "level": "及格"},
    {"name": "Carol", "score": 95, "level": "优秀"},
]

with path.open("w", encoding="utf-8", newline="") as f:
    writer = csv.DictWriter(f, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(data)
```

---

## 8. 综合项目：读 CSV → 对象列表 → 写结果

把下面四个文件放进 `day05/project/`，然后运行：

```bash
cd day05/project
python main.py
```

### 8.1 `students.csv`（输入）

```csv
name,score
Alice,88
Bob,55
Carol,95
Dave,73
Erin,100
Frank,abc
Grace,120
```

### 8.2 `models.py`

```python
"""领域模型：Student。"""


class Student:
    """学生对象。"""

    def __init__(self, name: str, score: int):
        if not name.strip():
            raise ValueError("姓名不能为空")
        if score < 0 or score > 100:
            raise ValueError(f"分数非法: {score}")
        self.name = name.strip()
        self.score = score

    def level(self) -> str:
        """返回等级。"""
        if self.score >= 90:
            return "优秀"
        if self.score >= 80:
            return "良好"
        if self.score >= 60:
            return "及格"
        return "不及格"

    def is_pass(self) -> bool:
        return self.score >= 60

    def to_row(self) -> dict:
        """转成可写入 CSV 的字典。"""
        return {
            "name": self.name,
            "score": self.score,
            "level": self.level(),
        }

    def __str__(self) -> str:
        return f"{self.name}({self.score}/{self.level()})"
```

### 8.3 `io_csv.py`

```python
"""CSV 读写工具。"""

from __future__ import annotations

import csv
from pathlib import Path
from typing import Iterable

from models import Student


def load_students(path: Path) -> list[Student]:
    """
    从 CSV 加载学生。
    非法行跳过并打印原因（练习异常处理）。
    """
    students: list[Student] = []
    with path.open("r", encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        for idx, row in enumerate(reader, start=2):  # 从第 2 行开始计数（含表头）
            name = (row.get("name") or "").strip()
            raw_score = (row.get("score") or "").strip()
            try:
                score = int(raw_score)
                students.append(Student(name, score))
            except (TypeError, ValueError) as e:
                print(f"跳过第 {idx} 行 {row!r}：{e}")
    return students


def save_students(path: Path, students: Iterable[Student]) -> None:
    """把学生列表写到 CSV。"""
    path.parent.mkdir(parents=True, exist_ok=True)
    fieldnames = ["name", "score", "level"]
    with path.open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for s in students:
            writer.writerow(s.to_row())
```

### 8.4 `main.py`

```python
"""Day5 入口：读入 -> 过滤 -> 导出。"""

from pathlib import Path

from io_csv import load_students, save_students


def run() -> None:
    base = Path(__file__).resolve().parent
    src = base / "students.csv"
    out_dir = base / "out"
    passed_path = out_dir / "passed.csv"
    report_path = out_dir / "report.txt"

    students = load_students(src)
    print("有效学生：", [str(s) for s in students])

    passed = [s for s in students if s.is_pass()]
    save_students(passed_path, passed)

    # 额外写一份文本报告
    avg = sum(s.score for s in students) / len(students) if students else 0
    lines = [
        f"总人数={len(students)}",
        f"及格人数={len(passed)}",
        f"平均分={avg:.1f}",
        "明细：",
    ]
    for s in students:
        lines.append(f"- {s}")

    report_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print("已输出：", passed_path)
    print("已输出：", report_path)


if __name__ == "__main__":
    run()
```

跑完后你应看到：

- `Frank,abc`、`Grace,120` 被跳过并提示原因  
- `out/passed.csv` 只有及格学生  
- `out/report.txt` 有汇总报告  

这就是后面数据清洗 / 爬虫落盘的缩影。

---

## 9. 今日练习题（必须独立写）

### 题目 1｜银行账户类（easy，但要写完整）

**要求：**

- 定义 `BankAccount`
  - 属性：`owner`（str）、`balance`（float，默认 0）
  - 方法：
    - `deposit(amount)`：amount <= 0 抛 `ValueError`
    - `withdraw(amount)`：金额非法或余额不足抛 `ValueError`
    - `__str__`：返回 `张三: 余额=100.00`
- 主程序演示存 100、取 30、再打印

**参考答案：**

```python
# 练习1：银行账户

class BankAccount:
    def __init__(self, owner, balance=0.0):
        self.owner = owner
        self.balance = float(balance)

    def deposit(self, amount):
        """存款。"""
        if amount <= 0:
            raise ValueError("存款金额必须 > 0")
        self.balance += amount

    def withdraw(self, amount):
        """取款。"""
        if amount <= 0:
            raise ValueError("取款金额必须 > 0")
        if amount > self.balance:
            raise ValueError("余额不足")
        self.balance -= amount

    def __str__(self):
        return f"{self.owner}: 余额={self.balance:.2f}"


if __name__ == "__main__":
    acc = BankAccount("张三")
    acc.deposit(100)
    acc.withdraw(30)
    print(acc)  # 张三: 余额=70.00
```

### 题目 2｜文本日志追加（easy）

**要求：**

- 写函数 `append_log(path, message)`
- 每次调用把一行 `[LOG] message` 追加到文件（`encoding=utf-8`）
- 调用 3 次后读出全文打印

**参考答案：**

```python
# 练习2：追加日志
from pathlib import Path


def append_log(path, message):
    """向日志文件追加一行。"""
    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    with p.open("a", encoding="utf-8") as f:
        f.write(f"[LOG] {message}\n")


if __name__ == "__main__":
    log_file = Path("out") / "app.log"
    append_log(log_file, "服务启动")
    append_log(log_file, "收到请求")
    append_log(log_file, "服务停止")
    print(log_file.read_text(encoding="utf-8"))
```

### 题目 3｜CSV 过滤导出（medium）

**要求：**

- 读取如下内容（可先手写到 `scores.csv`）：

```csv
name,score
Alice,88
Bob,55
Carol,95
```

- 定义 `Student`（至少含 `name/score/level()`）
- 读入后只保留 `score >= 80` 的学生
- 写出 `good_students.csv`，字段：`name,score,level`

**参考答案：**

```python
# 练习3：CSV 过滤导出
import csv
from pathlib import Path


class Student:
    def __init__(self, name, score):
        self.name = name
        self.score = int(score)

    def level(self):
        if self.score >= 90:
            return "优秀"
        if self.score >= 80:
            return "良好"
        if self.score >= 60:
            return "及格"
        return "不及格"


def load(path):
    students = []
    with Path(path).open("r", encoding="utf-8", newline="") as f:
        for row in csv.DictReader(f):
            students.append(Student(row["name"], row["score"]))
    return students


def save(path, students):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=["name", "score", "level"])
        writer.writeheader()
        for s in students:
            writer.writerow({"name": s.name, "score": s.score, "level": s.level()})


if __name__ == "__main__":
    # 先准备输入文件
    src = Path("scores.csv")
    src.write_text("name,score\nAlice,88\nBob,55\nCarol,95\n", encoding="utf-8")

    students = load(src)
    good = [s for s in students if s.score >= 80]
    save("good_students.csv", good)
    print("导出完成，人数=", len(good))
```

### 题目 4｜继承小扩展（optional）

**要求：**

- `Person(name)` + `intro()`
- `Teacher(Person)` 增加 `subject`，重写 `intro()` 显示科目
- 打印一个 `Teacher("王老师", "Python")` 的介绍

```python
# 加餐：继承
class Person:
    def __init__(self, name):
        self.name = name

    def intro(self):
        return f"我是 {self.name}"


class Teacher(Person):
    def __init__(self, name, subject):
        super().__init__(name)
        self.subject = subject

    def intro(self):
        return f"{super().intro()}，教授 {self.subject}"


if __name__ == "__main__":
    t = Teacher("王老师", "Python")
    print(t.intro())
```

---

## 10. 今日对照表（建议抄一遍）

| 想做的事 | Java | Python |
|----------|------|--------|
| 定义类 | `class X { }` | `class X:` |
| 构造器 | `X(...)` / 构造方法 | **`__init__(self, ...)`** |
| 当前对象 | `this` | **`self`** |
| new 对象 | `new X()` | **`X()`** |
| 继承 | `extends` | **`class Sub(Base)`** |
| 调父类 | `super(...)` | **`super().__init__(...)`** |
| 读文件 | `Files` / Stream | **`open` / `Path.read_text`** |
| 自动关资源 | try-with-resources | **`with ... as`** |
| CSV | OpenCSV 等库 | 标准库 **`csv`** |
| 编码 | `StandardCharsets.UTF_8` | **`encoding="utf-8"`** |

---

## 11. 打卡清单

- [ ] 能口述 `self` 和 `__init__` 的作用
- [ ] 能写带校验的简单类
- [ ] 知道实例方法 / 类方法 / 静态方法区别
- [ ] 会用 `with open(..., encoding="utf-8")`
- [ ] 会用 `csv.DictReader` / `DictWriter`
- [ ] 跑通综合项目 `project/main.py`
- [ ] 独立完成练习 1～3

---

## 12. 常见报错急救

| 报错 / 现象 | 常见原因 | 怎么处理 |
|-------------|----------|----------|
| `TypeError: ... takes 0 positional arguments but 1 was given` | 实例方法忘了写 `self` | 补上 `self` |
| `AttributeError: 'X' object has no attribute 'name'` | `__init__` 里写成局部变量 | 改成 `self.name = ...` |
| `FileNotFoundError` | 路径不对 / 文件不存在 | 检查相对路径，或先 `mkdir` |
| `UnicodeDecodeError` | 编码不匹配 | 统一 `utf-8` |
| CSV 数字对不上 | 忘了 `int(row["score"])` | 读入后显式转换 |
| Windows 写 CSV 出现空行 | 没设 `newline=""` | `open(..., newline="")` |

---

## 13. 预习明天

明天进入实战线：**pandas 数据清洗 + 爬虫入门（requests / BeautifulSoup）**。  
建议先安装（在虚拟环境里）：

```bash
python -m pip install pandas requests beautifulsoup4 lxml
```

- 上一篇：[Day4](/articles/python-7day-bootcamp-day04)  
- 返回总览：[总览](/articles/python-7day-bootcamp-overview)
