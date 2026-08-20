---
title: Go 零基础训练营 Day13｜Gin 入门、路由、参数绑定与 JSON 响应
summary: 从安装 Gin、创建服务、路由分组、路径参数、查询参数、JSON 绑定、校验和统一响应开始写 HTTP API。
author: CodeNest
category: backend
tags: [语法学习, Go专项, Golang, 零基础训练营, Day13, Gin, HTTP, Web API]
createdAt: 2026-08-20
updatedAt: 2026-08-20
readingMinutes: 55
slug: go-zero-bootcamp-day13
---

# Go 零基础训练营 Day13｜Gin 入门、路由、参数绑定与 JSON 响应

> 上一篇：[Day12｜GORM 事务、锁、性能与工程化](/articles/go-zero-bootcamp-day12)
> 今天目标：用 Gin 写出清晰的 HTTP API，掌握路由、参数、请求体、校验和响应。
> 下一篇：[Day14｜Gin 中间件、分层、错误处理与小型 REST 项目](/articles/go-zero-bootcamp-day14)

---

## 目录

1. 今日地图
2. Gin 是什么
3. 第一个服务
4. 路由和路由分组
5. 路径参数和查询参数
6. JSON 请求体绑定
7. 统一响应
8. 连接 GORM 查询用户
9. 练习、排错与打卡

---

## 0. 今日地图

| 主题 | 能力 |
|------|------|
| Router | 定义 HTTP 路由 |
| Context | 读取请求、写响应 |
| Binding | 把 JSON 绑定到结构体 |
| Validation | 校验必填字段 |
| Group | 管理 API 前缀和版本 |

Gin 是 Go 生态里常见的 Web 框架，适合写 REST API、后台服务和中小型 Web 后端。它比标准库 `net/http` 更省样板代码，但你仍然要理解 HTTP 本身。

---

## 1. 安装 Gin

```bash
go get github.com/gin-gonic/gin
```

第一个服务：

```go
package main

import "github.com/gin-gonic/gin"

func main() {
	r := gin.Default()

	r.GET("/ping", func(c *gin.Context) {
		c.JSON(200, gin.H{"message": "pong"})
	})

	r.Run(":8080")
}
```

访问：

```bash
curl http://127.0.0.1:8080/ping
```

`gin.Default()` 默认带日志和恢复中间件。`gin.New()` 则是空路由，需要你自己挂中间件。

---

## 2. 路由和分组

```go
api := r.Group("/api/v1")
{
	api.GET("/users", listUsers)
	api.POST("/users", createUser)
	api.GET("/users/:id", getUser)
	api.PUT("/users/:id", updateUser)
	api.DELETE("/users/:id", deleteUser)
}
```

路由命名尽量稳定：

- 资源用名词复数，例如 `/users`、`/posts`。
- 动作用 HTTP 方法表达，例如 GET 查询、POST 创建、PUT 更新、DELETE 删除。
- 版本放在前缀中，例如 `/api/v1`。

---

## 3. 路径参数和查询参数

```go
func getUser(c *gin.Context) {
	id := c.Param("id")
	c.JSON(200, gin.H{"id": id})
}
```

查询参数：

```go
func listUsers(c *gin.Context) {
	page := c.DefaultQuery("page", "1")
	keyword := c.Query("keyword")

	c.JSON(200, gin.H{
		"page":    page,
		"keyword": keyword,
	})
}
```

字符串转数字：

```go
func parsePositiveInt(value string, fallback int) int {
	n, err := strconv.Atoi(value)
	if err != nil || n <= 0 {
		return fallback
	}
	return n
}
```

不要相信客户端传来的参数。所有分页、排序、ID 都应该校验。

---

## 4. JSON 绑定和校验

```go
type CreateUserRequest struct {
	Name  string `json:"name" binding:"required"`
	Email string `json:"email" binding:"required,email"`
	Age   *int   `json:"age"`
}

func createUser(c *gin.Context) {
	var req CreateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	c.JSON(201, gin.H{
		"name":  req.Name,
		"email": req.Email,
		"age":   req.Age,
	})
}
```

`ShouldBindJSON` 失败时不会自动写响应，需要你自己处理。`binding` 标签来自 Gin 集成的校验器。

---

## 5. 统一响应

项目里最好统一响应格式：

```go
type APIResponse struct {
	Code    string `json:"code"`
	Message string `json:"message"`
	Data    any    `json:"data,omitempty"`
}

func OK(c *gin.Context, data any) {
	c.JSON(200, APIResponse{Code: "OK", Message: "success", Data: data})
}

func Fail(c *gin.Context, status int, code string, message string) {
	c.JSON(status, APIResponse{Code: code, Message: message})
}
```

使用：

```go
func health(c *gin.Context) {
	OK(c, gin.H{"status": "up"})
}
```

统一响应的价值是让前端、日志和测试都更稳定。

---

## 6. Gin 连接 GORM

简单示例可以把 `*gorm.DB` 放到 handler 结构体：

```go
type UserHandler struct {
	db *gorm.DB
}

func NewUserHandler(db *gorm.DB) *UserHandler {
	return &UserHandler{db: db}
}

func (h *UserHandler) Get(c *gin.Context) {
	id := c.Param("id")

	var user User
	err := h.db.WithContext(c.Request.Context()).First(&user, id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		Fail(c, 404, "USER_NOT_FOUND", "user not found")
		return
	}
	if err != nil {
		Fail(c, 500, "DATABASE_ERROR", "database error")
		return
	}

	OK(c, user)
}
```

关键点是 `WithContext(c.Request.Context())`。HTTP 请求断开或超时时，数据库操作也有机会跟着取消。

---

## 7. 分页接口案例

```go
func (h *UserHandler) List(c *gin.Context) {
	page := parsePositiveInt(c.DefaultQuery("page", "1"), 1)
	pageSize := parsePositiveInt(c.DefaultQuery("pageSize", "20"), 20)
	if pageSize > 100 {
		pageSize = 100
	}

	var users []User
	var total int64

	query := h.db.WithContext(c.Request.Context()).Model(&User{})
	if keyword := c.Query("keyword"); keyword != "" {
		like := "%" + keyword + "%"
		query = query.Where("name LIKE ? OR email LIKE ?", like, like)
	}

	if err := query.Count(&total).Error; err != nil {
		Fail(c, 500, "DATABASE_ERROR", "database error")
		return
	}

	err := query.Order("id DESC").
		Offset((page - 1) * pageSize).
		Limit(pageSize).
		Find(&users).Error
	if err != nil {
		Fail(c, 500, "DATABASE_ERROR", "database error")
		return
	}

	OK(c, gin.H{"items": users, "total": total, "page": page, "pageSize": pageSize})
}
```

这个接口把前几天学的分页、GORM 查询和 HTTP 参数串在一起。

---

## 8. 练习

1. 增加 `POST /api/v1/users` 创建用户。
2. 给 `pageSize` 加最大值限制。
3. 把错误响应统一成 `Fail`。
4. 用 `curl` 分别测试成功、参数错误、用户不存在。

---

## 9. 今日打卡

- 我能启动 Gin 服务。
- 我会定义路由分组。
- 我能读取路径参数、查询参数和 JSON 请求体。
- 我会写统一 JSON 响应。
- 我知道在 Gin 中把请求 context 传给 GORM。

下一篇会把 Gin 写成更像真实项目的结构：中间件、错误处理、Service、Repository 和一个小型 REST 项目。
