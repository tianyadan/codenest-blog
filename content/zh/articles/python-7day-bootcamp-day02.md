---
title: Python 7 天训练营 Day2｜流程控制与字符串（Java 对照版）
summary: 用 Java 对照学会 if/elif/else、for/while、break/continue，以及字符串切片与 f-string；含成绩评级与文本处理练习题。
author: CodeNest
category: syntax
tags: [语法学习, Python专项, Python, 7天训练营, Day2, Java对比]
createdAt: 2026-07-29
updatedAt: 2026-07-29
readingMinutes: 40
topOrder: 3
slug: python-7day-bootcamp-day02
---

# Python 7 天训练营 Day2｜流程控制与字符串（Java 对照版）

> 系列总览：[Python 7 天训练营总览](/articles/python-7day-bootcamp-overview)  
> 上一篇：[Day1｜环境与语法地基](/articles/python-7day-bootcamp-day01)  
> 今天目标：写出会「判断 + 循环」的小程序，并能熟练做 **字符串切片 / 查找 / 格式化**。

---

## 0. 今日地图

| 小节 | 你要带走的能力 | Java 对照 |
|------|----------------|-----------|
| 分支 | `if / elif / else` | `if / else if / else` |
| for 循环 | 遍历序列、`range` | `for-each`、传统 for |
| while | 条件循环 | `while` |
| 跳转 | `break` / `continue` | 同名关键字 |
| 字符串 | 索引、切片、常用方法 | `String` / `substring` |
| 格式化 | f-string 进阶 | `String.format` |
| 练习 | 成绩评级 + 文本处理 | —— |

**今日关键词：`elif` 不是 `else if`；`for` 默认遍历「可迭代对象」；切片左闭右开；字符串不可变。**

---

## 1. 分支：`if / elif / else`

### 1.1 基本写法

```python
score = 86

# 注意：每个分支后必须有冒号 :
if score >= 90:
    print("优秀")
elif score >= 80:   # 相当于 Java 的 else if
    print("良好")
elif score >= 60:
    print("及格")
else:
    print("不及格")
```

| Java | Python |
|------|--------|
| `else if` | **`elif`**（一个单词） |
| `{}` | **缩进** |
| `switch` | 3.10+ 有 `match`，今天先用 if 链 |

### 1.2 真值判断（很 Pythonic）

在条件位置，Python 会把值转成布尔语义：

- **假值**：`False`、`0`、`0.0`、`None`、`""`、`[]`、`{}`、`()`
- **其他多为真**

```python
name = ""

# 空字符串为假，推荐这种写法检查「有没有内容」
if name:
    print("有名字")
else:
    print("名字为空")

# 显式比较也可以，语义更直白
if name == "":
    print("确实是空串")
```

### 1.3 三元表达式（对照三目运算）

```java
// Java
String tip = score >= 60 ? "及格" : "不及格";
```

```python
# Python：先写「成立时的值」，再写条件
tip = "及格" if score >= 60 else "不及格"
print(tip)
```

**复杂逻辑别硬塞三元表达式，可读性优先。**

---

## 2. `for` 循环：遍历优先，不是数次数优先

Java 里你常写：

```java
for (int i = 0; i < 5; i++) { ... }
for (String s : list) { ... }
```

Python 的 `for` **首先是 for-each**：

```python
# 遍历字符串的每一个字符
for ch in "Python":
    print(ch)

# 遍历列表
fruits = ["apple", "banana", "cherry"]
for fruit in fruits:
    print(fruit)
```

### 2.1 需要次数时用 `range`

```python
# range(5) => 0,1,2,3,4（不含 5）
for i in range(5):
    print(i)

# range(开始, 结束, 步长) —— 结束仍然不含
for i in range(1, 10, 2):
    print(i)  # 1 3 5 7 9
```

**`range(a, b)` 是左闭右开：包含 a，不包含 b。**

### 2.2 既要下标又要元素：`enumerate`

```python
langs = ["Java", "Python", "Go"]

# start=1 让序号从 1 开始（默认从 0）
for index, lang in enumerate(langs, start=1):
    print(f"{index}. {lang}")
```

### 2.3 同时遍历两个序列：`zip`

```python
names = ["Alice", "Bob"]
scores = [90, 85]

for name, score in zip(names, scores):
    print(f"{name}: {score}")
```

---

## 3. `while` 循环

适合「不知道循环几次，只知道停下来的条件」。

```python
# 累加到超过 100
total = 0
n = 1

while total <= 100:
    total += n
    n += 1

print("总和 =", total, "最后加到了", n - 1)
```

小心死循环：

```python
# 错误示范：条件永远为真，且循环体内不改变条件
# while True:
#     print("停不下来")
```

需要「先做一次再判断」时，常用：

```python
while True:
    text = input("输入 quit 退出：")
    if text == "quit":
        break  # 主动跳出
    print("你输入了：", text)
```

---

## 4. `break` / `continue` / `else`（循环也能挂 else）

```python
# break：立刻结束整个循环
for i in range(10):
    if i == 3:
        break
    print(i)  # 只打印 0 1 2

# continue：跳过本轮剩余语句，进入下一轮
for i in range(5):
    if i % 2 == 0:
        continue
    print(i)  # 打印奇数 1 3
```

Python 特有（Java 没有）：**循环的 `else`** —— 循环**正常结束**（没被 `break`）才会执行。

```python
nums = [2, 4, 6, 8]
target = 5

for n in nums:
    if n == target:
        print("找到了")
        break
else:
    # 只有整圈都没 break，才会走到这里
    print("没找到")
```

**今天先会用 `break` / `continue`；循环 `else` 知道即可。**

---

## 5. 字符串深挖

### 5.1 不可变（immutable）

```python
s = "hello"
# s[0] = "H"  # TypeError：字符串不能原地改某个字符

# 正确做法：造一个新字符串
s = "H" + s[1:]
print(s)  # Hello
```

**字符串一改就生成新对象；原串不会被就地修改。**

### 5.2 索引与切片（左闭右开）

```text
 字符:   P  y  t  h  o  n
 下标:   0  1  2  3  4  5
 负下标:-6 -5 -4 -3 -2 -1
```

```python
word = "Python"

print(word[0])     # P
print(word[-1])    # n（最后一个）
print(word[0:2])   # Py（含 0，不含 2）
print(word[2:])    # thon
print(word[:2])    # Py
print(word[::2])   # Pto（步长 2）
print(word[::-1])  # nohtyP（反转，超好用）
```

对照 Java：

| 操作 | Java | Python |
|------|------|--------|
| 取字符 | `s.charAt(i)` | `s[i]` |
| 子串 | `s.substring(a, b)` | **`s[a:b]`** |
| 长度 | `s.length()` | **`len(s)`** |

### 5.3 常用方法（先背这批）

```python
text = "  Java And Python  "

print(text.strip())          # 去两端空白
print(text.lower())          # 全小写
print(text.upper())          # 全大写
print(text.replace("Java", "Go"))

# 查找
print("Python" in text)      # True：成员运算（超常用）
print(text.find("Python"))   # 找到返回下标，找不到返回 -1
# print(text.index("Ruby"))  # 找不到会抛 ValueError

# 拆分 / 拼接
parts = "a,b,c".split(",")   # ['a', 'b', 'c']
joined = "-".join(parts)     # a-b-c

# 判断
print("123".isdigit())       # True
print("abc".isalpha())       # True
print("Hello".startswith("He"))
print("Hello".endswith("lo"))
```

**`str.join(列表)` 的主语是「连接符」，不是列表。**  
写成 `"-".join(parts)`，不要写成 `parts.join("-")`。

### 5.4 f-string 进阶

```python
name = "evan"
score = 95.6789
ratio = 0.856

print(f"{name} 得分 {score:.2f}")   # 保留两位小数
print(f"{ratio:.1%}")               # 85.6%
print(f"{name:>10}")                # 右对齐，宽度 10
print(f"{name:<10}*")               # 左对齐
print(f"{1001:04d}")                # 01001（补零到 4 位）
```

---

## 6. 综合示例：成绩评级脚本

保存为 `day02_grade.py` 后运行：

```python
"""
Day2 综合演示：分支 + 循环 + 字符串处理。
运行：python day02_grade.py
"""

# 模拟一批学生成绩（真实场景可改成 input 或读文件）
raw_scores = "88, 92, 55, 73, 100, 61"

# 1) 拆成列表，并去掉空格
parts = raw_scores.split(",")
scores = []
for item in parts:
    # strip 去掉空格，再转 int
    scores.append(int(item.strip()))

print("成绩列表：", scores)

# 2) 评级统计
excellent = 0
good = 0
pass_count = 0
fail = 0

for score in scores:
    if score >= 90:
        level = "优秀"
        excellent += 1
    elif score >= 80:
        level = "良好"
        good += 1
    elif score >= 60:
        level = "及格"
        pass_count += 1
    else:
        level = "不及格"
        fail += 1
    print(f"分数 {score:3d} -> {level}")

# 3) 汇总
total = len(scores)
avg = sum(scores) / total
print("-" * 24)
print(f"人数={total} 平均分={avg:.1f}")
print(f"优秀={excellent} 良好={good} 及格={pass_count} 不及格={fail}")
```

---

## 7. 今日练习题（必须独立写）

规则同 Day1：每题一个 `.py`，关键处写中文注释，先自己写再看答案。

### 题目 1｜成绩评级器（easy）

**要求：**

- 用 `input` 读入一个 0～100 的整数分数
- 按规则打印等级：  
  **90+ 优秀 / 80–89 良好 / 60–79 及格 / 60 以下 不及格**
- 若输入不在 0～100，打印 `分数非法`

**参考答案：**

```python
# 练习1：单科成绩评级
raw = input("请输入分数（0-100）：")
score = int(raw)

# 先校验范围，再评级
if score < 0 or score > 100:
    print("分数非法")
elif score >= 90:
    print("优秀")
elif score >= 80:
    print("良好")
elif score >= 60:
    print("及格")
else:
    print("不及格")
```

### 题目 2｜奇数求和（easy）

**要求：**

- 计算 1～100 中所有 **奇数** 的和
- 用 `for + range`，并用 `continue` 跳过偶数
- 打印最终结果（应为 `2500`）

**参考答案：**

```python
# 练习2：1~100 奇数求和
total = 0

for n in range(1, 101):
    # 偶数直接跳过本轮
    if n % 2 == 0:
        continue
    total += n

print(total)  # 2500
```

### 题目 3｜文本清洗小助手（medium）

**要求：**

- 给定字符串（可写死，也可 `input`）：  
  `"  Hello, Python! Hello, Java!  "`
- 完成：
  1. 去掉两端空白
  2. 全部转小写
  3. 把 `java` 替换成 `go`
  4. 统计 `hello` 出现次数（提示：`count`）
  5. 按逗号 `split`，再逐个 `strip` 后打印每一段
- 每一步都 `print` 中间结果

**参考答案：**

```python
# 练习3：文本清洗
text = "  Hello, Python! Hello, Java!  "

# 1) 去空白
cleaned = text.strip()
print("去空白：", cleaned)

# 2) 转小写
lowered = cleaned.lower()
print("小写：", lowered)

# 3) 替换
replaced = lowered.replace("java", "go")
print("替换后：", replaced)

# 4) 统计子串出现次数
hello_count = replaced.count("hello")
print("hello 出现次数：", hello_count)

# 5) 拆分并逐段打印
parts = replaced.split(",")
for part in parts:
    print("段落：", part.strip())
```

### 题目 4｜回文检测（optional / medium）

**要求：**

- 读入一个单词（只含字母，不考虑空格标点）
- 判断是否回文（正读反读一样），如 `level`、`noon`
- 提示：可用切片 `s[::-1]`

**参考答案：**

```python
# 加餐：回文判断
word = input("请输入单词：").strip().lower()

# 反转后与原串比较
if word == word[::-1]:
    print("是回文")
else:
    print("不是回文")
```

---

## 8. 今日对照表

| 想做的事 | Java | Python |
|----------|------|--------|
| 多分支 | `else if` | **`elif`** |
| 遍历集合 | `for (x : list)` | `for x in list` |
| 数次数 | `for (i=0;i<n;i++)` | **`for i in range(n)`** |
| 带下标遍历 | 自己维护 i | **`enumerate`** |
| 子串 | `substring(a,b)` | **`s[a:b]`**（左闭右开） |
| 长度 | `length()` | **`len(s)`** |
| 包含判断 | `contains` | **`x in s`** |
| 拼接列表 | `String.join` | **`"-".join(list)`** |
| 格式化 | `String.format` | **f-string** |

---

## 9. 打卡清单

- [ ] 能默写 `if / elif / else` 结构
- [ ] 能用 `range` 和 `enumerate`
- [ ] 能解释切片 **左闭右开**
- [ ] 会用 `strip / split / replace / join / in`
- [ ] 独立完成练习 1～3
- [ ] 跑通综合示例 `day02_grade.py`

---

## 10. 常见报错急救

| 报错 / 现象 | 常见原因 | 怎么处理 |
|-------------|----------|----------|
| `SyntaxError` 在 else if | 写成了 Java 的 `else if` | 改成 **`elif`** |
| 循环少跑一次 / 多跑一次 | `range` 边界搞错 | 记住 **不含终点** |
| `TypeError: 'str' object does not support item assignment` | 想改 `s[i] = ...` | 重新拼接新字符串 |
| `AttributeError: 'list' object has no attribute 'join'` | 写成 `list.join("-")` | 改成 `"-".join(list)` |
| 死循环 | `while` 条件不变 | 循环体内更新条件，或 `break` |

---

## 11. 预习明天

明天进入 **四大容器**：`list` / `tuple` / `dict` / `set`。  
已更新：直接阅读 **[Day3｜四大容器](/articles/python-7day-bootcamp-day03)**。

- 上一篇：[Day1](/articles/python-7day-bootcamp-day01)  
- 返回总览：[总览](/articles/python-7day-bootcamp-overview)
