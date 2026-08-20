---
title: Go 零基础训练营 Day7｜goroutine、channel、锁与 context
summary: 从 goroutine、WaitGroup、channel、select 讲到 Mutex、竞态检测和 context，最终实现支持取消、超时和错误汇总的 worker pool。
author: CodeNest
category: syntax
tags: [语法学习, Go专项, Golang, 零基础训练营, Day7, Goroutine, Channel, Context, 并发]
createdAt: 2026-08-20
updatedAt: 2026-08-20
readingMinutes: 78
slug: go-zero-bootcamp-day07
---

# Go 零基础训练营 Day7｜goroutine、channel、锁与 context

> 上一篇：[Day6｜包设计、文件 I/O、JSON 与测试](/articles/go-zero-bootcamp-day06)
> 今天目标：理解并发任务的生命周期、通信、同步、取消和超时，能用 race detector 找出共享数据问题。
> 下一篇预告：Go 原生 `database/sql`，把 context、错误和资源释放用于真实数据库访问。

---

## 目录

1. 今日地图
2. 并发、并行与 goroutine
3. WaitGroup：等待生命周期结束
4. channel：用通信传递所有权
5. 缓冲、关闭、range 与方向
6. select、超时和多路复用
7. Mutex、RWMutex、atomic 与竞态检测
8. context：取消、截止时间与请求范围
9. 并发模式：pipeline、fan-out/fan-in
10. 综合项目：可取消 worker pool
11. 测试、练习、排错与打卡

---

## 0. 今日地图

| 主题 | 你要带走的能力 | Java 对照 |
|------|----------------|-----------|
| goroutine | 启动轻量并发任务 | executor task |
| WaitGroup | 等待一组任务完成 | CountDownLatch |
| channel | 在任务间传值与同步 | BlockingQueue / CSP |
| select | 等待多个 channel、超时 | select-like multiplexing |
| Mutex | 保护共享状态 | synchronized / Lock |
| context | 传递取消、超时、请求元数据 | cancellation token + request scope |

**今日关键词：并发必须有生命周期；发送方关闭 channel；不要复制使用中的锁；context 作为第一个参数向下传；任何 goroutine 都要能结束。**

---

## 1. 并发与并行

- 并发：多个任务的生命周期重叠，程序能在任务间推进。
- 并行：多个任务在不同 CPU 核心上同时执行。

Go 的 goroutine 是由运行时调度的轻量执行单元。创建 goroutine 表达并发，是否并行取决于 CPU、运行时和任务性质。

```go
func printMessage(message string) {
	fmt.Println(message)
}

func main() {
	go printMessage("from goroutine")
	fmt.Println("from main")
}
```

这个程序可能只输出 main，因为 main 返回时整个进程结束，不会自动等待其他 goroutine。

错误修复不是随便 `time.Sleep`。睡眠只是在某台机器上碰巧给任务时间，正确做法是显式同步。

### 1.1 匿名 goroutine

```go
go func(name string) {
	fmt.Println("hello", name)
}("Alice")
```

参数在启动时求值。并发闭包捕获外部可变变量时，要明确每个 goroutine 获得哪个值，并避免数据竞争。

### 1.2 goroutine 很轻，但不是免费

每个 goroutine 需要栈、调度和它持有的资源。无限创建会导致：

- 内存增长。
- 文件或网络连接耗尽。
- 下游被突发流量压垮。
- goroutine 永久阻塞形成泄漏。

生产代码通常使用并发上限、worker pool 或信号量。

---

## 2. sync.WaitGroup：等待任务完成

```go
func main() {
	var wg sync.WaitGroup

	for i := 1; i <= 3; i++ {
		wg.Add(1) // 启动前增加计数
		go func(taskID int) {
			defer wg.Done()
			fmt.Println("task", taskID)
		}(i)
	}

	wg.Wait()
	fmt.Println("all tasks completed")
}
```

规则：

- `Add` 在启动 goroutine 前执行，避免 Wait 提前观察到 0。
- goroutine 一开始 `defer wg.Done()`，确保任何返回路径都减计数。
- 不要复制使用中的 WaitGroup，通常传 `*sync.WaitGroup`。

常见错误：

```go
go func() {
	wg.Add(1) // 错误：Add 可能晚于主 goroutine 的 Wait
	defer wg.Done()
}()
```

WaitGroup 只负责等待，不传结果也不传播错误。结果可使用 channel；结构化任务组也可使用 `errgroup`（扩展库）。

---

## 3. channel：通信与同步

创建 channel：

```go
messages := make(chan string)
```

发送和接收：

```go
go func() {
	messages <- "hello"
}()

message := <-messages
fmt.Println(message)
```

无缓冲 channel 的发送与接收需要同时就绪。它既传值，也形成同步点：接收完成前发送方会等待。

### 3.1 用 channel 返回结果

```go
func squareAsync(value int) <-chan int {
	result := make(chan int, 1)
	go func() {
		defer close(result)
		result <- value * value
	}()
	return result
}

fmt.Println(<-squareAsync(5))
```

这里使用容量 1，避免调用方暂时不接收时 goroutine 卡在发送点。是否需要缓冲取决于协议，而不是“缓冲更快”。

### 3.2 nil channel

```go
var ch chan int
// ch <- 1 // 永久阻塞
// <-ch    // 永久阻塞
```

在 `select` 中，nil channel 对应 case 永远不会就绪，可用来动态关闭某个分支；无意 nil 则常造成泄漏。

---

## 4. 缓冲 channel、关闭与 range

### 4.1 缓冲 channel

```go
jobs := make(chan string, 2)
jobs <- "job-1"
jobs <- "job-2"

fmt.Println(<-jobs)
fmt.Println(<-jobs)
```

缓冲满后发送阻塞，缓冲空时接收阻塞。缓冲用于吸收有限速率差，不应掩盖消费者永久停止。

### 4.2 谁关闭 channel

原则：**发送方关闭，接收方不关闭。** 关闭表示“不会再有值”，不是销毁容器。

```go
values := make(chan int)

go func() {
	defer close(values)
	for i := 1; i <= 3; i++ {
		values <- i
	}
}()

for value := range values {
	fmt.Println(value)
}
```

接收关闭 channel：

```go
value, ok := <-values
if !ok {
	fmt.Println("channel closed")
}
```

关闭后仍可接收缓冲剩余值，耗尽后立即返回零值和 `ok=false`。

错误行为：

- 向已关闭 channel 发送会 panic。
- 重复 close 会 panic。
- 只为让接收方“停止等待”而由多个发送方随意 close，很容易竞态。

多个发送方时，让一个协调 goroutine 在所有发送方完成后关闭。

### 4.3 channel 方向

```go
func produce(output chan<- int) {
	defer close(output)
	for i := 1; i <= 3; i++ {
		output <- i
	}
}

func consume(input <-chan int) {
	for value := range input {
		fmt.Println(value)
	}
}
```

`chan<- T` 只发送，`<-chan T` 只接收。方向让函数合同更明确。

---

## 5. select：等待多个事件

```go
select {
case message := <-messages:
	fmt.Println("message:", message)
case err := <-errorsChannel:
	fmt.Println("error:", err)
}
```

若多个 case 同时可用，select 伪随机选择一个，不能依赖固定优先级。

### 5.1 超时

```go
select {
case result := <-resultChannel:
	fmt.Println(result)
case <-time.After(500 * time.Millisecond):
	fmt.Println("timeout")
}
```

循环中频繁 `time.After` 会不断创建计时器。可复用 timer：

```go
timer := time.NewTimer(500 * time.Millisecond)
defer timer.Stop()

select {
case result := <-resultChannel:
	fmt.Println(result)
case <-timer.C:
	fmt.Println("timeout")
}
```

### 5.2 非阻塞操作

```go
select {
case queue <- job:
	fmt.Println("queued")
default:
	fmt.Println("queue is full")
}
```

`default` 让 select 不等待。谨慎使用：忙循环中的 default 会持续占用 CPU。

### 5.3 ticker

```go
ticker := time.NewTicker(time.Second)
defer ticker.Stop()

for {
	select {
	case now := <-ticker.C:
		fmt.Println("tick", now)
	case <-done:
		return
	}
}
```

Ticker 不再使用时必须 Stop，但 Stop 不会关闭其 channel。

---

## 6. 数据竞争与 Mutex

下面代码有竞态：

```go
counter := 0
var wg sync.WaitGroup

for i := 0; i < 1000; i++ {
	wg.Add(1)
	go func() {
		defer wg.Done()
		counter++
	}()
}

wg.Wait()
fmt.Println(counter)
```

`counter++` 是读、加、写多个步骤，不是原子操作。运行竞态检测：

```bash
go test -race ./...
go run -race main.go
```

### 6.1 Mutex 保护共享状态

```go
type Counter struct {
	mu    sync.Mutex
	value int
}

func (c *Counter) Increment() {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.value++
}

func (c *Counter) Value() int {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.value
}
```

规则：

- 锁与它保护的数据放在同一个结构体。
- 持锁范围尽量短，不在锁内做慢网络 I/O。
- 不复制已经使用的 Mutex；包含锁的类型使用指针接收者。
- 不要依赖“只有一个写方”而忽略并发读写 Map，读写同时发生也会竞态甚至 panic。

### 6.2 RWMutex

```go
type Cache struct {
	mu     sync.RWMutex
	values map[string]string
}

func (c *Cache) Get(key string) (string, bool) {
	c.mu.RLock()
	defer c.mu.RUnlock()
	value, exists := c.values[key]
	return value, exists
}

func (c *Cache) Set(key, value string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.values[key] = value
}
```

RWMutex 适合读多写少，但复杂度更高。先用 Mutex，性能证据表明需要时再换。

### 6.3 atomic

简单计数或标志可用 `sync/atomic`：

```go
var count atomic.Int64
count.Add(1)
fmt.Println(count.Load())
```

多个字段必须保持一致时仍需要锁或通过 channel 交给单一所有者处理。

---

## 7. context：取消与截止时间

`context.Context` 在调用链中传递：

- 取消信号。
- 截止时间和超时。
- 请求范围的小量元数据。

约定：context 是函数第一个参数，命名 `ctx`，不存进长期结构体，不传 nil。

```go
func FindUser(ctx context.Context, id int64) (User, error) {
	// ...
}
```

### 7.1 WithCancel

```go
ctx, cancel := context.WithCancel(context.Background())
defer cancel()

go func() {
	// 某个条件发生后通知取消
	cancel()
}()

select {
case <-ctx.Done():
	fmt.Println("cancelled:", ctx.Err())
}
```

调用 cancel 释放相关资源，即使正常提前完成也应 `defer cancel()`。

### 7.2 WithTimeout

```go
ctx, cancel := context.WithTimeout(context.Background(), 500*time.Millisecond)
defer cancel()

result, err := slowOperation(ctx)
if errors.Is(err, context.DeadlineExceeded) {
	fmt.Println("operation timed out")
}
```

被调用函数必须主动观察取消：

```go
func slowOperation(ctx context.Context) (string, error) {
	select {
	case <-time.After(time.Second):
		return "done", nil
	case <-ctx.Done():
		return "", ctx.Err()
	}
}
```

### 7.3 Context Value

使用自定义 key 类型避免冲突：

```go
type contextKey string

const requestIDKey contextKey = "request-id"

ctx := context.WithValue(parent, requestIDKey, "req-123")
requestID, _ := ctx.Value(requestIDKey).(string)
```

只放请求范围、跨 API 边界的元数据，例如 request ID、认证主体。不要把数据库连接、配置和可选函数参数塞进 context。

### 7.4 不要创建失联 goroutine

如果父请求取消，子任务应尽快退出：

```go
func consume(ctx context.Context, jobs <-chan Job) error {
	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case job, ok := <-jobs:
			if !ok {
				return nil
			}
			process(job)
		}
	}
}
```

---

## 8. 模式一：pipeline

阶段一产生数字：

```go
func generate(ctx context.Context, values ...int) <-chan int {
	output := make(chan int)
	go func() {
		defer close(output)
		for _, value := range values {
			select {
			case output <- value:
			case <-ctx.Done():
				return
			}
		}
	}()
	return output
}
```

阶段二平方：

```go
func square(ctx context.Context, input <-chan int) <-chan int {
	output := make(chan int)
	go func() {
		defer close(output)
		for value := range input {
			select {
			case output <- value * value:
			case <-ctx.Done():
				return
			}
		}
	}()
	return output
}
```

组合：

```go
ctx, cancel := context.WithCancel(context.Background())
defer cancel()

for value := range square(ctx, generate(ctx, 1, 2, 3)) {
	fmt.Println(value)
}
```

每个阶段负责关闭自己的输出，并观察取消，防止下游停止接收后上游永久阻塞。

---

## 9. 模式二：fan-out / fan-in

多个 worker 共享输入是 fan-out；合并多个输出是 fan-in。

```go
func merge[T any](ctx context.Context, inputs ...<-chan T) <-chan T {
	output := make(chan T)
	var wg sync.WaitGroup

	forward := func(input <-chan T) {
		defer wg.Done()
		for value := range input {
			select {
			case output <- value:
			case <-ctx.Done():
				return
			}
		}
	}

	wg.Add(len(inputs))
	for _, input := range inputs {
		go forward(input)
	}

	go func() {
		wg.Wait()
		close(output)
	}()

	return output
}
```

负责关闭 output 的是协调 goroutine，因为它知道所有发送方都结束了。

---

## 10. 案例：并发查询，最先成功者获胜

```go
type QueryFunc func(context.Context) (string, error)

func firstSuccess(ctx context.Context, queries ...QueryFunc) (string, error) {
	if len(queries) == 0 {
		return "", errors.New("no queries provided")
	}

	ctx, cancel := context.WithCancel(ctx)
	defer cancel()

	type result struct {
		value string
		err   error
	}
	results := make(chan result, len(queries))

	for _, query := range queries {
		query := query
		go func() {
			value, err := query(ctx)
			select {
			case results <- result{value: value, err: err}:
			case <-ctx.Done():
			}
		}()
	}

	var lastErr error
	for range queries {
		select {
		case <-ctx.Done():
			return "", ctx.Err()
		case result := <-results:
			if result.err == nil {
				cancel()
				return result.value, nil
			}
			lastErr = result.err
		}
	}
	return "", fmt.Errorf("all queries failed: %w", lastErr)
}
```

结果 channel 容量等于任务数，避免函数提前返回后剩余 goroutine 卡在发送。查询函数仍必须尊重 ctx，才能尽快释放外部资源。

---

## 11. 综合项目：可取消 worker pool

目标：限定并发数处理任务；任一任务失败时取消其余任务；调用方超时时及时退出。

### 11.1 类型定义

```go
type Job struct {
	ID      int
	Payload string
}

type JobResult struct {
	JobID int
	Value string
}

type Processor func(context.Context, Job) (JobResult, error)
```

### 11.2 worker

```go
func worker(
	ctx context.Context,
	jobs <-chan Job,
	results chan<- JobResult,
	errorsChannel chan<- error,
	processor Processor,
	wg *sync.WaitGroup,
) {
	defer wg.Done()

	for {
		select {
		case <-ctx.Done():
			return
		case job, ok := <-jobs:
			if !ok {
				return
			}

			result, err := processor(ctx, job)
			if err != nil {
				select {
				case errorsChannel <- fmt.Errorf("job %d: %w", job.ID, err):
				case <-ctx.Done():
				}
				return
			}

			select {
			case results <- result:
			case <-ctx.Done():
				return
			}
		}
	}
}
```

### 11.3 调度和关闭

```go
func ProcessJobs(
	parent context.Context,
	jobsList []Job,
	workerCount int,
	processor Processor,
) ([]JobResult, error) {
	if workerCount < 1 {
		return nil, errors.New("workerCount must be at least 1")
	}
	if processor == nil {
		return nil, errors.New("processor must not be nil")
	}

	ctx, cancel := context.WithCancel(parent)
	defer cancel()

	jobs := make(chan Job)
	results := make(chan JobResult)
	errorsChannel := make(chan error, 1)

	var wg sync.WaitGroup
	wg.Add(workerCount)
	for i := 0; i < workerCount; i++ {
		go worker(ctx, jobs, results, errorsChannel, processor, &wg)
	}

	go func() {
		defer close(jobs)
		for _, job := range jobsList {
			select {
			case jobs <- job:
			case <-ctx.Done():
				return
			}
		}
	}()

	go func() {
		wg.Wait()
		close(results)
	}()

	collected := make([]JobResult, 0, len(jobsList))
	for {
		select {
		case <-parent.Done():
			cancel()
			return nil, parent.Err()
		case err := <-errorsChannel:
			cancel()
			return nil, err
		case result, ok := <-results:
			if !ok {
				return collected, nil
			}
			collected = append(collected, result)
		}
	}
}
```

为什么 errors channel 容量为 1？函数只需要第一个失败触发取消，worker 发送错误时不能因为主流程正处理其他分支而卡死。

结果顺序由完成时间决定。若业务要求输入顺序，在 `JobResult` 保存序号并最终排序。

### 11.4 调用

```go
ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
defer cancel()

jobs := []Job{
	{ID: 1, Payload: "go"},
	{ID: 2, Payload: "java"},
	{ID: 3, Payload: "python"},
}

processor := func(ctx context.Context, job Job) (JobResult, error) {
	select {
	case <-time.After(100 * time.Millisecond):
		return JobResult{JobID: job.ID, Value: strings.ToUpper(job.Payload)}, nil
	case <-ctx.Done():
		return JobResult{}, ctx.Err()
	}
}

results, err := ProcessJobs(ctx, jobs, 2, processor)
if err != nil {
	fmt.Println("process failed:", err)
	return
}
fmt.Println(results)
```

---

## 12. 并发测试

### 12.1 总是运行 race detector

```bash
go test -race ./...
```

它只能发现测试执行路径中的竞态，因此需要让测试真正并发运行关键代码。

### 12.2 测试超时和取消

```go
func TestProcessJobsTimeout(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Millisecond)
	defer cancel()

	processor := func(ctx context.Context, job Job) (JobResult, error) {
		<-ctx.Done()
		return JobResult{}, ctx.Err()
	}

	_, err := ProcessJobs(ctx, []Job{{ID: 1}}, 1, processor)
	if !errors.Is(err, context.DeadlineExceeded) {
		t.Fatalf("error = %v, want DeadlineExceeded", err)
	}
}
```

避免只用 `time.Sleep` 猜测调度顺序。使用 channel、context 和最终状态建立确定性同步。

### 12.3 检测 goroutine 泄漏思路

- 测试取消后函数必须在有限时间返回。
- 所有发送点都应可选择 `<-ctx.Done()`。
- 所有生产者明确关闭输出或由协调者关闭。
- 网络、数据库调用使用带 context 的 API。

---

## 13. 今日练习题

### 题目 1｜并发平方（easy）

启动固定数量 worker 计算 1～100 的平方，收集全部结果并按输入数字排序。运行 `-race`。

### 题目 2｜线程安全缓存（medium）

使用 `RWMutex` 实现并发安全的 `Get`、`Set`、`Delete`。写测试并发读写同一个 key。

### 题目 3｜超时聚合（medium）

并发调用三个模拟服务，在 300ms 总超时内收集成功结果；超时服务返回 context 错误，但其他成功结果仍保留。

### 题目 4｜有序 worker pool（optional）

扩展综合项目：并发执行但返回顺序与输入一致；支持 fail-fast 和 collect-all-errors 两种模式。

---

## 14. 今日对照表

| 概念 | Go | Java |
|------|----|------|
| 轻量任务 | goroutine | executor task / virtual thread |
| 等待组 | `sync.WaitGroup` | CountDownLatch |
| 消息传递 | channel | BlockingQueue |
| 多路等待 | `select` | CompletableFuture 组合等 |
| 独占锁 | `sync.Mutex` | synchronized / Lock |
| 读写锁 | `sync.RWMutex` | ReadWriteLock |
| 取消 | `context.Context` | cancellation token / interrupt |
| 竞态检测 | `go test -race` | 依赖工具与设计审计 |

---

## 15. 常见报错急救

### `fatal error: all goroutines are asleep - deadlock!`

所有 goroutine 都在等待，没有任何一方能推进。检查无接收方发送、未关闭 channel、WaitGroup 计数和锁重入。

### `send on closed channel`

发送方仍在写，但 channel 被关闭。由唯一协调者在所有发送方完成后关闭。

### `close of closed channel`

多个位置争抢关闭所有权。把 close 责任收敛到创建并控制发送生命周期的一方。

### `sync: negative WaitGroup counter`

Done 次数超过 Add，或 WaitGroup 被错误复用。启动前 Add，每个任务恰好 defer 一次 Done。

### `concurrent map read and map write`

Map 被并发读写。使用 Mutex/RWMutex、单 owner goroutine 或专用并发结构。

### goroutine 数量持续增长

发生泄漏。检查发送/接收是否有取消分支、外部 I/O 是否支持 context、ticker 是否停止、结果是否无人消费。

### context 超时了，但任务仍在运行

任务没有观察 `ctx.Done()`，或调用了不支持 context 的阻塞 API。取消是协作式协议，不会强杀 goroutine。

---

## 16. 打卡清单

- [ ] 能区分并发与并行
- [ ] 会正确 Add、Done、Wait
- [ ] 理解无缓冲与缓冲 channel 的阻塞条件
- [ ] 知道发送方关闭 channel，并会使用方向类型
- [ ] 会用 select 处理结果、超时和取消
- [ ] 能使用 Mutex/RWMutex/atomic 保护合适状态
- [ ] 会运行并解释 `go test -race`
- [ ] 会把 context 作为第一个参数向下传递
- [ ] 能写出不会因下游退出而泄漏的 pipeline
- [ ] 完成 worker pool 或至少 3 道练习

完成 Day 7 后，你已经具备用 Go 编写可靠基础模块的能力。下一阶段将把这些知识落到数据库：连接池、context 查询、参数化 SQL、结果扫描、事务和 Repository 实现。
