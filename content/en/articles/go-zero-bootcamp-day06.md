---
title: Go Zero-to-One Bootcamp Day 6 | Packages, File I/O, JSON, and Testing
summary: Learn package boundaries, internal, safe file paths and writes, JSON encoding, table-driven tests, temporary directories, benchmarks, and fuzzing.
author: CodeNest
category: syntax
tags: [Syntax, Go, Golang, Beginner Bootcamp, Day6, FileIO, JSON, GoTest]
createdAt: 2026-08-20
updatedAt: 2026-08-20
readingMinutes: 64
slug: go-zero-bootcamp-day06
---

# Go Zero-to-One Bootcamp Day 6 | Packages, File I/O, JSON, and Testing

> Previous: [Day 5 | Structs, Methods, Interfaces, and Generics](/articles/go-zero-bootcamp-day05)
> Goal: organize code into clear packages, read and write files and JSON reliably, and verify normal, failure, and boundary behavior with Go's native tools.
> Next: [Day 7 | goroutines, channels, Locks, and context](/articles/go-zero-bootcamp-day07)

---

## Table of Contents

1. Today's map
2. Modules, packages, and directory boundaries
3. Paths and basic file operations
4. Streaming I/O, buffering, and atomic writes
5. JSON encoding and decoding
6. Go tests and table-driven cases
7. Fakes, temporary directories, benchmarks, and fuzzing
8. Mini project: JSON user repository
9. Exercises, troubleshooting, and checklist

---

## 0. Today's Map

| Topic | What you will be able to do | Java comparison |
|-------|-----------------------------|-----------------|
| Packages | Separate responsibilities and export a small API | package / module |
| internal | Prevent external imports of implementation details | internal implementation package |
| Files | Read small files, stream large ones, and replace safely | Files / streams |
| JSON | Use tags, optional fields, and strict decoding | Jackson |
| Tests | Write tables, subtests, and fakes | JUnit parameterized test |
| Tools | Measure coverage, benchmarks, fuzz, and races | JaCoCo / JMH / fuzzing |

**Key ideas: package names describe capabilities; paths are not manual string concatenation; defer Close immediately after a successful open; validate JSON at boundaries; test behavior rather than implementation details.**

---

## 1. Modules, Packages, and Boundaries

### 1.1 Module and Package Are Different

- A module is defined by `go.mod` and controls dependencies and versions.
- A package is built from Go files in one directory and controls APIs.
- One module normally contains many packages.

```text
user-service/
  go.mod
  cmd/api/main.go
  internal/user/model.go
  internal/user/service.go
  internal/storage/jsonfile.go
```

The import path combines module path and directory:

```go
import "example.com/user-service/internal/user"
```

### 1.2 internal Restricts Imports

A directory below `internal` can be imported only by code in the parent tree. External modules cannot depend on `example.com/project/internal/storage`.

Use it for implementation details that do not promise public compatibility.

### 1.3 Package Design Guidelines

- Prefer short, concrete names: `user`, `storage`, `httpclient`.
- Avoid dumping unrelated helpers into `util`, `common`, or `misc`.
- Avoid repetition: `user.Service` often reads better than `service.UserService`.
- Export the minimum API and keep implementation unexported.
- Point dependencies from entry points toward business code; business code depends on external behavior through interfaces.

### 1.4 Prevent Import Cycles

If `user` imports `storage` and `storage` imports `user`, compilation fails. Resolve ownership rather than creating a giant `common` package:

1. Decide which package owns the data type.
2. Let lower-level implementations depend on stable domain values.
3. Define behavioral interfaces at consumers.
4. Merge packages that cannot meaningfully exist apart.

### 1.5 Use init Sparingly

`init()` runs automatically during package initialization. Driver registration is a common use. Avoid hidden configuration reads, network calls, or goroutine startup; explicit construction is testable and shows startup order.

---

## 2. Paths and Basic Files

### 2.1 Join Local Paths with filepath

```go
path := filepath.Join("data", "users.json")
```

`path/filepath` follows operating-system separators. Use `path` for URL paths.

Do not concatenate `"data/" + fileName`. For user-provided names, protect against traversal or, preferably, accept a business ID and choose the path in code.

```go
func safeFileName(name string) (string, error) {
	clean := filepath.Base(filepath.Clean(name))
	if clean == "." || clean == string(filepath.Separator) || clean != name {
		return "", errors.New("invalid file name")
	}
	return clean, nil
}
```

### 2.2 Read a Small File

```go
data, err := os.ReadFile("config.json")
if err != nil {
	return fmt.Errorf("read config: %w", err)
}
```

The complete file is loaded into memory. This is fine for configuration and small JSON, not large logs.

### 2.3 Write a Small File

```go
if err := os.WriteFile("message.txt", []byte("hello\n"), 0o644); err != nil {
	return fmt.Errorf("write message: %w", err)
}
```

Use restrictive `0o600` for secrets. Effective permissions may also depend on umask.

### 2.4 Create Directories

```go
if err := os.MkdirAll(filepath.Join("data", "archive"), 0o755); err != nil {
	return fmt.Errorf("create archive directory: %w", err)
}
```

### 2.5 Inspect File Errors

```go
data, err := os.ReadFile("missing.txt")
if errors.Is(err, fs.ErrNotExist) {
	fmt.Println("file is missing")
} else if err != nil {
	fmt.Println("read failed:", err)
} else {
	fmt.Println(string(data))
}
```

Use `errors.Is` so wrapped filesystem errors remain detectable.

---

## 3. Streaming I/O and Buffers

### 3.1 Close After a Successful Open

```go
file, err := os.Open("app.log")
if err != nil {
	return fmt.Errorf("open log: %w", err)
}
defer file.Close()
```

Critical writes should also inspect close failures:

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

### 3.2 io.Reader and io.Writer

Files, sockets, memory buffers, and compressed streams can share tiny interfaces:

```go
type Reader interface {
	Read(p []byte) (n int, err error)
}

type Writer interface {
	Write(p []byte) (n int, err error)
}
```

A function accepting `io.Reader` can process a file, string, or test buffer:

```go
func countBytes(reader io.Reader) (int64, error) {
	count, err := io.Copy(io.Discard, reader)
	if err != nil {
		return 0, fmt.Errorf("copy input: %w", err)
	}
	return count, nil
}
```

### 3.3 Scan Lines

```go
scanner := bufio.NewScanner(file)
lineNumber := 0

for scanner.Scan() {
	lineNumber++
	fmt.Println(lineNumber, scanner.Text())
}
if err := scanner.Err(); err != nil {
	return fmt.Errorf("scan file: %w", err)
}
```

Scanner has a default token limit. Increase it for potentially long lines or use `bufio.Reader`:

```go
scanner.Buffer(make([]byte, 64*1024), 1024*1024)
```

### 3.4 Buffered Output

```go
writer := bufio.NewWriter(file)
for _, value := range values {
	if _, err := fmt.Fprintln(writer, value); err != nil {
		return err
	}
}
if err := writer.Flush(); err != nil {
	return fmt.Errorf("flush output: %w", err)
}
```

---

## 4. Atomic Replacement

Overwriting a file directly can leave truncated JSON after a crash. Write a temporary file in the same directory, sync and close it, then rename it over the target:

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

A rename within one filesystem is normally atomic. Higher durability requirements also consider parent-directory syncing and OS-specific behavior.

---

## 5. JSON Encoding and Decoding

### 5.1 Struct Tags

```go
type User struct {
	ID        int64     `json:"id"`
	Name      string    `json:"name"`
	Email     string    `json:"email,omitempty"`
	Password  string    `json:"-"`
	CreatedAt time.Time `json:"createdAt"`
}
```

- Only exported fields are processed.
- `omitempty` omits zero values.
- `-` excludes a field such as a password.
- Tags are backtick strings; misspellings may not be compile errors.

### 5.2 Marshal and Unmarshal

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

Unmarshal requires a pointer so it can modify the destination.

### 5.3 Missing Fields Versus Zero Values

Ordinary fields cannot distinguish omission from an explicit zero:

```go
type UpdateUserRequest struct {
	Name   *string `json:"name"`
	Active *bool   `json:"active"`
}
```

nil means missing; a non-nil pointer can explicitly carry false or an empty string. Define separately whether JSON null is accepted.

### 5.4 Reject Unknown Fields

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

The second decode rejects a hidden second JSON value.

### 5.5 Streaming JSON

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

`Encoder.Encode` appends a newline and works well for JSON Lines.

---

## 6. Go Tests

Test files end with `_test.go`; test functions begin with `Test`:

```go
func TestAdd(t *testing.T) {
	got := Add(2, 3)
	want := 5
	if got != want {
		t.Fatalf("Add(2, 3) = %d, want %d", got, want)
	}
}
```

Useful commands:

```bash
go test ./...
go test -v ./...
go test -run TestAdd ./...
go test -count=1 ./...
```

### 6.1 Table-Driven Tests

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

Name each case and cover valid values, emptiness, format failures, and lower and upper boundaries.

### 6.2 Helpers and Error Identity

```go
func requireNoError(t *testing.T, err error) {
	t.Helper()
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}
```

Use `errors.Is` to test error contracts rather than comparing complete contextual messages.

---

## 7. File Tests and Dependency Fakes

### 7.1 t.TempDir

```go
func TestSaveAndLoad(t *testing.T) {
	directory := t.TempDir()
	path := filepath.Join(directory, "users.json")
	// The directory is removed after the test.
}
```

Avoid fixed shared paths such as `/tmp/demo`.

### 7.2 Small Handwritten Fakes

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

A fake has small working behavior; a stub returns fixed data; a mock often verifies interactions. Handwritten fakes are frequently clearer than a large framework in Go.

### 7.3 Parallel Tests

```go
t.Run(test.name, func(t *testing.T) {
	t.Parallel()
	// This case must not share mutable state.
})
```

Isolate state before enabling parallelism.

---

## 8. Coverage, Benchmarks, and Fuzzing

### 8.1 Coverage

```bash
go test -cover ./...
go test -coverprofile=coverage.out ./...
go tool cover -html=coverage.out
```

Coverage reports paths that ran; it does not prove assertions are meaningful. Test risk boundaries instead of chasing a number.

### 8.2 Benchmark

```go
func BenchmarkUnique(b *testing.B) {
	values := []string{"go", "java", "go", "python"}
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_ = uniqueNormalized(values)
	}
}
```

```bash
go test -bench=. -benchmem ./...
```

### 8.3 Fuzz Test

```go
func FuzzParseConfigNeverPanics(f *testing.F) {
	f.Add("HOST=localhost\nPORT=8080")
	f.Add("")

	f.Fuzz(func(t *testing.T, input string) {
		_, _ = parseConfig(input)
	})
}
```

```bash
go test -fuzz=FuzzParseConfigNeverPanics -fuzztime=10s
```

Fuzzing is especially useful for parsers and decoders.

---

## 9. Mini Project: JSON User Repository

### 9.1 Model and Repository

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

### 9.2 Load Data

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

### 9.3 Find and Save

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

This repository is useful for learning and small tools, not concurrent multi-process writes. The database chapters add transactions and concurrency control.

### 9.4 Core Tests

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

Also cover updates, malformed JSON, invalid users, and directory creation.

---

## 10. Exercises

### Exercise 1 | Log Summary (easy)

Scan a log line by line and count INFO, WARN, and ERROR. Skip blanks and print stable output.

### Exercise 2 | Strict Config Decoder (medium)

Reject unknown fields and extra JSON values, validate port 1-65535, and write table tests for boundaries.

### Exercise 3 | Atomic Todo Repository (medium)

Build a JSON todo repository with create, complete, and find. Test empty, overwrite, and malformed-file behavior with `t.TempDir`.

### Exercise 4 | Fuzz a Parser (optional)

Fuzz Day 4's `parseLines`: arbitrary input must not panic, and every key must be non-empty after success.

---

## 11. Java Comparison

| Concept | Go | Java |
|---------|----|------|
| Module | `go.mod` | Maven / Gradle module |
| Package boundary | directory + package | package |
| Internal API | `internal` | module-private convention |
| Small files | `os.ReadFile` / `WriteFile` | `Files.readAllBytes` |
| Streams | `io.Reader` / `Writer` | InputStream / OutputStream |
| JSON | `encoding/json` + tags | Jackson annotations |
| Tests | `testing` | JUnit |
| Parameterization | table + `t.Run` | ParameterizedTest |

---

## 12. Troubleshooting

### `import cycle not allowed`

Revisit type ownership and dependency direction. Define an interface at the consumer or merge inseparable packages.

### `permission denied`

Inspect parent directory, target permissions, and the runtime user. Do not hide the cause with global `0777`.

### A JSON Field Is Missing

The field may be unexported or tagged `json:"-"`. `encoding/json` processes exported fields only.

### `json: Unmarshal(non-pointer T)`

Pass a pointer destination, such as `json.Unmarshal(data, &value)`.

### Scanner Fails on a Long Line

Check `scanner.Err()`, increase the buffer limit, or use `bufio.Reader`.

### A Test Passes Alone but Fails in the Suite

Cases share files, globals, ports, or time. Use `t.TempDir`, injected dependencies, and isolated state.

---

## 13. Completion Checklist

- [ ] I distinguish modules from packages
- [ ] I design `internal` and a clear dependency direction
- [ ] I open, close, scan, and write files safely
- [ ] I understand atomic replacement for critical files
- [ ] I use JSON tags, strict decoding, and optional fields
- [ ] I write table-driven tests and subtests
- [ ] I use fakes, `t.TempDir`, and error-chain assertions
- [ ] I know the roles of coverage, benchmarks, and fuzzing
- [ ] I completed at least three examples or exercises

Next, we enter Go's defining strength: concurrency, progressing from goroutines and channels to a cancellable, time-bounded worker pool.
