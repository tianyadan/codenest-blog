---
title: Go 零基础训练营 Day11｜GORM 查询、关联、分页与作用域
summary: 深入 GORM 的 Where、Order、Limit、Preload、关联关系、分页封装和 Scopes，写出可复用查询代码。
author: CodeNest
category: database
tags: [语法学习, Go专项, Golang, 零基础训练营, Day11, GORM, 查询, 关联, 分页]
createdAt: 2026-08-20
updatedAt: 2026-08-20
readingMinutes: 56
slug: go-zero-bootcamp-day11
---

# Go 零基础训练营 Day11｜GORM 查询、关联、分页与作用域

> 上一篇：[Day10｜GORM 入门、模型定义与自动迁移](/articles/go-zero-bootcamp-day10)
> 今天目标：把 GORM 查询从“能用”提升到“可维护”，掌握分页、关联和复用条件。
> 下一篇：[Day12｜GORM 事务、锁、性能与工程化](/articles/go-zero-bootcamp-day12)

---

## 目录

1. 今日地图
2. 查询条件组合
3. 排序、分页与总数
4. 一对多关联
5. `Preload` 解决 N+1 查询
6. `Scopes` 复用查询条件
7. DTO 与响应对象
8. 综合项目：文章列表查询
9. 练习、排错与打卡

---

## 0. 今日地图

| 主题 | 能力 |
|------|------|
| 条件查询 | 动态组合 `Where` |
| 分页 | 返回列表和总数 |
| 关联 | 表达用户和文章关系 |
| `Preload` | 预加载关联数据 |
| `Scopes` | 复用过滤条件 |

今天的核心不是记住每个 API，而是学会把查询写成稳定的模式。查询一旦散落在业务代码各处，后期加状态、租户、软删除、权限都会很痛。

---

## 1. 条件查询

```go
var users []User
err := db.Where("status = ?", "active").
	Where("age >= ?", 18).
	Order("id DESC").
	Find(&users).Error
```

动态条件可以这样写：

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

不要用字符串拼接构造 SQL 条件值。列名和排序方向如果来自用户输入，也要做白名单。

---

## 2. 分页查询

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

列表和总数：

```go
type PageResult[T any] struct {
	Items    []T
	Total    int64
	Page     int
	PageSize int
}

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

注意：`Count` 和 `Find` 复用同一个 `base` 时，要确认后续链式调用不会污染前面的查询。复杂场景可以重新构建 base，让代码更直观。

---

## 3. 一对多关联

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

约定下，`Post.UserID` 会关联到 `User.ID`。如果字段不符合约定，可以用标签：

```go
Posts []Post `gorm:"foreignKey:AuthorID;references:ID"`
```

关联不是越多越好。模型可以表达关系，但接口返回时要按场景组织 DTO，避免把整棵对象树都输出。

---

## 4. `Preload`

普通循环查询容易造成 N+1：

```go
for _, user := range users {
	db.Where("user_id = ?", user.ID).Find(&user.Posts)
}
```

使用预加载：

```go
var users []User
err := db.Preload("Posts").
	Where("status = ?", "active").
	Find(&users).Error
```

带条件预加载：

```go
err := db.Preload("Posts", "status = ?", "published").
	Find(&users).Error
```

`Preload` 通常会额外发一条查询，然后把结果组装回结构体。它不是魔法，仍然要关注 SQL 数量和返回数据大小。

---

## 5. `Scopes` 复用条件

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

使用：

```go
err := db.Scopes(ActiveUsers, Keyword("alice"), Paginate(PageRequest{Page: 1, PageSize: 10})).
	Order("id DESC").
	Find(&users).Error
```

`Scopes` 适合封装稳定规则，例如状态过滤、租户过滤、分页、时间范围。不要把复杂业务判断全塞进 Scope，否则排查 SQL 会变困难。

---

## 6. DTO 与响应对象

数据库模型不一定等于接口响应。比如文章列表只需要作者名称，不需要作者邮箱：

```go
type PostListItem struct {
	ID         uint
	Title      string
	AuthorName string
	CreatedAt  time.Time
}
```

可以用 `Select` 和 `Joins`：

```go
var items []PostListItem
err := db.Table("posts").
	Select("posts.id, posts.title, users.name AS author_name, posts.created_at").
	Joins("JOIN users ON users.id = posts.user_id").
	Where("posts.status = ?", "published").
	Order("posts.id DESC").
	Scan(&items).Error
```

列表页通常用 DTO 更清爽，详情页再按需要加载更多关联。

---

## 7. 综合项目：文章列表查询

```go
type PostQuery struct {
	Keyword string
	Status  string
	UserID  *uint
}

func ListPosts(db *gorm.DB, q PostQuery, page PageRequest) (PageResult[PostListItem], error) {
	page = page.Normalize()

	base := db.Table("posts").
		Joins("JOIN users ON users.id = posts.user_id")

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

这个例子把“条件、分页、DTO、关联”放到一个真实列表查询中，已经很接近日常业务开发。

---

## 8. 练习

1. 给文章列表增加创建时间范围查询。
2. 给排序字段做白名单，只允许 `id` 和 `created_at`。
3. 使用 `Preload("Posts")` 查询用户及已发布文章。
4. 把状态过滤改成 Scope。

---

## 9. 今日打卡

- 我会组合 GORM 查询条件。
- 我能封装分页参数和分页结果。
- 我理解一对多关联和 `Preload`。
- 我知道如何用 DTO 返回列表。
- 我能用 `Scopes` 复用稳定查询规则。

下一篇继续处理更硬的工程问题：事务、锁、性能、日志和慢查询。
