---
title: Go Zero-to-One Bootcamp Day 2 | Variables, Basic Types, and Control Flow
summary: Learn Go variables, constants, basic types, explicit conversion, operators, if, switch, and for through Java comparisons and runnable exercises.
author: CodeNest
category: syntax
tags: [Syntax, Go, Golang, Beginner Bootcamp, Day2, Java Comparison]
createdAt: 2026-08-20
updatedAt: 2026-08-20
readingMinutes: 46
slug: go-zero-bootcamp-day02
---

# Go Zero-to-One Bootcamp Day 2 | Variables, Basic Types, and Control Flow

> Previous: [Day 1 | Setup, Go Modules, and Your First Program](/articles/go-zero-bootcamp-day01)  
> Goal: master **variables, constants, basic types, conversion, branches, and loops**, then build a CLI grade analyzer.  
> Next preview: arrays, slices, maps, and strings.

---

## Table of Contents

1. Today's map
2. Variables and zero values
3. Constants and iota
4. Basic types and conversion
5. Operators
6. if statements
7. switch statements
8. for loops
9. Mini project: grade analyzer
10. Exercises, troubleshooting, and checklist

---

## 0. Today's Map

| Section | What you will be able to do | Java comparison |
|---------|-----------------------------|-----------------|
| Variables | Use `var`, short declarations, groups, and zero values | Explicit types + locals |
| Constants | Use `const`, groups, and `iota` | `static final`, enum |
| Types | Work with numbers, strings, booleans, and aliases | primitives / String |
| Conversion | Convert numeric types and parse text | casts / parse methods |
| Branches | Use `if`, initializers, and `switch` | if / switch |
| Loops | Express every loop with `for` | for / while / for-each |

**Key ideas: Go does not implicitly convert numeric variables; declared locals must be used; zero values keep variables usable; `for` is the only loop keyword.**

---

## 1. Variables: Declarations, Inference, and Zero Values

### 1.1 Declare with var

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

Omit the explicit type when the initializer makes it clear:

```go
var language = "Go" // inferred as string
var year = 2026      // inferred as int
```

Group related package-level declarations:

```go
var (
	host  = "localhost"
	port  = 8080
	debug = true
)
```

### 1.2 Short Variable Declarations

Inside a function, `:=` is the most common declaration form:

```go
name := "Alice"
age := 20
```

It declares variables, infers their types, and assigns values. It cannot be used at package scope.

```go
// appName := "demo" // Invalid at package scope.
var appName = "demo"
```

At least one name on the left side of `:=` must be new in the current scope:

```go
name := "Alice"
name, age := "Bob", 20 // Valid because age is new.

// name := "Carol" // No new variable.
name = "Carol"      // Reassignment uses =.
```

### 1.3 Zero Values

Every declared Go variable receives a zero value:

| Type | Zero value |
|------|------------|
| Integer, floating point | `0` |
| `bool` | `false` |
| `string` | `""` |
| Pointer, slice, map, channel, function, interface | `nil` |

```go
var count int
var title string
var enabled bool

fmt.Printf("count=%d title=%q enabled=%t\n", count, title, enabled)
```

Java fields have defaults while Java locals may require initialization. Go zero values make declared variables readable, but a readable value is not automatically valid business data. A user ID of `0` may still need validation.

### 1.4 Unused Locals Fail the Build

```go
func main() {
	message := "hello" // Compilation fails if message is never used.
}
```

Use the blank identifier `_` when a value is intentionally discarded:

```go
value, _ := someFunction()
fmt.Println(value)
```

Do not casually discard errors in production. This example only demonstrates the syntax.

---

## 2. Constants and iota

Constants are determined at compile time:

```go
const appName = "CodeNest"
const maxRetry int = 3

const (
	statusPending = "pending"
	statusDone    = "done"
)
```

Constants cannot use `:=` and cannot be reassigned at runtime.

### 2.1 Untyped Constants

```go
const rate = 1.5

var price32 float32 = 100 * rate
var price64 float64 = 100 * rate
```

An untyped constant adapts to a compatible target type when used. This flexibility belongs to constants; ordinary variables still require explicit conversion.

### 2.2 iota for Incrementing Constants

```go
type Role int

const (
	RoleUnknown Role = iota // 0
	RoleAdmin               // 1
	RoleMember              // 2
)
```

`iota` starts at zero in each `const` group and increments per line. It is commonly used for states, flags, and enum-like values.

Go has no language construct identical to a Java enum. A named type plus constants and methods is the usual representation.

---

## 3. Basic Types

### 3.1 Integers

Common integer types include:

- `int` and `uint`, whose size follows the platform; `int` is common for counts.
- `int8`, `int16`, `int32`, and `int64`, with fixed widths.
- `byte`, an alias for `uint8`, often used for raw bytes.
- `rune`, an alias for `int32`, used for Unicode code points.

```go
var count int = 10
var userID int64 = 10001
var b byte = 'A'
var r rune = '中'

fmt.Println(count, userID, b, r)
fmt.Printf("characters: %c %c\n", b, r)
```

Database identifiers commonly use `int64` or `uint64`. Keep the driver, schema, and business boundary consistent.

### 3.2 Floating-Point Values

```go
var price float64 = 19.99
var ratio float32 = 0.75
```

Prefer `float64` for general calculations. Do not rely on exact floating-point equality for money; use an integer smallest unit or a decimal library.

### 3.3 Booleans

```go
var enabled bool = true
```

Integers, strings, and pointers do not become booleans automatically:

```go
name := "Go"

// if name { } // Does not compile.
if name != "" {
	fmt.Println("name is not empty")
}
```

### 3.4 Strings

Double-quoted strings interpret escapes. Backtick raw strings preserve newlines and backslashes:

```go
message := "hello\nGo"
raw := `C:\users\demo
the second line stays literal`

fmt.Println(message)
fmt.Println(raw)
```

A string is an immutable byte sequence. A Chinese character may occupy several UTF-8 bytes. Day 3 explores bytes, runes, and safe string iteration.

---

## 4. Explicit Conversion and Text Parsing

Go does not implicitly convert ordinary numeric variables:

```go
var age int = 18
var total int64

// total = age       // Does not compile.
total = int64(age)   // Explicit conversion.
```

### 4.1 Numeric Conversion

```go
price := 19.8
whole := int(price) // 19: truncation, not rounding
fmt.Println(whole)
```

Narrowing can overflow:

```go
large := 300
small := int8(large)
fmt.Println(small) // Wrapped value; conversion is not validation.
```

### 4.2 Strings and Numbers

Use the standard `strconv` package:

```go
package main

import (
	"fmt"
	"strconv"
)

func main() {
	age, err := strconv.Atoi("20")
	if err != nil {
		fmt.Println("invalid age:", err)
		return
	}

	price, err := strconv.ParseFloat("19.99", 64)
	if err != nil {
		fmt.Println("invalid price:", err)
		return
	}

	fmt.Println(age, price)
	fmt.Println(strconv.Itoa(age + 1))
}
```

- `strconv.Atoi` parses a decimal string into `int`.
- `strconv.Itoa` formats an `int` as a decimal string.
- `ParseInt`, `ParseFloat`, and `ParseBool` provide more control.

Conversion changes between compatible representations. Parsing interprets text. `int("20")` is not valid Go.

---

## 5. Operators

### 5.1 Arithmetic

```go
a, b := 7, 3

fmt.Println(a + b) // 10
fmt.Println(a - b) // 4
fmt.Println(a * b) // 21
fmt.Println(a / b) // 2: integer division
fmt.Println(a % b) // 1
```

Convert before division when you need a fractional result:

```go
fmt.Println(float64(a) / float64(b))
```

Go supports `a++` and `a--`, but only as statements:

```go
a++
// b = a++ // Invalid.
```

### 5.2 Comparison and Logic

```go
age := 20
hasTicket := true

canEnter := age >= 18 && hasTicket
isFree := age < 6 || age >= 65
blocked := !canEnter

fmt.Println(canEnter, isFree, blocked)
```

Logical operators are `&&`, `||`, and `!`. A condition must evaluate to `bool`.

---

## 6. if: No Parentheses, Mandatory Braces

```go
score := 86

if score >= 90 {
	fmt.Println("excellent")
} else if score >= 80 {
	fmt.Println("good")
} else if score >= 60 {
	fmt.Println("pass")
} else {
	fmt.Println("fail")
}
```

Compared with Java:

- Conditions do not use parentheses.
- Braces remain mandatory even for one statement.
- `else` must share a line with the previous `}` because of automatic semicolon insertion.
- Go has no ternary operator; use a clear `if`.

### 6.1 if Initializers

Declare branch-local values before the condition:

```go
if age, err := strconv.Atoi("20"); err != nil {
	fmt.Println("parse failed:", err)
} else {
	fmt.Println("age next year:", age+1)
}
```

`age` and `err` exist only across that `if / else`. This form appears constantly in database calls and error handling.

---

## 7. switch: No Fallthrough by Default

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

Each Go case exits automatically, so no `break` is required. `fallthrough` exists but is rarely appropriate in business code.

### 7.1 Expressionless switch

```go
score := 86

switch {
case score >= 90:
	fmt.Println("excellent")
case score >= 80:
	fmt.Println("good")
case score >= 60:
	fmt.Println("pass")
default:
	fmt.Println("fail")
}
```

This is often a cleaner form of a long `if / else if` chain.

---

## 8. for: Go's Only Loop

### 8.1 Classic Counter Loop

```go
for i := 0; i < 5; i++ {
	fmt.Println(i)
}
```

### 8.2 Use for Like while

```go
total := 0
n := 1

for total <= 100 {
	total += n
	n++
}

fmt.Println(total, n-1)
```

Go has no `while` keyword. Omit the initialization and post statements.

### 8.3 Infinite Loop

```go
for {
	fmt.Println("runs once")
	break
}
```

### 8.4 Iterate with range

```go
languages := []string{"Go", "Java", "Python"}

for index, language := range languages {
	fmt.Printf("%d: %s\n", index, language)
}
```

Discard the index with `_` when only the value is needed:

```go
for _, language := range languages {
	fmt.Println(language)
}
```

With one variable, `range` returns the index, not the value:

```go
for index := range languages {
	fmt.Println(index)
}
```

### 8.5 break and continue

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

Labels can exit an outer loop, but use them sparingly:

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

## 9. Mini Project: Command-Line Grade Analyzer

Read comma-separated scores, validate them, calculate the average, and print a grade.

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
	fmt.Print("Scores separated by commas (for example 86,90,75): ")

	line, err := reader.ReadString('\n')
	if err != nil {
		fmt.Println("failed to read input:", err)
		return
	}

	parts := strings.Split(strings.TrimSpace(line), ",")
	if len(parts) == 0 || strings.TrimSpace(line) == "" {
		fmt.Println("enter at least one score")
		return
	}

	total := 0
	validCount := 0

	for index, part := range parts {
		score, err := strconv.Atoi(strings.TrimSpace(part))
		if err != nil {
			fmt.Printf("item %d is not an integer: %q\n", index+1, part)
			continue
		}
		if score < 0 || score > 100 {
			fmt.Printf("item %d is outside 0-100: %d\n", index+1, score)
			continue
		}

		total += score
		validCount++
	}

	if validCount == 0 {
		fmt.Println("no valid scores")
		return
	}

	average := float64(total) / float64(validCount)
	grade := "fail"

	switch {
	case average >= 90:
		grade = "excellent"
	case average >= 80:
		grade = "good"
	case average >= 60:
		grade = "pass"
	}

	fmt.Printf("Valid scores: %d\n", validCount)
	fmt.Printf("Average: %.2f, grade: %s\n", average, grade)
}
```

This project combines short declarations, explicit conversion, initialized `if`, `for range`, `continue`, expressionless `switch`, and formatted output.

---

## 10. Exercises

### Exercise 1 | BMI Calculator (easy)

Given height in meters and weight in kilograms, calculate `BMI = weight / height²` and use `switch` to print a category. Validate that height is greater than zero.

### Exercise 2 | FizzBuzz (easy)

Loop from 1 through 100. Print `Fizz` for multiples of 3, `Buzz` for multiples of 5, `FizzBuzz` for both, and the number otherwise.

### Exercise 3 | Prime Test (medium)

Determine whether an integer greater than one is prime. Check only while `i*i <= n` and break as soon as a factor is found.

### Exercise 4 | Guess the Number (optional)

Use `math/rand` to choose a number from 1 to 100. Repeatedly read guesses, report high or low, and count attempts.

---

## 11. Java Comparison

| Concept | Go | Java |
|---------|----|------|
| Type inference | `name := "Go"` | `var name = "Java"` |
| Zero value | Every declared variable has one | Fields default; locals need initialization |
| Constant | `const` | `static final` |
| Explicit conversion | `int64(age)` | `(long) age` |
| Parse a string | `strconv.Atoi` | `Integer.parseInt` |
| Condition | `if condition {}` | `if (condition) {}` |
| Multi-branch | `switch` does not fall through | Depends on switch form |
| Loop | only `for` | for / while / do-while |

---

## 12. Troubleshooting

### `no new variables on left side of :=`

Every name on the left was already declared in this scope. Use `=` for reassignment, or make sure `:=` introduces at least one new variable.

### `declared and not used`

A local variable is never used. Remove it or implement the real logic instead of keeping placeholders.

### `mismatched types int and int64`

Go does not perform implicit numeric conversion. Choose the target business type and explicitly convert, while considering overflow.

### `cannot convert "20" to type int`

Text parsing is not a regular type conversion. Use `strconv.Atoi` or `strconv.ParseInt` and handle the returned error.

### The Average Has No Decimal Places

Dividing two integers performs integer division first. Convert both operands to `float64` before dividing.

### `unexpected else`

Automatic semicolon insertion requires `else` to follow the closing brace on the same line: `} else {`.

---

## 13. Completion Checklist

- [ ] I can distinguish `var`, `:=`, and `=`
- [ ] I know the zero values of common types
- [ ] I can explain why `int` is not assigned directly to `int64`
- [ ] I can parse strings with `strconv`
- [ ] I can write an initialized `if`
- [ ] I know that Go `switch` cases do not require `break`
- [ ] I can write counter, conditional, infinite, and `range` loops
- [ ] My grade analyzer handles invalid input
- [ ] I completed at least two exercises

Next, we study the structures that carry real application data: arrays, slices, maps, UTF-8 strings, and runes.

