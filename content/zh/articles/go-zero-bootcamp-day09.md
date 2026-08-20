---
title: Go 零基础训练营 Day9｜CRUD、事务、预编译与仓储层
summary: 使用原生 database/sql 完成新增、更新、删除、事务提交回滚、预编译语句和 UserRepository 分层。
author: CodeNest
category: database
tags: [语法学习, Go专项, Golang, 零基础训练营, Day9, database/sql, CRUD, 事务]
createdAt: 2026-08-20
updatedAt: 2026-08-20
readingMinutes: 54
slug: go-zero-bootcamp-day09
---

# Go 零基础训练营 Day9｜CRUD、事务、预编译与仓储层

> 上一篇：[Day8｜database/sql 入门、连接池与查询](/articles/go-zero-bootcamp-day08)
> 今天目标：掌握原生 SQL 的写入操作、事务边界和仓储层组织方式。
> 下一篇：[Day10｜GORM 入门、模型定义与自动迁移](/articles/go-zero-bootcamp-day10)

---

## 目录

1. 今日地图
2. 新增：`ExecContext` 与自增 ID
3. 更新：检查影响行数
4. 删除：物理删除与软删除思路
5. 事务：成功提交，失败回滚
6. 预编译语句
7. 仓储层接口设计
8. 综合项目：账号转账
9. 练习、排错与打卡

---

## 0. 今日地图

| 主题 | 你要带走的能力 |
|------|----------------|
| `ExecContext` | 执行不返回行集的 SQL |
| `LastInsertId` | 获取自增主键 |
| `RowsAffected` | 判断更新或删除是否生效 |
| `Tx` | 把多条 SQL 放进同一个事务 |
| Repository | 隔离业务代码和 SQL 细节 |

今天开始写“会改数据”的代码。写入代码要比查询更谨慎，因为它会改变状态。一个好习惯是：每次写入都问自己三个问题：参数安全吗？结果确认了吗？失败会不会留下半成品？

---

## 1. 新增用户

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

`ExecContext` 用于 `INSERT`、`UPDATE`、`DELETE` 这类不返回行集的 SQL。MySQL 自增主键可以通过 `LastInsertId` 获取。

如果业务传入的 `Name` 为空，不应该等数据库报错才发现：

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

## 2. 更新用户

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

返回 `bool` 的意义是区分：

- SQL 执行失败：数据库异常或约束冲突。
- SQL 成功但没有行被更新：用户不存在。

这比简单返回 `error` 更适合业务层做判断。

---

## 3. 删除用户

物理删除：

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

很多业务系统会选择软删除：

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

软删除保留历史，但所有查询都要记得加 `deleted_at IS NULL`。

---

## 4. 事务基础

事务适合“要么全部成功，要么全部失败”的场景。比如转账：A 扣钱和 B 加钱必须一起完成。

```sql
CREATE TABLE accounts (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    owner VARCHAR(64) NOT NULL,
    balance BIGINT NOT NULL
);
```

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

`defer tx.Rollback()` 是常见写法。事务提交成功后再执行 `Rollback` 会返回错误，但不会破坏已提交事务。这里可以忽略它，因为它只是兜底。

---

## 5. 把事务传进仓储层

如果仓储层只持有 `*sql.DB`，事务函数就很难复用。可以抽象出最小执行接口：

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

`*sql.DB` 和 `*sql.Tx` 都满足这个接口，因此同一个 repository 可以在事务内外复用。

---

## 6. 预编译语句

当同一条 SQL 高频执行时，可以准备语句：

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
		// 按业务处理 ErrNoRows 或其他错误。
		continue
	}
	fmt.Println(user)
}
```

不要为了“看起来高级”到处预编译。普通查询先写清楚，热点路径再优化。

---

## 7. 综合项目：注册用户并写审计日志

```sql
CREATE TABLE audit_logs (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    action VARCHAR(64) NOT NULL,
    detail VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

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

这个例子展示了一个核心原则：**业务动作跨多张表时，要先确定事务边界，再组织仓储代码**。

---

## 8. 练习

1. 给 `UpdateEmail` 增加邮箱格式校验。
2. 写 `CreateMany(ctx, users)`，要求全部成功才提交。
3. 修改转账案例，禁止给自己转账。
4. 给软删除后的查询统一补上 `deleted_at IS NULL`。

---

## 9. 常见排错

| 问题 | 原因 | 处理方式 |
|------|------|----------|
| 更新成功但数据没变 | 没检查 `RowsAffected` 或 WHERE 不准确 | 输出条件参数并检查影响行数 |
| 事务没有回滚 | 错误被吞掉或提前返回前没 defer | Begin 后立刻 defer Rollback |
| 死锁或等待太久 | 更新顺序不一致或事务太大 | 固定更新顺序，缩短事务 |
| 预编译泄漏 | `stmt.Close()` 漏掉 | 语句生命周期结束时关闭 |

---

## 10. 今日打卡

- 我会用 `ExecContext` 写新增、更新、删除。
- 我会用 `RowsAffected` 判断写入是否命中数据。
- 我能写出基本事务代码。
- 我知道如何让 repository 同时支持 `*sql.DB` 和 `*sql.Tx`。
- 我理解预编译语句适合高频重复 SQL。

原生 SQL 阶段到这里已经具备项目雏形。下一篇开始进入 GORM，用更高层的方式处理模型、迁移和基础 CRUD。
