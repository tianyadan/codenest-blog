---
title: Python 7 天训练营 Day3｜四大容器 list / tuple / dict / set（Java 对照版）
summary: 用 Java 对照学会列表、元组、字典、集合的增删查改与推导式；含词频统计与名单去重练习题。
author: CodeNest
category: syntax
tags: [语法学习, Python专项, Python, 7天训练营, Day3, Java对比]
createdAt: 2026-07-30
updatedAt: 2026-07-30
readingMinutes: 42
topOrder: 4
slug: python-7day-bootcamp-day03
---

# Python 7 天训练营 Day3｜四大容器 list / tuple / dict / set（Java 对照版）

> 系列总览：[Python 7 天训练营总览](/articles/python-7day-bootcamp-overview)  
> 上一篇：[Day2｜流程控制与字符串](/articles/python-7day-bootcamp-day02)  
> 今天目标：熟练使用 **list / tuple / dict / set**，能做增删查改，并写出简单推导式。

---

## 0. 今日地图

| 容器 | 一句话 | 接近 Java |
|------|--------|-----------|
| `list` | 有序、可变、可重复 | `ArrayList` |
| `tuple` | 有序、**不可变**、可重复 | 有点像不可变数组 / Record 字段组 |
| `dict` | 键值对、键唯一 | `HashMap` |
| `set` | 无序（概念上）、元素唯一 | `HashSet` |

**今日关键词：可变 vs 不可变；字典用键取值；集合天生去重；推导式让循环更短。**

---

## 1. list｜最常用的有序可变序列

### 1.1 创建与读写

```python
# 创建列表（方括号）
nums = [10, 20, 30]
mixed = [1, "ok", True]  # 可以混类型，但平时尽量同质

print(nums[0])     # 10
print(nums[-1])    # 30（最后一个）
nums[1] = 99       # 可变：可以改元素
print(nums)        # [10, 99, 30]
```

### 1.2 增删改查（先背这批）

```python
langs = ["Java", "Python"]

# 增
langs.append("Go")           # 末尾追加
langs.insert(1, "Rust")      # 在下标 1 插入
langs.extend(["C", "C++"])   # 批量追加另一个可迭代对象

# 删
langs.remove("Rust")         # 按值删除（找不到会 ValueError）
last = langs.pop()           # 弹出最后一个（也可 pop(下标)）
# del langs[0]               # 按索引删除

# 查
print("Python" in langs)     # True
print(langs.index("Python")) # 找到下标
print(langs.count("Java"))   # 出现次数
print(len(langs))            # 长度
```

### 1.3 切片与排序

```python
nums = [3, 1, 4, 1, 5, 9]

print(nums[1:4])     # [1, 4, 1] 左闭右开
print(nums[::-1])    # 反转得到新列表

# sort 原地排序；sorted 返回新列表
sorted_nums = sorted(nums)   # 不改原列表
nums.sort(reverse=True)      # 原地倒序
print(sorted_nums, nums)
```

### 1.4 引用陷阱（Java 同学必看）

```python
a = [1, 2, 3]
b = a          # b 和 a 指向同一个列表对象
b.append(4)
print(a)       # [1, 2, 3, 4] —— a 也被改了！

# 需要副本时：
c = a[:]       # 浅拷贝
# 或 c = list(a) / a.copy()
c.append(5)
print(a)       # [1, 2, 3, 4]
print(c)       # [1, 2, 3, 4, 5]
```

**赋值不会复制列表，只是多个名字指向同一对象。**

对照：

| 操作 | Java (`ArrayList`) | Python (`list`) |
|------|--------------------|-----------------|
| 追加 | `add(x)` | `append(x)` |
| 长度 | `size()` | `len(list)` |
| 包含 | `contains` | `x in list` |
| 取下标 | `get(i)` | `list[i]` |

---

## 2. tuple｜不可变的有序序列

```python
point = (3, 4)
# point[0] = 10  # TypeError：元组不可变

# 只有一个元素的元组，必须加逗号
one = (42,)
not_tuple = (42)  # 这只是整数 42，不是元组！

# 拆包（超常用）
x, y = point
print(x, y)  # 3 4

# 列表可转元组，元组可转列表
t = tuple([1, 2, 3])
lst = list(t)
```

什么时候用 tuple？

- 函数返回多个值：`return name, score`
- 作为 **dict 的键**（list 不能当键，因为可变）
- 表示「一组不该被改的固定数据」

**tuple 不可变；想改就先转 list，改完再转回。**

---

## 3. dict｜键值映射（业务里最重要）

### 3.1 创建与访问

```python
# 创建字典（花括号 + 键:值）
user = {
    "name": "evan",
    "years_java": 3,
    "city": "Shanghai",
}

print(user["name"])          # evan
print(user.get("email"))     # None（键不存在时不报错）
print(user.get("email", "-"))  # 缺省值

# 写入 / 更新
user["email"] = "a@b.com"
user["city"] = "Beijing"

# 删除
del user["years_java"]
# email = user.pop("email")
```

**`user[key]` 键不存在会 `KeyError`；不确定时用 `get`。**

### 3.2 遍历

```python
scores = {"Alice": 90, "Bob": 85, "Carol": 92}

# 默认遍历的是键
for name in scores:
    print(name, scores[name])

# 更常见：同时拿键和值
for name, score in scores.items():
    print(f"{name} -> {score}")

print(scores.keys())
print(scores.values())
```

### 3.3 统计场景（后面练习会用）

```python
words = ["java", "python", "java", "go", "python", "java"]
counter = {}

for w in words:
    # 若键不存在则当 0，再 +1
    counter[w] = counter.get(w, 0) + 1

print(counter)  # {'java': 3, 'python': 2, 'go': 1}
```

对照：

| 操作 | Java (`HashMap`) | Python (`dict`) |
|------|------------------|-----------------|
| 放入 | `put(k,v)` | `d[k] = v` |
| 取出 | `get(k)` | `d[k]` / `d.get(k)` |
| 是否含键 | `containsKey` | `k in d` |
| 遍历 | `entrySet` | **`d.items()`** |

---

## 4. set｜去重利器

```python
tags = {"java", "python", "java", "go"}
print(tags)  # 自动去重，例如 {'java', 'python', 'go'}

tags.add("rust")
tags.discard("go")   # 不存在也不报错（remove 不存在会报错）

print("python" in tags)

# 集合运算
a = {1, 2, 3}
b = {3, 4, 5}
print(a | b)  # 并集 {1,2,3,4,5}
print(a & b)  # 交集 {3}
print(a - b)  # 差集 {1,2}
```

从列表快速去重（顺序不保证）：

```python
names = ["Ann", "Bob", "Ann", "Carol", "Bob"]
unique = list(set(names))
print(unique)
```

若要 **去重且保序**（3.7+ dict 保插入序，可用这个技巧）：

```python
names = ["Ann", "Bob", "Ann", "Carol", "Bob"]
unique_keep_order = list(dict.fromkeys(names))
print(unique_keep_order)  # ['Ann', 'Bob', 'Carol']
```

**set 元素必须可哈希；list 不能放进 set，tuple 可以。**

---

## 5. 推导式初识（让代码变短）

### 5.1 列表推导式

```python
# 传统写法
squares = []
for n in range(1, 6):
    squares.append(n * n)

# 推导式：同样结果，更紧凑
squares = [n * n for n in range(1, 6)]
print(squares)  # [1, 4, 9, 16, 25]

# 带过滤
evens = [n for n in range(10) if n % 2 == 0]
print(evens)  # [0, 2, 4, 6, 8]
```

### 5.2 字典 / 集合推导式

```python
names = ["alice", "bob", "carol"]
length_map = {name: len(name) for name in names}
print(length_map)

nums = [1, 2, 2, 3, 3, 3]
unique_squares = {n * n for n in nums}
print(unique_squares)
```

**能一眼看懂再用推导式；嵌套太深就写回普通 for。**

---

## 6. 可变性总表（今天最值得背）

| 类型 | 可变？ | 可当 dict 键？ | 典型用途 |
|------|--------|----------------|----------|
| `list` | 是 | 否 | 有序列表、栈/队列雏形 |
| `tuple` | 否 | 是 | 固定分组、多返回值 |
| `dict` | 是 | 键本身要不可变 | 配置、映射、计数 |
| `set` | 是 | 元素要不可变 | 去重、成员判断 |
| `str` | 否 | 是 | 文本 |

---

## 7. 综合示例：名单清洗 + 词频

保存为 `day03_containers.py` 后运行：

```python
"""
Day3 综合演示：list / dict / set 协作。
运行：python day03_containers.py
"""

# 原始报名名单（含重复与大小写不一致）
raw_names = ["Alice", "bob", "Alice", "Carol", "BOB", "dave", "Carol"]

# 1) 统一小写
normalized = [name.lower() for name in raw_names]
print("规范化：", normalized)

# 2) 去重且保序
unique_names = list(dict.fromkeys(normalized))
print("去重后：", unique_names)

# 3) 统计原始出现次数（按小写键）
counter = {}
for name in normalized:
    counter[name] = counter.get(name, 0) + 1
print("出现次数：", counter)

# 4) 找出重复报名的人
duplicates = {name for name, cnt in counter.items() if cnt > 1}
print("重复名单：", duplicates)

# 5) 用 set 做权限差集示例
allowed = {"alice", "carol", "erin"}
applicants = set(unique_names)
print("不在白名单：", applicants - allowed)
```

---

## 8. 今日练习题（必须独立写）

### 题目 1｜成绩列表统计（easy）

**要求：**

- 给定 `scores = [88, 92, 55, 73, 100, 61, 92]`
- 打印：人数、最高分、最低分、平均分（保留 1 位小数）
- 用列表推导式得到所有 **>= 90** 的分数并打印

**参考答案：**

```python
# 练习1：成绩列表统计
scores = [88, 92, 55, 73, 100, 61, 92]

count = len(scores)
highest = max(scores)
lowest = min(scores)
avg = sum(scores) / count

print(f"人数={count}")
print(f"最高分={highest}")
print(f"最低分={lowest}")
print(f"平均分={avg:.1f}")

# 列表推导式过滤优秀分
excellent = [s for s in scores if s >= 90]
print("优秀分：", excellent)
```

### 题目 2｜名单去重保序（easy）

**要求：**

- 给定 `names = ["Ann", "Bob", "ann", "Carol", "Bob", "ANN"]`
- 先全部转小写，再 **去重且保持首次出现顺序**
- 打印结果（应为 `['ann', 'bob', 'carol']`）

**参考答案：**

```python
# 练习2：去重保序
names = ["Ann", "Bob", "ann", "Carol", "Bob", "ANN"]

# 先规范化大小写
normalized = [n.lower() for n in names]
# dict.fromkeys 保序去重
unique = list(dict.fromkeys(normalized))
print(unique)
```

### 题目 3｜词频统计（medium）

**要求：**

- 给定文本：`"java python java go python java rust go"`
- `split` 成单词后，用 **dict** 统计每个单词出现次数
- 按次数从高到低打印：`单词:次数`
- 提示：`sorted(counter.items(), key=lambda x: x[1], reverse=True)`

**参考答案：**

```python
# 练习3：词频统计
text = "java python java go python java rust go"
words = text.split()

counter = {}
for w in words:
    # 累计每个单词出现次数
    counter[w] = counter.get(w, 0) + 1

# 按次数降序排序
ranked = sorted(counter.items(), key=lambda item: item[1], reverse=True)
for word, cnt in ranked:
    print(f"{word}:{cnt}")
```

### 题目 4｜两集合关系（optional）

**要求：**

- `liked = {"java", "python", "go", "rust"}`
- `learned = {"java", "spring", "python", "mysql"}`
- 打印：都会的（交集）、只喜欢还没学的（差集）、全部相关技术（并集）

**参考答案：**

```python
# 加餐：集合运算
liked = {"java", "python", "go", "rust"}
learned = {"java", "spring", "python", "mysql"}

print("都会的：", liked & learned)
print("只喜欢还没学：", liked - learned)
print("全部相关：", liked | learned)
```

---

## 9. 今日对照表

| 想做的事 | Java | Python |
|----------|------|--------|
| 动态数组 | `ArrayList` | **`list`** |
| 不可变分组 | 自己封装 / Record | **`tuple`** |
| 哈希表 | `HashMap` | **`dict`** |
| 去重集合 | `HashSet` | **`set`** |
| 长度 | `size()` | **`len(x)`** |
| 包含判断 | `contains` | **`x in container`** |
| 安全取 map | `getOrDefault` | **`d.get(k, default)`** |
| 遍历 map | `entrySet` | **`for k,v in d.items()`** |

---

## 10. 打卡清单

- [ ] 能口述 list / tuple / dict / set 各自特点
- [ ] 能解释 **`b = a` 为什么会互相影响**
- [ ] 会用 `get`、`items`、`dict.fromkeys` 去重保序
- [ ] 能写简单列表推导式
- [ ] 独立完成练习 1～3
- [ ] 跑通 `day03_containers.py`

---

## 11. 常见报错急救

| 报错 / 现象 | 常见原因 | 怎么处理 |
|-------------|----------|----------|
| `KeyError` | `d[k]` 键不存在 | 改用 `get`，或先 `if k in d` |
| `TypeError: unhashable type: 'list'` | list 当了 set 元素或 dict 键 | 改成 tuple / 字符串 |
| `ValueError: list.remove(x): x not in list` | `remove` 找不到元素 | 先 `in` 判断，或用别的删法 |
| 改了 `b` 却影响 `a` | 共享同一列表引用 | 用 `a.copy()` / `a[:]` |
| `sorted` 后原列表没变 | 这是正常的 | 需要原地改用 `list.sort()` |

---

## 12. 预习明天

明天进入 **函数 / 模块 / 异常**：`def`、参数、返回值、`import`、`try/except`。  
官方预习：[定义函数](https://docs.python.org/zh-cn/3/tutorial/controlflow.html#defining-functions)

- 上一篇：[Day2](/articles/python-7day-bootcamp-day02)  
- 返回总览：[总览](/articles/python-7day-bootcamp-overview)
