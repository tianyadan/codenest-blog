---
title: Go 零基础训练营 Day6｜包设计、文件 I/O、JSON 与测试
summary: 详细学习 Go 包边界、internal、路径与文件安全读写、JSON 编解码、表格驱动测试、临时目录、基准和模糊测试。
author: CodeNest
category: syntax
tags: [语法学习, Go专项, Golang, 零基础训练营, Day6, 文件IO, JSON, GoTest]
createdAt: 2026-08-20
updatedAt: 2026-08-20
readingMinutes: 68
slug: go-zero-bootcamp-day06
---

# Go 零基础训练营 Day6｜包设计、文件 I/O、JSON 与测试

> 上一篇：[Day5｜结构体、方法、接口与泛型](/articles/go-zero-bootcamp-day05)
> 今天目标：把代码组织成清晰包，可靠地读写文件和 JSON，并使用 Go 原生测试工具验证正常、异常与边界行为。
> 下一篇：[Day7｜goroutine、channel、锁与 context](/articles/go-zero-bootcamp-day07)

---

## 目录

1. 今日地图
2. 模块、包与目录边界
3. 文件路径与基础读写
4. 流式 I/O、缓冲与原子写入
5. JSON 编解码与标签
6. Go Test 与表格驱动测试
7. 依赖替身、临时目录、基准和 Fuzz
8. 综合项目：JSON 文件用户仓库
9. 练习、排错与打卡

---

## 0. 今日地图

| 主题 | 你要带走的能力 | Java 对照 |
|------|----------------|-----------|
| 包 | 按职责拆分、控制导出 API | package / module |
| internal | 限制仓库内部引用 | 模块内部实现包 |
| 文件 | 小文件、流式读取、权限、原子替换 | Files / streams |
| JSON | 标签、未知字段、流式解码 | Jackson |
| 测试 | table test、subtest、fake | JUnit parameterized test |
| 工具 | coverage、benchmark、fuzz、race | JaCoCo / JMH / fuzzing |

**今日关键词：包名描述能力而不是层级废话；路径不是字符串拼接；资源成功打开后立即 defer Close；JSON 输入应在边界校验；测试优先覆盖行为而非实现细节。**

---

## 1. 模块、包与目录边界

### 1.1 模块与包不是一回事

- 模块由 `go.mod` 定义，是依赖和版本边界。
- 包由同一目录中的 Go 文件组成，是编译和 API 边界。
- 一个模块通常包含多个包。

```text
user-service/
  go.mod                         # module example.com/user-service
  cmd/api/main.go                # package main
  internal/user/model.go         # package user
  internal/user/service.go       # package user
  internal/storage/jsonfile.go   # package storage
```

导入路径是模块路径加目录：

```go
import "example.com/user-service/internal/user"
```

包名通常是目录最后一段，但调用方使用的是包声明名：

```go
package user
```

### 1.2 internal 限制可见范围

任何包含 `internal` 的目录，只能被其父目录树中的代码导入。

```text
example.com/project/internal/storage
```

仓库外部模块无法导入它。适合不承诺公共兼容性的实现细节。

### 1.3 包设计原则

- 包名简短、具体：`user`、`storage`、`httpclient`。
- 避免 `util`、`common`、`misc` 逐渐变成杂物间。
- 避免重复：`user.UserService` 比 `service.UserService` 更能表达领域。
- 导出最小 API，未导出实现更容易修改。
- 依赖方向从入口指向业务，业务通过接口依赖外部能力。

### 1.4 避免循环依赖

若 `package user` 导入 `storage`，而 `storage` 又导入 `user`，编译器会拒绝。

解决思路不是强行抽 `common`：

1. 找出真正拥有数据类型的一方。
2. 让低层实现依赖稳定领域类型。
3. 在使用方定义小接口，反转行为依赖。
4. 若两个包总是互相依赖，可能本应是一个包。

### 1.5 init 的克制使用

```go
func init() {
	// 包被初始化时自动执行
}
```

适合注册驱动等少数机制。不要用 `init` 隐式读取配置、发网络请求或启动 goroutine；显式构造更可测试，也更容易理解启动顺序。

---

## 2. 路径与文件基础

### 2.1 使用 filepath 拼接本地路径

```go
path := filepath.Join("data", "users.json")
fmt.Println(path)
```

`path/filepath` 使用当前操作系统分隔符。处理 URL 路径使用 `path` 包，不要混用。

不要手工拼：

```go
// path := "data/" + fileName
```

用户提供文件名时要防止路径穿越：

```go
func safeFileName(name string) (string, error) {
	clean := filepath.Base(filepath.Clean(name))
	if clean == "." || clean == string(filepath.Separator) || clean != name {
		return "", errors.New("invalid file name")
	}
	return clean, nil
}
```

更可靠的设计是用户只传业务 ID，由程序决定完整路径。

### 2.2 一次读取小文件

```go
data, err := os.ReadFile("config.json")
if err != nil {
	return fmt.Errorf("read config: %w", err)
}
fmt.Println(string(data))
```

`os.ReadFile` 简洁，但会把整个文件读入内存。配置、小型 JSON 合适；日志和大数据文件应流式处理。

### 2.3 一次写入小文件

```go
content := []byte("hello\n")
if err := os.WriteFile("message.txt", content, 0o644); err != nil {
	return fmt.Errorf("write message: %w", err)
}
```

`0o644` 表示所有者可读写，组和其他用户只读。权限会受系统 umask 影响。密钥类文件应使用更严格的 `0o600`。

### 2.4 创建目录

```go
if err := os.MkdirAll(filepath.Join("data", "archive"), 0o755); err != nil {
	return fmt.Errorf("create archive directory: %w", err)
}
```

`MkdirAll` 在目录已存在时也成功。

### 2.5 判断错误原因

```go
data, err := os.ReadFile("missing.txt")
if errors.Is(err, fs.ErrNotExist) {
	fmt.Println("文件不存在")
} else if err != nil {
	fmt.Println("读取失败：", err)
} else {
	fmt.Println(string(data))
}
```

使用 `errors.Is` 判断包装后的文件系统错误，不要比较错误文本。

---

## 3. 流式 I/O 与缓冲

### 3.1 打开后立即安排关闭

```go
file, err := os.Open("app.log")
if err != nil {
	return fmt.Errorf("open log: %w", err)
}
defer file.Close()
```

只在打开成功后 defer。对写文件，`Close` 也可能返回错误；关键数据应显式处理：

```go
func writeImportant(path string, data []byte) (err error) {
	file, err := os.Create(path)
	if err != nil {
		return fmt.Errorf("create file: %w", err)
	}
	defer func() {
		if closeErr := file.Close(); err == nil && closeErr != nil {
			err = fmt.Errorf("close file: %w", closeErr)
		}
	}()

	if _, err := file.Write(data); err != nil {
		return fmt.Errorf("write file: %w", err)
	}
	return nil
}
```

### 3.2 io.Reader 与 io.Writer

```go
type Reader interface {
	Read(p []byte) (n int, err error)
}

type Writer interface {
	Write(p []byte) (n int, err error)
}
```

文件、网络连接、内存 Buffer、压缩流都可实现这些接口。业务函数接收 `io.Reader`，就能同时处理文件、字符串和测试输入。

```go
func countBytes(reader io.Reader) (int64, error) {
	count, err := io.Copy(io.Discard, reader)
	if err != nil {
		return 0, fmt.Errorf("copy input: %w", err)
	}
	return count, nil
}
```

### 3.3 按行读取

```go
scanner := bufio.NewScanner(file)
lineNumber := 0

for scanner.Scan() {
	lineNumber++
	line := scanner.Text()
	fmt.Println(lineNumber, line)
}

if err := scanner.Err(); err != nil {
	return fmt.Errorf("scan file: %w", err)
}
```

Scanner 默认单个 token 上限有限。可能出现超长行时提高缓冲或使用 `bufio.Reader`：

```go
scanner.Buffer(make([]byte, 64*1024), 1024*1024)
```

### 3.4 缓冲写入

```go
writer := bufio.NewWriter(file)
defer writer.Flush()

for _, value := range values {
	if _, err := fmt.Fprintln(writer, value); err != nil {
		return err
	}
}
```

重要数据应显式检查 `Flush` 错误，而不是只 defer：

```go
if err := writer.Flush(); err != nil {
	return fmt.Errorf("flush output: %w", err)
}
```

---

## 4. 原子写入：避免半个 JSON 文件

直接覆盖文件时，进程崩溃可能留下截断内容。常见做法：同目录写临时文件，刷新并关闭，再 rename 替换。

```go
func atomicWrite(path string, data []byte, permission fs.FileMode) (err error) {
	directory := filepath.Dir(path)
	if err := os.MkdirAll(directory, 0o755); err != nil {
		return fmt.Errorf("create directory: %w", err)
	}

	temporary, err := os.CreateTemp(directory, ".tmp-*")
	if err != nil {
		return fmt.Errorf("create temporary file: %w", err)
	}
	temporaryName := temporary.Name()

	defer func() {
		_ = temporary.Close()
		if err != nil {
			_ = os.Remove(temporaryName)
		}
	}()

	if err = temporary.Chmod(permission); err != nil {
		return fmt.Errorf("chmod temporary file: %w", err)
	}
	if _, err = temporary.Write(data); err != nil {
		return fmt.Errorf("write temporary file: %w", err)
	}
	if err = temporary.Sync(); err != nil {
		return fmt.Errorf("sync temporary file: %w", err)
	}
	if err = temporary.Close(); err != nil {
		return fmt.Errorf("close temporary file: %w", err)
	}
	if err = os.Rename(temporaryName, path); err != nil {
		return fmt.Errorf("replace target file: %w", err)
	}
	return nil
}
```

同一文件系统内 rename 通常是原子的。极高可靠性场景还要考虑同步父目录以及不同操作系统语义。

---

## 5. JSON 编解码

### 5.1 结构体标签

```go
type User struct {
	ID       int64     `json:"id"`
	Name     string    `json:"name"`
	Email    string    `json:"email,omitempty"`
	Password string    `json:"-"`
	CreatedAt time.Time `json:"createdAt"`
}
```

- 导出字段才会被 `encoding/json` 处理。
- `omitempty` 在零值时省略字段。
- `-` 永不输出，例如密码。
- 标签是反引号字符串，拼写错误不会自动成为编译错误。

### 5.2 Marshal 与 Unmarshal

```go
user := User{ID: 1, Name: "Alice", Email: "alice@example.com"}

data, err := json.MarshalIndent(user, "", "  ")
if err != nil {
	return fmt.Errorf("marshal user: %w", err)
}

var decoded User
if err := json.Unmarshal(data, &decoded); err != nil {
	return fmt.Errorf("unmarshal user: %w", err)
}
```

`Unmarshal` 需要指针，否则无法写入目标值。

### 5.3 区分缺失、null 与零值

普通字段无法区分“没传”和“传了零值”：

```go
type UpdateUserRequest struct {
	Name   *string `json:"name"`
	Active *bool   `json:"active"`
}
```

指针为 nil 表示字段缺失；非 nil 指向 false 或空字符串表示客户端明确传入。是否允许 JSON `null` 需要额外约定。

### 5.4 拒绝未知字段

HTTP 或配置边界建议严格解码：

```go
func decodeConfig(reader io.Reader) (Config, error) {
	decoder := json.NewDecoder(reader)
	decoder.DisallowUnknownFields()

	var config Config
	if err := decoder.Decode(&config); err != nil {
		return Config{}, fmt.Errorf("decode config: %w", err)
	}
	if err := decoder.Decode(&struct{}{}); !errors.Is(err, io.EOF) {
		return Config{}, errors.New("input must contain one JSON value")
	}
	return config, nil
}
```

第二次 Decode 防止输入中偷偷附带第二个 JSON 值。

### 5.5 流式 JSON

逐条处理大文件：

```go
decoder := json.NewDecoder(file)
for {
	var event Event
	if err := decoder.Decode(&event); errors.Is(err, io.EOF) {
		break
	} else if err != nil {
		return fmt.Errorf("decode event: %w", err)
	}
	process(event)
}
```

`Encoder.Encode` 会在每个 JSON 后添加换行，适合 JSON Lines。

---

## 6. Go Test 基础

测试文件以 `_test.go` 结尾，测试函数以 `Test` 开头：

```go
func Add(a, b int) int {
	return a + b
}
```

```go
func TestAdd(t *testing.T) {
	got := Add(2, 3)
	want := 5
	if got != want {
		t.Fatalf("Add(2, 3) = %d, want %d", got, want)
	}
}
```

运行：

```bash
go test ./...
go test -v ./...
go test -run TestAdd ./...
go test -count=1 ./...
```

`-count=1` 禁用测试缓存，适合排查依赖时间或外部状态的测试。

### 6.1 表格驱动测试

```go
func TestParsePage(t *testing.T) {
	tests := []struct {
		name      string
		pageText  string
		sizeText  string
		want      Page
		wantError bool
	}{
		{name: "valid", pageText: "2", sizeText: "20", want: Page{Number: 2, Size: 20}},
		{name: "invalid page format", pageText: "x", sizeText: "20", wantError: true},
		{name: "page below one", pageText: "0", sizeText: "20", wantError: true},
		{name: "size too large", pageText: "1", sizeText: "101", wantError: true},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			got, err := parsePage(test.pageText, test.sizeText)
			if test.wantError {
				if err == nil {
					t.Fatal("expected error, got nil")
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if got != test.want {
				t.Fatalf("got %+v, want %+v", got, test.want)
			}
		})
	}
}
```

每个用例命名，失败时能直接定位。覆盖正常值、空值、边界值、非法格式和业务上限。

### 6.2 Helper

```go
func requireNoError(t *testing.T, err error) {
	t.Helper()
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}
```

`t.Helper()` 让失败行号指向调用者，而不是辅助函数内部。

### 6.3 测试错误身份

```go
if !errors.Is(err, ErrNotFound) {
	t.Fatalf("got error %v, want ErrNotFound", err)
}
```

不要只比较完整错误文本，除非文本本身就是明确合同。

---

## 7. 文件测试与依赖替身

### 7.1 t.TempDir

```go
func TestSaveAndLoad(t *testing.T) {
	directory := t.TempDir()
	path := filepath.Join(directory, "users.json")

	// 使用 path 测试，结束后目录自动清理
}
```

不要让单元测试写固定 `/tmp/demo`，并行测试会互相污染。

### 7.2 通过接口替换依赖

```go
type UserLoader interface {
	Load(id int64) (User, error)
}

type fakeUserLoader struct {
	user User
	err  error
}

func (f fakeUserLoader) Load(id int64) (User, error) {
	return f.user, f.err
}
```

fake 是有行为的小实现；stub 通常返回固定值；mock 常验证交互。Go 中手写小 fake 往往比引入重量框架更清晰。

### 7.3 测试并行

```go
t.Run(test.name, func(t *testing.T) {
	t.Parallel()
	// 用例必须不共享可变状态
})
```

先确保数据隔离再并行。并行不是让不稳定测试“跑快一点”的按钮。

---

## 8. 覆盖率、基准与 Fuzz

### 8.1 覆盖率

```bash
go test -cover ./...
go test -coverprofile=coverage.out ./...
go tool cover -html=coverage.out
```

覆盖率提示未执行路径，不证明断言正确。优先测试风险边界，而不是追求 100% 数字。

### 8.2 基准测试

```go
func BenchmarkUnique(b *testing.B) {
	values := []string{"go", "java", "go", "python"}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_ = uniqueNormalized(values)
	}
}
```

运行：

```bash
go test -bench=. -benchmem ./...
```

基准只比较稳定、真实的热点，不要凭一次结果得出结论。

### 8.3 Fuzz 测试

```go
func FuzzParseConfigNeverPanics(f *testing.F) {
	f.Add("HOST=localhost\nPORT=8080")
	f.Add("")

	f.Fuzz(func(t *testing.T, input string) {
		_, _ = parseConfig(input)
	})
}
```

运行：

```bash
go test -fuzz=FuzzParseConfigNeverPanics -fuzztime=10s
```

Fuzz 适合解析器、编解码器和边界输入，可发现未想到的崩溃。

---

## 9. 综合项目：JSON 文件用户仓库

### 9.1 模型和仓库

```go
var ErrUserNotFound = errors.New("user not found")

type User struct {
	ID    int64  `json:"id"`
	Name  string `json:"name"`
	Email string `json:"email"`
}

type JSONUserRepository struct {
	path string
}

func NewJSONUserRepository(path string) *JSONUserRepository {
	return &JSONUserRepository{path: path}
}
```

### 9.2 读取全部数据

```go
func (r *JSONUserRepository) loadAll() ([]User, error) {
	data, err := os.ReadFile(r.path)
	if errors.Is(err, fs.ErrNotExist) {
		return []User{}, nil
	}
	if err != nil {
		return nil, fmt.Errorf("read users file: %w", err)
	}

	var users []User
	if err := json.Unmarshal(data, &users); err != nil {
		return nil, fmt.Errorf("decode users file: %w", err)
	}
	if users == nil {
		users = []User{}
	}
	return users, nil
}
```

### 9.3 查询与保存

```go
func (r *JSONUserRepository) FindByID(id int64) (User, error) {
	users, err := r.loadAll()
	if err != nil {
		return User{}, err
	}
	for _, user := range users {
		if user.ID == id {
			return user, nil
		}
	}
	return User{}, ErrUserNotFound
}

func (r *JSONUserRepository) Save(user User) error {
	if user.ID <= 0 || strings.TrimSpace(user.Name) == "" {
		return errors.New("user id and name are required")
	}

	users, err := r.loadAll()
	if err != nil {
		return err
	}

	found := false
	for index := range users {
		if users[index].ID == user.ID {
			users[index] = user
			found = true
			break
		}
	}
	if !found {
		users = append(users, user)
	}

	data, err := json.MarshalIndent(users, "", "  ")
	if err != nil {
		return fmt.Errorf("encode users: %w", err)
	}
	data = append(data, '\n')

	if err := atomicWrite(r.path, data, 0o644); err != nil {
		return fmt.Errorf("save users: %w", err)
	}
	return nil
}
```

该仓库适合教学和小工具，不适合多进程并发写。数据库章节会解决事务、锁和并发更新。

### 9.4 表格测试核心

```go
func TestJSONUserRepository_SaveAndFind(t *testing.T) {
	repository := NewJSONUserRepository(filepath.Join(t.TempDir(), "users.json"))

	want := User{ID: 1, Name: "Alice", Email: "alice@example.com"}
	if err := repository.Save(want); err != nil {
		t.Fatalf("Save() error = %v", err)
	}

	got, err := repository.FindByID(1)
	if err != nil {
		t.Fatalf("FindByID() error = %v", err)
	}
	if got != want {
		t.Fatalf("FindByID() = %+v, want %+v", got, want)
	}
}

func TestJSONUserRepository_FindMissing(t *testing.T) {
	repository := NewJSONUserRepository(filepath.Join(t.TempDir(), "users.json"))

	_, err := repository.FindByID(404)
	if !errors.Is(err, ErrUserNotFound) {
		t.Fatalf("error = %v, want ErrUserNotFound", err)
	}
}
```

还应增加：覆盖更新、损坏 JSON、非法用户、目录自动创建等用例。

---

## 10. 今日练习题

### 题目 1｜日志统计（easy）

使用 `bufio.Scanner` 按行读取日志，统计 INFO、WARN、ERROR 数量；空行忽略，最后稳定输出。

### 题目 2｜严格配置解码（medium）

实现 JSON 配置读取：拒绝未知字段、只允许一个 JSON 值、端口范围 1～65535，并写表格测试覆盖边界。

### 题目 3｜原子待办仓库（medium）

实现 JSON 文件 Todo 仓库，支持新增、完成和查询。使用 `t.TempDir` 测试空文件、覆盖和损坏文件。

### 题目 4｜Fuzz 字符串解析器（optional）

为 Day 4 的 `parseLines` 增加 Fuzz：任意输入不得 panic；成功时所有 key 非空。

---

## 11. 今日对照表

| 概念 | Go | Java |
|------|----|------|
| 模块 | `go.mod` | Maven / Gradle module |
| 包边界 | 目录 + package | package |
| 内部 API | `internal` | module-private 约定 |
| 小文件 | `os.ReadFile` / `WriteFile` | `Files.readAllBytes` |
| 流接口 | `io.Reader` / `Writer` | InputStream / OutputStream |
| JSON | `encoding/json` + tags | Jackson annotations |
| 测试 | `testing` | JUnit |
| 参数化 | table + `t.Run` | ParameterizedTest |

---

## 12. 常见报错急救

### `import cycle not allowed`

两个包互相依赖。重新确认类型所有权和依赖方向，在使用方定义接口，或合并本来不可分割的包。

### `permission denied`

检查父目录权限、目标文件权限和运行用户。不要用全局 `0777` 掩盖问题。

### JSON 字段没有输出

字段首字母小写未导出，或标签写了 `json:"-"`。`encoding/json` 只能访问导出字段。

### `json: Unmarshal(non-pointer T)`

目标必须传指针，如 `json.Unmarshal(data, &value)`。

### Scanner 读取超长行失败

检查 `scanner.Err()`，提高 Buffer 上限或改用 `bufio.Reader`。

### 测试单独成功、一起失败

用例共享文件、全局变量、端口或时间。使用 `t.TempDir`、依赖注入和独立状态。

---

## 13. 打卡清单

- [ ] 能区分 module 与 package
- [ ] 会设计 `internal` 和清晰依赖方向
- [ ] 会安全打开、关闭、扫描和写入文件
- [ ] 理解为什么关键文件需要原子替换
- [ ] 会使用 JSON 标签、严格解码和可选字段
- [ ] 会编写表格驱动测试与子测试
- [ ] 会使用 fake、`t.TempDir` 和错误链断言
- [ ] 知道覆盖率、基准和 Fuzz 各解决什么问题
- [ ] 完成至少 3 个案例或练习

下一篇进入 Go 的核心优势：并发。我们会从 goroutine 和 channel 开始，最终完成支持超时、取消、限流和错误汇总的任务池。
