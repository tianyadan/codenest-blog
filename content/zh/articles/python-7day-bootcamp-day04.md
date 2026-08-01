---
title: Python 7 天训练营 Day4｜函数、模块与异常（Java 对照版）
summary: 用 Java 对照学会 def 函数、参数与返回值、模块导入、try/except；含可运行多文件小工具与练习题。
author: CodeNest
category: syntax
tags: [语法学习, Python专项, Python, 7天训练营, Day4, Java对比]
createdAt: 2026-08-01
updatedAt: 2026-08-01
readingMinutes: 40
topOrder: 5
slug: python-7day-bootcamp-day04
---

# Python 7 天训练营 Day4｜函数、模块与异常（Java 对照版）

> 系列总览：[Python 7 天训练营总览](/articles/python-7day-bootcamp-overview)  
> 上一篇：[Day3｜四大容器](/articles/python-7day-bootcamp-day03)  
> 今天目标：会写函数、会拆模块、会处理异常，交出一个 **多文件小工具**。

---

## 0. 今日地图

| 小节 | 你要带走的能力 | Java 对照 |
|------|----------------|-----------|
| 函数 | `def`、参数、返回值 | 方法定义 |
| 进阶参数 | 默认参数、`*args` / `**kwargs` | 重载 / varargs |
| 模块 | `import`、包意识 | `import` / 类路径 |
| 入口保护 | `if __name__ == "__main__"` | `main` 方法 |
| 异常 | `try / except / finally / else` | `try / catch / finally` |
| 练习 | 多文件工具 + 异常处理题 | —— |

**今日关键词：函数是一等公民；默认参数别用可变对象；`__name__` 保护入口；捕获具体异常，少用裸 `except`。**

---

## 1. 定义函数：`def`

### 1.1 最简形式

```python
# 定义函数：参数 name，返回拼接后的问候语
def greet(name):
    """返回问候语（文档字符串，类似 JavaDoc）。"""
    return f"你好，{name}！"

# 调用函数
msg = greet("evan")
print(msg)
```

对照 Java：

```java
public static String greet(String name) {
    return "你好，" + name + "！";
}
```

差异：

- Python **不必写在类里**，顶层直接 `def` 即可
- **不必声明参数/返回类型**（可选类型注解后面再说）
- 没有返回值时，默认返回 **`None`**（类似返回 void / null）

### 1.2 多返回值（其实是元组）

```python
def calc(a, b):
    # 一次返回商和余数
    return a // b, a % b

q, r = calc(17, 5)
print(q, r)  # 3 2
```

**`return a, b` 返回的是 tuple，接收端拆包。**

### 1.3 类型注解（可选，先混个眼熟）

```python
def add(a: int, b: int) -> int:
    return a + b

print(add(2, 3))
```

注解 **默认不强制检查**（不像 Java 编译期强校验），主要帮助人和 IDE 阅读。

---

## 2. 参数进阶

### 2.1 位置参数 vs 关键字参数

```python
def report(name, score):
    print(f"{name}: {score}")

report("Alice", 90)           # 位置参数
report(score=90, name="Alice")  # 关键字参数（顺序可调）
report("Bob", score=85)       # 混合：位置在前，关键字在后
```

### 2.2 默认参数

```python
def greet(name, title="同学"):
    return f"{title}{name}，你好"

print(greet("小明"))           # 同学小明，你好
print(greet("老师", title="尊敬的"))
```

**大坑：默认参数不要用可变对象（list/dict）。**

```python
# 错误示范：默认列表会在多次调用间共享
def add_item(item, bucket=[]):
    bucket.append(item)
    return bucket

print(add_item("a"))  # ['a']
print(add_item("b"))  # ['a', 'b']  ← 不是你以为的 ['b']

# 正确写法：默认用 None，函数内再创建
def add_item_safe(item, bucket=None):
    if bucket is None:
        bucket = []
    bucket.append(item)
    return bucket
```

### 2.3 `*args` / `**kwargs`

```python
# *args：接收多余的位置参数，打成元组
def total(*nums):
    return sum(nums)

print(total(1, 2, 3, 4))  # 10

# **kwargs：接收多余的关键字参数，打成字典
def show_user(**info):
    for k, v in info.items():
        print(f"{k}={v}")

show_user(name="evan", city="Shanghai")
```

对照感觉：

| Python | 接近 Java |
|--------|-----------|
| `*args` | `int... nums` 可变参数 |
| `**kwargs` | 没有直接对应，有点像 Map 入参 |

---

## 3. 作用域：LEGB（先建立直觉）

```python
level = "global"

def demo():
    level = "local"   # 函数内赋值，创建的是局部变量
    print("函数内：", level)

demo()
print("函数外：", level)  # 仍是 global
```

若要在函数内修改全局变量（尽量少用）：

```python
count = 0

def bump():
    global count
    count += 1

bump()
print(count)  # 1
```

**优先用返回值传递数据，少用 `global`。**

---

## 4. 模块与 `import`

### 4.1 导入方式

```python
import math
print(math.sqrt(16))

from math import sqrt
print(sqrt(9))

# 起别名（常见）
import datetime as dt
print(dt.date.today())
```

标准库常用（今天混个脸熟）：

- `math`：数学
- `random`：随机
- `datetime`：日期时间
- `json`：JSON 编解码
- `os` / `pathlib`：路径与系统（Day5 更常用）

### 4.2 自己拆模块

假设目录：

```text
day04_tool/
├── main.py
└── grade_utils.py
```

`grade_utils.py`：

```python
"""成绩相关工具函数。"""

def to_level(score):
    """把分数映射成等级字符串。"""
    if score < 0 or score > 100:
        raise ValueError("分数必须在 0~100")
    if score >= 90:
        return "优秀"
    if score >= 80:
        return "良好"
    if score >= 60:
        return "及格"
    return "不及格"


def average(scores):
    """计算平均分；空列表返回 0.0。"""
    if not scores:
        return 0.0
    return sum(scores) / len(scores)
```

`main.py`：

```python
"""程序入口：调用工具模块。"""

from grade_utils import to_level, average


def run():
    scores = [88, 92, 55, 73]
    print("平均分：", round(average(scores), 1))
    for s in scores:
        print(s, "->", to_level(s))


# 只有直接运行本文件时才执行；被 import 时不执行
if __name__ == "__main__":
    run()
```

运行：

```bash
cd day04_tool
python main.py
```

### 4.3 为什么要写 `if __name__ == "__main__"`？

| 场景 | `__name__` 的值 |
|------|-----------------|
| `python main.py` 直接运行 | `"__main__"` |
| `import main` 被别人导入 | `"main"`（模块名） |

**把「可执行逻辑」放进该判断里，模块才能被安全复用。**

---

## 5. 异常处理：`try / except / else / finally`

### 5.1 基本结构（对照 Java）

```java
// Java
try {
    int n = Integer.parseInt(text);
} catch (NumberFormatException e) {
    System.out.println("不是数字");
} finally {
    System.out.println("收尾");
}
```

```python
text = "abc"

try:
    n = int(text)          # 可能抛 ValueError
    print("转换成功：", n)
except ValueError:
    print("不是数字")
finally:
    print("收尾（无论成败都会走）")
```

### 5.2 常见内置异常（先记这些）

| 异常 | 常见触发 |
|------|----------|
| `ValueError` | `int("x")`、数值不合法 |
| `TypeError` | `1 + "2"` 类型不对 |
| `KeyError` | 字典键不存在 |
| `IndexError` | 列表下标越界 |
| `FileNotFoundError` | 文件不存在（Day5） |
| `ZeroDivisionError` | 除以 0 |

### 5.3 多 except、`else`、主动抛出

```python
def divide(a, b):
    if b == 0:
        # 主动抛出异常（类似 throw）
        raise ZeroDivisionError("除数不能为 0")
    return a / b


try:
    result = divide(10, 2)
except ZeroDivisionError as e:
    print("捕获到：", e)
except (TypeError, ValueError) as e:
    print("类型或值错误：", e)
else:
    # 没有异常才会走这里
    print("结果：", result)
finally:
    print("结束")
```

### 5.4 反模式

```python
# 不推荐：裸 except 会吞掉所有错误，包括 KeyboardInterrupt
try:
    do_something()
except:
    pass

# 推荐：捕获你预期的具体异常
try:
    do_something()
except ValueError as e:
    print("处理失败：", e)
```

**能捕获具体异常就别写裸 `except:`。**

---

## 6. 综合示例：多文件成绩工具

按下面建两个文件，然后运行 `python main.py`。

### `grade_utils.py`

```python
"""成绩工具：等级映射与平均值。"""


def to_level(score: int) -> str:
    """分数转等级；非法分数抛 ValueError。"""
    if not isinstance(score, int):
        raise TypeError("score 必须是 int")
    if score < 0 or score > 100:
        raise ValueError("分数必须在 0~100")
    if score >= 90:
        return "优秀"
    if score >= 80:
        return "良好"
    if score >= 60:
        return "及格"
    return "不及格"


def parse_scores(text: str) -> list:
    """
    把 '88, 92, x, 70' 解析成合法分数列表。
    非法片段跳过并打印提示。
    """
    result = []
    for part in text.split(","):
        piece = part.strip()
        if not piece:
            continue
        try:
            score = int(piece)
            # 先验证能否评级，非法会抛异常
            to_level(score)
            result.append(score)
        except (ValueError, TypeError) as e:
            print(f"跳过非法分数 [{piece}]：{e}")
    return result


def average(scores: list) -> float:
    """计算平均分。"""
    if not scores:
        return 0.0
    return sum(scores) / len(scores)
```

### `main.py`

```python
"""Day4 入口：解析输入并输出评级报告。"""

from grade_utils import parse_scores, to_level, average


def run():
    # 练习环境可不交互，直接写死字符串
    raw = "88, 92, abc, 105, 70, -1, 100"
    scores = parse_scores(raw)
    print("有效成绩：", scores)
    print("平均分：", round(average(scores), 1))

    for s in scores:
        print(f"{s:3d} -> {to_level(s)}")


if __name__ == "__main__":
    run()
```

预期输出包含：跳过 `abc` / `105` / `-1`，并对有效分评级。

---

## 7. 今日练习题（必须独立写）

### 题目 1｜温度换算函数（easy）

**要求：**

- 编写 `celsius_to_fahrenheit(c)`，返回华氏度
- 公式：`F = C * 9 / 5 + 32`
- 再写 `fahrenheit_to_celsius(f)` 反向换算
- 在 `if __name__ == "__main__":` 里打印两组互逆结果做自测

**参考答案：**

```python
# 练习1：温度换算函数

def celsius_to_fahrenheit(c):
    """摄氏转华氏。"""
    return c * 9 / 5 + 32


def fahrenheit_to_celsius(f):
    """华氏转摄氏。"""
    return (f - 32) * 5 / 9


if __name__ == "__main__":
    c = 0
    f = celsius_to_fahrenheit(c)
    print(f"{c}°C = {f:.1f}°F")
    print(f"{f:.1f}°F = {fahrenheit_to_celsius(f):.1f}°C")
```

### 题目 2｜安全除法（easy）

**要求：**

- 写 `safe_div(a, b)`：
  - 成功返回商（float）
  - 除数为 0 时返回 `None`，并打印 `除数不能为 0`
- 用 `try/except ZeroDivisionError` 实现
- 自测：`safe_div(10, 2)` 与 `safe_div(10, 0)`

**参考答案：**

```python
# 练习2：安全除法

def safe_div(a, b):
    """除法；除零时返回 None。"""
    try:
        return a / b
    except ZeroDivisionError:
        print("除数不能为 0")
        return None


if __name__ == "__main__":
    print(safe_div(10, 2))  # 5.0
    print(safe_div(10, 0))  # None
```

### 题目 3｜词频函数化（medium）

**要求：**

- 写 `count_words(text: str) -> dict`
- 按空格分词，统计词频并返回字典
- 再写 `top_n(counter: dict, n: int = 3) -> list`，返回出现次数最高的前 n 个 `(word, count)`
- 主程序对 `"java python java go python java"` 打印 top 3

**参考答案：**

```python
# 练习3：词频函数化

def count_words(text):
    """统计词频，返回 dict。"""
    counter = {}
    for w in text.split():
        counter[w] = counter.get(w, 0) + 1
    return counter


def top_n(counter, n=3):
    """返回出现次数最高的前 n 项。"""
    ranked = sorted(counter.items(), key=lambda item: item[1], reverse=True)
    return ranked[:n]


if __name__ == "__main__":
    text = "java python java go python java"
    counter = count_words(text)
    for word, cnt in top_n(counter, 3):
        print(f"{word}:{cnt}")
```

### 题目 4｜拆模块小挑战（optional）

**要求：**

- 把题目 3 的两个函数放到 `word_utils.py`
- `main.py` 里 `import` 后调用
- 两个文件都要有中文注释，且 `main.py` 使用 `__main__` 入口保护

结构示例：

```text
day04_words/
├── word_utils.py
└── main.py
```

---

## 8. 今日对照表

| 想做的事 | Java | Python |
|----------|------|--------|
| 定义方法 | `返回类型 名(参数)` | **`def 名(参数):`** |
| 无返回值 | `void` | 不写 `return` → **`None`** |
| 可变参数 | `T... args` | **`*args`** |
| 抛异常 | `throw` | **`raise`** |
| 捕获异常 | `catch` | **`except`** |
| 入口方法 | `public static void main` | **`if __name__ == "__main__":`** |
| 导入类/包 | `import` | **`import` / `from ... import`** |

---

## 9. 打卡清单

- [ ] 能独立写出带参数和返回值的函数
- [ ] 知道默认参数不要用 `[]` / `{}`
- [ ] 会用 `import` / `from ... import`
- [ ] 理解 `__name__ == "__main__"` 的作用
- [ ] 会写 `try/except/finally`，并主动 `raise`
- [ ] 跑通多文件示例 `day04_tool`
- [ ] 独立完成练习 1～3

---

## 10. 常见报错急救

| 报错 / 现象 | 常见原因 | 怎么处理 |
|-------------|----------|----------|
| `TypeError: ... missing ... argument` | 调用时参数个数不对 | 核对定义与调用 |
| `NameError: name 'x' is not defined` | 局部/全局搞混，或拼错名 | 检查作用域与拼写 |
| `ModuleNotFoundError` | 文件不在同目录 / 名字写错 | 检查路径与模块名 |
| 默认列表「越积越多」 | 默认参数用了 `[]` | 改成 `None` 后函数内创建 |
| `except:` 把程序「静默弄坏」 | 捕获过宽 | 改成具体异常类型 |

---

## 11. 预习明天

明天进入 **面向对象 + 文件读写**：`class`、`__init__`、`self`、文本/CSV I/O。  
官方预习：[类](https://docs.python.org/zh-cn/3/tutorial/classes.html) · [读写文件](https://docs.python.org/zh-cn/3/tutorial/inputoutput.html#reading-and-writing-files)

- 上一篇：[Day3](/articles/python-7day-bootcamp-day03)  
- 返回总览：[总览](/articles/python-7day-bootcamp-overview)
