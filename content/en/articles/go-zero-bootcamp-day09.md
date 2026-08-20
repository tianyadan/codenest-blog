---
title: Go Zero-to-One Bootcamp Day 9 | CRUD, Transactions, Prepared Statements, and Repositories
summary: Use native database/sql for inserts, updates, deletes, commits, rollbacks, prepared statements, and a UserRepository layer.
author: CodeNest
category: database
tags: [Syntax, Go, Golang, Beginner Bootcamp, Day9, database/sql, CRUD, Transaction]
createdAt: 2026-08-20
updatedAt: 2026-08-20
readingMinutes: 52
slug: go-zero-bootcamp-day09
---

# Go Zero-to-One Bootcamp Day 9 | CRUD, Transactions, Prepared Statements, and Repositories

> Previous: [Day 8 | database/sql, connection pools, and queries](/articles/go-zero-bootcamp-day08)
> Goal: master native SQL writes, transaction boundaries, and repository organization.
> Next: [Day 10 | GORM Basics, Models, and Auto Migration](/articles/go-zero-bootcamp-day10)

---

## Table of Contents

1. Today's map
2. Insert with `ExecContext`
3. Update and check affected rows
4. Delete and soft delete
5. Transactions: commit or rollback
6. Prepared statements
7. Repository interfaces
8. Mini project: transfer and audit log
9. Exercises, troubleshooting, and checklist

---

## 0. Today's Map

| Topic | What you will learn |
|-------|---------------------|
| `ExecContext` | Run SQL that does not return rows |
| `LastInsertId` | Read an auto-increment primary key |
| `RowsAffected` | Confirm an update or delete changed data |
| `Tx` | Group multiple SQL statements atomically |
| Repository | Keep business code away from SQL details |

Write operations deserve extra care because they change state. For every write, ask: are the parameters safe, did I confirm the result, and can failure leave partial data?

---

## 1. Insert a User

```go
type CreateUserParams struct {
	Name  string
	Email string
	Age   sql.NullInt64
}

func (s *UserStore) Create(ctx context.Context, params CreateUserParams) (int64, error) {
	const query = `
INSERT INTO users (name, email, age)
VALUES (?, ?, ?)
`

	result, err := s.db.ExecContext(ctx, query, params.Name, params.Email, params.Age)
	if err != nil {
		return 0, err
	}

	id, err := result.LastInsertId()
	if err != nil {
		return 0, err
	}
	return id, nil
}
```

Validate before the database rejects obvious input:

```go
func (p CreateUserParams) Validate() error {
	if strings.TrimSpace(p.Name) == "" {
		return errors.New("name is required")
	}
	if !strings.Contains(p.Email, "@") {
		return errors.New("email is invalid")
	}
	return nil
}
```

---

## 2. Update a User

```go
func (s *UserStore) UpdateEmail(ctx context.Context, id int64, email string) (bool, error) {
	const query = `
UPDATE users
SET email = ?
WHERE id = ?
`

	result, err := s.db.ExecContext(ctx, query, email, id)
	if err != nil {
		return false, err
	}

	affected, err := result.RowsAffected()
	if err != nil {
		return false, err
	}
	return affected > 0, nil
}
```

The boolean separates database failure from "the user did not exist".

---

## 3. Delete and Soft Delete

Physical delete:

```go
func (s *UserStore) Delete(ctx context.Context, id int64) (bool, error) {
	result, err := s.db.ExecContext(ctx, `DELETE FROM users WHERE id = ?`, id)
	if err != nil {
		return false, err
	}
	affected, err := result.RowsAffected()
	if err != nil {
		return false, err
	}
	return affected > 0, nil
}
```

Soft delete keeps history:

```sql
ALTER TABLE users ADD COLUMN deleted_at TIMESTAMP NULL;
```

```go
func (s *UserStore) SoftDelete(ctx context.Context, id int64) (bool, error) {
	result, err := s.db.ExecContext(ctx, `UPDATE users SET deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL`, id)
	if err != nil {
		return false, err
	}
	affected, err := result.RowsAffected()
	if err != nil {
		return false, err
	}
	return affected > 0, nil
}
```

Every normal query must then add `deleted_at IS NULL`.

---

## 4. Transactions

Transfers are a classic transaction example: debit one account and credit another atomically.

```go
func transfer(ctx context.Context, db *sql.DB, fromID, toID int64, amount int64) error {
	if amount <= 0 {
		return errors.New("amount must be positive")
	}

	tx, err := db.BeginTx(ctx, &sql.TxOptions{Isolation: sql.LevelReadCommitted})
	if err != nil {
		return err
	}
	defer tx.Rollback()

	result, err := tx.ExecContext(ctx, `UPDATE accounts SET balance = balance - ? WHERE id = ? AND balance >= ?`, amount, fromID, amount)
	if err != nil {
		return err
	}
	affected, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if affected != 1 {
		return errors.New("insufficient balance or source account not found")
	}

	result, err = tx.ExecContext(ctx, `UPDATE accounts SET balance = balance + ? WHERE id = ?`, amount, toID)
	if err != nil {
		return err
	}
	affected, err = result.RowsAffected()
	if err != nil {
		return err
	}
	if affected != 1 {
		return errors.New("target account not found")
	}

	return tx.Commit()
}
```

`defer tx.Rollback()` is a safety net. After a successful commit it becomes harmless.

---

## 5. Repository That Works With DB and Tx

```go
type DBTX interface {
	ExecContext(context.Context, string, ...any) (sql.Result, error)
	QueryContext(context.Context, string, ...any) (*sql.Rows, error)
	QueryRowContext(context.Context, string, ...any) *sql.Row
}

type UserRepository struct {
	db DBTX
}

func NewUserRepository(db DBTX) *UserRepository {
	return &UserRepository{db: db}
}
```

Both `*sql.DB` and `*sql.Tx` satisfy this interface, so the same repository can run inside or outside a transaction.

---

## 6. Prepared Statements

```go
stmt, err := db.PrepareContext(ctx, `SELECT id, name, email FROM users WHERE email = ?`)
if err != nil {
	return err
}
defer stmt.Close()

for _, email := range emails {
	var user User
	err := stmt.QueryRowContext(ctx, email).Scan(&user.ID, &user.Name, &user.Email)
	if err != nil {
		continue
	}
	fmt.Println(user)
}
```

Use prepared statements for hot repeated SQL. Start with clear ordinary queries and optimize when repetition justifies it.

---

## 7. Mini Project: Register With Audit Log

```go
func RegisterUser(ctx context.Context, db *sql.DB, params CreateUserParams) (int64, error) {
	if err := params.Validate(); err != nil {
		return 0, err
	}

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return 0, err
	}
	defer tx.Rollback()

	repo := NewUserRepository(tx)
	userID, err := repo.Create(ctx, params)
	if err != nil {
		return 0, err
	}

	_, err = tx.ExecContext(ctx, `INSERT INTO audit_logs (action, detail) VALUES (?, ?)`, "create_user", params.Email)
	if err != nil {
		return 0, err
	}

	if err := tx.Commit(); err != nil {
		return 0, err
	}
	return userID, nil
}
```

Core rule: when a business action spans multiple tables, define the transaction boundary first.

---

## 8. Exercises

1. Add email validation to `UpdateEmail`.
2. Write `CreateMany(ctx, users)` and require all rows to succeed.
3. Reject transfers from an account to itself.
4. Add `deleted_at IS NULL` to all soft-delete-aware queries.

---

## 9. Checklist

- I can use `ExecContext` for insert, update, and delete.
- I check `RowsAffected`.
- I can write a transaction with rollback and commit.
- I can make a repository work with both `*sql.DB` and `*sql.Tx`.
- I understand when prepared statements are useful.

Next, we move into GORM and let a higher-level ORM handle models, migration, and basic CRUD.
