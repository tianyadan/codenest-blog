---
title: Go 零基础训练营 Day3｜数组、切片、Map 与 UTF-8 字符串
summary: 详细掌握数组、切片、Map、byte、rune 和字符串处理，理解 append 扩容与共享底层数组，并完成词频和库存统计案例。
author: CodeNest
category: syntax
tags: [语法学习, Go专项, Golang, 零基础训练营, Day3, Slice, Map, Unicode]
createdAt: 2026-08-20
updatedAt: 2026-08-20
readingMinutes: 58
slug: go-zero-bootcamp-day03
---

# Go 零基础训练营 Day3｜数组、切片、Map 与 UTF-8 字符串

> 上一篇：[Day2｜变量、基础类型与流程控制](/articles/go-zero-bootcamp-day02)
> 今天目标：掌握 Go 最常用的数据容器，能正确处理中文字符串，并看懂切片共享数据带来的副作用。
> 下一篇：[Day4｜函数、指针、defer 与错误处理](/articles/go-zero-bootcamp-day04)

---

## 目录

1. 今日地图
2. 数组：长度属于类型
3. 切片：业务代码的主力容器
4. append、容量与底层数组
5. 切片复制、删除和排序
6. Map：键值数据与安全读取
7. 字符串、byte、rune 与 UTF-8
8. 综合案例：文本词频与库存汇总
9. 练习、排错与打卡

---

## 0. 今日地图

| 主题 | 你要带走的能力 | Java 对照 |
|------|----------------|-----------|
| 数组 | 声明固定长度数据、理解值复制 | 固定长度 array |
| 切片 | 增删、截取、复制、预分配 | `ArrayList` + 数组视图 |
| Map | CRUD、存在性判断、遍历 | `HashMap` |
| 字符串 | 区分字节长度与字符数量 | UTF-8 bytes / code points |
| 综合案例 | 去重、词频、分组汇总 | 集合与 Stream 常见任务 |

**今日关键词：数组长度属于类型；切片是描述底层数组的一段视图；Map 读取缺失键会得到零值；字符串索引得到 byte，`range` 得到 rune。**

---

## 1. 数组：长度属于类型

### 1.1 声明与初始化

```go
var scores [3]int
fmt.Println(scores) // [0 0 0]

scores[0] = 90
scores[1] = 85
scores[2] = 96

names := [3]string{"Alice", "Bob", "Carol"}
days := [...]string{"Mon", "Tue", "Wed"} // 编译器计算长度

fmt.Println(names, len(days))
```

`[3]int` 与 `[4]int` 是不同类型。数组长度必须在编译期确定，不能使用运行时变量：

```go
size := 3
// var values [size]int // 编译失败：长度不是常量
```

### 1.2 数组是值类型

赋值和函数传参会复制整个数组：

```go
original := [3]int{1, 2, 3}
copied := original
copied[0] = 99

fmt.Println(original) // [1 2 3]
fmt.Println(copied)   // [99 2 3]
```

这与 Java 数组变量保存引用不同。大数组按值传递会产生复制，实际业务更常使用切片。

### 1.3 遍历数组

```go
scores := [4]int{88, 92, 76, 95}
total := 0

for index, score := range scores {
	fmt.Printf("第 %d 个成绩：%d\n", index, score)
	total += score
}

average := float64(total) / float64(len(scores))
fmt.Printf("平均分：%.2f\n", average)
```

适合数组的场景通常是长度本身有语义，例如 RGB 三通道、IPv4 四段、固定大小哈希值。普通列表优先使用切片。

---

## 2. 切片：业务代码的主力容器

切片类型写作 `[]T`，没有固定长度：

```go
languages := []string{"Go", "Java", "Python"}
fmt.Println(len(languages)) // 3
fmt.Println(cap(languages)) // 当前容量
```

切片可理解为三个信息：

```text
指向底层数组的指针 + 当前长度 len + 可用容量 cap
```

它不是 Java `ArrayList` 的完全等价物，但使用体验相似；更重要的是，多个切片可能共享同一个底层数组。

### 2.1 make 创建切片

```go
values := make([]int, 3)     // len=3, cap=3，已有三个零值元素
buffer := make([]int, 0, 10) // len=0, cap=10，预留容量但没有元素

fmt.Println(values) // [0 0 0]
fmt.Println(buffer) // []
```

常见误区：

```go
items := make([]string, 3)
items = append(items, "Go")
fmt.Println(items) // ["" "" "" "Go"]
```

如果准备通过 `append` 添加元素，通常从长度 0 开始：

```go
items := make([]string, 0, 3)
items = append(items, "Go")
```

### 2.2 nil 切片与空切片

```go
var nilSlice []int
emptySlice := []int{}
madeSlice := make([]int, 0)

fmt.Println(len(nilSlice), nilSlice == nil)     // 0 true
fmt.Println(len(emptySlice), emptySlice == nil) // 0 false
fmt.Println(len(madeSlice), madeSlice == nil)   // 0 false
```

三者都能 `append`。区别常在 JSON：默认情况下 nil 切片可能编码为 `null`，空切片编码为 `[]`。API 如果约定返回数组，通常初始化为空切片更稳定。

### 2.3 截取：左闭右开

```go
numbers := []int{10, 20, 30, 40, 50}

fmt.Println(numbers[1:4]) // [20 30 40]
fmt.Println(numbers[:3])  // [10 20 30]
fmt.Println(numbers[2:])  // [30 40 50]
fmt.Println(numbers[:])   // 全部元素
```

规则与 Java `subList(from, to)` 类似：包含起点，不包含终点。

---

## 3. append、容量与底层数组

### 3.1 append 必须接住返回值

```go
numbers := []int{1, 2}
numbers = append(numbers, 3)
numbers = append(numbers, 4, 5)

more := []int{6, 7}
numbers = append(numbers, more...)
```

`append` 可能复用原数组，也可能分配新数组，因此总要接收返回的新切片。

### 3.2 观察长度与容量

```go
items := make([]int, 0, 2)

for i := 1; i <= 5; i++ {
	items = append(items, i)
	fmt.Printf("append %d: len=%d cap=%d values=%v\n",
		i, len(items), cap(items), items)
}
```

容量不足时运行时会扩容并复制数据。具体增长倍数属于实现细节，不要写依赖“容量一定翻倍”的业务逻辑。

### 3.3 共享底层数组案例

```go
base := []int{10, 20, 30, 40}
part := base[1:3]

part[0] = 999

fmt.Println(base) // [10 999 30 40]
fmt.Println(part) // [999 30]
```

`part` 不是独立副本，而是 `base` 的视图。

更隐蔽的情况发生在 `append`：

```go
base := make([]int, 3, 5)
base[0], base[1], base[2] = 1, 2, 3

view := base[:2]
view = append(view, 99) // 容量足够，写入共享数组

fmt.Println(base) // [1 2 99]
fmt.Println(view) // [1 2 99]
```

当函数不应该修改调用方数据时，先复制再处理。

---

## 4. 切片复制、删除和排序

### 4.1 独立复制

```go
source := []int{1, 2, 3}

target := make([]int, len(source))
copy(target, source)
target[0] = 99

fmt.Println(source) // [1 2 3]
fmt.Println(target) // [99 2 3]
```

Go 1.21+ 也可以使用：

```go
cloned := append([]int(nil), source...)
```

### 4.2 删除指定下标

不保持顺序：

```go
items := []string{"A", "B", "C", "D"}
i := 1
items[i] = items[len(items)-1]
items = items[:len(items)-1]
fmt.Println(items) // [A D C]
```

保持顺序：

```go
items := []string{"A", "B", "C", "D"}
i := 1
items = append(items[:i], items[i+1:]...)
fmt.Println(items) // [A C D]
```

删除包含指针的大对象时，可先把尾部清零，避免底层数组继续持有引用：

```go
items[len(items)-1] = ""
items = items[:len(items)-1]
```

### 4.3 排序

```go
import "sort"

scores := []int{88, 60, 95, 72}
sort.Ints(scores)
fmt.Println(scores) // [60 72 88 95]

names := []string{"Carol", "Alice", "Bob"}
sort.Strings(names)
```

按结构体字段排序：

```go
type User struct {
	Name string
	Age  int
}

users := []User{{"Alice", 30}, {"Bob", 20}, {"Carol", 25}}
sort.Slice(users, func(i, j int) bool {
	return users[i].Age < users[j].Age
})
```

`sort` 会原地修改切片。若要保留原顺序，先复制。

---

## 5. Map：键值数据与安全读取

### 5.1 创建与 CRUD

```go
ages := map[string]int{
	"Alice": 28,
	"Bob":   32,
}

ages["Carol"] = 25       // 新增
ages["Alice"] = 29       // 修改
fmt.Println(ages["Bob"]) // 查询
delete(ages, "Carol")    // 删除，不存在也不会报错
```

使用 `make`：

```go
scores := make(map[string]int, 100) // 可选容量提示
scores["Go"] = 95
```

### 5.2 nil Map 只能读，不能写

```go
var scores map[string]int
fmt.Println(scores["Go"]) // 0，读取安全

// scores["Go"] = 95 // panic: assignment to entry in nil map
scores = make(map[string]int)
scores["Go"] = 95
```

### 5.3 comma ok：区分缺失与零值

```go
stock := map[string]int{
	"keyboard": 0,
}

count, exists := stock["keyboard"]
fmt.Println(count, exists) // 0 true

count, exists = stock["mouse"]
fmt.Println(count, exists) // 0 false
```

只看 `stock[key]` 无法区分“键不存在”和“存在但值为 0”。权限、缓存、数据库映射等场景必须使用 `comma ok`。

### 5.4 遍历顺序不保证

```go
for key, value := range ages {
	fmt.Println(key, value)
}
```

Map 遍历顺序不稳定。需要稳定输出时，先收集并排序键：

```go
keys := make([]string, 0, len(ages))
for key := range ages {
	keys = append(keys, key)
}
sort.Strings(keys)

for _, key := range keys {
	fmt.Println(key, ages[key])
}
```

### 5.5 哪些类型能当 key

可比较类型才能做 Map key，例如布尔、数字、字符串、指针、数组、只包含可比较字段的结构体。切片、Map、函数不能作为 key。

```go
type Coordinate struct {
	X int
	Y int
}

visited := map[Coordinate]bool{
	{X: 1, Y: 2}: true,
}
```

Map 不是并发安全容器。Day 7 会演示使用互斥锁保护共享 Map。

---

## 6. 字符串、byte、rune 与 UTF-8

### 6.1 len 返回字节数

```go
text := "Go语言"

fmt.Println(len(text))         // 8：G、o 各 1 字节，汉字各 3 字节
fmt.Println(len([]rune(text))) // 4：Unicode 码点数量
```

字符串索引得到 byte：

```go
fmt.Printf("%T %d %c\n", text[0], text[0], text[0])
```

不要用 `text[i]` 按中文字符截取，它可能切断 UTF-8 编码。

### 6.2 range 按 rune 遍历

```go
for byteIndex, r := range "Go语言" {
	fmt.Printf("字节下标=%d rune=%c Unicode=%U\n", byteIndex, r, r)
}
```

注意 `range` 返回的下标仍是字节下标，不是第几个字符。

需要字符序号时自行计数：

```go
characterIndex := 0
for _, r := range "Go语言" {
	fmt.Println(characterIndex, string(r))
	characterIndex++
}
```

### 6.3 修改字符串

字符串不可变。修改 ASCII 字节可转 `[]byte`，修改 Unicode 字符应转 `[]rune`：

```go
text := "Go语言"
runes := []rune(text)
runes[2] = '语'
runes[3] = '法'

result := string(runes)
fmt.Println(result) // Go语法
```

### 6.4 strings 常用函数

```go
import "strings"

raw := "  Go,Java,Python  "
clean := strings.TrimSpace(raw)
parts := strings.Split(clean, ",")

fmt.Println(parts)
fmt.Println(strings.Join(parts, " | "))
fmt.Println(strings.Contains(clean, "Java"))
fmt.Println(strings.HasPrefix(clean, "Go"))
fmt.Println(strings.ToLower(clean))
fmt.Println(strings.ReplaceAll(clean, "Java", "Rust"))
```

频繁拼接字符串时使用 `strings.Builder`，避免不断创建中间字符串：

```go
var builder strings.Builder
for i := 1; i <= 3; i++ {
	if i > 1 {
		builder.WriteString(",")
	}
	builder.WriteString(strconv.Itoa(i))
}
fmt.Println(builder.String()) // 1,2,3
```

---

## 7. 案例一：去重并保持顺序

```go
func uniqueNormalized(values []string) []string {
	seen := make(map[string]struct{}, len(values))
	result := make([]string, 0, len(values))

	for _, value := range values {
		normalized := strings.ToLower(strings.TrimSpace(value))
		if normalized == "" {
			continue
		}
		if _, exists := seen[normalized]; exists {
			continue
		}

		seen[normalized] = struct{}{}
		result = append(result, normalized)
	}

	return result
}
```

为什么用 `map[string]struct{}`？空结构体不承载业务值，只表达“是否出现”，比 `map[string]bool` 更明确。

调用：

```go
values := []string{" Go ", "Java", "go", "", "Python", "JAVA"}
fmt.Println(uniqueNormalized(values)) // [go java python]
```

---

## 8. 案例二：Unicode 词频统计

```go
func runeFrequency(text string) map[rune]int {
	frequency := make(map[rune]int)

	for _, r := range strings.ToLower(text) {
		if unicode.IsSpace(r) || unicode.IsPunct(r) {
			continue
		}
		frequency[r]++
	}

	return frequency
}
```

完整输出需要稳定排序：

```go
text := "Go, Go! 语言"
frequency := runeFrequency(text)

characters := make([]rune, 0, len(frequency))
for r := range frequency {
	characters = append(characters, r)
}
sort.Slice(characters, func(i, j int) bool {
	return characters[i] < characters[j]
})

for _, r := range characters {
	fmt.Printf("%c: %d\n", r, frequency[r])
}
```

需要导入 `unicode`。该案例展示了 `range`、rune Map、计数、切片和排序的组合。

---

## 9. 综合项目：订单库存汇总

给定订单明细，汇总商品数量、过滤无效项，并按商品名稳定输出：

```go
package main

import (
	"fmt"
	"sort"
	"strings"
)

type OrderItem struct {
	Product  string
	Quantity int
}

func summarize(items []OrderItem) map[string]int {
	result := make(map[string]int)

	for _, item := range items {
		product := strings.ToLower(strings.TrimSpace(item.Product))
		if product == "" || item.Quantity <= 0 {
			continue
		}
		result[product] += item.Quantity
	}

	return result
}

func sortedKeys(values map[string]int) []string {
	keys := make([]string, 0, len(values))
	for key := range values {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	return keys
}

func main() {
	items := []OrderItem{
		{Product: "Keyboard", Quantity: 2},
		{Product: " keyboard ", Quantity: 1},
		{Product: "Mouse", Quantity: 3},
		{Product: "", Quantity: 10},
		{Product: "Monitor", Quantity: -1},
	}

	summary := summarize(items)
	for _, product := range sortedKeys(summary) {
		fmt.Printf("%-10s %d\n", product, summary[product])
	}
}
```

输出：

```text
keyboard   3
mouse      3
```

这里的 `OrderItem` 先当普通数据结构使用，Day 5 会系统学习结构体和方法。

---

## 10. 今日练习题

### 题目 1｜合并并去重（easy）

合并两个 `[]int`，去重并保持第一次出现的顺序。不要使用第三方库。

### 题目 2｜移动零元素（medium）

把切片中的所有 0 移动到末尾，同时保持非零元素顺序，例如 `[0,1,0,3,12]` 变成 `[1,3,12,0,0]`。尝试原地完成。

### 题目 3｜学生分组（medium）

将学生按城市分组为 `map[string][]string`，城市和姓名先去除空格，忽略空值，最终每组姓名按字母排序。

### 题目 4｜最长不重复字符（optional）

计算 Unicode 字符串中最长无重复子串的字符长度。提示：用 `map[rune]int` 记录 rune 最近出现的位置。

---

## 11. 今日对照表

| 概念 | Go | Java |
|------|----|------|
| 固定数组 | `[3]int`，长度属于类型 | `int[3]` 实例长度固定 |
| 动态序列 | `[]int` slice | `ArrayList<Integer>` |
| 长度 / 容量 | `len` / `cap` | `size` / 内部 capacity |
| 复制 | `copy` 或 `append` | `Arrays.copyOf` / 新集合 |
| 键值容器 | `map[K]V` | `Map<K,V>` |
| 存在性 | `value, ok := m[key]` | `containsKey` |
| Unicode 字符 | `rune` | code point / `int` |
| 字节 | `byte` | `byte`，但 Go 的 byte 无符号 |

---

## 12. 常见报错急救

### `index out of range`

访问下标超过 `0 <= i < len(slice)`。容量大不代表可以访问，只有长度范围内的元素可读写。

### `assignment to entry in nil map`

Map 尚未初始化。写入前使用 `make(map[K]V)` 或 Map 字面量。

### 修改子切片导致原切片变化

两个切片共享底层数组。需要隔离时创建新切片并 `copy`。

### Map 输出顺序每次不同

语言不保证遍历顺序。收集 key、排序后再输出。

### `len("中文")` 不是 2

`len(string)` 返回 UTF-8 字节数。字符数量使用 `utf8.RuneCountInString` 或 `len([]rune(text))`。

### append 后原变量没变化

忘记接收返回值。始终写成 `slice = append(slice, value)`。

---

## 13. 打卡清单

- [ ] 能解释数组为什么是值类型
- [ ] 能区分切片的长度和容量
- [ ] 能解释子切片为什么会修改原数据
- [ ] 会预分配、复制、删除和排序切片
- [ ] 会使用 `comma ok` 判断 Map 键是否存在
- [ ] 知道 Map 遍历顺序不稳定
- [ ] 能区分 byte、rune、字节下标和字符数量
- [ ] 完成至少 3 个案例或练习

下一篇将学习如何把这些数据处理逻辑拆成函数，并用指针、`defer` 和显式 `error` 建立可靠的控制流。
