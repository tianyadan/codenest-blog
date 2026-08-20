---
title: Go 零基础训练营 Day10｜GORM 入门、模型定义与自动迁移
summary: 从安装 GORM、连接数据库、定义模型、字段标签、自动迁移讲到基础创建和查询。
author: CodeNest
category: database
tags: [语法学习, Go专项, Golang, 零基础训练营, Day10, GORM, ORM, 数据库]
createdAt: 2026-08-20
updatedAt: 2026-08-20
readingMinutes: 50
slug: go-zero-bootcamp-day10
---

# Go 零基础训练营 Day10｜GORM 入门、模型定义与自动迁移

> 上一篇：[Day9｜CRUD、事务、预编译与仓储层](/articles/go-zero-bootcamp-day09)
> 今天目标：理解 ORM 的价值和边界，用 GORM 定义模型、连接数据库并完成基础 CRUD。
> 下一篇：[Day11｜GORM 查询、关联、分页与作用域](/articles/go-zero-bootcamp-day11)

---

## 目录

1. 今日地图
2. ORM 解决什么问题
3. 安装 GORM 与 MySQL 驱动
4. 建立连接与连接池配置
5. 定义模型和字段标签
6. 自动迁移
7. 创建和查询
8. 模型钩子与默认值
9. 练习、排错与打卡

---

## 0. 今日地图

| 主题 | 能力 |
|------|------|
| GORM | 用对象方式组织数据库访问 |
| Model | 把表结构映射为结构体 |
| Tag | 控制列名、索引、约束和类型 |
| AutoMigrate | 根据模型补齐表结构 |
| CRUD | 用方法链完成基础读写 |

ORM 不是为了让你完全不懂 SQL，而是让重复的映射、扫描、基础 CRUD 和关联管理更高效。越懂 SQL，越能用好 ORM。

---

## 1. 安装依赖

```bash
go get gorm.io/gorm
go get gorm.io/driver/mysql
```

连接数据库：

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

func main() {
	db, err := openGORM()
	if err != nil {
		log.Fatal(err)
	}
	_ = db
}
```

GORM 底层仍然使用 `database/sql` 的连接池，所以连接池配置仍然重要。

---

## 2. 定义模型

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

字段说明：

- `ID` 默认会被识别为主键，这里显式写出方便初学者理解。
- `Name` 和 `Email` 使用 `not null`。
- `Age *int` 可以表达数据库 `NULL`。
- `CreatedAt`、`UpdatedAt` 会由 GORM 自动维护。
- `DeletedAt` 加上后，GORM 默认启用软删除。

和原生 `sql.NullInt64` 相比，指针字段更贴近业务对象；但在 API 输出时要小心空指针。

---

## 3. 自动迁移

```go
func migrate(db *gorm.DB) error {
	return db.AutoMigrate(&User{})
}
```

`AutoMigrate` 会创建表、缺失列、索引和约束，但它不是完整迁移系统。生产环境更常用专门迁移工具，例如 goose、atlas、golang-migrate。

适合使用 `AutoMigrate` 的场景：

- 本地练习。
- 原型项目。
- 测试环境。
- 早期内部工具。

不适合直接依赖它处理复杂表结构变更。

---

## 4. 创建数据

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

GORM 的写法通常返回 `*gorm.DB`，错误放在 `result.Error`。创建成功后，自增 ID 会回填到结构体。

批量创建：

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

## 5. 查询数据

按主键：

```go
var user User
err := db.First(&user, 1).Error
if errors.Is(err, gorm.ErrRecordNotFound) {
	log.Println("not found")
} else if err != nil {
	return err
}
```

按条件：

```go
var user User
err := db.Where("email = ?", "alice@example.com").First(&user).Error
```

查询列表：

```go
var users []User
err := db.Where("status = ?", "active").
	Order("id DESC").
	Limit(20).
	Find(&users).Error
```

GORM 链式调用看起来轻松，但本质还是生成 SQL。遇到性能问题时要打开日志看真实 SQL。

---

## 6. 更新数据

更新单列：

```go
err := db.Model(&User{}).
	Where("id = ?", userID).
	Update("status", "disabled").Error
```

更新多列：

```go
err := db.Model(&User{}).
	Where("id = ?", userID).
	Updates(map[string]any{
		"name":   "Alice Zhang",
		"status": "active",
	}).Error
```

使用结构体更新时，零值字段默认不会更新：

```go
db.Model(&user).Updates(User{Name: "", Status: "active"})
```

上面 `Name` 是空字符串，默认会被忽略。如果确实要更新零值，可以使用 `Select` 或 map。

---

## 7. 删除数据

```go
err := db.Delete(&User{}, userID).Error
```

因为模型里有 `DeletedAt gorm.DeletedAt`，这会执行软删除。默认查询会自动排除软删除数据。

查询已删除数据：

```go
var user User
err := db.Unscoped().First(&user, userID).Error
```

永久删除：

```go
err := db.Unscoped().Delete(&User{}, userID).Error
```

---

## 8. 练习

1. 增加 `Post` 模型，字段包含 `Title`、`Content`、`UserID`。
2. 给 `User.Status` 增加索引。
3. 写 `FindUserByEmail(db, email)`。
4. 尝试用结构体更新空字符串，观察是否生效。

---

## 9. 常见排错

| 问题 | 原因 | 处理方式 |
|------|------|----------|
| 表名不是预期 | GORM 默认使用复数表名 | 实现 `TableName()` |
| 查询不到软删除数据 | 默认过滤 `deleted_at` | 使用 `Unscoped()` |
| 零值没有更新 | 结构体更新会忽略零值 | 使用 map 或 `Select` |
| 连接池不会配置 | 忘了 `db.DB()` | 取出底层 `*sql.DB` |

---

## 10. 今日打卡

- 我知道 GORM 是 ORM，不是 SQL 的替代品。
- 我能定义模型、标签和软删除字段。
- 我会使用 `AutoMigrate` 做练习迁移。
- 我能完成 GORM 基础 CRUD。
- 我知道结构体更新零值的坑。

下一篇继续进入查询能力：分页、排序、作用域、关联关系和预加载。
