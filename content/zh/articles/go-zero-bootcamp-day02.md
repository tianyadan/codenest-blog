---
title: Go 零基础训练营 Day2｜变量、基础类型与流程控制（Java 对照版）
summary: 用 Java 对照掌握 Go 的变量、常量、基础类型、类型转换、运算符，以及 if、switch 和 for；含完整示例与练习题。
author: CodeNest
category: syntax
tags: [语法学习, Go专项, Golang, 零基础训练营, Day2, Java对比]
createdAt: 2026-08-20
updatedAt: 2026-08-20
readingMinutes: 48
slug: go-zero-bootcamp-day02
---

# Go 零基础训练营 Day2｜变量、基础类型与流程控制（Java 对照版）

> 上一篇：[Day1｜环境搭建、Go Modules 与第一个程序](/articles/go-zero-bootcamp-day01)  
> 今天目标：掌握 **变量 / 常量 / 基础类型 / 类型转换 / 分支 / 循环**，独立完成一个命令行成绩统计程序。  
> 下一篇预告：数组、切片、Map 与字符串。

---

## 目录

1. 今日地图
2. 变量与零值
3. 常量与 iota
4. 基础类型与类型转换
5. 运算符
6. if 分支
7. switch 分支
8. for 循环
9. 综合项目：成绩统计器
10. 练习、排错与打卡

---

## 0. 今日地图

| 小节 | 你要带走的能力 | Java 对照 |
|------|----------------|-----------|
| 变量 | `var`、短声明、批量声明、零值 | 显式类型 + 局部变量 |
| 常量 | `const`、常量组、`iota` | `static final`、enum |
| 类型 | 数字、字符串、布尔、别名 | primitive / String |
| 转换 | 显式类型转换、字符串解析 | 强转 / parse |
| 分支 | `if`、初始化语句、`switch` | if / switch |
| 循环 | 用一种 `for` 表达所有循环 | for / while / for-each |

**今日关键词：Go 不做隐式数字类型转换；声明后必须使用；零值让变量始终处于可用状态；Go 只有 `for` 一种循环关键字。**

---

## 1. 变量：声明、推断与零值

### 1.1 使用 var 声明

```go
package main

import "fmt"

func main() {
	var age int = 18
	var name string = "CodeNest"
	var active bool = true

	fmt.Println(name, age, active)
}
```

类型明显时可以省略：

```go
var language = "Go" // 编译器推断为 string
var year = 2026      // 推断为 int
```

批量声明适合包级配置或相关变量：

```go
var (
	host = "localhost"
	port = 8080
	debug = true
)
```

### 1.2 短变量声明 :=

函数内部最常见的写法：

```go
name := "Alice"
age := 20
```

`:=` 同时完成声明、类型推断和赋值，但只能在函数内部使用。

```go
// 包级作用域不能这样写：
// appName := "demo"

var appName = "demo" // 包级变量使用 var
```

同一作用域中，`:=` 左侧至少要出现一个新变量：

```go
name := "Alice"
name, age := "Bob", 20 // age 是新变量，因此合法

// name := "Carol" // 没有新变量，编译失败
name = "Carol"      // 已声明变量重新赋值用 =
```

### 1.3 零值

Go 变量声明后即拥有零值：

| 类型 | 零值 |
|------|------|
| 整数、浮点数 | `0` |
| `bool` | `false` |
| `string` | `""` |
| 指针、slice、map、channel、函数、interface | `nil` |

```go
var count int
var title string
var enabled bool

fmt.Printf("count=%d title=%q enabled=%t\n", count, title, enabled)
```

Java 局部变量可能要求先赋值；Go 的零值保证声明后的变量可读。不过“可读”不代表业务值一定有效，用户 ID 为 `0` 仍可能需要校验。

### 1.4 未使用变量会编译失败

```go
func main() {
	message := "hello" // 若后面没用，编译失败
}
```

临时忽略某个返回值可使用空白标识符 `_`：

```go
value, _ := someFunction()
fmt.Println(value)
```

`_` 会丢弃值。生产代码不要随意丢掉 `error`；这里仅用于理解语法。

---

## 2. 常量与 iota

常量在编译期确定，使用 `const`：

```go
const appName = "CodeNest"
const maxRetry int = 3

const (
	statusPending = "pending"
	statusDone    = "done"
)
```

常量不能使用 `:=`，也不能在运行时重新赋值。

### 2.1 无类型常量

```go
const rate = 1.5

var price32 float32 = 100 * rate
var price64 float64 = 100 * rate
```

无类型常量会在使用时适配目标类型，但值必须能被目标类型表示。这种灵活性只属于常量，不代表普通变量能隐式转换。

### 2.2 iota：生成递增常量

```go
type Role int

const (
	RoleUnknown Role = iota // 0
	RoleAdmin               // 1
	RoleMember              // 2
)
```

`iota` 在每个 `const` 组中从 0 开始逐行递增，常用于状态、权限位和枚举式常量。

Java 对照：Go 没有完全等价于 Java enum 的语言结构，通常使用“自定义类型 + 常量组 + 方法”表达。

---

## 3. 基础类型

### 3.1 整数

常用整数类型：

- `int` / `uint`：位数与平台相关，业务计数最常用 `int`。
- `int8`、`int16`、`int32`、`int64`：位数固定。
- `byte`：`uint8` 的别名，常表示原始字节。
- `rune`：`int32` 的别名，表示 Unicode 码点。

```go
var count int = 10
var userID int64 = 10001
var b byte = 'A'
var r rune = '中'

fmt.Println(count, userID, b, r)
fmt.Printf("字符：%c %c\n", b, r)
```

数据库 ID 常用 `int64` 或 `uint64`，要与驱动、表字段和业务边界保持一致。

### 3.2 浮点数

```go
var price float64 = 19.99
var ratio float32 = 0.75
```

业务计算优先使用 `float64`。金额不要直接依赖浮点数精确相等，可使用“最小货币单位整数”或 decimal 库。

### 3.3 布尔

```go
var enabled bool = true
```

Go 不允许把整数、字符串、指针自动当作布尔值：

```go
name := "Go"

// if name { } // 编译失败
if name != "" {
	fmt.Println("name is not empty")
}
```

### 3.4 字符串

双引号字符串支持转义，反引号原始字符串保留换行和反斜杠：

```go
message := "hello\nGo"
raw := `C:\users\demo
第二行保持原样`

fmt.Println(message)
fmt.Println(raw)
```

字符串本质上是只读字节序列，不可直接修改某个位置。中文字符可能占多个 UTF-8 字节，Day 3 会专门处理 `byte`、`rune` 和字符串遍历。

---

## 4. 显式类型转换与字符串解析

Go 不允许普通数字变量隐式转换：

```go
var age int = 18
var total int64

// total = age       // 编译失败
total = int64(age)   // 显式转换
```

### 4.1 数字之间转换

```go
price := 19.8
whole := int(price) // 19，直接截断小数，不是四舍五入
fmt.Println(whole)
```

缩小类型可能溢出：

```go
large := 300
small := int8(large)
fmt.Println(small) // 值发生回绕，不能把转换当校验
```

### 4.2 字符串和数字转换

使用标准库 `strconv`：

```go
package main

import (
	"fmt"
	"strconv"
)

func main() {
	ageText := "20"
	age, err := strconv.Atoi(ageText)
	if err != nil {
		fmt.Println("年龄格式错误：", err)
		return
	}

	price, err := strconv.ParseFloat("19.99", 64)
	if err != nil {
		fmt.Println("价格格式错误：", err)
		return
	}

	fmt.Println(age, price)
	fmt.Println(strconv.Itoa(age + 1))
}
```

- `strconv.Atoi`：十进制字符串转 `int`。
- `strconv.Itoa`：`int` 转十进制字符串。
- `strconv.ParseInt` / `ParseFloat` / `ParseBool`：更通用的解析函数。

类型转换处理的是兼容类型的表示；解析处理的是文本格式。`int("20")` 在 Go 中不合法。

---

## 5. 运算符

### 5.1 算术运算

```go
a, b := 7, 3

fmt.Println(a + b) // 10
fmt.Println(a - b) // 4
fmt.Println(a * b) // 21
fmt.Println(a / b) // 2：整数除法
fmt.Println(a % b) // 1
```

需要小数结果时先转换：

```go
fmt.Println(float64(a) / float64(b))
```

Go 支持 `a++` 和 `a--`，但它们是语句，不是表达式：

```go
a++
// b = a++ // 编译失败
```

### 5.2 比较和逻辑

```go
age := 20
hasTicket := true

canEnter := age >= 18 && hasTicket
isFree := age < 6 || age >= 65
blocked := !canEnter

fmt.Println(canEnter, isFree, blocked)
```

逻辑运算仍是 `&&`、`||`、`!`。条件表达式必须得到 `bool`。

---

## 6. if：条件不加括号，花括号不能省

```go
score := 86

if score >= 90 {
	fmt.Println("优秀")
} else if score >= 80 {
	fmt.Println("良好")
} else if score >= 60 {
	fmt.Println("及格")
} else {
	fmt.Println("不及格")
}
```

与 Java 对比：

- 条件外不写 `()`。
- 即使只有一行，代码块也必须有 `{}`。
- `else` 必须与前一个 `}` 在同一行，这是自动分号规则决定的。
- Go 没有三元运算符，优先写清楚的 `if`。

### 6.1 if 初始化语句

Go 可以在条件前声明只在分支内使用的变量：

```go
if age, err := strconv.Atoi("20"); err != nil {
	fmt.Println("解析失败：", err)
} else {
	fmt.Println("明年年龄：", age+1)
}
```

`age` 和 `err` 的作用域只覆盖整个 `if / else`，不会泄漏到后续代码。数据库查询和错误处理里会大量看到这种写法。

---

## 7. switch：默认不贯穿

```go
day := 2

switch day {
case 1:
	fmt.Println("Monday")
case 2:
	fmt.Println("Tuesday")
case 6, 7:
	fmt.Println("Weekend")
default:
	fmt.Println("Other")
}
```

Go 的 `case` 默认执行完就退出，不需要写 `break`。确实需要继续执行下一分支时可以使用 `fallthrough`，但业务代码很少需要它。

### 7.1 无表达式 switch

```go
score := 86

switch {
case score >= 90:
	fmt.Println("优秀")
case score >= 80:
	fmt.Println("良好")
case score >= 60:
	fmt.Println("及格")
default:
	fmt.Println("不及格")
}
```

这种写法相当于更整齐的 `if / else if` 链。

---

## 8. for：Go 唯一的循环

### 8.1 经典计数循环

```go
for i := 0; i < 5; i++ {
	fmt.Println(i)
}
```

### 8.2 当作 while 使用

```go
total := 0
n := 1

for total <= 100 {
	total += n
	n++
}

fmt.Println(total, n-1)
```

Go 没有 `while` 关键字；省略初始化和递增部分即可。

### 8.3 无限循环

```go
for {
	fmt.Println("只执行一次")
	break
}
```

### 8.4 range 遍历

```go
languages := []string{"Go", "Java", "Python"}

for index, language := range languages {
	fmt.Printf("%d: %s\n", index, language)
}
```

只需要值时，用 `_` 忽略下标：

```go
for _, language := range languages {
	fmt.Println(language)
}
```

只接收一个变量时得到的是下标，不是值：

```go
for index := range languages {
	fmt.Println(index)
}
```

### 8.5 break 与 continue

```go
for i := 1; i <= 10; i++ {
	if i%2 == 0 {
		continue
	}
	if i > 7 {
		break
	}
	fmt.Println(i) // 1 3 5 7
}
```

嵌套循环可使用标签跳出外层，但不要过度使用：

```go
outer:
for i := 0; i < 3; i++ {
	for j := 0; j < 3; j++ {
		if i == 1 && j == 1 {
			break outer
		}
		fmt.Println(i, j)
	}
}
```

---

## 9. 综合项目：命令行成绩统计器

目标：读取逗号分隔的成绩，校验输入，计算平均分，并给出等级。

```go
package main

import (
	"bufio"
	"fmt"
	"os"
	"strconv"
	"strings"
)

func main() {
	reader := bufio.NewReader(os.Stdin)
	fmt.Print("请输入成绩，用逗号分隔（例如 86,90,75）：")

	line, err := reader.ReadString('\n')
	if err != nil {
		fmt.Println("读取失败：", err)
		return
	}

	parts := strings.Split(strings.TrimSpace(line), ",")
	if len(parts) == 0 || strings.TrimSpace(line) == "" {
		fmt.Println("至少输入一个成绩")
		return
	}

	total := 0
	validCount := 0

	for index, part := range parts {
		score, err := strconv.Atoi(strings.TrimSpace(part))
		if err != nil {
			fmt.Printf("第 %d 项不是整数：%q\n", index+1, part)
			continue
		}
		if score < 0 || score > 100 {
			fmt.Printf("第 %d 项超出 0~100：%d\n", index+1, score)
			continue
		}

		total += score
		validCount++
	}

	if validCount == 0 {
		fmt.Println("没有有效成绩")
		return
	}

	average := float64(total) / float64(validCount)
	level := "不及格"

	switch {
	case average >= 90:
		level = "优秀"
	case average >= 80:
		level = "良好"
	case average >= 60:
		level = "及格"
	}

	fmt.Printf("有效成绩：%d 个\n", validCount)
	fmt.Printf("平均分：%.2f，等级：%s\n", average, level)
}
```

这个项目串起了今天的核心知识：短变量声明、显式转换、`if` 初始化语句、`for range`、`continue`、无表达式 `switch` 和格式化输出。

---

## 10. 今日练习题

### 题目 1｜BMI 计算器（easy）

给定身高（米）和体重（千克），计算 `BMI = 体重 / 身高²`，并使用 `switch` 输出区间提示。记得校验身高必须大于 0。

### 题目 2｜FizzBuzz（easy）

遍历 1 到 100：3 的倍数输出 `Fizz`，5 的倍数输出 `Buzz`，同时满足时输出 `FizzBuzz`，否则输出数字。

### 题目 3｜素数判断（medium）

判断一个大于 1 的整数是否为素数。循环只需检查到 `i*i <= n`，找到因子后立即 `break`。

### 题目 4｜猜数字（optional）

使用 `math/rand` 生成 1～100 的数字，循环读取用户猜测并提示偏大或偏小，猜中后统计次数。

---

## 11. 今日对照表

| 概念 | Go | Java |
|------|----|------|
| 类型推断 | `name := "Go"` | `var name = "Java"` |
| 零值 | 所有声明变量都有零值 | 字段有默认值，局部变量需初始化 |
| 常量 | `const` | `static final` |
| 显式转换 | `int64(age)` | `(long) age` |
| 字符串解析 | `strconv.Atoi` | `Integer.parseInt` |
| 条件 | `if condition {}` | `if (condition) {}` |
| 多分支 | `switch` 默认不贯穿 | switch 版本相关 |
| 循环 | 只有 `for` | for / while / do-while |

---

## 12. 常见报错急救

### `no new variables on left side of :=`

左侧变量都已在当前作用域声明。重新赋值应使用 `=`，或确保 `:=` 至少引入一个新变量。

### `declared and not used`

局部变量声明后没有被使用。删除它或完成真实逻辑，不要保留占位变量。

### `mismatched types int and int64`

Go 不做隐式数字转换。确认业务目标类型后显式写 `int64(value)` 或 `int(value)`，并留意溢出。

### `cannot convert "20" to type int`

字符串解析不是普通类型转换。使用 `strconv.Atoi` 或 `strconv.ParseInt` 并处理返回的错误。

### 平均分结果没有小数

两个整数相除会先执行整数除法。除法前将两侧转成 `float64`。

### `unexpected else`

Go 会在换行处自动插入分号，`else` 必须紧跟前一个右花括号：`} else {`。

---

## 13. 打卡清单

- [ ] 能区分 `var`、`:=` 和 `=`
- [ ] 知道常见类型的零值
- [ ] 能解释为什么 `int` 不能直接赋给 `int64`
- [ ] 会用 `strconv` 解析字符串
- [ ] 会写 `if` 初始化语句
- [ ] 知道 Go 的 `switch` 默认不需要 `break`
- [ ] 会写计数循环、条件循环、无限循环和 `range`
- [ ] 完成成绩统计器并处理非法输入
- [ ] 独立完成至少 2 道练习

下一篇将学习真正承载业务数据的结构：数组、切片、Map，以及 UTF-8 字符串与 `rune`。

