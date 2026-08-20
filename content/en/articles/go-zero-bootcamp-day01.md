---
title: Go Zero-to-One Bootcamp Day 1 | Setup, Go Modules, and Your First Program
summary: Install Go, learn the core go commands, modules, packages, the main entry point, and build a small runnable command-line project.
author: CodeNest
category: syntax
tags: [Syntax, Go, Golang, Beginner Bootcamp, Day1, Java Comparison]
createdAt: 2026-08-20
updatedAt: 2026-08-20
readingMinutes: 36
slug: go-zero-bootcamp-day01
---

# Go Zero-to-One Bootcamp Day 1 | Setup, Go Modules, and Your First Program

> Goal: install Go, understand **modules, packages, and the main entry point**, and run your first CLI project.  
> Prerequisite: no Go experience is required; Java comparisons are included where useful.  
> Next: [Day 2 | Variables, Types, and Control Flow](/articles/go-zero-bootcamp-day02)

---

## Table of Contents

1. Today's map
2. What Go is
3. Installation and environment checks
4. Your first Go program
5. Go Modules
6. Packages and the main entry point
7. Essential go commands
8. Project layout and naming
9. Mini project: CLI greeter
10. Exercises, troubleshooting, and checklist

---

## 0. Today's Map

| Section | What you will be able to do | Java comparison |
|---------|-----------------------------|-----------------|
| Environment | Install Go and inspect the toolchain | Install a JDK |
| Hello World | Compile and run a `.go` file | A `main` method |
| Module | Manage project identity and dependencies | Maven `pom.xml` |
| Package | Understand declarations, imports, and visibility | package / import |
| Toolchain | Use run, build, fmt, and test | Maven + formatter |
| Practice | Create a minimal maintainable project | A small Maven app |

**Key ideas: one directory normally represents one package; a `main` package builds an executable; `go.mod` gives the module its identity.**

---

## 1. What Is Go?

Go is a statically typed, compiled language initiated at Google. It favors a small language, a consistent toolchain, fast builds, and direct concurrency support. It is widely used for web services, infrastructure, cloud-native software, and command-line tools.

If you know Java, start with this rough map:

| Java | Go |
|------|----|
| JDK | Go SDK |
| Maven / Gradle | Go Modules |
| `public static void main` | `package main` + `func main()` |
| class | struct + method |
| exception | an `error` return value |
| thread / executor | goroutine / channel |

Go is not Java with shorter syntax. Learn the direct Go expression first instead of looking for a class-shaped equivalent for every idea.

---

## 2. Installation and Environment Checks

### 2.1 Install Go

Download the stable installer from [https://go.dev/dl/](https://go.dev/dl/). Reopen your terminal after installation and run:

```bash
go version
```

You should see something similar to:

```text
go version go1.24.0 darwin/arm64
```

Your version may differ. The final two values identify the operating system and CPU architecture.

### 2.2 Inspect the Environment

```bash
go env GOROOT GOPATH GOOS GOARCH GOPROXY
```

- `GOROOT` is the Go SDK installation directory. You normally do not edit it.
- `GOPATH` stores caches and installed commands.
- `GOOS` and `GOARCH` identify the build target.
- `GOPROXY` controls where modules are downloaded from.

Modern projects use **Go Modules**, so your repository does not need to live under `GOPATH/src`. Be careful with old tutorials that still require that layout.

### 2.3 Choose an Editor

VS Code works well with the official Go extension, while GoLand includes Go support out of the box. In either case, verify `go version` in a terminal. The editor helps you write code; the Go toolchain performs the actual build.

---

## 3. Your First Go Program

Create a practice directory:

```bash
mkdir -p go-bootcamp/day01
cd go-bootcamp/day01
```

Create `main.go`:

```go
package main

import "fmt"

func main() {
	fmt.Println("Hello, Go!")
}
```

Run it:

```bash
go run .
```

The output is:

```text
Hello, Go!
```

Line by line:

- `package main` puts the file in an executable package.
- `import "fmt"` imports the standard formatting package.
- `func main()` is the entry point; it has no parameters or declared return value.
- `fmt.Println` prints a value followed by a newline.

The compiler inserts most semicolons automatically. Brace placement is standardized as well, so let `gofmt` format the source.

---

## 4. Go Modules: Give the Project an Identity

Initialize a module before the exercise grows:

```bash
go mod init example.com/go-bootcamp/day01
```

This creates `go.mod`:

```go
module example.com/go-bootcamp/day01

go 1.24.0
```

The module path prefixes package imports inside the project. We use `example.com/...` as a placeholder. A public project commonly uses its repository path:

```bash
go mod init github.com/your-name/your-project
```

After changing dependencies, run:

```bash
go mod tidy
```

It adds dependencies used by the code and removes dependencies that are no longer referenced.

### Java Comparison

`go.mod` is a lighter relative of `pom.xml`:

- It declares the module path and Go version.
- It records direct and indirect dependencies.
- Dependency checksums live in `go.sum`.
- It does not define a large build lifecycle.

---

## 5. Packages, Imports, and the Main Entry Point

### 5.1 One Directory Normally Means One Package

Ordinary `.go` files in one directory must declare the same package. Here is a small extensible layout:

```text
day01/
  go.mod
  main.go
  greeting/
    greeting.go
```

`greeting/greeting.go`:

```go
package greeting

import "fmt"

func Message(name string) string {
	return fmt.Sprintf("Hello, %s!", name)
}
```

`main.go`:

```go
package main

import (
	"fmt"

	"example.com/go-bootcamp/day01/greeting"
)

func main() {
	fmt.Println(greeting.Message("CodeNest"))
}
```

### 5.2 Capitalization Controls Visibility

Go has no `public` or `private` keyword:

- `Message` starts with an uppercase letter and is available to other packages.
- `message` starts with a lowercase letter and remains package-private.

This applies to functions, types, fields, methods, and variables. Capitalization is part of the API, not just a naming preference.

### 5.3 Imports Must Be Used

The compiler rejects unused imports and local variables:

```go
import "strings" // Compilation fails if strings is never used.
```

Do not add dummy references to silence the compiler. Remove code you are not using yet.

---

## 6. Essential go Commands

| Command | Purpose |
|---------|---------|
| `go run .` | Compile and run the current main package |
| `go build ./...` | Build every package in the module |
| `go test ./...` | Run all module tests |
| `go fmt ./...` | Format Go source files |
| `go vet ./...` | Report suspicious constructs |
| `go mod tidy` | Reconcile module dependencies |
| `go doc fmt.Println` | Read documentation in the terminal |

Build a standalone executable:

```bash
go build -o bin/hello .
./bin/hello
```

Use `go run` for quick development feedback and `go build` when you need a distributable binary.

---

## 7. Project Layout and Naming

Follow these rules on Day 1:

- Use lowercase file names, such as `user_service.go`.
- Give packages short, meaningful lowercase names.
- Build import paths from the module path and subdirectory.
- Keep executable entry points in `main` packages and reusable code in ordinary packages.
- Run `go fmt ./...` before committing instead of manually debating indentation.

A common service layout looks like this:

```text
project/
  go.mod
  cmd/api/main.go
  internal/service/
  internal/repository/
```

This is not a requirement for tiny programs. `go.mod + main.go` is a perfectly good starting point. Let the structure grow with real responsibilities.

---

## 8. Mini Project: Command-Line Greeter

The program reads a name and prints a greeting plus the current Go environment.

```go
package main

import (
	"bufio"
	"fmt"
	"os"
	"runtime"
	"strings"
)

func main() {
	reader := bufio.NewReader(os.Stdin)

	fmt.Print("Your name: ")
	name, err := reader.ReadString('\n')
	if err != nil {
		fmt.Println("failed to read input:", err)
		return
	}

	name = strings.TrimSpace(name)
	if name == "" {
		name = "Go learner"
	}

	fmt.Printf("Hello, %s!\n", name)
	fmt.Printf("Environment: %s / %s\n", runtime.Version(), runtime.GOOS)
}
```

Run it with `go run .`. You do not need to understand every `if` or `err` yet. Notice the Go style: a function can return a result and an error, and the caller handles the error explicitly. Day 2 introduces conditions; Day 4 covers error handling in depth.

---

## 9. Exercises

### Exercise 1 | Profile Card (easy)

Print your name, role, and current learning goal on separate lines. Use `fmt.Printf` at least once.

### Exercise 2 | Extract a greeting Package (medium)

Move greeting generation into a `greeting` subpackage and call an exported function from `main`.

### Exercise 3 | Build a Binary (easy)

Run `go build -o bin/card .`, close the terminal, and verify that the resulting program still runs directly.

### Exercise 4 | Command-Line Arguments (optional)

Read the documentation for `os.Args` and make this command use `Alice` as the name:

```bash
go run . Alice
```

---

## 10. Java Comparison

| Goal | Go | Java |
|------|----|------|
| Entry point | `package main` + `func main()` | `public static void main` |
| Module config | `go.mod` | `pom.xml` / `build.gradle` |
| Import | `import "fmt"` | `import java...` |
| Public symbol | Uppercase first letter | `public` |
| Build | `go build` | `mvn package` |
| Format | `go fmt` | IDE / formatter plugin |

---

## 11. Troubleshooting

### `go: command not found`

Go is not installed or its executable directory is missing from `PATH`. Reinstall it, reopen the terminal, and run `go version`.

### `go: go.mod file not found`

The current directory is not inside a module. Enter the project directory and run `go mod init <module-path>`.

### `package ... is not in std`

A local import path is often wrong. Verify that it begins with the module value from `go.mod`.

### `imported and not used`

Remove the unused import. Go does not allow dead dependencies in source files.

### `package command-line-arguments is not a main package`

The selected directory is not a `main` package or has no `func main()`. A library package should be invoked by tests or another main package.

---

## 12. Completion Checklist

- [ ] `go version` works
- [ ] I can describe the basic roles of `GOROOT` and `GOPATH`
- [ ] I created my own `go.mod`
- [ ] I can start a program with `go run .`
- [ ] I can generate a binary with `go build`
- [ ] I know that uppercase names are exported
- [ ] I ran `go fmt ./...` and `go test ./...`
- [ ] I completed at least two exercises

Next, we build the language foundation: variables, constants, basic types, operators, `if`, `switch`, and Go's only loop, `for`.

