---
title: Go Zero-to-One Bootcamp Day 4 | Functions, Pointers, defer, and Errors
summary: Master functions, multiple returns, variadic parameters, closures, pointers, defer, error wrapping, and panic/recover through practical examples.
author: CodeNest
category: syntax
tags: [Syntax, Go, Golang, Beginner Bootcamp, Day4, Functions, Pointers, Errors]
createdAt: 2026-08-20
updatedAt: 2026-08-20
readingMinutes: 59
slug: go-zero-bootcamp-day04
---

# Go Zero-to-One Bootcamp Day 4 | Functions, Pointers, defer, and Errors

> Previous: [Day 3 | Arrays, Slices, Maps, and UTF-8 Strings](/articles/go-zero-bootcamp-day03)
> Goal: decompose data processing into clear functions, understand pointer mutation, and create a complete habit for returning, wrapping, and inspecting errors.
> Next: [Day 5 | Structs, Methods, Interfaces, and Generics](/articles/go-zero-bootcamp-day05)

---

## Table of Contents

1. Today's map
2. Functions and multiple returns
3. Parameters, variadic functions, and value passing
4. Function values, anonymous functions, and closures
5. Pointers for shared mutation
6. defer for reliable cleanup
7. Creating, wrapping, and inspecting errors
8. The boundary of panic and recover
9. Practical examples and a configuration pipeline
10. Exercises, troubleshooting, and checklist

---

## 0. Today's Map

| Topic | What you will be able to do | Java comparison |
|-------|-----------------------------|-----------------|
| Functions | Design parameters and return values | method / static method |
| Multiple returns | Return a result and error together | DTO / thrown exception |
| Function values | Build callbacks, predicates, and closures | lambda / functional interface |
| Pointers | Share mutation and avoid large copies | object reference, with different semantics |
| defer | Close, unlock, and measure reliably | try-finally / try-with-resources |
| error | Add context while preserving the cause chain | exception cause |

**Key ideas: every Go parameter is passed by value; a pointer is also a copied value; deferred calls run in reverse order before the current function returns; errors should add context without destroying the underlying chain.**

---

## 1. Function Declarations and Returns

### 1.1 Basic Functions

```go
func add(a int, b int) int {
	return a + b
}
```

Adjacent parameters of one type can share the type declaration:

```go
func add(a, b int) int {
	return a + b
}
```

Go has no function overloading. Two package-level functions cannot share a name based only on different parameter types. Prefer explicit names, different methods, or generics when the algorithm is genuinely shared.

### 1.2 Multiple Return Values

```go
func divide(a, b float64) (float64, error) {
	if b == 0 {
		return 0, errors.New("divisor must not be zero")
	}
	return a / b, nil
}

result, err := divide(10, 2)
if err != nil {
	fmt.Println("calculation failed:", err)
	return
}
fmt.Println(result)
```

“result plus error” is one of Go's central contracts. On success, error is `nil`; on failure, the result normally uses its zero value.

Multiple business results are direct as well:

```go
func minMax(values []int) (int, int, error) {
	if len(values) == 0 {
		return 0, 0, errors.New("values must not be empty")
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

### 1.3 Named Returns

```go
func rectangle(width, height float64) (area float64, perimeter float64) {
	area = width * height
	perimeter = 2 * (width + height)
	return
}
```

Named returns are variables in the function scope. They clarify multiple results of the same type and can be observed by `defer`.

Do not overuse naked `return`. In a long function, `return area, perimeter` is easier to review.

---

## 2. Parameters, Variadic Functions, and Value Passing

### 2.1 Every Parameter Is Passed by Value

```go
func increase(value int) {
	value++
}

number := 10
increase(number)
fmt.Println(number) // 10
```

The function modifies a copy.

Slices may look like reference passing, but the slice descriptor is copied:

```go
func updateFirst(values []int) {
	values[0] = 99 // The copied descriptor reaches the same array.
}

func appendLocal(values []int) {
	values = append(values, 100) // Only the local descriptor changes.
}
```

Return the new slice when the caller must see a changed length:

```go
func appendValue(values []int, value int) []int {
	return append(values, value)
}
```

### 2.2 Variadic Parameters

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

A variadic parameter is a slice inside the function and must be last.

### 2.3 Parameter Design Guidelines

- Pass small, meaningful values directly.
- Replace long groups of optional booleans with a config struct or functional options.
- Pass small structs by value; use pointers for mutation or very large values.
- Slices and maps are already small descriptors, so `*[]T` and `*map[K]V` are rarely necessary.

---

## 3. Function Values, Anonymous Functions, and Closures

Functions can be assigned, passed, and returned:

```go
func calculate(a, b int, operation func(int, int) int) int {
	return operation(a, b)
}

multiply := func(a, b int) int {
	return a * b
}

fmt.Println(calculate(3, 4, multiply)) // 12
```

This resembles a Java lambda plus functional interface, but Go uses the function type directly.

### 3.1 Named Function Types

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

### 3.2 Closures Capture Variables

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

The captured `count` survives after the outer function returns. Closures are useful for callbacks and lightweight state, but concurrent shared state still requires synchronization.

In modern Go, range iteration variables are created per iteration. Older code may explicitly shadow a loop variable before capturing it. The durable lesson is that a closure captures a variable, not a frozen textual value.

---

## 4. Pointers: Shared Mutation, Not Pointer Arithmetic

### 4.1 Address and Dereference

```go
number := 10
pointer := &number

fmt.Println(pointer)
fmt.Println(*pointer)

*pointer = 20
fmt.Println(number) // 20
```

- `&value` obtains an address.
- `*pointer` reads or writes the pointed value.
- Go does not support C-style pointer arithmetic.

### 4.2 Mutate Caller-Owned Data

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

Go parses `*value++` as `(*value)++`.

### 4.3 Returning a Local Address Is Safe

```go
func newCounter() *int {
	value := 0
	return &value
}
```

Escape analysis moves storage when necessary. You do not manually manage its lifetime.

### 4.4 nil Pointers

```go
var pointer *int
fmt.Println(pointer == nil)

// fmt.Println(*pointer) // panic
```

Whether nil is accepted is part of an API contract. Check it explicitly when supported; otherwise make construction guarantee a non-nil value.

---

## 5. defer: Reliable Cleanup

`defer` registers a call to run before the current function returns:

```go
func work() {
	fmt.Println("start")
	defer fmt.Println("cleanup")
	fmt.Println("working")
}
```

The output is `start`, `working`, then `cleanup`.

### 5.1 Last Registered, First Run

```go
defer fmt.Println("first")
defer fmt.Println("second")
defer fmt.Println("third")
```

The output order is `third`, `second`, `first`.

### 5.2 Arguments Are Evaluated at Registration

```go
value := 10
defer fmt.Println("deferred:", value)
value = 20
fmt.Println("now:", value)
```

This prints `now: 20` and `deferred: 10`. A deferred closure reads the variable when it executes:

```go
value := 10
defer func() {
	fmt.Println("closure:", value)
}()
value = 20 // prints 20 later
```

### 5.3 Typical Cleanup

```go
file, err := os.Open("config.json")
if err != nil {
	return err
}
defer file.Close()
```

Other uses include unlocking mutexes, rollback protection, timing, and panic recovery.

Avoid accumulating defers inside a huge loop. Extract one iteration into a function so each resource is released promptly.

### 5.4 Timing Helper

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

The first call executes `track` immediately; defer invokes the returned closure at function exit.

---

## 6. error: Create, Wrap, and Inspect

`error` is a standard interface:

```go
type error interface {
	Error() string
}
```

### 6.1 Sentinel and Dynamic Errors

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

A sentinel is useful when callers need a stable identity. Dynamic details belong in formatted errors.

### 6.2 Wrap with %w

```go
func loadUser(id int64) (string, error) {
	user, err := findUser(id)
	if err != nil {
		return "", fmt.Errorf("load user %d: %w", id, err)
	}
	return user, nil
}
```

The wrapper adds layer-specific context while preserving the chain:

```go
_, err := loadUser(404)
if errors.Is(err, ErrNotFound) {
	fmt.Println("user does not exist")
}
```

Do not compare error strings. They are human context, not a stable machine contract.

### 6.3 Custom Errors and errors.As

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

Extract structured details:

```go
err := validateAge(200)
var validationErr *ValidationError
if errors.As(err, &validationErr) {
	fmt.Println(validationErr.Field, validationErr.Message)
}
```

Use `errors.Is` for identity and `errors.As` for a type.

Usually, lower layers add context while a boundary layer logs once and translates the error. Logging at every layer creates duplicate noise.

---

## 7. panic and recover Boundaries

`panic` stops normal control flow, unwinds the stack, and runs deferred calls.

Reasonable panic cases include unrecoverable startup invariants and genuine programmer errors. Invalid user input, a missing file, a database outage, or an HTTP failure should return `error`.

### 7.1 recover Must Run in defer

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

Recovery is not permission to hide defects. Web frameworks often recover at the request boundary, log a stack, and return 500; business functions still return normal errors.

---

## 8. Example: Safe Pagination Parsing

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

This distinguishes format failures from business validation while preserving `strconv` errors.

---

## 9. Example: Retry a Function

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

Simulate two temporary failures with a closure:

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

Production retries also need context cancellation, backoff, and error classification. Day 7 introduces context.

---

## 10. Mini Project: Configuration Pipeline

Parse `KEY=VALUE` text into a typed configuration with contextual errors:

```go
package main

import (
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
		fmt.Println("configuration error:", err)
		return
	}
	fmt.Printf("%+v\n", config)
}
```

The project demonstrates small functions, zero values, maps, strings, multiple returns, error wrapping, and one boundary that handles failure.

---

## 11. Exercises

### Exercise 1 | Safe Average (easy)

Implement `average(values []float64) (float64, error)` and return an error for an empty slice.

### Exercise 2 | Configurable Filter (medium)

Implement `filterStrings(values []string, predicate func(string) bool) []string`. Pass predicates for non-empty values, length over three, and strings containing Go.

### Exercise 3 | Balance Transfer (medium)

Implement `transfer(from, to *int64, amount int64) error`. Validate nil pointers, a positive amount, and sufficient funds. Leave both balances unchanged on failure.

### Exercise 4 | Error Chain (optional)

Define `ErrInsufficientBalance`, wrap it with `%w` in a service layer, and translate it with `errors.Is` at the boundary.

---

## 12. Java Comparison

| Concept | Go | Java |
|---------|----|------|
| Function | Can exist outside a type | Usually inside a class |
| Multiple results | `(value, error)` | DTO / exception |
| Callback | Function type | functional interface |
| Pointer | `*T`, explicit dereference | Object reference, implicit dereference |
| Cleanup | `defer` | finally / try-with-resources |
| Business failure | Return `error` | throw exception |
| Error chain | `%w` + Is / As | cause + instanceof |

---

## 13. Troubleshooting

### `not enough arguments in call`

Go has no default parameters or overloads. Pass every argument or use a config/options design.

### Caller Data Does Not Change

Parameters are copied. Pass a pointer for shared mutation or return the updated value.

### `invalid memory address or nil pointer dereference`

A nil pointer was dereferenced. Define whether nil is valid and check it at the boundary.

### defer Does Not Run per Loop Iteration

defer runs when the current function returns, not at block exit. Extract the iteration into a function.

### `errors.Is` Cannot Find the Cause

The wrapper used `%v` or created a new error. Wrap with `%w`.

### recover Does Nothing

`recover` works only inside a deferred function for a panic in the same goroutine.

---

## 14. Completion Checklist

- [ ] I design functions that return `(result, error)`
- [ ] I understand that all parameters are passed by value
- [ ] I use variadic parameters, function values, and closures
- [ ] I mutate caller data with pointers and handle nil
- [ ] I explain defer order and argument evaluation
- [ ] I use `%w`, `errors.Is`, and `errors.As`
- [ ] I distinguish error from panic
- [ ] I completed at least three examples or exercises

Next, we organize data and behavior with structs and methods, then define replaceable boundaries with interfaces and reusable algorithms with generics.
