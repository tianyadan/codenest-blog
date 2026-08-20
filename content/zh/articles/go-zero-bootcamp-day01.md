---
title: Go 零基础训练营 Day1｜环境搭建、Go Modules 与第一个程序
summary: 从安装 Go 开始，掌握 go 命令、模块、包、main 入口和基础工程结构，并完成第一个可运行的命令行项目。
author: CodeNest
category: syntax
tags: [语法学习, Go专项, Golang, 零基础训练营, Day1, Java对比]
createdAt: 2026-08-20
updatedAt: 2026-08-20
readingMinutes: 38
slug: go-zero-bootcamp-day01
---

# Go 零基础训练营 Day1｜环境搭建、Go Modules 与第一个程序

> 今天目标：装好 Go，理解 **模块 / 包 / main 入口**，跑通第一个命令行项目。  
> 学习前提：不要求学过 Go；文中会用 Java 做必要对照。  
> 下一篇：[Day2｜变量、类型与流程控制](/articles/go-zero-bootcamp-day02)

---

## 目录

1. 今日地图
2. Go 是什么
3. 安装与环境检查
4. 第一个 Go 程序
5. Go Modules
6. 包与 main 入口
7. 常用 go 命令
8. 工程目录与命名习惯
9. 综合项目：命令行欢迎程序
10. 练习、排错与打卡

---

## 0. 今日地图

| 小节 | 你要带走的能力 | Java 对照 |
|------|----------------|-----------|
| 环境 | 安装 Go，确认版本和环境变量 | 安装 JDK |
| Hello World | 编译并运行 `.go` 文件 | `main` 方法 |
| Module | 用 `go.mod` 管理项目与依赖 | Maven `pom.xml` |
| Package | 理解包声明、导入和可见性 | Java package / import |
| 工具链 | 会用 run、build、fmt、test | Maven + IDE 格式化 |
| 工程实践 | 建立一个最小可维护项目 | 标准 Maven 工程 |

**今日关键词：一个目录通常对应一个包；`main` 包负责生成可执行程序；`go.mod` 定义模块身份。**

---

## 1. Go 是什么

Go 是一门静态类型、编译型语言，由 Google 发起。它的特点不是“语法花样多”，而是工具链统一、编译快、并发支持直接，适合 Web 服务、基础设施、云原生组件和命令行工具。

如果你学过 Java，可以先建立下面的对应关系：

| Java | Go |
|------|----|
| JDK | Go SDK |
| Maven / Gradle | Go Modules |
| `public static void main` | `package main` + `func main()` |
| class | struct + method |
| exception | `error` 返回值 |
| thread / executor | goroutine / channel |

Go 不追求把 Java 语法换一种写法。后面学习时，先理解 Go 的直接表达方式，不要急着给每个概念找 class。

---

## 2. 安装与环境检查

### 2.1 安装 Go

从官网下载安装包：[https://go.dev/dl/](https://go.dev/dl/)

建议安装当前稳定版本。完成后重新打开终端，执行：

```bash
go version
```

输出类似下面内容即表示安装成功：

```text
go version go1.24.0 darwin/arm64
```

版本号可能不同，不影响本教程。`darwin/arm64` 表示操作系统和 CPU 架构。

### 2.2 查看关键环境

```bash
go env GOROOT GOPATH GOOS GOARCH GOPROXY
```

- `GOROOT`：Go SDK 的安装目录，通常不需要手动修改。
- `GOPATH`：缓存、已安装命令等内容的工作目录。
- `GOOS` / `GOARCH`：目标操作系统与架构。
- `GOPROXY`：依赖下载代理。

现代 Go 项目使用 **Go Modules**，项目不需要放进 `GOPATH/src`。这是很多旧教程最容易造成的误导。

### 2.3 编辑器

VS Code 可安装官方 Go 扩展；GoLand 开箱即用。无论使用哪种编辑器，都应确保终端里的 `go version` 正常，因为构建最终依赖 Go 工具链，而不是编辑器本身。

---

## 3. 第一个 Go 程序

创建练习目录：

```bash
mkdir -p go-bootcamp/day01
cd go-bootcamp/day01
```

创建 `main.go`：

```go
package main

import "fmt"

func main() {
	fmt.Println("Hello, Go!")
}
```

运行：

```bash
go run .
```

输出：

```text
Hello, Go!
```

逐行理解：

- `package main`：当前文件属于 `main` 包，它可以被编译成可执行程序。
- `import "fmt"`：导入标准库的格式化输入输出包。
- `func main()`：程序入口，不接收参数，也不声明返回值。
- `fmt.Println`：输出内容并换行。

Go 的分号通常由编译器自动插入，不需要手写。花括号位置也有明确规范，交给 `gofmt` 统一处理。

---

## 4. Go Modules：先给项目一个身份

刚才的简单程序可能可以直接运行，但正式练习应先初始化模块：

```bash
go mod init example.com/go-bootcamp/day01
```

目录中会生成 `go.mod`：

```go
module example.com/go-bootcamp/day01

go 1.24.0
```

模块路径是项目内包导入路径的前缀。教程里使用 `example.com/...` 作为占位名称；真实开源项目常用仓库地址，例如：

```bash
go mod init github.com/your-name/your-project
```

常用命令：

```bash
go mod tidy
```

`go mod tidy` 会补齐代码实际使用的依赖，并移除不再使用的依赖。它不是“每次运行前必须执行”的命令，但修改依赖后值得运行。

### Java 对照

`go.mod` 有点像 `pom.xml`，但更轻：

- 声明模块路径和 Go 版本。
- 记录直接、间接依赖。
- 依赖校验信息保存在 `go.sum`。
- 不负责写复杂构建生命周期。

---

## 5. 包、导入与 main 入口

### 5.1 一个目录通常就是一个包

同一目录里的普通 `.go` 文件必须声明同一个包名。下面是一个可扩展结构：

```text
day01/
  go.mod
  main.go
  greeting/
    greeting.go
```

`greeting/greeting.go`：

```go
package greeting

import "fmt"

func Message(name string) string {
	return fmt.Sprintf("Hello, %s!", name)
}
```

`main.go`：

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

### 5.2 首字母决定可见性

Go 没有 `public` / `private` 关键字：

- `Message` 首字母大写，可以被其他包访问。
- `message` 首字母小写，只能在当前包访问。

这个规则适用于函数、类型、字段、方法和变量。大写不是普通命名偏好，而是 API 可见性的一部分。

### 5.3 导入必须被使用

Go 编译器不允许保留未使用的导入和局部变量。刚开始可能觉得严格，但它能让代码长期保持干净：

```go
import "strings" // 若没有使用，编译直接失败
```

不要为了绕过检查随便写空引用；删除暂时不用的代码即可。

---

## 6. 常用 go 命令

| 命令 | 用途 |
|------|------|
| `go run .` | 编译并立即运行当前 main 包 |
| `go build ./...` | 构建当前模块下所有包 |
| `go test ./...` | 运行当前模块下所有测试 |
| `go fmt ./...` | 格式化当前模块代码 |
| `go vet ./...` | 检查可疑代码 |
| `go mod tidy` | 整理模块依赖 |
| `go doc fmt.Println` | 在终端查看文档 |

构建可执行文件：

```bash
go build -o bin/hello .
./bin/hello
```

`go run` 适合开发时快速验证；`go build` 生成可以单独分发的二进制文件。

---

## 7. 工程目录与命名习惯

Day 1 先遵守这些规则：

- 文件名使用小写，多个单词可写成 `user_service.go`。
- 包名使用简短小写单词，不写 `utils_common_helpers` 这类模糊长名。
- 导入路径由模块路径、子目录组成；包名通常取目录最后一段。
- 可执行程序放在 `main` 包，库代码放在语义明确的普通包。
- 提交前运行 `go fmt ./...`，不要手工争论缩进风格。

一个常见但不是强制的服务结构：

```text
project/
  go.mod
  cmd/api/main.go
  internal/service/
  internal/repository/
```

今天不必照搬复杂目录。小程序只用 `go.mod + main.go` 完全正确，结构应随业务增长，而不是提前堆出来。

---

## 8. 综合项目：命令行欢迎程序

目标：接收一个名字，输出问候语和当前 Go 版本。

`main.go`：

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

	fmt.Print("请输入你的名字：")
	name, err := reader.ReadString('\n')
	if err != nil {
		fmt.Println("读取输入失败：", err)
		return
	}

	name = strings.TrimSpace(name)
	if name == "" {
		name = "Go 学习者"
	}

	fmt.Printf("你好，%s！\n", name)
	fmt.Printf("当前环境：%s / %s\n", runtime.Version(), runtime.GOOS)
}
```

运行：

```bash
go run .
```

今天不要求完全理解 `err` 和 `if`。先观察 Go 的风格：函数可能返回“结果 + 错误”，调用方明确处理错误。Day 2 会学习判断，Day 4 会系统学习错误处理。

---

## 9. 今日练习题

### 题目 1｜个人名片（easy）

输出姓名、职业和正在学习的语言，每项单独一行。要求使用 `fmt.Printf` 至少一次。

### 题目 2｜拆分 greeting 包（medium）

把生成问候语的逻辑放入 `greeting` 子包，通过导出函数在 `main` 包调用。

### 题目 3｜构建二进制（easy）

使用 `go build -o bin/card .` 生成程序，退出终端后仍能直接运行它。

### 题目 4｜命令行参数（optional）

阅读 `os.Args` 文档，让下面命令把 `Alice` 当作名字：

```bash
go run . Alice
```

---

## 10. 今日对照表

| 目标 | Go | Java |
|------|----|------|
| 程序入口 | `package main` + `func main()` | `public static void main` |
| 模块配置 | `go.mod` | `pom.xml` / `build.gradle` |
| 导入 | `import "fmt"` | `import java...` |
| 公开符号 | 名字首字母大写 | `public` |
| 构建 | `go build` | `mvn package` |
| 格式化 | `go fmt` | IDE / formatter 插件 |

---

## 11. 常见报错急救

### `go: command not found`

Go 未安装或可执行目录不在 `PATH`。重新安装后关闭并重开终端，再执行 `go version`。

### `go: go.mod file not found`

当前目录不在 Go 模块中。进入项目目录执行 `go mod init <module-path>`。

### `package ... is not in std`

常见原因是本地包导入路径写错。检查它是否以 `go.mod` 中的 module 路径开头。

### `imported and not used`

删除未使用的导入。Go 不允许把无效依赖留在源码中。

### `package command-line-arguments is not a main package`

要运行的目录不是 `main` 包，或没有 `func main()`。普通库包应由测试或其他 main 包调用。

---

## 12. 打卡清单

- [ ] `go version` 能正常输出
- [ ] 能解释 `GOROOT` 与 `GOPATH` 的基本用途
- [ ] 创建了自己的 `go.mod`
- [ ] 能用 `go run .` 启动程序
- [ ] 能用 `go build` 生成二进制文件
- [ ] 知道大写首字母代表包外可见
- [ ] 运行过 `go fmt ./...` 和 `go test ./...`
- [ ] 独立完成至少 2 道练习

下一篇将进入真正的语法地基：变量、常量、基础类型、运算符、`if`、`switch` 和 Go 唯一的循环 `for`。

