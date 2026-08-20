---
title: Go 零基础训练营 Day5｜结构体、方法、接口与泛型
summary: 详细学习结构体、构造函数、值与指针接收者、组合、接口、类型断言和泛型，并用可替换存储与通知器完成订单案例。
author: CodeNest
category: syntax
tags: [语法学习, Go专项, Golang, 零基础训练营, Day5, Struct, Interface, Generics]
createdAt: 2026-08-20
updatedAt: 2026-08-20
readingMinutes: 65
slug: go-zero-bootcamp-day05
---

# Go 零基础训练营 Day5｜结构体、方法、接口与泛型

> 上一篇：[Day4｜函数、指针、defer 与错误处理](/articles/go-zero-bootcamp-day04)
> 今天目标：用结构体和方法组织领域数据，通过小接口替换依赖，并理解泛型适合与不适合的场景。
> 下一篇：[Day6｜包设计、文件 I/O、JSON 与测试](/articles/go-zero-bootcamp-day06)

---

## 目录

1. 今日地图
2. 结构体定义、初始化与零值
3. 方法和值/指针接收者
4. 构造函数与不变量
5. 组合、嵌入与继承差异
6. 接口与隐式实现
7. 类型断言、类型 switch 与 nil 陷阱
8. 泛型与约束基础
9. 综合项目：订单服务
10. 练习、排错与打卡

---

## 0. 今日地图

| 主题 | 你要带走的能力 | Java 对照 |
|------|----------------|-----------|
| 结构体 | 定义业务数据与零值 | POJO / record |
| 方法 | 选择值或指针接收者 | instance method |
| 构造 | 用 `NewXxx` 建立不变量 | constructor / factory |
| 组合 | 嵌入字段、委托行为 | composition |
| 接口 | 由使用方定义最小能力 | interface，隐式实现 |
| 泛型 | 复用类型无关算法 | Java generics |

**今日关键词：结构体是数据组合，不是 class；方法只是带接收者的函数；接口由方法集合满足；优先组合与小接口；泛型解决算法重复，不替代接口多态。**

---

## 1. 结构体：把相关字段组织起来

### 1.1 定义与初始化

```go
type User struct {
	ID       int64
	Name     string
	Email    string
	Active   bool
	CreatedAt time.Time
}
```

推荐带字段名初始化：

```go
user := User{
	ID:     1001,
	Name:   "Alice",
	Email:  "alice@example.com",
	Active: true,
}
```

同包内部也能按位置初始化：

```go
// 不推荐：字段顺序变化会破坏代码，可读性也差
user := User{1001, "Alice", "alice@example.com", true, time.Time{}}
```

跨包使用未导出字段时，调用方只能通过导出字段、构造函数或方法访问。

### 1.2 零值结构体

```go
var user User
fmt.Printf("%+v\n", user)
```

每个字段使用自己的零值。良好类型应尽量让零值可用，例如 `bytes.Buffer`、`sync.Mutex` 不需要构造即可使用。

但不是所有业务对象的零值都有效。`User{}` 可能缺少 ID 和名称，应由构造函数或校验明确约束。

### 1.3 访问与修改

```go
user.Name = "Bob"
fmt.Println(user.Email)
```

结构体指针访问字段不需要手写解引用：

```go
pointer := &user
pointer.Name = "Carol" // 等价于 (*pointer).Name = "Carol"
```

### 1.4 匿名结构体

适合局部、一次性数据：

```go
response := struct {
	Code    int
	Message string
}{
	Code:    0,
	Message: "ok",
}
```

跨函数或有业务含义的数据应定义命名类型。

### 1.5 结构体比较

若所有字段都可比较，结构体可直接 `==`：

```go
type Point struct {
	X int
	Y int
}

fmt.Println(Point{1, 2} == Point{1, 2}) // true
```

包含 slice、map 或 function 字段的结构体不能直接比较。测试中可逐字段比较，或使用适合的比较工具。

---

## 2. 方法与接收者

方法是带接收者参数的函数：

```go
type Rectangle struct {
	Width  float64
	Height float64
}

func (r Rectangle) Area() float64 {
	return r.Width * r.Height
}

rectangle := Rectangle{Width: 3, Height: 4}
fmt.Println(rectangle.Area())
```

接收者名通常使用类型名的简短缩写，如 `u`、`r`、`s`，不要统一写 `this` 或 `self`。

### 2.1 值接收者

```go
func (r Rectangle) Scale(factor float64) {
	r.Width *= factor
	r.Height *= factor
}
```

这里修改的是副本，调用后原矩形不变。值接收者适合：

- 方法不修改对象。
- 类型较小，复制成本低。
- 类型希望表现为不可变值，如坐标、金额。

### 2.2 指针接收者

```go
func (r *Rectangle) Scale(factor float64) error {
	if r == nil {
		return errors.New("rectangle is nil")
	}
	if factor <= 0 {
		return errors.New("factor must be positive")
	}
	r.Width *= factor
	r.Height *= factor
	return nil
}
```

调用时 Go 会自动取地址：

```go
rectangle := Rectangle{Width: 3, Height: 4}
_ = rectangle.Scale(2) // 自动转换为 (&rectangle).Scale(2)
```

指针接收者适合：

- 方法需要修改字段。
- 类型较大，不希望频繁复制。
- 类型包含 `sync.Mutex` 等不可复制字段。
- 需要统一方法集合语义。

同一个类型的方法最好保持接收者风格一致，不要只为少复制几个字节随意混用。

### 2.3 方法值与方法表达式

```go
areaFn := rectangle.Area
fmt.Println(areaFn())

areaExpression := Rectangle.Area
fmt.Println(areaExpression(rectangle))
```

方法值绑定具体接收者；方法表达式把接收者变回第一个普通参数。

---

## 3. 构造函数与业务不变量

Go 没有构造函数关键字，约定使用 `NewType`：

```go
type Account struct {
	id      int64
	owner   string
	balance int64
}

func NewAccount(id int64, owner string) (*Account, error) {
	owner = strings.TrimSpace(owner)
	if id <= 0 {
		return nil, errors.New("id must be positive")
	}
	if owner == "" {
		return nil, errors.New("owner must not be empty")
	}

	return &Account{id: id, owner: owner}, nil
}
```

字段小写后，其他包不能绕过构造流程直接写入。通过方法维护余额不变量：

```go
func (a *Account) Deposit(amount int64) error {
	if amount <= 0 {
		return errors.New("amount must be positive")
	}
	a.balance += amount
	return nil
}

func (a Account) Balance() int64 {
	return a.balance
}
```

是否返回指针取决于语义：需要共享身份和修改的对象通常返回 `*Account`；小型不可变值可以返回值。

### 3.1 functional options

当可选配置增多时：

```go
type Client struct {
	timeout time.Duration
	retries int
}

type ClientOption func(*Client)

func WithTimeout(timeout time.Duration) ClientOption {
	return func(client *Client) {
		client.timeout = timeout
	}
}

func WithRetries(retries int) ClientOption {
	return func(client *Client) {
		client.retries = retries
	}
}

func NewClient(options ...ClientOption) *Client {
	client := &Client{timeout: 3 * time.Second, retries: 1}
	for _, option := range options {
		option(client)
	}
	return client
}
```

调用：

```go
client := NewClient(WithTimeout(5*time.Second), WithRetries(3))
```

简单对象不要过早引入 options；它适合选项多、默认值明确且需要向后兼容的构造 API。

---

## 4. 组合与嵌入

Go 没有 class 继承，推荐组合：

```go
type Address struct {
	City   string
	Street string
}

type Customer struct {
	ID      int64
	Name    string
	Address Address
}
```

显式字段访问：

```go
fmt.Println(customer.Address.City)
```

### 4.1 匿名嵌入字段

```go
type AuditFields struct {
	CreatedAt time.Time
	UpdatedAt time.Time
}

type Order struct {
	AuditFields
	ID     int64
	Amount int64
}

fmt.Println(order.CreatedAt) // 提升后的字段
```

嵌入提供字段和方法提升，但不是“Order 继承 AuditFields”。`Order` 仍是包含一个 `AuditFields` 字段的独立类型。

名称冲突时必须显式选择：

```go
fmt.Println(order.AuditFields.CreatedAt)
```

### 4.2 嵌入行为

```go
type Logger struct{}

func (Logger) Info(message string) {
	fmt.Println("INFO", message)
}

type Service struct {
	Logger
}

service.Info("started")
```

嵌入方便但可能隐藏依赖。核心业务依赖通常使用命名字段更清楚：`logger Logger`。

---

## 5. 接口：由方法集合定义能力

```go
type Writer interface {
	Write(data []byte) (int, error)
}
```

类型不需要写 `implements`。只要方法集合匹配，就自动满足接口。

```go
type ConsoleWriter struct{}

func (ConsoleWriter) Write(data []byte) (int, error) {
	return fmt.Print(string(data))
}

func printMessage(writer Writer, message string) error {
	_, err := writer.Write([]byte(message))
	return err
}
```

### 5.1 接口由使用方定义

不必为每个结构体提前创建 `UserServiceInterface`。在调用方只需要一个能力时定义最小接口：

```go
type UserFinder interface {
	FindByID(id int64) (User, error)
}
```

实现方可以拥有更多方法，调用方只依赖它真正使用的一个方法。这让测试替身简单、模块耦合更低。

### 5.2 方法集合与接收者

```go
type Counter struct {
	value int
}

func (c *Counter) Increment() {
	c.value++
}

type Incrementer interface {
	Increment()
}
```

只有 `*Counter` 满足 `Incrementer`，`Counter` 值不满足，因为方法使用指针接收者：

```go
var incrementer Incrementer = &Counter{} // 正确
// var incrementer Incrementer = Counter{} // 编译失败
```

可以用编译期断言明确意图：

```go
var _ Incrementer = (*Counter)(nil)
```

### 5.3 接口组合

```go
type Reader interface {
	Read(data []byte) (int, error)
}

type Closer interface {
	Close() error
}

type ReadCloser interface {
	Reader
	Closer
}
```

优先小接口，确实需要多个能力时再组合。

---

## 6. 类型断言与类型 switch

接口值可断言为具体类型：

```go
value, ok := input.(string)
if !ok {
	fmt.Println("input is not a string")
}
```

省略 `ok` 会在失败时 panic：

```go
// value := input.(string)
```

处理多种类型用 type switch：

```go
func describe(value any) string {
	switch typed := value.(type) {
	case nil:
		return "nil"
	case string:
		return fmt.Sprintf("string(%q)", typed)
	case int:
		return fmt.Sprintf("int(%d)", typed)
	case error:
		return "error: " + typed.Error()
	default:
		return fmt.Sprintf("unknown %T", typed)
	}
}
```

`any` 是 `interface{}` 的别名，表示可以承载任意类型，但不等于“不要设计类型”。业务 API 滥用 `any` 会把类型错误推迟到运行时。

---

## 7. interface nil 陷阱

接口值包含“动态类型 + 动态值”。只有二者都为空时接口才等于 nil。

```go
type AppError struct {
	Message string
}

func (e *AppError) Error() string {
	return e.Message
}

func maybeError() error {
	var appErr *AppError = nil
	return appErr
}

err := maybeError()
fmt.Println(err == nil) // false
```

返回的接口动态类型是 `*AppError`，动态值才是 nil，所以接口本身非 nil。

正确写法：

```go
func maybeError() error {
	var appErr *AppError
	if appErr == nil {
		return nil
	}
	return appErr
}
```

规则：需要表示“无错误”时直接返回无类型的 `nil`，不要把 typed nil 装入接口。

---

## 8. 泛型基础

泛型适合“算法相同、元素类型不同”的重复。

### 8.1 类型参数与约束

```go
func Contains[T comparable](values []T, target T) bool {
	for _, value := range values {
		if value == target {
			return true
		}
	}
	return false
}

fmt.Println(Contains([]int{1, 2, 3}, 2))
fmt.Println(Contains([]string{"Go", "Java"}, "Go"))
```

`comparable` 允许使用 `==` / `!=`，因此 slice、map、function 不满足。

### 8.2 自定义数字约束

```go
type Number interface {
	~int | ~int64 | ~float32 | ~float64
}

func Sum[T Number](values []T) T {
	var total T
	for _, value := range values {
		total += value
	}
	return total
}
```

`~int` 表示底层类型为 int 的命名类型也满足约束。

```go
type Score int
fmt.Println(Sum([]Score{80, 90}))
```

### 8.3 泛型 Map 函数

```go
func MapSlice[T any, R any](values []T, transform func(T) R) []R {
	result := make([]R, 0, len(values))
	for _, value := range values {
		result = append(result, transform(value))
	}
	return result
}

lengths := MapSlice([]string{"Go", "Java"}, func(value string) int {
	return len(value)
})
```

### 8.4 何时不用泛型

- 只是为了省两三个非常清楚的函数。
- 不同类型的业务规则实际并不相同。
- 需要运行时行为替换时，接口通常更合适。
- 类型参数让调用和错误信息明显更难理解。

接口表达“某个值能做什么”；泛型表达“同一算法适用于哪些类型”。

---

## 9. 案例一：接口驱动的通知

```go
type Notifier interface {
	Notify(userID int64, message string) error
}

type EmailNotifier struct {
	From string
}

func (n EmailNotifier) Notify(userID int64, message string) error {
	fmt.Printf("email from=%s user=%d message=%s\n", n.From, userID, message)
	return nil
}

type ConsoleNotifier struct{}

func (ConsoleNotifier) Notify(userID int64, message string) error {
	fmt.Printf("console user=%d message=%s\n", userID, message)
	return nil
}
```

调用方只依赖 `Notifier`，测试可传入记录调用的 fake，而不需要真实发邮件。

---

## 10. 综合项目：订单服务

### 10.1 领域对象

```go
var ErrOrderNotFound = errors.New("order not found")

type OrderStatus string

const (
	OrderPending OrderStatus = "pending"
	OrderPaid    OrderStatus = "paid"
)

type Order struct {
	ID     int64
	UserID int64
	Amount int64
	Status OrderStatus
}

func NewOrder(id, userID, amount int64) (*Order, error) {
	if id <= 0 || userID <= 0 {
		return nil, errors.New("id and userID must be positive")
	}
	if amount <= 0 {
		return nil, errors.New("amount must be positive")
	}
	return &Order{ID: id, UserID: userID, Amount: amount, Status: OrderPending}, nil
}

func (o *Order) MarkPaid() error {
	if o == nil {
		return errors.New("order is nil")
	}
	if o.Status != OrderPending {
		return fmt.Errorf("cannot pay order in status %s", o.Status)
	}
	o.Status = OrderPaid
	return nil
}
```

### 10.2 由服务定义依赖接口

```go
type OrderRepository interface {
	FindByID(id int64) (*Order, error)
	Save(order *Order) error
}

type PaymentNotifier interface {
	NotifyPaid(order *Order) error
}

type OrderService struct {
	repository OrderRepository
	notifier   PaymentNotifier
}

func NewOrderService(repository OrderRepository, notifier PaymentNotifier) *OrderService {
	return &OrderService{repository: repository, notifier: notifier}
}
```

### 10.3 业务方法

```go
func (s *OrderService) Pay(orderID int64) error {
	order, err := s.repository.FindByID(orderID)
	if err != nil {
		return fmt.Errorf("find order %d: %w", orderID, err)
	}

	if err := order.MarkPaid(); err != nil {
		return fmt.Errorf("mark order paid: %w", err)
	}

	if err := s.repository.Save(order); err != nil {
		return fmt.Errorf("save order %d: %w", orderID, err)
	}

	if err := s.notifier.NotifyPaid(order); err != nil {
		return fmt.Errorf("notify paid order %d: %w", orderID, err)
	}
	return nil
}
```

### 10.4 内存实现

```go
type MemoryOrderRepository struct {
	orders map[int64]*Order
}

func NewMemoryOrderRepository(orders ...*Order) *MemoryOrderRepository {
	values := make(map[int64]*Order, len(orders))
	for _, order := range orders {
		copyOfOrder := *order
		values[order.ID] = &copyOfOrder
	}
	return &MemoryOrderRepository{orders: values}
}

func (r *MemoryOrderRepository) FindByID(id int64) (*Order, error) {
	order, exists := r.orders[id]
	if !exists {
		return nil, ErrOrderNotFound
	}
	copyOfOrder := *order
	return &copyOfOrder, nil
}

func (r *MemoryOrderRepository) Save(order *Order) error {
	copyOfOrder := *order
	r.orders[order.ID] = &copyOfOrder
	return nil
}
```

真实数据库实现会在 Day 8 开始替换这个内存仓库，而 `OrderService` 不需要改变。

---

## 11. 今日练习题

### 题目 1｜商品模型（easy）

定义 `Product`，通过 `NewProduct` 校验名称和价格；实现 `ApplyDiscount(percent int) error`。

### 题目 2｜几何接口（medium）

定义 `Shape` 接口，包含 `Area() float64`。让 Circle 和 Rectangle 实现它，并编写总面积函数。

### 题目 3｜缓存接口（medium）

由调用方定义只包含 `Get` / `Set` 的接口，实现内存 Map 版本，并用 fake 验证业务逻辑不依赖具体缓存。

### 题目 4｜泛型去重（optional）

实现 `Unique[T comparable](values []T) []T`，保持首次出现顺序。思考为什么它不能接受 `[][]int`。

---

## 12. 今日对照表

| 概念 | Go | Java |
|------|----|------|
| 数据对象 | struct | class / record |
| 构造 | `NewType` 普通函数 | constructor |
| 方法 | 显式 receiver | 隐式 `this` |
| 复用 | 组合、嵌入 | composition / inheritance |
| 接口实现 | 隐式满足方法集合 | `implements` |
| 任意类型 | `any` | `Object` |
| 泛型约束 | type set | bounds |

---

## 13. 常见报错急救

### 方法修改字段后没有生效

使用了值接收者。需要修改对象时改为指针接收者，并确保调用的是可寻址值。

### `T does not implement Interface (method has pointer receiver)`

只有 `*T` 拥有指针接收者方法。把接口值赋为 `&value` 或调整方法接收者。

### interface 明明装的是 nil，却不等于 nil

接口保留了动态类型。无值时直接返回裸 `nil`。

### 结构体无法使用 ==

结构体包含不可比较字段，例如 slice 或 map。改为逐字段比较或定义明确的 Equal 方法。

### 泛型约束不满足

检查算法实际使用的操作。例如 `==` 需要 `comparable`，`+` 需要包含相应底层类型的约束。

### 接口越来越大

接口放错了所有权。回到调用方，只保留当前业务真正调用的方法。

---

## 14. 打卡清单

- [ ] 会用字段名初始化结构体并理解零值
- [ ] 能选择值接收者或指针接收者
- [ ] 会通过构造函数维护业务不变量
- [ ] 能解释嵌入不是继承
- [ ] 会在使用方定义小接口
- [ ] 理解方法集合与 interface nil 陷阱
- [ ] 会使用安全类型断言和 type switch
- [ ] 能区分接口多态与泛型算法复用
- [ ] 完成至少 3 个案例或练习

下一篇将把这些类型放进真实包结构，学习文件资源管理、JSON 编解码、表格驱动测试与基准测试。
