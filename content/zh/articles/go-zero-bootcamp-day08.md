---
title: Go 零基础训练营 Day8｜database/sql 入门、连接池与查询
summary: 从驱动、DSN、连接池、context、QueryRow、Query 讲到 rows.Scan 和资源释放，完成第一个原生数据库查询程序。
author: CodeNest
category: database
tags: [语法学习, Go专项, Golang, 零基础训练营, Day8, database/sql, MySQL, 数据库]
createdAt: 2026-08-20
updatedAt: 2026-08-20
readingMinutes: 48
slug: go-zero-bootcamp-day08
---

# Go 零基础训练营 Day8｜database/sql 入门、连接池与查询

> 上一篇：[Day7｜goroutine、channel、锁与 context](/articles/go-zero-bootcamp-day07)
> 今天目标：理解 Go 原生数据库访问的基本模型，能安全打开连接池、执行单行查询和多行查询。
> 下一篇：[Day9｜CRUD、事务、预编译与仓储层](/articles/go-zero-bootcamp-day09)

---

## 目录

1. 今日地图
2. `database/sql` 的角色
3. 安装驱动与准备连接
4. `sql.DB` 是连接池，不是一条连接
5. `PingContext` 与超时
6. 查询单行：`QueryRowContext`
7. 查询多行：`QueryContext`
8. 处理 NULL 与时间
9. 综合项目：用户查询脚手架
10. 练习、排错与打卡

---

## 0. 今日地图

| 主题 | 你要带走的能力 | Java 对照 |
|------|----------------|-----------|
| `database/sql` | 使用标准库统一操作数据库 | JDBC |
| 驱动 | 让标准库知道如何连接 MySQL/PostgreSQL | JDBC Driver |
| `sql.DB` | 管理连接池 | DataSource |
| `context` | 控制查询超时和取消 | request timeout |
| `Scan` | 把结果列绑定到变量 | ResultSet getter |

今天先不急着写复杂业务。数据库代码最重要的第一课是：**连接、超时、关闭、错误处理必须稳定**。这些习惯养成后，后面学 GORM 和 Gin 才不会把问题藏起来。

---

## 1. `database/sql` 的角色

Go 标准库提供 `database/sql`，但它不包含具体数据库协议。它负责定义一套统一接口：

- 打开连接池。
- 执行 SQL。
- 读取结果。
- 处理事务。
- 管理预编译语句。

真正和 MySQL 通信的是驱动，例如：

```bash
go get github.com/go-sql-driver/mysql
```

在代码中通常用空白导入注册驱动：

```go
import (
	"database/sql"

	_ "github.com/go-sql-driver/mysql"
)
```

`_` 表示只执行包的初始化逻辑，不直接使用包名。MySQL 驱动会在初始化时把自己注册到 `database/sql`。

---

## 2. 准备一张练习表

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

建议本地练习时先使用 MySQL 或 MariaDB。DSN 示例：

```text
root:password@tcp(127.0.0.1:3306)/go_bootcamp?parseTime=true&charset=utf8mb4&loc=Local
```

几个重要参数：

- `parseTime=true`：把时间列解析成 `time.Time`。
- `charset=utf8mb4`：支持完整 Unicode 字符。
- `loc=Local`：本地时区解析时间。

---

## 3. 打开连接池

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

注意：`sql.Open` 通常不会马上建立真实网络连接。它更像是创建一个连接池对象，所以需要 `PingContext` 验证数据库真的可用。

---

## 4. `sql.DB` 是连接池

很多初学者会把 `*sql.DB` 当成一条连接，这是错误理解。它是并发安全的连接池，应该在应用启动时创建，然后复用。

不要这样做：

```go
func findUser(id int64) {
	db, _ := sql.Open("mysql", dsn)
	defer db.Close()
	// 每次查询都创建连接池，成本高，也容易耗尽连接。
}
```

更推荐：

```go
type UserStore struct {
	db *sql.DB
}

func NewUserStore(db *sql.DB) *UserStore {
	return &UserStore{db: db}
}
```

把 `db` 作为依赖传入，后续测试和替换实现都会更自然。

---

## 5. 查询单行

定义模型：

```go
type User struct {
	ID        int64
	Name      string
	Email     string
	Age       sql.NullInt64
	CreatedAt time.Time
}
```

查询函数：

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

这里有三个关键点：

- 参数使用 `?` 占位，不要拼接用户输入。
- `Scan` 的目标数量和 SQL 选择列数量必须一致。
- `sql.ErrNoRows` 是“没查到”，不一定是系统异常。

---

## 6. 查询多行

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

多行查询固定流程：

1. `QueryContext` 得到 `rows`。
2. 立刻 `defer rows.Close()`。
3. `for rows.Next()` 循环。
4. 每行 `Scan`。
5. 循环结束后检查 `rows.Err()`。

漏掉 `rows.Close()` 会导致连接不能及时回到连接池。漏掉 `rows.Err()` 会吞掉迭代过程中的错误。

---

## 7. 处理 NULL

数据库里的 `NULL` 不能直接扫描到普通 `int`、`string`。Go 标准库提供了可空类型：

```go
func formatAge(age sql.NullInt64) string {
	if !age.Valid {
		return "unknown"
	}
	return fmt.Sprintf("%d", age.Int64)
}
```

常见类型：

- `sql.NullString`
- `sql.NullInt64`
- `sql.NullFloat64`
- `sql.NullBool`
- `sql.NullTime`

如果你的业务明确要求字段不能为空，优先在表结构里用 `NOT NULL` 保证，而不是在每层代码里猜。

---

## 8. 综合项目：用户查询脚手架

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

这个脚手架已经包含真实项目里的几个重要姿势：连接池只创建一次、查询带超时、参数化 SQL、区分未找到和错误、可空字段显式处理。

---

## 9. 练习

1. 增加 `FindByEmail(ctx, email)`，邮箱不存在时返回 `nil, nil`。
2. 增加 `ListByMinAge(ctx, minAge, limit)`，只查询年龄不为空且大于等于指定值的用户。
3. 把 DSN 放到环境变量 `MYSQL_DSN`，不要写死在代码里。
4. 故意把数据库端口写错，观察 `PingContext` 的错误。

---

## 10. 常见排错

| 问题 | 常见原因 | 处理方式 |
|------|----------|----------|
| `unknown driver "mysql"` | 忘了空白导入驱动 | 加 `_ "github.com/go-sql-driver/mysql"` |
| 时间扫描失败 | DSN 没有 `parseTime=true` | 添加参数 |
| 连接越来越多 | rows 没关闭或每次创建 DB | 复用连接池，关闭 rows |
| 查询卡住 | 没设置 context 超时 | 使用 `QueryContext` |
| `Scan` 报错 | 列数量或类型不匹配 | 对齐 SQL 和结构体字段 |

---

## 11. 今日打卡

- 我知道 `sql.DB` 是连接池，不是单条连接。
- 我会使用 `PingContext` 验证数据库可用。
- 我能写出 `QueryRowContext` 和 `QueryContext`。
- 我会关闭 `rows` 并检查 `rows.Err()`。
- 我知道如何处理 `NULL` 字段。

下一篇会继续写增删改、事务、预编译语句和仓储层，让原生 SQL 代码开始具备项目结构。
