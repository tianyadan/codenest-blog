---
title: Python 7 天训练营 Day1｜环境搭建与语法地基（Java 对照版）
summary: 从安装 Python 开始，用 Java 对照学会变量、类型、运算符与输入输出；含可运行示例与练习题。
author: CodeNest
category: syntax
tags: [语法学习, Python专项, Python, 7天训练营, Day1, Java对比]
createdAt: 2026-07-29
updatedAt: 2026-07-29
readingMinutes: 35
topOrder: 2
slug: python-7day-bootcamp-day01
---

# Python 7 天训练营 Day1｜环境搭建与语法地基（Java 对照版）

> 系列总览：[Python 7 天训练营总览](/articles/python-7day-bootcamp-overview)  
> 今天目标：装好环境，跑通第一个程序，掌握 **变量 / 类型 / 运算符 / 输入输出**。  
> 学习前提：你会 Java 基础即可；Python 语法按「对照翻译」来记。

---

## 0. 今日地图

| 小节 | 你要带走的能力 | Java 对照 |
|------|----------------|-----------|
| 环境 | 安装 Python、创建 venv、用 pip | JDK + Maven 仓库感 |
| Hello World | 会运行 `.py` 文件 | `main` 方法 |
| 缩进 | 看懂代码块边界 | `{}` |
| 变量与类型 | 会赋值、会 `type()` | 声明类型 vs 动态绑定 |
| 运算符 | 算术 / 比较 / 逻辑 | `+ - * /`、`&& \|\|` |
| 输入输出 | `print` / `input` | `System.out` / `Scanner` |
| 练习 | 独立写出 3 道可运行题 | —— |

**今日关键词（先记住）：缩进决定代码块、赋值即创建名字、类型属于对象不属于变量名。**

---

## 1. 环境搭建（一次性）

### 1.1 检查是否已安装

在终端执行：

```bash
python3 --version
# 期望类似：Python 3.10.x 或更高
```

Windows 若提示找不到命令，可试：

```bash
python --version
```

若没有 Python，去官网安装：[https://www.python.org/downloads/](https://www.python.org/downloads/)  
安装时勾选 **Add Python to PATH**（Windows）。

### 1.2 虚拟环境（强烈建议）

Java 项目有自己的依赖；Python 用 **venv** 隔离环境，避免污染系统。

```bash
# 进入你的练习目录
mkdir -p python-bootcamp/day01
cd python-bootcamp/day01

# 创建虚拟环境（目录名常用 .venv）
python3 -m venv .venv

# 激活（macOS / Linux）
source .venv/bin/activate

# 激活（Windows PowerShell）
# .venv\Scripts\Activate.ps1

# 确认 pip 可用
python -m pip install --upgrade pip
```

**记住：做项目先激活虚拟环境，再装包、再运行。**

### 1.3 第一个文件怎么跑

创建 `hello.py`：

```python
# 打印一行文字到终端（类似 System.out.println）
print("Hello, Python!")
```

运行：

```bash
python hello.py
```

看到输出 `Hello, Python!` 即成功。

---

## 2. Hello World：和 Java 差在哪

### Java

```java
public class Hello {
    public static void main(String[] args) {
        System.out.println("Hello, Java!");
    }
}
```

### Python

```python
# 不需要类，不需要 main，直接写语句即可
print("Hello, Python!")
```

对比要点：

- **Python 可以是脚本**：文件从上到下执行。
- Java 强制「类 + main」当入口。
- 后面工程化时，Python 常用：

```python
# 只有「直接运行本文件」时才执行下面代码
# 被 import 时不会执行（类似保护入口）
if __name__ == "__main__":
    print("这里才是真正的入口逻辑")
```

**今天先会直接跑脚本；`__name__` 在 Day4 再深挖。**

---

## 3. 缩进是语法，不是审美

Java 用大括号；**Python 用缩进表示代码块**。官方推荐 **4 个空格**，不要混用 Tab。

```python
score = 85

# if 后面冒号 : 表示「下面缩进的是代码块」
if score >= 60:
    # 这行属于 if 块（必须缩进）
    print("及格")
    print("继续加油")
else:
    # 这行属于 else 块
    print("不及格")

# 这行与 if 同级，不属于上面的分支
print("程序结束")
```

常见翻车：

```python
if True:
print("少缩进会直接 SyntaxError")  # 错误示范
```

**口诀：冒号开头，下一行缩进；同级代码对齐。**

---

## 4. 变量：名字绑定对象（不是「箱子装值」）

### Java（静态类型）

```java
int age = 18;
age = "十八"; // 编译错误：类型不匹配
```

### Python（动态强类型）

```python
# 赋值 = 把名字 age 绑定到整数对象 18
age = 18
print(age)        # 18
print(type(age))  # <class 'int'>

# 同一个名字可以改绑到别的类型（名字可变，对象类型固定）
age = "十八"
print(age)        # 十八
print(type(age))  # <class 'str'>

# 强类型：不会偷偷帮你把字符串当数字加
# print(1 + "2")  # TypeError，运行时才会爆
```

关键理解：

- **变量名是标签，不是固定类型的盒子。**
- **类型在对象上**；用 `type(x)` 查看。
- 动态 ≠ 随意：类型错误多数在运行时出现。

多重赋值（Java 没有这么爽的写法）：

```python
# 同时给多个名字赋值
a, b = 1, 2
print(a, b)  # 1 2

# 交换两个变量（经典写法，不用临时 tmp）
a, b = b, a
print(a, b)  # 2 1
```

命名建议（PEP 8）：

- 变量 / 函数：`user_name`（蛇形）
- 常量习惯：`MAX_SIZE`（全大写，只是约定）
- **不要用** `l`、`O`、`I` 这种易混单字母当正式变量名

---

## 5. 基本数据类型（今天必会 5 个）

| Python | 含义 | 接近 Java |
|--------|------|-----------|
| `int` | 整数（任意精度） | `int` / `long` |
| `float` | 浮点数 | `double` |
| `str` | 字符串 | `String` |
| `bool` | 布尔：`True` / `False` | `boolean`（注意大小写） |
| `None` | 空值 | `null` |

```python
# ----- 数字 -----
count = 10          # int
price = 19.9        # float
big = 10 ** 20      # 超大整数也没问题（Java BigInteger 才有的感觉）

# ----- 字符串：单双引号都行 -----
name = "CodeNest"
title = 'Python Day1'

# 三引号：多行字符串
doc = """
第一行
第二行
"""

# ----- 布尔：首字母必须大写 -----
ok = True
failed = False

# ----- 空值 -----
data = None
print(data is None)  # True；判断 None 推荐用 is，不用 ==
```

类型转换（显式）：

```python
# str -> int（类似 Integer.parseInt）
n = int("42")
print(n + 1)  # 43

# int -> str（拼接前常需要）
msg = "编号=" + str(1001)
print(msg)

# 任意对象转布尔：空串 / 0 / None / 空容器为 False
print(bool(""))    # False
print(bool("hi"))  # True
print(bool(0))     # False
print(bool(3))     # True
```

**字符串拼接优先 f-string（后面练习会用）：**

```python
user = "evan"
score = 95
# f"..." 里用 {表达式} 嵌入变量，可读性最好
print(f"{user} 的分数是 {score}")
```

---

## 6. 运算符速查（对照 Java）

### 6.1 算术

```python
print(17 / 3)   # 5.666...  真除法，结果是 float（Java 里 int/int 会截断）
print(17 // 3)  # 5         向下取整除法
print(17 % 3)   # 2         取余
print(2 ** 10)  # 1024      乘方（Java 常用 Math.pow）
```

**重点：`/` 永远返回浮点；要整数商用 `//`。**

### 6.2 比较

```python
print(3 == 3)   # True
print(3 != 4)   # True
print(3 < 4)    # True
# Python 支持链式比较（Java 没有）
print(1 < 2 < 3)  # True，等价于 1 < 2 and 2 < 3
```

### 6.3 逻辑（关键字，不是符号）

| Java | Python |
|------|--------|
| `&&` | **`and`** |
| `\|\|` | **`or`** |
| `!` | **`not`** |

```python
age = 20
has_id = True

# 两个条件都真才进入
if age >= 18 and has_id:
    print("可以办理")

# 取反
if not has_id:
    print("请先办证")
```

### 6.4 身份 vs 相等（先建立意识）

```python
a = [1, 2]
b = [1, 2]
c = a

print(a == b)  # True：值相等（类似 equals 语义，对内置类型）
print(a is b)  # False：不是同一个对象
print(a is c)  # True：同一个对象

# None 判断用 is
x = None
print(x is None)  # True
```

**今天记住：`==` 比内容，`is` 比是不是同一个对象；`None` 用 `is`。**

---

## 7. 输入与输出

### 7.1 print

```python
# 多个参数默认用空格隔开，末尾换行
print("姓名", "分数", 98)

# sep 改分隔符，end 改结尾
print("A", "B", sep="-", end="!\n")  # A-B!
```

### 7.2 input（读入永远是字符串）

```python
# input 返回 str，类似 Scanner.nextLine()
name = input("请输入姓名：")
print(f"你好，{name}")

# 若要做数学运算，必须先转换类型
raw = input("请输入年龄：")
age = int(raw)  # 用户若输入非数字会 ValueError（Day4 再学异常处理）
print(f"明年你 {age + 1} 岁")
```

**大坑：`input()` 得到的是 `str`，`"18" + 1` 会报错，先 `int()` / `float()`。**

---

## 8. 注释与可读性

```python
# 单行注释：从 # 到行尾

"""
多行字符串常常当多行注释用（解释器仍会创建字符串对象，
模块顶层的三引号字符串常作文档字符串 docstring）。
"""

def add(a, b):
    """函数文档字符串：说明参数与返回值。"""
    return a + b
```

---

## 9. 综合示例（先看懂，再自己改）

把下面保存为 `day01_demo.py`，直接运行：

```python
"""
Day1 综合演示：变量、类型、运算、输入输出。
运行：python day01_demo.py
"""

# 1) 基本信息（名字绑定）
course = "Python 7天训练营"
day = 1
passed = True

# 2) 输出课程信息
print(f"课程：{course} | 第 {day} 天 | 是否开课：{passed}")

# 3) 计算器小片段
x = 17
y = 3
print("真除法 /  =", x / y)
print("整除 // =", x // y)
print("取余 %  =", x % y)
print("乘方 ** =", y ** 2)

# 4) 读取用户输入并换算
# 说明：练习环境若不便交互，可把 input 改成写死字符串再测
raw_price = input("请输入商品原价（数字）：")
price = float(raw_price)
discount = 0.8  # 8 折
final_price = price * discount
print(f"折后价：{final_price:.2f}")  # :.2f 保留两位小数

# 5) 简单分支（预告 Day2）
if final_price >= 100:
    print("满 100，可以包邮")
else:
    print("还差一点就包邮啦")
```

---

## 10. 今日练习题（必须独立写）

规则：

1. 每题一个 `.py` 文件，能直接 `python xxx.py` 跑通。
2. **关键逻辑处写中文注释**。
3. 先自己写，再看参考答案。
4. 交互题若不方便输入，可用「写死变量」代替 `input`，但注释标明。

### 题目 1｜自我介绍卡（easy）

**要求：**

- 定义变量：`name`（str）、`years_java`（int）、`goal`（str）
- 用 **f-string** 打印三行自我介绍
- 打印出 `name` 的类型

**参考答案（先别看）：**

```python
# 练习1：自我介绍卡
name = "小明"           # 姓名
years_java = 3          # Java 年限
goal = "学会 Python 做爬虫和数据处理"

# 用 f-string 输出，避免 + 拼接
print(f"我是 {name}")
print(f"我写了 {years_java} 年 Java")
print(f"我的目标：{goal}")

# type() 查看对象类型
print("name 的类型是：", type(name))
```

### 题目 2｜收银找零（easy）

**要求：**

- 商品单价 `unit_price = 12.5`，购买数量 `qty = 3`
- 顾客付款 `paid = 50`
- 计算应付金额、找零
- 输出保留两位小数
- **禁止**在输出里手写算好的结果，必须用表达式计算

**参考答案：**

```python
# 练习2：收银找零
unit_price = 12.5  # 单价
qty = 3            # 数量
paid = 50.0        # 实付

# 应付 = 单价 * 数量
total = unit_price * qty
# 找零 = 实付 - 应付
change = paid - total

print(f"应付：{total:.2f}")
print(f"实付：{paid:.2f}")
print(f"找零：{change:.2f}")
```

### 题目 3｜温度换算小工具（medium）

**要求：**

- 从键盘读入摄氏温度（`input` → `float`）
- 公式：华氏 = 摄氏 * 9 / 5 + 32
- 打印：`xx.x°C = yy.y°F`（各保留 1 位小数）
- 若摄氏 **低于 0**，额外打印一行：`注意：低于冰点`
- 若摄氏 **高于等于 100**，额外打印：`注意：达到沸点`

**参考答案：**

```python
# 练习3：摄氏转华氏 + 简单分支提示
raw = input("请输入摄氏温度：")
celsius = float(raw)  # 输入是字符串，必须转 float

# 换算公式
fahrenheit = celsius * 9 / 5 + 32
print(f"{celsius:.1f}°C = {fahrenheit:.1f}°F")

# 边界提示（Day2 会系统学分支，这里先够用）
if celsius < 0:
    print("注意：低于冰点")
if celsius >= 100:
    print("注意：达到沸点")
```

### 题目 4｜加餐挑战（optional）

**要求：** 不使用临时变量，交换两个整数 `a`、`b` 并打印。  
提示：用 `a, b = b, a`。

```python
# 加餐：交换变量
a = 10
b = 20
# 右侧先算完，再同时赋给左侧
a, b = b, a
print(a, b)  # 20 10
```

---

## 11. 今日对照表（贴显示器旁边）

| 想做的事 | Java | Python |
|----------|------|--------|
| 打印 | `System.out.println(x)` | `print(x)` |
| 读一行 | `scanner.nextLine()` | `input()` → **str** |
| 代码块 | `{ }` | **缩进 + `:`** |
| 空值 | `null` | `None` |
| 布尔 | `true/false` | **`True/False`** |
| 逻辑与/或/非 | `&& \|\| !` | **`and or not`** |
| 整除 | `/`（整数时） | **`//`** |
| 乘方 | `Math.pow` | **`**`** |
| 看类型 | `getClass()` | `type(x)` |
| 格式化 | `String.format` | **f-string** |

---

## 12. 打卡清单（全部勾完再睡）

- [ ] `python3 --version` 成功
- [ ] 虚拟环境创建并激活成功
- [ ] 跑通 `hello.py`
- [ ] 能口述：**缩进为什么重要**
- [ ] 能口述：**`input` 返回什么类型**
- [ ] 独立完成练习 1～3
- [ ] 把今天的 Java↔Python 对照表抄一遍

---

## 13. 常见报错急救

| 报错 | 常见原因 | 怎么处理 |
|------|----------|----------|
| `SyntaxError: expected ':'` | `if` / `else` 忘了冒号 | 补 `:` |
| `IndentationError` | 缩进混乱或混用 Tab/空格 | 统一 4 空格 |
| `NameError` | 用了未赋值的名字 | 先赋值再使用 |
| `TypeError: ... str ... int` | 字符串和数字直接运算 | 先 `int()` / `str()` |
| `ValueError: invalid literal` | `int("abc")` 之类 | 检查输入内容 |

---

## 14. 预习明天

明天进入 **流程控制与字符串**：`if/elif/else`、`for`、`while`、切片、f-string 进阶。  
今晚可先扫一眼官方文档：[Python 速览](https://docs.python.org/zh-cn/3/tutorial/introduction.html)。

返回总览：[Python 7 天训练营总览](/articles/python-7day-bootcamp-overview)
