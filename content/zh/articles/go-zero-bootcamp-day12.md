---
title: Go 零基础训练营 Day12｜GORM 事务、锁、性能与工程化
summary: 学习 GORM 事务写法、行锁、错误处理、日志、慢查询、索引意识和 Repository 分层实践。
author: CodeNest
category: database
tags: [语法学习, Go专项, Golang, 零基础训练营, Day12, GORM, 事务, 性能]
createdAt: 2026-08-20
updatedAt: 2026-08-20
readingMinutes: 58
slug: go-zero-bootcamp-day12
---

# Go 零基础训练营 Day12｜GORM 事务、锁、性能与工程化

> 上一篇：[Day11｜GORM 查询、关联、分页与作用域](/articles/go-zero-bootcamp-day11)
> 今天目标：把 GORM 用到真实项目风格，处理事务、并发扣减、错误、日志和分层。
> 下一篇：[Day13｜Gin 入门、路由、参数绑定与 JSON 响应](/articles/go-zero-bootcamp-day13)

---

## 目录

1. 今日地图
2. GORM 事务
3. 行锁和库存扣减
4. 错误处理
5. 日志与慢查询
6. 索引和 Select
7. Repository 分层
8. 综合项目：订单创建
9. 练习、排错与打卡

---

## 0. 今日地图

| 主题 | 能力 |
|------|------|
| Transaction | 用函数封装事务边界 |
| Locking | 避免并发扣减错乱 |
| Error | 区分未找到、唯一键冲突、系统错误 |
| Logger | 观察 SQL 和慢查询 |
| Repository | 让业务层不依赖 GORM 细节 |

今天是 GORM 阶段最接近工程实战的一天。ORM 的优点是效率，风险是让你忘记数据库仍然有事务、锁、索引和慢查询。

---

## 1. GORM 事务

函数式事务：

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

函数返回 `nil` 会提交，返回错误会回滚。这个写法比手动 `Begin`、`Commit`、`Rollback` 更不容易漏。

手动事务适合需要更细控制的场景：

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

## 2. 行锁和库存扣减

商品表：

```go
type Product struct {
	ID    uint
	Name  string
	Stock int
}
```

使用 `FOR UPDATE`：

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

需要导入：

```go
import "gorm.io/gorm/clause"
```

行锁必须在事务里才有意义。事务越长，锁持有越久，对并发影响越大。

---

## 3. 更简洁的原子扣减

很多库存扣减可以不用先查再改：

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

这个 SQL 让数据库自己保证条件更新，通常更短、更快、锁范围更清晰。

---

## 4. 错误处理

未找到：

```go
err := db.First(&user, id).Error
if errors.Is(err, gorm.ErrRecordNotFound) {
	return nil, nil
}
```

唯一键冲突需要结合驱动错误。MySQL 示例：

```go
var mysqlErr *mysql.MySQLError
if errors.As(err, &mysqlErr) && mysqlErr.Number == 1062 {
	return errors.New("email already exists")
}
```

不要把所有数据库错误直接返回给前端。业务层应该把底层错误翻译成稳定的业务语义。

---

## 5. 日志与慢查询

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

开发阶段可以打开 Info 观察 SQL，线上通常记录慢查询和错误。真正排查性能时，还要结合数据库的 `EXPLAIN`。

---

## 6. Select 与索引意识

不要总是 `SELECT *`：

```go
var items []PostListItem
err := db.Model(&Post{}).
	Select("id", "title", "created_at").
	Where("status = ?", "published").
	Order("created_at DESC").
	Limit(20).
	Find(&items).Error
```

常见索引：

```go
type Post struct {
	ID        uint
	UserID    uint      `gorm:"index"`
	Status    string    `gorm:"index"`
	CreatedAt time.Time `gorm:"index"`
}
```

索引不是越多越好。索引能加速查询，但会增加写入成本和存储成本。

---

## 7. Repository 分层

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

`WithContext(ctx)` 很重要，它把请求超时、取消和链路信息传给数据库操作。

---

## 8. 综合项目：创建订单

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

这个案例把事务、条件更新、业务校验和模型创建串起来，是电商、库存、报名名额这类场景的基础模板。

---

## 9. 练习

1. 给 `CreateOrder` 增加订单金额字段。
2. 商品不存在和库存不足返回不同错误。
3. 给 `Post` 的 `status + created_at` 建联合索引。
4. 打开 GORM Info 日志，观察分页查询 SQL。

---

## 10. 今日打卡

- 我会使用 `db.Transaction`。
- 我理解行锁必须配合事务。
- 我能写条件更新式库存扣减。
- 我知道如何处理 `ErrRecordNotFound` 和唯一键冲突。
- 我会使用 `WithContext(ctx)` 和 GORM logger。

下一篇进入 Gin，开始把数据库能力包装成 HTTP API。
