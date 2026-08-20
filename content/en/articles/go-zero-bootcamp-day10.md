---
title: Go Zero-to-One Bootcamp Day 10 | GORM Basics, Models, and Auto Migration
summary: Install GORM, connect to MySQL, define models, use field tags, run auto migration, and perform basic create and query operations.
author: CodeNest
category: database
tags: [Syntax, Go, Golang, Beginner Bootcamp, Day10, GORM, ORM, Database]
createdAt: 2026-08-20
updatedAt: 2026-08-20
readingMinutes: 48
slug: go-zero-bootcamp-day10
---

# Go Zero-to-One Bootcamp Day 10 | GORM Basics, Models, and Auto Migration

> Previous: [Day 9 | CRUD, transactions, prepared statements, and repositories](/articles/go-zero-bootcamp-day09)
> Goal: understand the value and limits of an ORM, then define models, connect to a database, and run basic CRUD with GORM.
> Next: [Day 11 | GORM Queries, Associations, Pagination, and Scopes](/articles/go-zero-bootcamp-day11)

---

## Table of Contents

1. Today's map
2. What an ORM solves
3. Install GORM and the MySQL driver
4. Connection and pool configuration
5. Models and field tags
6. Auto migration
7. Create, query, update, and delete
8. Common pitfalls
9. Exercises and checklist

---

## 0. Today's Map

| Topic | Ability |
|-------|---------|
| GORM | Organize database access with objects |
| Model | Map tables to structs |
| Tag | Control column names, indexes, constraints, and types |
| AutoMigrate | Create missing schema pieces from models |
| CRUD | Use method chains for basic reads and writes |

An ORM is not a reason to stop understanding SQL. It reduces repetitive mapping, scanning, basic CRUD, and association work. The better you know SQL, the better you can use GORM.

---

## 1. Install Dependencies

```bash
go get gorm.io/gorm
go get gorm.io/driver/mysql
```

Connect to the database:

```go
package main

import (
	"log"
	"time"

	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

func openGORM() (*gorm.DB, error) {
	dsn := "root:password@tcp(127.0.0.1:3306)/go_bootcamp?charset=utf8mb4&parseTime=True&loc=Local"
	db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{})
	if err != nil {
		return nil, err
	}

	sqlDB, err := db.DB()
	if err != nil {
		return nil, err
	}
	sqlDB.SetMaxOpenConns(10)
	sqlDB.SetMaxIdleConns(5)
	sqlDB.SetConnMaxLifetime(30 * time.Minute)
	return db, nil
}
```

GORM still uses `database/sql` underneath, so pool configuration still matters.

---

## 2. Define a Model

```go
type User struct {
	ID        uint           `gorm:"primaryKey"`
	Name      string         `gorm:"size:64;not null"`
	Email     string         `gorm:"size:128;uniqueIndex;not null"`
	Age       *int
	Status    string         `gorm:"size:20;not null;default:active"`
	CreatedAt time.Time
	UpdatedAt time.Time
	DeletedAt gorm.DeletedAt `gorm:"index"`
}
```

Notes:

- `ID` is recognized as the primary key by convention.
- `Name` and `Email` are required.
- `Age *int` represents a nullable column.
- `CreatedAt` and `UpdatedAt` are maintained automatically.
- `DeletedAt` enables soft delete.

Compared with `sql.NullInt64`, pointer fields feel closer to domain objects. Be careful when returning them in API responses.

---

## 3. Auto Migration

```go
func migrate(db *gorm.DB) error {
	return db.AutoMigrate(&User{})
}
```

`AutoMigrate` creates tables, missing columns, indexes, and constraints. It is not a full migration system. For production, teams often use goose, atlas, or golang-migrate.

Good places for `AutoMigrate`:

- Local practice.
- Prototypes.
- Test environments.
- Early internal tools.

Avoid relying on it for complex schema evolution.

---

## 4. Create Data

```go
func createUser(db *gorm.DB) error {
	age := 20
	user := User{
		Name:  "Alice",
		Email: "alice@example.com",
		Age:   &age,
	}

	result := db.Create(&user)
	if result.Error != nil {
		return result.Error
	}
	log.Println("new user id:", user.ID)
	return nil
}
```

After create succeeds, the auto-increment ID is written back to the struct.

Batch create:

```go
users := []User{
	{Name: "Bob", Email: "bob@example.com"},
	{Name: "Carol", Email: "carol@example.com"},
}

if err := db.Create(&users).Error; err != nil {
	return err
}
```

---

## 5. Query Data

By primary key:

```go
var user User
err := db.First(&user, 1).Error
if errors.Is(err, gorm.ErrRecordNotFound) {
	log.Println("not found")
} else if err != nil {
	return err
}
```

By condition:

```go
var user User
err := db.Where("email = ?", "alice@example.com").First(&user).Error
```

List:

```go
var users []User
err := db.Where("status = ?", "active").
	Order("id DESC").
	Limit(20).
	Find(&users).Error
```

The chain is convenient, but it still generates SQL. When performance is suspicious, inspect the generated SQL.

---

## 6. Update and Delete

Update one column:

```go
err := db.Model(&User{}).
	Where("id = ?", userID).
	Update("status", "disabled").Error
```

Update many columns:

```go
err := db.Model(&User{}).
	Where("id = ?", userID).
	Updates(map[string]any{
		"name":   "Alice Zhang",
		"status": "active",
	}).Error
```

Struct updates ignore zero values by default:

```go
db.Model(&user).Updates(User{Name: "", Status: "active"})
```

Use a map or `Select` when you really need to update zero values.

Soft delete:

```go
err := db.Delete(&User{}, userID).Error
```

Because the model has `DeletedAt`, normal queries filter deleted rows. Use `Unscoped()` to include or permanently delete them.

---

## 7. Exercises

1. Add a `Post` model with `Title`, `Content`, and `UserID`.
2. Add an index to `User.Status`.
3. Write `FindUserByEmail(db, email)`.
4. Try updating an empty string with struct updates and observe the result.

---

## 8. Checklist

- I know GORM is an ORM, not a replacement for SQL knowledge.
- I can define models, tags, and soft delete fields.
- I can use `AutoMigrate` for practice migrations.
- I can perform basic GORM CRUD.
- I know the zero-value update pitfall.

Next, we move into pagination, sorting, scopes, associations, and preload.
