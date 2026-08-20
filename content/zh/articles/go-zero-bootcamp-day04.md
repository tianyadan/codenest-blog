---
title: Go 零基础训练营 Day4｜函数、指针、defer 与错误处理
summary: 详细掌握函数、多返回值、可变参数、闭包、指针、defer、错误包装和 panic/recover，并完成可靠的配置解析案例。
author: CodeNest
category: syntax
tags: [语法学习, Go专项, Golang, 零基础训练营, Day4, 函数, 指针, 错误处理]
createdAt: 2026-08-20
updatedAt: 2026-08-20
readingMinutes: 62
slug: go-zero-bootcamp-day04
---

# Go 零基础训练营 Day4｜函数、指针、defer 与错误处理

> 上一篇：[Day3｜数组、切片、Map 与 UTF-8 字符串](/articles/go-zero-bootcamp-day03)
> 今天目标：把数据处理逻辑拆成清晰函数，理解指针修改语义，并建立“返回、包装、判断错误”的完整习惯。
> 下一篇：[Day5｜结构体、方法、接口与泛型](/articles/go-zero-bootcamp-day05)

---

## 目录

1. 今日地图
2. 函数声明与多返回值
3. 参数、可变参数与值传递
4. 函数值、匿名函数与闭包
5. 指针：共享修改而非指针运算
6. defer：可靠的收尾机制
7. error：创建、包装、判断和自定义
8. panic 与 recover 的边界
9. 综合案例：配置解析管道
10. 练习、排错与打卡

---

## 0. 今日地图

| 主题 | 你要带走的能力 | Java 对照 |
|------|----------------|-----------|
| 函数 | 参数、返回值、命名返回值 | method / static method |
| 多返回值 | 同时返回结果和错误 | 返回 DTO / 抛异常 |
| 函数值 | 回调、排序条件、闭包 | lambda / functional interface |
| 指针 | 共享修改、避免大值复制 | 对象引用，但语义不同 |
| defer | 关闭文件、解锁、统计耗时 | try-finally / try-with-resources |
| error | 包装上下文、检查错误链 | checked result / exception cause |

**今日关键词：Go 参数永远按值传递；指针也是一个被复制的值；`defer` 在当前函数返回前逆序执行；错误应携带上下文但保留原始错误链。**

---

## 1. 函数声明与返回值

### 1.1 基本函数

```go
func add(a int, b int) int {
	return a + b
}
```

相邻参数类型相同时可以合并：

```go
func add(a, b int) int {
	return a + b
}
```

Go 没有函数重载。下面两个函数不能仅靠参数类型共存：

```go
// func parse(value string) int
// func parse(value int) string // 同包同名，编译失败
```

使用明确名字、不同方法，或者在确实有共同算法时使用泛型。

### 1.2 多返回值

```go
func divide(a, b float64) (float64, error) {
	if b == 0 {
		return 0, errors.New("除数不能为 0")
	}
	return a / b, nil
}

result, err := divide(10, 2)
if err != nil {
	fmt.Println("计算失败：", err)
	return
}
fmt.Println(result)
```

“结果 + error”是 Go 最重要的函数契约之一。成功时 error 为 `nil`；失败时结果通常返回零值。

多个业务结果也可以直接返回：

```go
func minMax(values []int) (int, int, error) {
	if len(values) == 0 {
		return 0, 0, errors.New("values 不能为空")
	}

	min, max := values[0], values[0]
	for _, value := range values[1:] {
		if value < min {
			min = value
		}
		if value > max {
			max = value
		}
	}
	return min, max, nil
}
```

### 1.3 命名返回值

```go
func rectangle(width, height float64) (area float64, perimeter float64) {
	area = width * height
	perimeter = 2 * (width + height)
	return
}
```

命名返回值是当前函数作用域中的变量。适合给多个同类型返回值增加语义，也便于 `defer` 观察或修改最终结果。

不要为了省几个字滥用裸 `return`。函数很长时，显式 `return area, perimeter` 更容易阅读。

---

## 2. 参数、可变参数与值传递

### 2.1 所有参数都是值传递

```go
func increase(value int) {
	value++
}

number := 10
increase(number)
fmt.Println(number) // 10
```

函数收到 `number` 的副本，修改副本不会影响调用方。

切片看起来像引用传递，但实际复制的是切片描述符：

```go
func updateFirst(values []int) {
	values[0] = 99 // 通过复制的描述符访问同一底层数组
}

func appendLocal(values []int) {
	values = append(values, 100) // 只更新函数内的切片描述符
}
```

要让调用方看到新的长度，返回新切片：

```go
func appendValue(values []int, value int) []int {
	return append(values, value)
}
```

### 2.2 可变参数

```go
func sum(values ...int) int {
	total := 0
	for _, value := range values {
		total += value
	}
	return total
}

fmt.Println(sum())
fmt.Println(sum(1, 2, 3))

numbers := []int{4, 5, 6}
fmt.Println(sum(numbers...))
```

可变参数在函数内部是切片，并且只能位于参数列表最后。

### 2.3 参数设计建议

- 参数少且语义明确时直接传值。
- 多个可选配置不要堆一串布尔参数，可使用配置结构体或 functional options。
- 小结构体按值传递通常更清晰；需要修改或结构体很大时再传指针。
- 切片、Map 本身已经是小描述符，不要习惯性写 `*[]T` 或 `*map[K]V`。

---

## 3. 函数值、匿名函数与闭包

函数可以赋值、传参和返回：

```go
func calculate(a, b int, operation func(int, int) int) int {
	return operation(a, b)
}

multiply := func(a, b int) int {
	return a * b
}

fmt.Println(calculate(3, 4, multiply)) // 12
```

这与 Java lambda + functional interface 类似，但 Go 直接使用函数类型。

### 3.1 自定义函数类型

```go
type Predicate func(int) bool

func filter(values []int, predicate Predicate) []int {
	result := make([]int, 0, len(values))
	for _, value := range values {
		if predicate(value) {
			result = append(result, value)
		}
	}
	return result
}

even := filter([]int{1, 2, 3, 4}, func(value int) bool {
	return value%2 == 0
})
```

### 3.2 闭包捕获外部变量

```go
func counter() func() int {
	count := 0
	return func() int {
		count++
		return count
	}
}

next := counter()
fmt.Println(next()) // 1
fmt.Println(next()) // 2
```

闭包让 `count` 在外层函数返回后仍然存活。适合轻量状态、回调配置；共享并发状态需要同步，不能只依赖闭包。

### 3.3 循环中的闭包

现代 Go 版本的 `for range` 每轮迭代变量已按轮次创建，但维护旧代码时仍可能看到显式复制：

```go
for _, name := range names {
	name := name
	callbacks = append(callbacks, func() {
		fmt.Println(name)
	})
}
```

理解重点不是背版本差异，而是知道闭包捕获变量，而不是立即复制变量当前值。

---

## 4. 指针：共享修改而非指针运算

### 4.1 取地址与解引用

```go
number := 10
pointer := &number

fmt.Println(pointer)  // 地址
fmt.Println(*pointer) // 读取地址中的值

*pointer = 20
fmt.Println(number) // 20
```

- `&value` 取得地址。
- `*pointer` 读取或修改指向的值。
- Go 不支持 C 风格指针算术。

### 4.2 用指针修改调用方变量

```go
func increase(value *int) {
	if value == nil {
		return
	}
	*value++
}

number := 10
increase(&number)
fmt.Println(number) // 11
```

`*value++` 按 Go 语法解释为 `(*value)++`。

### 4.3 返回局部变量地址是安全的

```go
func newCounter() *int {
	value := 0
	return &value
}
```

Go 编译器会进行逃逸分析，必要时把变量放到堆上。不要手工管理内存生命周期。

### 4.4 nil 指针

```go
var pointer *int
fmt.Println(pointer == nil) // true

// fmt.Println(*pointer) // panic: nil pointer dereference
```

指针参数是否允许 nil 是 API 契约的一部分。允许就明确检查；不允许则让调用方在类型和构造流程上保证。

---

## 5. defer：可靠的收尾机制

`defer` 注册一个调用，在当前函数返回前执行：

```go
func work() {
	fmt.Println("start")
	defer fmt.Println("cleanup")
	fmt.Println("working")
}
```

输出：

```text
start
working
cleanup
```

### 5.1 后注册先执行

```go
defer fmt.Println("first")
defer fmt.Println("second")
defer fmt.Println("third")
```

输出顺序为 `third`、`second`、`first`，像栈一样后进先出。

### 5.2 参数在注册时求值

```go
value := 10
defer fmt.Println("deferred:", value)
value = 20
fmt.Println("now:", value)
```

输出 `now: 20` 和 `deferred: 10`。若 defer 使用闭包，闭包会在执行时读取变量：

```go
value := 10
defer func() {
	fmt.Println("closure:", value)
}()
value = 20 // 最终输出 20
```

### 5.3 典型用途

```go
file, err := os.Open("config.json")
if err != nil {
	return err
}
defer file.Close()
```

其他常见用途：互斥锁解锁、事务回滚保护、追踪耗时、恢复 panic。

不要在巨大循环里不断 `defer` 而迟迟不退出函数。把每轮逻辑提取成小函数，让资源在每轮结束时释放。

### 5.4 统计函数耗时

```go
func track(name string) func() {
	start := time.Now()
	return func() {
		fmt.Printf("%s took %s\n", name, time.Since(start))
	}
}

func process() {
	defer track("process")()
	time.Sleep(50 * time.Millisecond)
}
```

这里第一次 `()` 立即调用 `track`，第二次由 defer 在函数结束时调用返回的闭包。

---

## 6. error：创建、包装与判断

`error` 是标准接口：

```go
type error interface {
	Error() string
}
```

### 6.1 创建错误

```go
var ErrNotFound = errors.New("not found")

func findUser(id int64) (string, error) {
	if id <= 0 {
		return "", fmt.Errorf("invalid user id: %d", id)
	}
	if id == 404 {
		return "", ErrNotFound
	}
	return "Alice", nil
}
```

包级哨兵错误适合让调用方稳定判断某类结果。动态细节使用 `fmt.Errorf`。

### 6.2 使用 %w 包装错误

```go
func loadUser(id int64) (string, error) {
	user, err := findUser(id)
	if err != nil {
		return "", fmt.Errorf("load user %d: %w", id, err)
	}
	return user, nil
}
```

包装增加当前层上下文，又通过 `%w` 保留原始错误链。不要写 `%v` 后再期待 `errors.Is` 能识别底层错误。

```go
_, err := loadUser(404)
if errors.Is(err, ErrNotFound) {
	fmt.Println("用户不存在")
}
```

不要用错误文本相等判断：

```go
// if err.Error() == "not found" { ... } // 脆弱
```

### 6.3 自定义错误类型与 errors.As

```go
type ValidationError struct {
	Field   string
	Message string
}

func (e *ValidationError) Error() string {
	return e.Field + ": " + e.Message
}

func validateAge(age int) error {
	if age < 0 || age > 150 {
		return &ValidationError{Field: "age", Message: "must be between 0 and 150"}
	}
	return nil
}
```

提取错误类型：

```go
err := validateAge(200)
var validationErr *ValidationError
if errors.As(err, &validationErr) {
	fmt.Println(validationErr.Field, validationErr.Message)
}
```

`errors.Is` 判断错误身份；`errors.As` 提取错误类型和结构化字段。

### 6.4 处理一次，避免重复记录

底层通常负责包装上下文，边界层负责记录日志并转换为用户响应。每一层都记录同一错误会产生重复日志。

---

## 7. panic 与 recover 的边界

`panic` 会中断正常流程并沿调用栈向上传播，同时执行已注册的 defer。

适合 panic 的情况：

- 程序启动时不可恢复的内部配置错误。
- 违反开发者约定的“不可能状态”。
- 库初始化中的编程错误。

不适合 panic 的情况：

- 用户输入无效。
- 数据库暂时不可用。
- 文件不存在。
- HTTP 下游返回错误。

这些都应返回 `error`。

### 7.1 recover 必须在 defer 中调用

```go
func safeRun(task func()) (err error) {
	defer func() {
		if recovered := recover(); recovered != nil {
			err = fmt.Errorf("task panicked: %v", recovered)
		}
	}()

	task()
	return nil
}
```

```go
err := safeRun(func() {
	panic("unexpected state")
})
fmt.Println(err)
```

`recover` 不应成为忽略编程错误的万能胶。Web 框架通常在请求边界恢复 panic，记录堆栈并返回 500；业务函数仍应使用正常 error。

---

## 8. 案例一：安全解析分页参数

```go
type Page struct {
	Number int
	Size   int
}

func parsePage(numberText, sizeText string) (Page, error) {
	number, err := strconv.Atoi(numberText)
	if err != nil {
		return Page{}, fmt.Errorf("parse page number %q: %w", numberText, err)
	}

	size, err := strconv.Atoi(sizeText)
	if err != nil {
		return Page{}, fmt.Errorf("parse page size %q: %w", sizeText, err)
	}

	if number < 1 {
		return Page{}, &ValidationError{Field: "page", Message: "must be at least 1"}
	}
	if size < 1 || size > 100 {
		return Page{}, &ValidationError{Field: "size", Message: "must be between 1 and 100"}
	}

	return Page{Number: number, Size: size}, nil
}
```

该函数区分了格式错误和业务校验错误，并保留 `strconv` 原始错误链。

---

## 9. 案例二：带重试的函数执行器

```go
func retry(attempts int, operation func() error) error {
	if attempts < 1 {
		return errors.New("attempts must be at least 1")
	}

	var lastErr error
	for attempt := 1; attempt <= attempts; attempt++ {
		if err := operation(); err != nil {
			lastErr = err
			continue
		}
		return nil
	}

	return fmt.Errorf("operation failed after %d attempts: %w", attempts, lastErr)
}
```

使用闭包模拟前两次失败：

```go
count := 0
err := retry(3, func() error {
	count++
	if count < 3 {
		return fmt.Errorf("temporary failure %d", count)
	}
	return nil
})
fmt.Println(err) // <nil>
```

真实重试还应考虑 context、退避和可重试错误分类，Day 7 会引入 context 取消。

---

## 10. 综合项目：配置解析管道

把 `KEY=VALUE` 文本解析为配置，并提供结构化错误：

```go
package main

import (
	"errors"
	"fmt"
	"strconv"
	"strings"
)

type Config struct {
	Host  string
	Port  int
	Debug bool
}

func parseLines(text string) (map[string]string, error) {
	values := make(map[string]string)

	for lineNumber, rawLine := range strings.Split(text, "\n") {
		line := strings.TrimSpace(rawLine)
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}

		key, value, found := strings.Cut(line, "=")
		if !found {
			return nil, fmt.Errorf("line %d: missing =", lineNumber+1)
		}

		key = strings.TrimSpace(key)
		value = strings.TrimSpace(value)
		if key == "" {
			return nil, fmt.Errorf("line %d: empty key", lineNumber+1)
		}
		values[key] = value
	}

	return values, nil
}

func required(values map[string]string, key string) (string, error) {
	value, exists := values[key]
	if !exists || value == "" {
		return "", fmt.Errorf("required key %s is missing", key)
	}
	return value, nil
}

func buildConfig(values map[string]string) (Config, error) {
	host, err := required(values, "HOST")
	if err != nil {
		return Config{}, err
	}

	portText, err := required(values, "PORT")
	if err != nil {
		return Config{}, err
	}
	port, err := strconv.Atoi(portText)
	if err != nil {
		return Config{}, fmt.Errorf("parse PORT: %w", err)
	}
	if port < 1 || port > 65535 {
		return Config{}, fmt.Errorf("PORT out of range: %d", port)
	}

	debug := false
	if debugText, exists := values["DEBUG"]; exists {
		debug, err = strconv.ParseBool(debugText)
		if err != nil {
			return Config{}, fmt.Errorf("parse DEBUG: %w", err)
		}
	}

	return Config{Host: host, Port: port, Debug: debug}, nil
}

func parseConfig(text string) (Config, error) {
	values, err := parseLines(text)
	if err != nil {
		return Config{}, fmt.Errorf("parse config lines: %w", err)
	}

	config, err := buildConfig(values)
	if err != nil {
		return Config{}, fmt.Errorf("build config: %w", err)
	}
	return config, nil
}

func main() {
	raw := `
# service config
HOST=localhost
PORT=8080
DEBUG=true
`

	config, err := parseConfig(raw)
	if err != nil {
		fmt.Println("配置错误：", err)
		return
	}

	fmt.Printf("%+v\n", config)
	_ = errors.Is // 下一步可为固定错误增加 errors.Is 判断
}
```

这个项目演示了小函数拆分、零值、Map、字符串、多个返回值、错误包装和单一边界处理。

---

## 11. 今日练习题

### 题目 1｜安全平均值（easy）

实现 `average(values []float64) (float64, error)`，空切片返回错误。调用方必须处理 error。

### 题目 2｜可配置过滤器（medium）

实现 `filterStrings(values []string, predicate func(string) bool) []string`，分别传入“非空”“长度大于 3”“包含 Go”的匿名函数。

### 题目 3｜余额转账（medium）

实现 `transfer(from, to *int64, amount int64) error`，校验 nil、金额正数和余额充足。确保错误时两个余额都不改变。

### 题目 4｜错误链（optional）

定义 `ErrInsufficientBalance`，在 service 层使用 `%w` 包装，在入口层用 `errors.Is` 转换为用户提示。

---

## 12. 今日对照表

| 概念 | Go | Java |
|------|----|------|
| 函数 | 可独立于类型存在 | 多在 class 中 |
| 多返回值 | `(value, error)` | DTO / exception |
| 回调 | 函数类型 | functional interface |
| 指针 | `*T`、显式解引用 | 对象引用无显式解引用 |
| 收尾 | `defer` | finally / try-with-resources |
| 业务失败 | 返回 `error` | throw exception |
| 错误链 | `%w` + Is / As | cause + instanceof |

---

## 13. 常见报错急救

### `not enough arguments in call`

Go 不支持默认参数和重载。传齐参数，或改用配置结构体 / options。

### 修改参数后调用方没变化

参数按值复制。需要共享修改时传指针，或返回修改后的值。

### `invalid memory address or nil pointer dereference`

解引用了 nil 指针。明确 API 是否允许 nil，并在边界检查。

### defer 没有在循环每轮执行

defer 在当前函数返回时执行，不是在代码块结束时执行。把循环体提取成函数。

### `errors.Is` 判断不到底层错误

包装时用了 `%v` 或重新创建了错误。使用 `%w` 保留错误链。

### recover 没有效果

`recover` 只有在 defer 调用的函数中才能截获当前 goroutine 的 panic，也无法恢复另一个 goroutine。

---

## 14. 打卡清单

- [ ] 会设计返回 `(result, error)` 的函数
- [ ] 理解 Go 所有参数都是值传递
- [ ] 会使用可变参数、函数值和闭包
- [ ] 能用指针修改调用方数据并处理 nil
- [ ] 能解释 defer 的逆序执行和参数求值时机
- [ ] 会用 `%w`、`errors.Is`、`errors.As`
- [ ] 能区分 error 与 panic 的使用边界
- [ ] 完成至少 3 个案例或练习

下一篇将把数据和行为组织到结构体与方法中，并通过接口和泛型建立可替换、可复用的代码边界。
