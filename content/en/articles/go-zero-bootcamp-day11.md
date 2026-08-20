---
title: Go Zero-to-One Bootcamp Day 11 | GORM Queries, Associations, Pagination, and Scopes
summary: Go deeper into Where, Order, Limit, Preload, associations, pagination helpers, and Scopes to write reusable GORM query code.
author: CodeNest
category: database
tags: [Syntax, Go, Golang, Beginner Bootcamp, Day11, GORM, Query, Association, Pagination]
createdAt: 2026-08-20
updatedAt: 2026-08-20
readingMinutes: 54
slug: go-zero-bootcamp-day11
---

# Go Zero-to-One Bootcamp Day 11 | GORM Queries, Associations, Pagination, and Scopes

> Previous: [Day 10 | GORM basics, models, and auto migration](/articles/go-zero-bootcamp-day10)
> Goal: move from "GORM works" to maintainable query code with pagination, associations, and reusable conditions.
> Next: [Day 12 | GORM Transactions, Locks, Performance, and Engineering Practices](/articles/go-zero-bootcamp-day12)

---

## Table of Contents

1. Today's map
2. Composing query conditions
3. Sorting, pagination, and counts
4. One-to-many associations
5. `Preload` and N+1 queries
6. Reusable `Scopes`
7. DTOs and response objects
8. Mini project: post list query
9. Exercises and checklist

---

## 0. Today's Map

| Topic | Ability |
|-------|---------|
| Conditions | Compose dynamic `Where` clauses |
| Pagination | Return items and total count |
| Associations | Model user and post relationships |
| `Preload` | Load related data intentionally |
| `Scopes` | Reuse stable filters |

The goal is not to memorize every API. It is to build a stable query pattern. Once query logic is scattered everywhere, adding status, tenant rules, soft delete, or permissions becomes painful.

---

## 1. Compose Conditions

```go
var users []User
err := db.Where("status = ?", "active").
	Where("age >= ?", 18).
	Order("id DESC").
	Find(&users).Error
```

Dynamic conditions:

```go
type UserQuery struct {
	Keyword string
	Status  string
	MinAge  *int
}

func applyUserQuery(db *gorm.DB, q UserQuery) *gorm.DB {
	if q.Keyword != "" {
		like := "%" + q.Keyword + "%"
		db = db.Where("name LIKE ? OR email LIKE ?", like, like)
	}
	if q.Status != "" {
		db = db.Where("status = ?", q.Status)
	}
	if q.MinAge != nil {
		db = db.Where("age >= ?", *q.MinAge)
	}
	return db
}
```

Do not concatenate user input into SQL values. If column names or sort direction come from the request, use a whitelist.

---

## 2. Pagination

```go
type PageRequest struct {
	Page     int
	PageSize int
}

func (p PageRequest) Normalize() PageRequest {
	if p.Page <= 0 {
		p.Page = 1
	}
	if p.PageSize <= 0 || p.PageSize > 100 {
		p.PageSize = 20
	}
	return p
}

func (p PageRequest) Offset() int {
	return (p.Page - 1) * p.PageSize
}
```

```go
type PageResult[T any] struct {
	Items    []T
	Total    int64
	Page     int
	PageSize int
}
```

```go
func ListUsers(db *gorm.DB, q UserQuery, page PageRequest) (PageResult[User], error) {
	page = page.Normalize()
	base := applyUserQuery(db.Model(&User{}), q)

	var total int64
	if err := base.Count(&total).Error; err != nil {
		return PageResult[User]{}, err
	}

	var users []User
	err := base.Order("id DESC").
		Offset(page.Offset()).
		Limit(page.PageSize).
		Find(&users).Error
	if err != nil {
		return PageResult[User]{}, err
	}

	return PageResult[User]{Items: users, Total: total, Page: page.Page, PageSize: page.PageSize}, nil
}
```

For complex queries, rebuilding the base query for count and list can be clearer than reusing a mutable chain.

---

## 3. Associations and Preload

```go
type User struct {
	ID    uint
	Name  string
	Email string
	Posts []Post
}

type Post struct {
	ID      uint
	UserID  uint
	Title   string
	Content string
	Status  string
}
```

By convention, `Post.UserID` points to `User.ID`.

Avoid N+1:

```go
for _, user := range users {
	db.Where("user_id = ?", user.ID).Find(&user.Posts)
}
```

Use `Preload`:

```go
var users []User
err := db.Preload("Posts", "status = ?", "published").
	Where("status = ?", "active").
	Find(&users).Error
```

`Preload` usually sends an extra query and assembles results in memory. Watch query count and returned data size.

---

## 4. Scopes

```go
func ActiveUsers(db *gorm.DB) *gorm.DB {
	return db.Where("status = ?", "active")
}

func Keyword(keyword string) func(*gorm.DB) *gorm.DB {
	return func(db *gorm.DB) *gorm.DB {
		if keyword == "" {
			return db
		}
		like := "%" + keyword + "%"
		return db.Where("name LIKE ? OR email LIKE ?", like, like)
	}
}

func Paginate(page PageRequest) func(*gorm.DB) *gorm.DB {
	page = page.Normalize()
	return func(db *gorm.DB) *gorm.DB {
		return db.Offset(page.Offset()).Limit(page.PageSize)
	}
}
```

```go
err := db.Scopes(ActiveUsers, Keyword("alice"), Paginate(PageRequest{Page: 1, PageSize: 10})).
	Order("id DESC").
	Find(&users).Error
```

Scopes are good for stable rules such as status filters, tenant filters, pagination, and time ranges.

---

## 5. DTOs

Database models do not have to equal API responses:

```go
type PostListItem struct {
	ID         uint
	Title      string
	AuthorName string
	CreatedAt  time.Time
}
```

```go
var items []PostListItem
err := db.Table("posts").
	Select("posts.id, posts.title, users.name AS author_name, posts.created_at").
	Joins("JOIN users ON users.id = posts.user_id").
	Where("posts.status = ?", "published").
	Order("posts.id DESC").
	Scan(&items).Error
```

List endpoints are often cleaner with DTOs; detail endpoints can load richer associations.

---

## 6. Mini Project: Post List

```go
type PostQuery struct {
	Keyword string
	Status  string
	UserID  *uint
}

func ListPosts(db *gorm.DB, q PostQuery, page PageRequest) (PageResult[PostListItem], error) {
	page = page.Normalize()
	base := db.Table("posts").Joins("JOIN users ON users.id = posts.user_id")

	if q.Keyword != "" {
		base = base.Where("posts.title LIKE ?", "%"+q.Keyword+"%")
	}
	if q.Status != "" {
		base = base.Where("posts.status = ?", q.Status)
	}
	if q.UserID != nil {
		base = base.Where("posts.user_id = ?", *q.UserID)
	}

	var total int64
	if err := base.Count(&total).Error; err != nil {
		return PageResult[PostListItem]{}, err
	}

	var items []PostListItem
	err := base.Select("posts.id, posts.title, users.name AS author_name, posts.created_at").
		Order("posts.id DESC").
		Offset(page.Offset()).
		Limit(page.PageSize).
		Scan(&items).Error
	if err != nil {
		return PageResult[PostListItem]{}, err
	}

	return PageResult[PostListItem]{Items: items, Total: total, Page: page.Page, PageSize: page.PageSize}, nil
}
```

This is close to everyday business work: conditions, pagination, DTOs, and joins in one query.

---

## 7. Exercises

1. Add a created-time range to the post query.
2. Whitelist sort fields and allow only `id` and `created_at`.
3. Query users with published posts using `Preload("Posts")`.
4. Move status filtering into a Scope.

---

## 8. Checklist

- I can compose GORM conditions.
- I can package page parameters and page results.
- I understand one-to-many associations and `Preload`.
- I know when to use DTOs.
- I can use `Scopes` for reusable rules.

Next, we handle harder engineering topics: transactions, locks, performance, logs, and slow queries.
