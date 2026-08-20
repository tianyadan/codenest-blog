---
title: Go Zero-to-One Bootcamp Day 7 | goroutines, channels, Locks, and context
summary: Progress from goroutines, WaitGroup, channels, and select to mutexes, race detection, and context, then build a cancellable worker pool.
author: CodeNest
category: syntax
tags: [Syntax, Go, Golang, Beginner Bootcamp, Day7, Goroutine, Channel, Context, Concurrency]
createdAt: 2026-08-20
updatedAt: 2026-08-20
readingMinutes: 74
slug: go-zero-bootcamp-day07
---

# Go Zero-to-One Bootcamp Day 7 | goroutines, channels, Locks, and context

> Previous: [Day 6 | Packages, File I/O, JSON, and Testing](/articles/go-zero-bootcamp-day06)
> Goal: manage concurrent task lifecycles, communication, synchronization, cancellation, and timeouts, then find shared-state bugs with the race detector.
> Next preview: native `database/sql`, applying context, errors, and resource cleanup to real database access.

---

## Table of Contents

1. Today's map
2. Concurrency, parallelism, and goroutines
3. WaitGroup and task lifetime
4. Channels, buffers, closure, and direction
5. select, timeouts, and multiplexing
6. Mutex, RWMutex, atomic, and race detection
7. context cancellation and deadlines
8. Pipelines and fan-out/fan-in
9. First-success query example
10. Mini project: cancellable worker pool
11. Testing, exercises, troubleshooting, and checklist

---

## 0. Today's Map

| Topic | What you will be able to do | Java comparison |
|-------|-----------------------------|-----------------|
| goroutine | Start lightweight concurrent tasks | executor task |
| WaitGroup | Wait for a task set to finish | CountDownLatch |
| channel | Transfer values and synchronize | BlockingQueue / CSP |
| select | Wait on channels and timeouts | multiplexed wait |
| Mutex | Protect shared state | synchronized / Lock |
| context | Propagate cancellation, deadlines, and request data | cancellation token + request scope |

**Key ideas: concurrency needs explicit lifetime ownership; senders close channels; never copy a lock in use; pass context as the first parameter; every goroutine needs an exit path.**

---

## 1. Concurrency and Parallelism

- Concurrency means task lifetimes overlap and the program can make progress among them.
- Parallelism means tasks execute simultaneously on multiple CPU cores.

A goroutine is a lightweight execution unit scheduled by the Go runtime. Starting one expresses concurrency; actual parallelism depends on runtime conditions and workload.

```go
func printMessage(message string) {
	fmt.Println(message)
}

func main() {
	go printMessage("from goroutine")
	fmt.Println("from main")
}
```

This may print only the main message because process exit does not wait for goroutines. Adding arbitrary sleep is not synchronization; use an explicit protocol.

### 1.1 Anonymous goroutine

```go
go func(name string) {
	fmt.Println("hello", name)
}("Alice")
```

Arguments are evaluated at startup. When a concurrent closure captures mutable outer data, define which value each goroutine owns and avoid races.

### 1.2 Lightweight Is Not Free

Every goroutine consumes stack, scheduling, and held resources. Unlimited creation can exhaust memory, descriptors, connections, or downstream capacity. Production code uses limits, worker pools, or semaphores.

---

## 2. sync.WaitGroup: Wait for Completion

```go
func main() {
	var wg sync.WaitGroup

	for i := 1; i <= 3; i++ {
		wg.Add(1)
		go func(taskID int) {
			defer wg.Done()
			fmt.Println("task", taskID)
		}(i)
	}

	wg.Wait()
	fmt.Println("all tasks completed")
}
```

Rules:

- Call `Add` before starting the goroutine.
- Put `defer wg.Done()` at the beginning of the goroutine.
- Do not copy a WaitGroup in use; pass a pointer when necessary.

Incorrect:

```go
go func() {
	wg.Add(1) // Wait might observe zero first.
	defer wg.Done()
}()
```

WaitGroup waits only; it does not carry results or errors. Use channels for values or a structured task-group abstraction when appropriate.

---

## 3. Channels: Communication and Synchronization

```go
messages := make(chan string)

go func() {
	messages <- "hello"
}()

message := <-messages
fmt.Println(message)
```

An unbuffered send and receive rendezvous. The channel transfers a value and creates a synchronization point.

### 3.1 Return a Result Through a Channel

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

Capacity one prevents the goroutine from blocking if the caller receives slightly later. Buffering is a protocol choice, not a universal speed setting.

### 3.2 nil Channels

Sending or receiving on a nil channel blocks forever. In a select, a nil channel case is disabled; accidental nil channels often cause leaks.

---

## 4. Buffered Channels, Closure, and Direction

### 4.1 Buffers

```go
jobs := make(chan string, 2)
jobs <- "job-1"
jobs <- "job-2"

fmt.Println(<-jobs)
fmt.Println(<-jobs)
```

Sends block when the buffer is full; receives block when empty. A buffer absorbs a limited rate mismatch but cannot repair a permanently stopped consumer.

### 4.2 Who Closes a Channel?

The sender closes it to announce that no more values will arrive.

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

Receive closure explicitly:

```go
value, ok := <-values
if !ok {
	fmt.Println("channel closed")
}
```

Sending after close or closing twice panics. With multiple senders, a coordinator closes only after every sender finishes.

### 4.3 Directional Channels

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

`chan<- T` sends only; `<-chan T` receives only. Directions make ownership contracts visible.

---

## 5. select: Wait for Multiple Events

```go
select {
case message := <-messages:
	fmt.Println("message:", message)
case err := <-errorsChannel:
	fmt.Println("error:", err)
}
```

If several cases are ready, selection is pseudo-random. Do not rely on priority.

### 5.1 Timeout

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

`time.After` is concise for one-off waits. Reuse timers in loops instead of creating one each iteration.

### 5.2 Non-Blocking Operation

```go
select {
case queue <- job:
	fmt.Println("queued")
default:
	fmt.Println("queue is full")
}
```

`default` prevents waiting. In a busy loop it can consume a CPU core.

### 5.3 Ticker

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

Stop tickers when finished. `Stop` does not close the ticker channel.

---

## 6. Data Races and Mutex

This counter races because `counter++` is a read-modify-write sequence:

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
```

Detect it:

```bash
go test -race ./...
go run -race main.go
```

### 6.1 Mutex

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

Keep the lock beside protected data, keep critical sections short, do not hold locks across slow network calls, and never copy a lock after use.

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

RWMutex can help read-heavy workloads but adds complexity. Start with Mutex and change only with evidence.

### 6.3 atomic

```go
var count atomic.Int64
count.Add(1)
fmt.Println(count.Load())
```

Atomic operations fit simple counters and flags. Use a lock or single owner when multiple fields must change consistently.

---

## 7. context: Cancellation and Deadlines

`context.Context` carries cancellation, deadlines, and small request-scoped metadata through a call tree.

Pass it as the first parameter named `ctx`; do not store it in a long-lived struct or pass nil.

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
	cancel()
}()

<-ctx.Done()
fmt.Println(ctx.Err())
```

Call cancel even after normal early completion to release timer and child resources.

### 7.2 WithTimeout

```go
ctx, cancel := context.WithTimeout(context.Background(), 500*time.Millisecond)
defer cancel()

result, err := slowOperation(ctx)
if errors.Is(err, context.DeadlineExceeded) {
	fmt.Println("operation timed out")
}
```

The operation must cooperate:

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

### 7.3 Values

```go
type contextKey string
const requestIDKey contextKey = "request-id"

ctx := context.WithValue(parent, requestIDKey, "req-123")
requestID, _ := ctx.Value(requestIDKey).(string)
```

Store request metadata such as request IDs or authenticated principals, not database connections, configuration, or optional function parameters.

### 7.4 No Detached goroutines

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

Child work should exit when its parent request ends.

---

## 8. Pattern: Pipeline

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

```go
ctx, cancel := context.WithCancel(context.Background())
defer cancel()

for value := range square(ctx, generate(ctx, 1, 2, 3)) {
	fmt.Println(value)
}
```

Each stage closes its own output and observes cancellation so an abandoned downstream does not leak upstream senders.

---

## 9. Pattern: fan-out and fan-in

Several workers sharing one input are fan-out. Combining outputs is fan-in:

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

The coordinator closes output because it knows when all senders finish.

---

## 10. Example: First Successful Query

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

The result buffer equals task count so late goroutines do not block after an early return. Query functions still must respect context to release external resources.

---

## 11. Mini Project: Cancellable Worker Pool

The pool limits concurrency, cancels on the first error, and exits on caller timeout.

### 11.1 Types

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

### 11.2 Worker

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

### 11.3 Scheduling and Closure

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

The error channel has capacity one because the first failure triggers cancellation and a worker must not block while reporting it.

Completion order determines output order. Store an input index and sort when the business contract requires stable order.

### 11.4 Call the Pool

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

## 12. Concurrency Tests

Always run:

```bash
go test -race ./...
```

The detector only sees executed paths, so tests must actually run key operations concurrently.

### 12.1 Test Timeout and Cancellation

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

Avoid sleeping to guess scheduler order. Use channels, context, and final state for deterministic synchronization.

Leak prevention checklist:

- Cancellation must make the function return within a bound.
- Potentially blocked sends also select on `ctx.Done()`.
- Producers or coordinators close every output channel.
- Network and database calls use context-aware APIs.

---

## 13. Exercises

### Exercise 1 | Concurrent Squares (easy)

Use fixed workers to square 1 through 100, collect all values, sort by input, and run with `-race`.

### Exercise 2 | Concurrent Cache (medium)

Implement `Get`, `Set`, and `Delete` with `RWMutex`, then test concurrent reads and writes to one key.

### Exercise 3 | Timeout Aggregation (medium)

Call three simulated services concurrently and keep successful results within a 300ms total deadline. Timed-out services return context errors.

### Exercise 4 | Ordered Worker Pool (optional)

Preserve input order while executing concurrently and support both fail-fast and collect-all-errors modes.

---

## 14. Java Comparison

| Concept | Go | Java |
|---------|----|------|
| Lightweight task | goroutine | executor task / virtual thread |
| Wait set | `sync.WaitGroup` | CountDownLatch |
| Message passing | channel | BlockingQueue |
| Multiplexing | `select` | CompletableFuture composition, etc. |
| Exclusive lock | `sync.Mutex` | synchronized / Lock |
| Read/write lock | `sync.RWMutex` | ReadWriteLock |
| Cancellation | `context.Context` | cancellation token / interrupt |
| Race detection | `go test -race` | tool- and design-dependent |

---

## 15. Troubleshooting

### `fatal error: all goroutines are asleep - deadlock!`

Every goroutine is waiting. Inspect sends without receivers, channels never closed, WaitGroup counts, and lock re-entry.

### `send on closed channel`

A sender outlived channel closure. A single coordinator should close only after all senders finish.

### `close of closed channel`

Several locations compete for closure ownership. Assign close responsibility to the creator controlling the send lifecycle.

### `sync: negative WaitGroup counter`

Done exceeds Add or a WaitGroup was reused incorrectly. Add before startup and defer exactly one Done per task.

### `concurrent map read and map write`

Protect the map with a lock, give it a single owner goroutine, or use an appropriate concurrent structure.

### goroutine Count Keeps Growing

Check blocked sends and receives, cancellation paths, context-aware I/O, stopped tickers, and abandoned result channels.

### Context Times Out but Work Continues

The task never observes `ctx.Done()` or calls a blocking API without context. Cancellation is cooperative; it does not kill a goroutine.

---

## 16. Completion Checklist

- [ ] I distinguish concurrency from parallelism
- [ ] I use Add, Done, and Wait correctly
- [ ] I understand buffered and unbuffered blocking
- [ ] I let senders close channels and use directions
- [ ] I use select for results, timeout, and cancellation
- [ ] I choose Mutex, RWMutex, or atomic appropriately
- [ ] I run and interpret `go test -race`
- [ ] I pass context as the first parameter
- [ ] I build pipelines that exit when downstream stops
- [ ] I completed the worker pool or at least three exercises

After Day 7, you can build reliable Go foundations. The next stage applies them to database pools, contextual queries, parameterized SQL, scanning, transactions, and repository implementations.
