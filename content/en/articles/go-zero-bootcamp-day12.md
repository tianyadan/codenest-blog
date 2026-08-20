---
title: Go Zero-to-One Bootcamp Day 12 | GORM Transactions, Locks, Performance, and Engineering Practices
summary: Learn GORM transactions, row locks, error handling, logging, slow queries, index awareness, and repository-layer practices.
author: CodeNest
category: database
tags: [Syntax, Go, Golang, Beginner Bootcamp, Day12, GORM, Transaction, Performance]
createdAt: 2026-08-20
updatedAt: 2026-08-20
readingMinutes: 56
slug: go-zero-bootcamp-day12
---

# Go Zero-to-One Bootcamp Day 12 | GORM Transactions, Locks, Performance, and Engineering Practices

> Previous: [Day 11 | GORM queries, associations, pagination, and scopes](/articles/go-zero-bootcamp-day11)
> Goal: use GORM in a production-shaped way with transactions, concurrent stock updates, errors, logging, and layering.
> Next: [Day 13 | Gin Basics, Routes, Binding, and JSON Responses](/articles/go-zero-bootcamp-day13)

---

## Table of Contents

1. Today's map
2. GORM transactions
3. Row locks and stock deduction
4. Atomic conditional updates
5. Error handling
6. Logs, slow queries, and indexes
7. Repository layering
8. Mini project: create order
9. Exercises and checklist

---

## 0. Today's Map

| Topic | Ability |
|-------|---------|
| Transaction | Wrap transaction boundaries in functions |
| Locking | Avoid broken concurrent stock changes |
| Error | Separate not found, unique conflicts, and system errors |
| Logger | Observe SQL and slow queries |
| Repository | Keep business code away from GORM details |

GORM increases speed, but it does not remove database fundamentals. Transactions, locks, indexes, and slow queries still exist.

---

## 1. Transactions

Function-style transaction:

```go
err := db.Transaction(func(tx *gorm.DB) error {
	if err := tx.Create(&Order{UserID: userID, Amount: 100}).Error; err != nil {
		return err
	}
	if err := tx.Model(&User{}).Where("id = ?", userID).Update("last_order_at", time.Now()).Error; err != nil {
		return err
	}
	return nil
})
```

Returning `nil` commits; returning an error rolls back. This style is harder to misuse than manual begin/commit/rollback.

Manual transactions still exist for special control:

```go
tx := db.Begin()
if tx.Error != nil {
	return tx.Error
}
defer tx.Rollback()

if err := tx.Create(&order).Error; err != nil {
	return err
}

return tx.Commit().Error
```

---

## 2. Row Locks

```go
type Product struct {
	ID    uint
	Name  string
	Stock int
}
```

```go
func DecreaseStock(db *gorm.DB, productID uint, quantity int) error {
	return db.Transaction(func(tx *gorm.DB) error {
		var product Product
		err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			First(&product, productID).Error
		if err != nil {
			return err
		}

		if product.Stock < quantity {
			return errors.New("insufficient stock")
		}

		return tx.Model(&Product{}).
			Where("id = ?", productID).
			Update("stock", product.Stock-quantity).Error
	})
}
```

Import:

```go
import "gorm.io/gorm/clause"
```

Row locks matter only inside a transaction. The longer the transaction, the longer the lock is held.

---

## 3. Atomic Conditional Update

Many stock deductions can be written without a read first:

```go
func DecreaseStockAtomic(db *gorm.DB, productID uint, quantity int) error {
	result := db.Model(&Product{}).
		Where("id = ? AND stock >= ?", productID, quantity).
		Update("stock", gorm.Expr("stock - ?", quantity))
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected != 1 {
		return errors.New("insufficient stock")
	}
	return nil
}
```

The database performs the check and update in one statement. This is often shorter, faster, and easier to reason about.

---

## 4. Error Handling

Not found:

```go
err := db.First(&user, id).Error
if errors.Is(err, gorm.ErrRecordNotFound) {
	return nil, nil
}
```

MySQL duplicate key:

```go
var mysqlErr *mysql.MySQLError
if errors.As(err, &mysqlErr) && mysqlErr.Number == 1062 {
	return errors.New("email already exists")
}
```

Do not return raw database errors directly to API clients. Translate them into stable business meanings.

---

## 5. Logs and Indexes

```go
newLogger := logger.New(
	log.New(os.Stdout, "\r\n", log.LstdFlags),
	logger.Config{
		SlowThreshold:             200 * time.Millisecond,
		LogLevel:                  logger.Warn,
		IgnoreRecordNotFoundError: true,
		Colorful:                  true,
	},
)

db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{
	Logger: newLogger,
})
```

Development can use Info logging. Production usually records slow queries and errors. For real performance work, also use database `EXPLAIN`.

Select only needed columns:

```go
err := db.Model(&Post{}).
	Select("id", "title", "created_at").
	Where("status = ?", "published").
	Order("created_at DESC").
	Limit(20).
	Find(&items).Error
```

Indexes speed reads but slow writes and consume storage, so add them around actual query patterns.

---

## 6. Repository Layering

```go
type UserRepository interface {
	FindByID(ctx context.Context, id uint) (*User, error)
	Create(ctx context.Context, user *User) error
}

type gormUserRepository struct {
	db *gorm.DB
}

func (r *gormUserRepository) FindByID(ctx context.Context, id uint) (*User, error) {
	var user User
	err := r.db.WithContext(ctx).First(&user, id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &user, nil
}
```

`WithContext(ctx)` carries request timeout, cancellation, and tracing information into the database operation.

---

## 7. Mini Project: Create Order

```go
func CreateOrder(ctx context.Context, db *gorm.DB, userID, productID uint, quantity int) error {
	if quantity <= 0 {
		return errors.New("quantity must be positive")
	}

	return db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		result := tx.Model(&Product{}).
			Where("id = ? AND stock >= ?", productID, quantity).
			Update("stock", gorm.Expr("stock - ?", quantity))
		if result.Error != nil {
			return result.Error
		}
		if result.RowsAffected != 1 {
			return errors.New("insufficient stock")
		}

		order := Order{
			UserID:    userID,
			ProductID: productID,
			Quantity:  quantity,
			Status:    "created",
		}
		return tx.Create(&order).Error
	})
}
```

This pattern applies to ecommerce orders, event seats, coupons, and any limited stock resource.

---

## 8. Exercises

1. Add an amount field to `CreateOrder`.
2. Return different errors for product-not-found and insufficient stock.
3. Add a compound index for `status + created_at`.
4. Enable GORM Info logs and inspect the pagination SQL.

---

## 9. Checklist

- I can use `db.Transaction`.
- I know row locks must be used inside transactions.
- I can write a conditional stock update.
- I can handle `ErrRecordNotFound` and duplicate-key errors.
- I use `WithContext(ctx)` and understand GORM logger basics.

Next, we enter Gin and expose these database operations as HTTP APIs.
