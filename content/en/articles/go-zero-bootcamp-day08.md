---
title: Go Zero-to-One Bootcamp Day 8 | database/sql, Connection Pools, and Queries
summary: Learn drivers, DSNs, connection pools, context, QueryRow, Query, rows.Scan, and resource cleanup by writing your first native database query program.
author: CodeNest
category: database
tags: [Syntax, Go, Golang, Beginner Bootcamp, Day8, database/sql, MySQL, Database]
createdAt: 2026-08-20
updatedAt: 2026-08-20
readingMinutes: 46
slug: go-zero-bootcamp-day08
---

# Go Zero-to-One Bootcamp Day 8 | database/sql, Connection Pools, and Queries

> Previous: [Day 7 | goroutines, channels, locks, and context](/articles/go-zero-bootcamp-day07)
> Goal: understand Go's native database model and safely open a pool, query one row, and query many rows.
> Next: [Day 9 | CRUD, Transactions, Prepared Statements, and Repositories](/articles/go-zero-bootcamp-day09)

---

## Table of Contents

1. Today's map
2. What `database/sql` does
3. Install a driver and prepare a connection
4. `sql.DB` is a pool, not one connection
5. `PingContext` and timeouts
6. Single-row queries with `QueryRowContext`
7. Multi-row queries with `QueryContext`
8. Handling NULL and time values
9. Mini project: user query scaffold
10. Exercises, troubleshooting, and checklist

---

## 0. Today's Map

| Topic | What you will learn | Java comparison |
|-------|---------------------|-----------------|
| `database/sql` | Use the standard database API | JDBC |
| driver | Teach the API how to talk to MySQL/PostgreSQL | JDBC Driver |
| `sql.DB` | Manage a connection pool | DataSource |
| `context` | Control query timeout and cancellation | request timeout |
| `Scan` | Bind result columns into variables | ResultSet getter |

The first database lesson is not fancy SQL. It is stable connection handling, timeouts, cleanup, and error handling. Once those habits are solid, GORM and Gin become much easier to reason about.

---

## 1. What `database/sql` Does

The standard library provides `database/sql`, but it does not contain a concrete database protocol. It defines a common API for:

- Opening a pool.
- Executing SQL.
- Reading results.
- Managing transactions.
- Working with prepared statements.

The actual MySQL communication is handled by a driver:

```bash
go get github.com/go-sql-driver/mysql
```

Register the driver with a blank import:

```go
import (
	"database/sql"

	_ "github.com/go-sql-driver/mysql"
)
```

The `_` means the package is imported for its initialization side effects. The driver registers itself with `database/sql`.

---

## 2. Practice Table

```sql
CREATE TABLE users (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(64) NOT NULL,
    email VARCHAR(128) NOT NULL UNIQUE,
    age INT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO users (name, email, age) VALUES
('Alice', 'alice@example.com', 20),
('Bob', 'bob@example.com', NULL),
('Carol', 'carol@example.com', 28);
```

Example DSN:

```text
root:password@tcp(127.0.0.1:3306)/go_bootcamp?parseTime=true&charset=utf8mb4&loc=Local
```

Important parameters:

- `parseTime=true`: scan time columns into `time.Time`.
- `charset=utf8mb4`: support full Unicode.
- `loc=Local`: parse times with the local timezone.

---

## 3. Open the Pool

```go
package main

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"time"

	_ "github.com/go-sql-driver/mysql"
)

func openDB() (*sql.DB, error) {
	dsn := "root:password@tcp(127.0.0.1:3306)/go_bootcamp?parseTime=true&charset=utf8mb4&loc=Local"
	db, err := sql.Open("mysql", dsn)
	if err != nil {
		return nil, err
	}

	db.SetMaxOpenConns(10)
	db.SetMaxIdleConns(5)
	db.SetConnMaxLifetime(30 * time.Minute)
	db.SetConnMaxIdleTime(5 * time.Minute)

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	if err := db.PingContext(ctx); err != nil {
		db.Close()
		return nil, err
	}
	return db, nil
}

func main() {
	db, err := openDB()
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	fmt.Println("database connected")
}
```

`sql.Open` usually does not create a real network connection immediately. It creates a pool object. Use `PingContext` to verify the database is reachable.

---

## 4. `sql.DB` Is a Pool

Do not create a new pool per query:

```go
func findUser(id int64) {
	db, _ := sql.Open("mysql", dsn)
	defer db.Close()
	// Expensive and easy to exhaust under traffic.
}
```

Create one pool when the application starts and inject it:

```go
type UserStore struct {
	db *sql.DB
}

func NewUserStore(db *sql.DB) *UserStore {
	return &UserStore{db: db}
}
```

This design also makes tests and future replacements easier.

---

## 5. Query One Row

```go
type User struct {
	ID        int64
	Name      string
	Email     string
	Age       sql.NullInt64
	CreatedAt time.Time
}
```

```go
func (s *UserStore) FindByID(ctx context.Context, id int64) (*User, error) {
	const query = `
SELECT id, name, email, age, created_at
FROM users
WHERE id = ?
`

	var user User
	err := s.db.QueryRowContext(ctx, query, id).Scan(
		&user.ID,
		&user.Name,
		&user.Email,
		&user.Age,
		&user.CreatedAt,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return &user, nil
}
```

Key points:

- Use placeholders instead of string-concatenating user input.
- The number of `Scan` destinations must match the selected columns.
- `sql.ErrNoRows` means "not found", not necessarily "system failure".

---

## 6. Query Many Rows

```go
func (s *UserStore) List(ctx context.Context, limit int) ([]User, error) {
	if limit <= 0 || limit > 100 {
		limit = 20
	}

	const query = `
SELECT id, name, email, age, created_at
FROM users
ORDER BY id DESC
LIMIT ?
`

	rows, err := s.db.QueryContext(ctx, query, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []User
	for rows.Next() {
		var user User
		if err := rows.Scan(&user.ID, &user.Name, &user.Email, &user.Age, &user.CreatedAt); err != nil {
			return nil, err
		}
		users = append(users, user)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return users, nil
}
```

The fixed rhythm for multi-row queries is:

1. Call `QueryContext`.
2. Immediately `defer rows.Close()`.
3. Loop with `rows.Next()`.
4. `Scan` each row.
5. Check `rows.Err()` after the loop.

---

## 7. Handling NULL

Database `NULL` cannot be scanned into a plain `int` or `string`. Use standard nullable types:

```go
func formatAge(age sql.NullInt64) string {
	if !age.Valid {
		return "unknown"
	}
	return fmt.Sprintf("%d", age.Int64)
}
```

Common types:

- `sql.NullString`
- `sql.NullInt64`
- `sql.NullFloat64`
- `sql.NullBool`
- `sql.NullTime`

When a field must always exist, prefer enforcing it with `NOT NULL` in the schema.

---

## 8. Mini Project

```go
func main() {
	db, err := openDB()
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	store := NewUserStore(db)
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	user, err := store.FindByID(ctx, 1)
	if err != nil {
		log.Fatal(err)
	}
	if user == nil {
		fmt.Println("user not found")
		return
	}

	fmt.Printf("%d %s %s age=%s\n", user.ID, user.Name, user.Email, formatAge(user.Age))
}
```

This small scaffold already contains production-shaped habits: one pool, request timeout, parameterized SQL, explicit not-found handling, and nullable field handling.

---

## 9. Exercises

1. Add `FindByEmail(ctx, email)`.
2. Add `ListByMinAge(ctx, minAge, limit)` and ignore rows where age is `NULL`.
3. Read the DSN from `MYSQL_DSN`.
4. Break the database port intentionally and observe the `PingContext` error.

---

## 10. Checklist

- I know `sql.DB` is a connection pool.
- I can verify connectivity with `PingContext`.
- I can write `QueryRowContext` and `QueryContext`.
- I close `rows` and check `rows.Err()`.
- I can handle nullable columns.

Next, we will add inserts, updates, deletes, transactions, prepared statements, and a repository layer.
