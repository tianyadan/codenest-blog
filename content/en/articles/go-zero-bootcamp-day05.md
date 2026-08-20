---
title: Go Zero-to-One Bootcamp Day 5 | Structs, Methods, Interfaces, and Generics
summary: Learn structs, constructors, value and pointer receivers, composition, interfaces, type assertions, and generics through a replaceable order service.
author: CodeNest
category: syntax
tags: [Syntax, Go, Golang, Beginner Bootcamp, Day5, Struct, Interface, Generics]
createdAt: 2026-08-20
updatedAt: 2026-08-20
readingMinutes: 62
slug: go-zero-bootcamp-day05
---

# Go Zero-to-One Bootcamp Day 5 | Structs, Methods, Interfaces, and Generics

> Previous: [Day 4 | Functions, Pointers, defer, and Errors](/articles/go-zero-bootcamp-day04)
> Goal: organize domain data with structs and methods, replace dependencies through small interfaces, and understand where generics fit.
> Next: [Day 6 | Packages, File I/O, JSON, and Testing](/articles/go-zero-bootcamp-day06)

---

## Table of Contents

1. Today's map
2. Struct definition, initialization, and zero values
3. Methods and value/pointer receivers
4. Constructors and invariants
5. Composition and embedding
6. Interfaces and implicit implementation
7. Type assertions, type switches, and nil traps
8. Generics and constraints
9. Mini project: order service
10. Exercises, troubleshooting, and checklist

---

## 0. Today's Map

| Topic | What you will be able to do | Java comparison |
|-------|-----------------------------|-----------------|
| Structs | Model domain data and useful zero values | POJO / record |
| Methods | Select value or pointer receivers | instance method |
| Construction | Enforce invariants with `NewXxx` | constructor / factory |
| Composition | Embed and delegate behavior | composition |
| Interfaces | Define the minimum capability at the consumer | implicit interface implementation |
| Generics | Reuse type-independent algorithms | Java generics |

**Key ideas: a struct combines data rather than acting as a class; a method is a function with a receiver; method sets satisfy interfaces implicitly; prefer composition and small interfaces; generics remove algorithm duplication, not interface polymorphism.**

---

## 1. Structs: Group Related Fields

### 1.1 Define and Initialize

```go
type User struct {
	ID        int64
	Name      string
	Email     string
	Active    bool
	CreatedAt time.Time
}

user := User{
	ID:     1001,
	Name:   "Alice",
	Email:  "alice@example.com",
	Active: true,
}
```

Named fields are preferred. Positional literals are fragile when fields change and are harder to review. Other packages can access only exported fields or methods.

### 1.2 Struct Zero Values

```go
var user User
fmt.Printf("%+v\n", user)
```

Every field receives its own zero value. Good infrastructure types often make zero values useful: `bytes.Buffer` and `sync.Mutex` need no constructor.

A business zero value is not always valid. `User{}` may lack required identity, so construction or validation must make that explicit.

### 1.3 Field Access and Pointers

```go
user.Name = "Bob"
pointer := &user
pointer.Name = "Carol" // Go inserts the dereference.
```

### 1.4 Anonymous Structs

Use an anonymous struct for local, one-off data:

```go
response := struct {
	Code    int
	Message string
}{Code: 0, Message: "ok"}
```

Define a named type when data crosses functions or carries business meaning.

### 1.5 Comparison

A struct is comparable when all fields are comparable:

```go
type Point struct {
	X int
	Y int
}

fmt.Println(Point{1, 2} == Point{1, 2})
```

Structs containing slices, maps, or functions cannot use `==`.

---

## 2. Methods and Receivers

```go
type Rectangle struct {
	Width  float64
	Height float64
}

func (r Rectangle) Area() float64 {
	return r.Width * r.Height
}
```

Use a short receiver based on the type name, such as `r`, not a universal `this` or `self`.

### 2.1 Value Receivers

A value receiver gets a copy. It is appropriate for read-only behavior, small types, and value-like objects.

```go
func (r Rectangle) Label() string {
	return fmt.Sprintf("%.1fx%.1f", r.Width, r.Height)
}
```

### 2.2 Pointer Receivers

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

Go automatically takes the address of an addressable value for the call:

```go
rectangle := Rectangle{Width: 3, Height: 4}
_ = rectangle.Scale(2)
```

Use pointer receivers for mutation, large types, fields that must not be copied such as `sync.Mutex`, or a consistent pointer-based identity.

Keep one type's receiver style consistent unless a clear semantic reason exists.

### 2.3 Method Values and Expressions

```go
areaFn := rectangle.Area
fmt.Println(areaFn())

areaExpression := Rectangle.Area
fmt.Println(areaExpression(rectangle))
```

A method value binds a receiver. A method expression turns the receiver into the first ordinary parameter.

---

## 3. Constructors and Invariants

Go has no constructor keyword. The convention is `NewType`:

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

Unexported fields prevent other packages from bypassing construction. Methods maintain the invariant:

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

Return a pointer for shared identity and mutation. Return a value for small immutable values.

### 3.1 Functional Options

When optional configuration grows:

```go
type Client struct {
	timeout time.Duration
	retries int
}

type ClientOption func(*Client)

func WithTimeout(timeout time.Duration) ClientOption {
	return func(client *Client) { client.timeout = timeout }
}

func WithRetries(retries int) ClientOption {
	return func(client *Client) { client.retries = retries }
}

func NewClient(options ...ClientOption) *Client {
	client := &Client{timeout: 3 * time.Second, retries: 1}
	for _, option := range options {
		option(client)
	}
	return client
}
```

```go
client := NewClient(WithTimeout(5*time.Second), WithRetries(3))
```

Do not introduce options for every small object. They help when defaults are meaningful and the constructor must evolve compatibly.

---

## 4. Composition and Embedding

Go has no class inheritance. Compose explicit fields:

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

### 4.1 Embedded Fields

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

fmt.Println(order.CreatedAt)
```

Embedding promotes fields and methods, but `Order` does not become an `AuditFields`. It remains a distinct type containing that field. Name conflicts require explicit qualification.

Behavior can be embedded too, but named dependencies such as `logger Logger` often communicate core requirements more clearly.

---

## 5. Interfaces: Capabilities Defined by Method Sets

```go
type Writer interface {
	Write(data []byte) (int, error)
}
```

No `implements` declaration is required. A matching method set satisfies the interface.

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

### 5.1 Define Interfaces at the Consumer

Do not pre-create a large interface for every implementation. If a consumer needs only one capability, define one method:

```go
type UserFinder interface {
	FindByID(id int64) (User, error)
}
```

Implementations may have more methods. The consumer depends only on what it calls, which keeps tests and modules small.

### 5.2 Method Sets and Receivers

```go
type Counter struct{ value int }

func (c *Counter) Increment() { c.value++ }

type Incrementer interface {
	Increment()
}

var incrementer Incrementer = &Counter{}
// var invalid Incrementer = Counter{} // Does not compile.
```

Only `*Counter` has the pointer receiver method in its method set. A compile-time assertion documents intent:

```go
var _ Incrementer = (*Counter)(nil)
```

### 5.3 Interface Composition

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

Prefer small interfaces and combine them only where both capabilities are required.

---

## 6. Type Assertions and Type Switches

```go
value, ok := input.(string)
if !ok {
	fmt.Println("input is not a string")
}
```

Without `ok`, a failed assertion panics. Use a type switch for several types:

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

`any` aliases `interface{}`. It can carry any type, but using it throughout business APIs postpones errors until runtime.

---

## 7. The Typed nil Interface Trap

An interface value contains a dynamic type and dynamic value. It equals nil only when both are absent.

```go
type AppError struct {
	Message string
}

func (e *AppError) Error() string { return e.Message }

func maybeError() error {
	var appErr *AppError = nil
	return appErr
}

err := maybeError()
fmt.Println(err == nil) // false
```

The interface has dynamic type `*AppError`, even though its dynamic value is nil. Return an untyped nil to represent no error:

```go
func maybeError() error {
	var appErr *AppError
	if appErr == nil {
		return nil
	}
	return appErr
}
```

---

## 8. Generics Basics

Generics fit duplicated algorithms whose logic is independent of element type.

### 8.1 Type Parameters and Constraints

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

`comparable` permits `==` and `!=`, so slices, maps, and functions do not satisfy it.

### 8.2 Numeric Constraints

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

`~int` includes named types whose underlying type is int:

```go
type Score int
fmt.Println(Sum([]Score{80, 90}))
```

### 8.3 Generic Mapping

```go
func MapSlice[T any, R any](values []T, transform func(T) R) []R {
	result := make([]R, 0, len(values))
	for _, value := range values {
		result = append(result, transform(value))
	}
	return result
}
```

### 8.4 When Not to Use Generics

- The duplicated code is tiny and already clear.
- Business rules differ despite similar signatures.
- Runtime behavior replacement calls for an interface.
- Type parameters make calls and errors harder to understand.

Interfaces express what a value can do. Generics express which types share one compile-time algorithm.

---

## 9. Example: Replaceable Notifications

```go
type Notifier interface {
	Notify(userID int64, message string) error
}

type EmailNotifier struct{ From string }

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

The consumer depends only on `Notifier`. Tests can pass a fake that records calls without sending email.

---

## 10. Mini Project: Order Service

### 10.1 Domain Object

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

### 10.2 Consumer-Owned Interfaces

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
```

### 10.3 Business Operation

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

### 10.4 In-Memory Repository

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

Day 8 can replace this repository with a database implementation without changing `OrderService`.

---

## 11. Exercises

### Exercise 1 | Product Model (easy)

Define `Product`, validate name and price in `NewProduct`, and implement `ApplyDiscount(percent int) error`.

### Exercise 2 | Shape Interface (medium)

Define `Shape` with `Area() float64`. Implement it for Circle and Rectangle, then sum areas.

### Exercise 3 | Cache Boundary (medium)

Define a consumer-owned `Get` / `Set` interface, implement a memory map, and use a fake to show business logic does not depend on the concrete cache.

### Exercise 4 | Generic Unique (optional)

Implement `Unique[T comparable](values []T) []T` while preserving first-seen order. Explain why `[][]int` is rejected.

---

## 12. Java Comparison

| Concept | Go | Java |
|---------|----|------|
| Data object | struct | class / record |
| Construction | ordinary `NewType` function | constructor |
| Method | explicit receiver | implicit `this` |
| Reuse | composition and embedding | composition / inheritance |
| Interface implementation | implicit method set | `implements` |
| Any type | `any` | `Object` |
| Generic constraint | type set | bounds |

---

## 13. Troubleshooting

### A Method Does Not Mutate Fields

It uses a value receiver. Use a pointer receiver for mutation and call it on an addressable value.

### `T does not implement Interface (method has pointer receiver)`

Only `*T` owns pointer receiver methods in its method set. Assign `&value` or reconsider the receiver.

### An Interface Contains nil but Is Not nil

The interface retains a dynamic type. Return an untyped nil when no value exists.

### A Struct Cannot Use ==

It contains a non-comparable field such as a slice or map. Compare fields or define an explicit equality method.

### A Generic Constraint Fails

Match the constraint to operations. `==` requires `comparable`; `+` requires a type set supporting addition.

### An Interface Keeps Growing

Move ownership to the consumer and keep only methods the current operation actually calls.

---

## 14. Completion Checklist

- [ ] I initialize structs with field names and understand zero values
- [ ] I select value or pointer receivers intentionally
- [ ] I enforce invariants through constructors
- [ ] I explain why embedding is not inheritance
- [ ] I define small interfaces at consumers
- [ ] I understand method sets and typed nil interfaces
- [ ] I use safe type assertions and switches
- [ ] I distinguish interface polymorphism from generic algorithms
- [ ] I completed at least three examples or exercises

Next, we place these types into real package boundaries and learn file resource management, JSON encoding, table-driven tests, and benchmarks.
