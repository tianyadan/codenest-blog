---
title: Go Zero-to-One Bootcamp Day 3 | Arrays, Slices, Maps, and UTF-8 Strings
summary: Master arrays, slices, maps, bytes, runes, and string processing; understand append growth and shared backing arrays through practical examples.
author: CodeNest
category: syntax
tags: [Syntax, Go, Golang, Beginner Bootcamp, Day3, Slice, Map, Unicode]
createdAt: 2026-08-20
updatedAt: 2026-08-20
readingMinutes: 55
slug: go-zero-bootcamp-day03
---

# Go Zero-to-One Bootcamp Day 3 | Arrays, Slices, Maps, and UTF-8 Strings

> Previous: [Day 2 | Variables, Basic Types, and Control Flow](/articles/go-zero-bootcamp-day02)
> Goal: use Go's essential containers, process Unicode correctly, and recognize side effects caused by shared slice storage.
> Next: [Day 4 | Functions, Pointers, defer, and Errors](/articles/go-zero-bootcamp-day04)

---

## Table of Contents

1. Today's map
2. Arrays and value semantics
3. Slices as the primary sequence type
4. append, capacity, and backing arrays
5. Copying, deleting, and sorting slices
6. Maps and safe lookup
7. Strings, bytes, runes, and UTF-8
8. Practical examples and a mini project
9. Exercises, troubleshooting, and checklist

---

## 0. Today's Map

| Topic | What you will be able to do | Java comparison |
|-------|-----------------------------|-----------------|
| Arrays | Model fixed-size values and understand copying | fixed array |
| Slices | Append, slice, copy, delete, and preallocate | `ArrayList` + array view |
| Maps | Perform CRUD and distinguish missing keys | `HashMap` |
| Strings | Separate byte length from character count | UTF-8 bytes / code points |
| Practice | Deduplicate, count, group, and aggregate | collection and Stream tasks |

**Key ideas: an array length is part of its type; a slice describes a window over an array; a missing map key returns the value type's zero value; string indexing returns a byte while `range` decodes runes.**

---

## 1. Arrays: Length Is Part of the Type

### 1.1 Declaration and Initialization

```go
var scores [3]int
fmt.Println(scores) // [0 0 0]

scores[0] = 90
scores[1] = 85
scores[2] = 96

names := [3]string{"Alice", "Bob", "Carol"}
days := [...]string{"Mon", "Tue", "Wed"}

fmt.Println(names, len(days))
```

`[3]int` and `[4]int` are different types. An array length must be known at compile time.

```go
size := 3
// var values [size]int // Invalid: size is not a constant.
```

### 1.2 Arrays Are Values

Assignment and parameter passing copy the complete array:

```go
original := [3]int{1, 2, 3}
copied := original
copied[0] = 99

fmt.Println(original) // [1 2 3]
fmt.Println(copied)   // [99 2 3]
```

This differs from a Java array reference. Copying a large array can be expensive, so application code normally passes slices instead.

### 1.3 Iterate an Array

```go
scores := [4]int{88, 92, 76, 95}
total := 0

for index, score := range scores {
	fmt.Printf("score %d: %d\n", index, score)
	total += score
}

average := float64(total) / float64(len(scores))
fmt.Printf("average: %.2f\n", average)
```

Arrays are useful when the length carries meaning: three RGB channels, four IPv4 octets, or a fixed-size hash. Prefer slices for ordinary lists.

---

## 2. Slices: The Primary Sequence Type

A slice type is written `[]T` and has no fixed length:

```go
languages := []string{"Go", "Java", "Python"}
fmt.Println(len(languages))
fmt.Println(cap(languages))
```

Conceptually, a slice stores:

```text
pointer to a backing array + current length + available capacity
```

It is not exactly a Java `ArrayList`. Most importantly, multiple slices can share one backing array.

### 2.1 Create Slices with make

```go
values := make([]int, 3)     // len=3, cap=3, three zero values
buffer := make([]int, 0, 10) // len=0, cap=10, reserved storage
```

A common mistake:

```go
items := make([]string, 3)
items = append(items, "Go")
fmt.Println(items) // ["" "" "" "Go"]
```

When you plan to append, start with length zero:

```go
items := make([]string, 0, 3)
items = append(items, "Go")
```

### 2.2 nil and Empty Slices

```go
var nilSlice []int
emptySlice := []int{}
madeSlice := make([]int, 0)

fmt.Println(len(nilSlice), nilSlice == nil)     // 0 true
fmt.Println(len(emptySlice), emptySlice == nil) // 0 false
fmt.Println(len(madeSlice), madeSlice == nil)   // 0 false
```

All three support `append`. The distinction often appears in JSON: a nil slice may encode as `null`, while an empty slice encodes as `[]`. APIs that promise arrays often initialize an empty slice.

### 2.3 Slice Expressions Are Half-Open

```go
numbers := []int{10, 20, 30, 40, 50}

fmt.Println(numbers[1:4]) // [20 30 40]
fmt.Println(numbers[:3])  // [10 20 30]
fmt.Println(numbers[2:])  // [30 40 50]
fmt.Println(numbers[:])   // all values
```

The start is included and the end is excluded, like Java `subList(from, to)`.

---

## 3. append, Capacity, and Backing Arrays

### 3.1 Always Keep append's Return Value

```go
numbers := []int{1, 2}
numbers = append(numbers, 3)
numbers = append(numbers, 4, 5)

more := []int{6, 7}
numbers = append(numbers, more...)
```

`append` may reuse the current array or allocate another one. Always assign the returned slice.

### 3.2 Observe Growth

```go
items := make([]int, 0, 2)

for i := 1; i <= 5; i++ {
	items = append(items, i)
	fmt.Printf("append %d: len=%d cap=%d values=%v\n",
		i, len(items), cap(items), items)
}
```

The runtime grows storage when capacity is exhausted. The exact growth factor is an implementation detail; never encode it in application logic.

### 3.3 Shared Storage

```go
base := []int{10, 20, 30, 40}
part := base[1:3]
part[0] = 999

fmt.Println(base) // [10 999 30 40]
fmt.Println(part) // [999 30]
```

`part` is a view, not a copy.

`append` can make the sharing less obvious:

```go
base := make([]int, 3, 5)
base[0], base[1], base[2] = 1, 2, 3

view := base[:2]
view = append(view, 99) // Capacity remains, so storage is shared.

fmt.Println(base) // [1 2 99]
fmt.Println(view) // [1 2 99]
```

Copy first when a function must not mutate caller-owned data.

---

## 4. Copying, Deleting, and Sorting Slices

### 4.1 Independent Copy

```go
source := []int{1, 2, 3}
target := make([]int, len(source))
copy(target, source)

target[0] = 99
fmt.Println(source) // [1 2 3]
fmt.Println(target) // [99 2 3]
```

Another concise clone is:

```go
cloned := append([]int(nil), source...)
```

### 4.2 Delete by Index

Without preserving order:

```go
items := []string{"A", "B", "C", "D"}
i := 1
items[i] = items[len(items)-1]
items = items[:len(items)-1]
fmt.Println(items) // [A D C]
```

Preserving order:

```go
items := []string{"A", "B", "C", "D"}
i := 1
items = append(items[:i], items[i+1:]...)
fmt.Println(items) // [A C D]
```

When elements retain large referenced objects, clear the removed tail before shortening the slice.

### 4.3 Sort Values

```go
import "sort"

scores := []int{88, 60, 95, 72}
sort.Ints(scores)

names := []string{"Carol", "Alice", "Bob"}
sort.Strings(names)
```

Sort structs by a field:

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

Sorting mutates the slice. Clone first when original order matters.

---

## 5. Maps: Key-Value Data and Safe Lookup

### 5.1 Create and Modify

```go
ages := map[string]int{
	"Alice": 28,
	"Bob":   32,
}

ages["Carol"] = 25
ages["Alice"] = 29
fmt.Println(ages["Bob"])
delete(ages, "Carol")
```

Create with a capacity hint:

```go
scores := make(map[string]int, 100)
scores["Go"] = 95
```

### 5.2 A nil Map Is Readable but Not Writable

```go
var scores map[string]int
fmt.Println(scores["Go"]) // 0

// scores["Go"] = 95 // panic: assignment to entry in nil map
scores = make(map[string]int)
scores["Go"] = 95
```

### 5.3 comma ok Distinguishes Missing Keys

```go
stock := map[string]int{"keyboard": 0}

count, exists := stock["keyboard"]
fmt.Println(count, exists) // 0 true

count, exists = stock["mouse"]
fmt.Println(count, exists) // 0 false
```

Looking only at `stock[key]` cannot distinguish a missing key from a stored zero. Use `comma ok` for permissions, caches, and database mappings.

### 5.4 Iteration Order Is Unspecified

```go
for key, value := range ages {
	fmt.Println(key, value)
}
```

For deterministic output, sort the keys:

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

Comparable types can be map keys: booleans, numbers, strings, pointers, arrays, and structs containing only comparable fields. Slices, maps, and functions cannot be keys.

```go
type Coordinate struct {
	X int
	Y int
}

visited := map[Coordinate]bool{{X: 1, Y: 2}: true}
```

Maps are not safe for concurrent writes. Day 7 protects shared maps with a mutex.

---

## 6. Strings, bytes, runes, and UTF-8

### 6.1 len Counts Bytes

```go
text := "Go语言"

fmt.Println(len(text))         // 8 bytes
fmt.Println(len([]rune(text))) // 4 Unicode code points
```

String indexing returns a byte:

```go
fmt.Printf("%T %d %c\n", text[0], text[0], text[0])
```

Do not slice Chinese text by arbitrary byte indexes; that can split a UTF-8 encoding.

### 6.2 range Decodes Runes

```go
for byteIndex, r := range "Go语言" {
	fmt.Printf("byte index=%d rune=%c Unicode=%U\n", byteIndex, r, r)
}
```

The index remains a byte offset, not a character ordinal. Keep a separate counter when needed.

### 6.3 Modify Through []rune

Strings are immutable. Use `[]byte` for ASCII byte work and `[]rune` for Unicode characters:

```go
text := "Go语言"
runes := []rune(text)
runes[2] = '语'
runes[3] = '法'

fmt.Println(string(runes)) // Go语法
```

### 6.4 Useful strings Functions

```go
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

Use `strings.Builder` for repeated concatenation:

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

## 7. Example: Stable Deduplication

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

`map[string]struct{}` clearly models a set because the empty struct carries no business value.

```go
values := []string{" Go ", "Java", "go", "", "Python", "JAVA"}
fmt.Println(uniqueNormalized(values)) // [go java python]
```

---

## 8. Example: Unicode Frequency

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

Produce stable output by sorting runes:

```go
frequency := runeFrequency("Go, Go! 语言")
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

This combines `range`, a rune-keyed map, counting, slices, and sorting.

---

## 9. Mini Project: Order Inventory Summary

Normalize order lines, skip invalid records, aggregate quantities, and print stable output:

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

The output is:

```text
keyboard   3
mouse      3
```

`OrderItem` is just a data structure here. Day 5 covers structs and methods systematically.

---

## 10. Exercises

### Exercise 1 | Merge and Deduplicate (easy)

Merge two `[]int` values, remove duplicates, and preserve first-seen order without a third-party library.

### Exercise 2 | Move Zeroes (medium)

Move all zeroes to the end while preserving non-zero order. Transform `[0,1,0,3,12]` into `[1,3,12,0,0]`, preferably in place.

### Exercise 3 | Group Students (medium)

Group student names by city into `map[string][]string`. Trim city and name, skip empty values, and sort each group.

### Exercise 4 | Longest Unique Unicode Substring (optional)

Find the character length of the longest substring without repeated Unicode characters. A `map[rune]int` can track the last position.

---

## 11. Java Comparison

| Concept | Go | Java |
|---------|----|------|
| Fixed array | `[3]int`, length in type | fixed-length array instance |
| Dynamic sequence | `[]int` slice | `ArrayList<Integer>` |
| Length / capacity | `len` / `cap` | `size` / internal capacity |
| Copy | `copy` or `append` | `Arrays.copyOf` / new collection |
| Key-value store | `map[K]V` | `Map<K,V>` |
| Presence | `value, ok := m[key]` | `containsKey` |
| Unicode character | `rune` | code point / `int` |
| Byte | `byte` is unsigned | Java `byte` is signed |

---

## 12. Troubleshooting

### `index out of range`

The index must satisfy `0 <= i < len(slice)`. Capacity does not make elements addressable; only length does.

### `assignment to entry in nil map`

Initialize the map with `make(map[K]V)` or a map literal before writing.

### Updating a Subslice Changes the Original

The slices share a backing array. Allocate and `copy` when isolation is required.

### Map Output Changes Order

Map iteration is unspecified. Sort keys before deterministic output.

### `len("中文")` Is Not 2

`len(string)` counts UTF-8 bytes. Use `utf8.RuneCountInString` or `len([]rune(text))` for code points.

### append Appears to Do Nothing

Keep the returned slice: `slice = append(slice, value)`.

---

## 13. Completion Checklist

- [ ] I can explain array value semantics
- [ ] I distinguish slice length and capacity
- [ ] I understand why a subslice can mutate original data
- [ ] I can preallocate, copy, delete, and sort slices
- [ ] I use `comma ok` for map presence
- [ ] I know map iteration order is unspecified
- [ ] I distinguish byte, rune, byte offset, and character count
- [ ] I completed at least three examples or exercises

Next, we turn container operations into reusable functions and build reliable control flow with pointers, `defer`, and explicit errors.
