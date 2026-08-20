---
title: Go 零基础训练营 Day14｜Gin 中间件、分层、错误处理与小型 REST 项目
summary: 用 Gin 搭建更完整的后端结构，包含中间件、Handler、Service、Repository、统一错误和用户 REST API。
author: CodeNest
category: backend
tags: [语法学习, Go专项, Golang, 零基础训练营, Day14, Gin, 中间件, REST, 项目实战]
createdAt: 2026-08-20
updatedAt: 2026-08-20
readingMinutes: 60
slug: go-zero-bootcamp-day14
---

# Go 零基础训练营 Day14｜Gin 中间件、分层、错误处理与小型 REST 项目

> 上一篇：[Day13｜Gin 入门、路由、参数绑定与 JSON 响应](/articles/go-zero-bootcamp-day13)
> 今天目标：把 Gin、GORM 和前面 Go 基础串起来，完成一个有分层、有错误处理、有中间件的小型 REST API。
> 下一阶段预告：继续扩展可以加入认证、配置管理、日志、部署和完整项目实战。

---

## 目录

1. 今日地图
2. 推荐项目结构
3. 中间件
4. 统一错误模型
5. Handler、Service、Repository
6. 用户 REST API
7. 路由注册
8. 可继续扩展的方向
9. 练习、排错与打卡

---

## 0. 今日地图

| 主题 | 能力 |
|------|------|
| Middleware | 在请求前后统一处理逻辑 |
| Error Model | 把业务错误映射成 HTTP 响应 |
| Handler | 负责 HTTP 输入输出 |
| Service | 负责业务规则 |
| Repository | 负责数据库访问 |

今天是前 14 天的小结课。你会发现 Go 的语法、context、错误处理、GORM 和 Gin 并不是分散知识点，它们会在一个后端 API 中汇合。

---

## 1. 推荐项目结构

```text
go-blog-api/
  cmd/
    api/
      main.go
  internal/
    app/
      router.go
    handler/
      user_handler.go
    service/
      user_service.go
    repository/
      user_repository.go
    model/
      user.go
    response/
      response.go
```

`internal` 目录表示这些包只给当前项目使用。初学阶段不需要过度拆分，但 Handler、Service、Repository 三层很值得练。

---

## 2. 中间件

请求 ID：

```go
func RequestID() gin.HandlerFunc {
	return func(c *gin.Context) {
		requestID := c.GetHeader("X-Request-ID")
		if requestID == "" {
			requestID = uuid.NewString()
		}
		c.Set("requestID", requestID)
		c.Header("X-Request-ID", requestID)
		c.Next()
	}
}
```

耗时日志：

```go
func AccessLog() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		c.Next()

		log.Printf("%s %s status=%d cost=%s",
			c.Request.Method,
			c.Request.URL.Path,
			c.Writer.Status(),
			time.Since(start),
		)
	}
}
```

中间件适合放通用逻辑：日志、跨域、认证、限流、请求 ID、恢复 panic。业务规则不要放进中间件。

---

## 3. 统一错误模型

```go
type AppError struct {
	Status  int
	Code    string
	Message string
}

func (e AppError) Error() string {
	return e.Message
}

func NewNotFound(message string) AppError {
	return AppError{Status: 404, Code: "NOT_FOUND", Message: message}
}

func NewBadRequest(message string) AppError {
	return AppError{Status: 400, Code: "BAD_REQUEST", Message: message}
}
```

统一输出：

```go
func WriteError(c *gin.Context, err error) {
	var appErr AppError
	if errors.As(err, &appErr) {
		c.JSON(appErr.Status, APIResponse{Code: appErr.Code, Message: appErr.Message})
		return
	}
	c.JSON(500, APIResponse{Code: "INTERNAL_ERROR", Message: "internal server error"})
}
```

这样 Service 可以返回业务错误，Handler 负责把错误转换成 HTTP。

---

## 4. 模型和 Repository

```go
type User struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	Name      string         `gorm:"size:64;not null" json:"name"`
	Email     string         `gorm:"size:128;uniqueIndex;not null" json:"email"`
	CreatedAt time.Time      `json:"createdAt"`
	UpdatedAt time.Time      `json:"updatedAt"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}
```

```go
type UserRepository interface {
	FindByID(ctx context.Context, id uint) (*User, error)
	Create(ctx context.Context, user *User) error
}

type GormUserRepository struct {
	db *gorm.DB
}

func (r *GormUserRepository) FindByID(ctx context.Context, id uint) (*User, error) {
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

func (r *GormUserRepository) Create(ctx context.Context, user *User) error {
	return r.db.WithContext(ctx).Create(user).Error
}
```

Repository 不关心 HTTP，也不应该返回状态码。

---

## 5. Service

```go
type UserService struct {
	repo UserRepository
}

func NewUserService(repo UserRepository) *UserService {
	return &UserService{repo: repo}
}

func (s *UserService) GetUser(ctx context.Context, id uint) (*User, error) {
	user, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if user == nil {
		return nil, NewNotFound("user not found")
	}
	return user, nil
}

func (s *UserService) CreateUser(ctx context.Context, name, email string) (*User, error) {
	if strings.TrimSpace(name) == "" {
		return nil, NewBadRequest("name is required")
	}
	if !strings.Contains(email, "@") {
		return nil, NewBadRequest("email is invalid")
	}

	user := &User{Name: name, Email: email}
	if err := s.repo.Create(ctx, user); err != nil {
		return nil, err
	}
	return user, nil
}
```

Service 放业务规则：字段含义、状态流转、权限、事务编排。它不应该依赖 Gin 的 `*gin.Context`。

---

## 6. Handler

```go
type UserHandler struct {
	service *UserService
}

type CreateUserRequest struct {
	Name  string `json:"name" binding:"required"`
	Email string `json:"email" binding:"required,email"`
}

func (h *UserHandler) Get(c *gin.Context) {
	id64, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil || id64 == 0 {
		WriteError(c, NewBadRequest("invalid user id"))
		return
	}

	user, err := h.service.GetUser(c.Request.Context(), uint(id64))
	if err != nil {
		WriteError(c, err)
		return
	}
	OK(c, user)
}

func (h *UserHandler) Create(c *gin.Context) {
	var req CreateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		WriteError(c, NewBadRequest("invalid request body"))
		return
	}

	user, err := h.service.CreateUser(c.Request.Context(), req.Name, req.Email)
	if err != nil {
		WriteError(c, err)
		return
	}
	c.JSON(201, APIResponse{Code: "OK", Message: "success", Data: user})
}
```

Handler 的职责很清楚：解析 HTTP 输入、调用 Service、写 HTTP 响应。

---

## 7. 路由注册

```go
func RegisterRoutes(r *gin.Engine, userHandler *UserHandler) {
	r.Use(RequestID(), AccessLog(), gin.Recovery())

	api := r.Group("/api/v1")
	{
		api.GET("/users/:id", userHandler.Get)
		api.POST("/users", userHandler.Create)
	}
}
```

`main.go` 负责组装依赖：

```go
func main() {
	db := mustOpenDB()
	db.AutoMigrate(&User{})

	repo := &GormUserRepository{db: db}
	userService := NewUserService(repo)
	userHandler := &UserHandler{service: userService}

	r := gin.New()
	RegisterRoutes(r, userHandler)
	r.Run(":8080")
}
```

这就是一个小型但结构清晰的 REST API。

---

## 8. 可继续扩展的方向

1. 配置：用环境变量读取端口和数据库 DSN。
2. 日志：把标准库 log 换成结构化日志。
3. 认证：增加 JWT 或 Session。
4. 测试：用 `httptest` 测 Handler，用 fake repository 测 Service。
5. 部署：构建 Docker 镜像，配置健康检查。

这些内容都可以作为下一阶段课程。

---

## 9. 常见排错

| 问题 | 原因 | 处理方式 |
|------|------|----------|
| Service 里到处是 `gin.Context` | 分层混乱 | Service 使用 `context.Context` |
| 错误响应格式不一致 | 每个 Handler 自己写 | 统一 `WriteError` |
| 请求取消后 DB 还在跑 | 没传请求 context | 使用 `c.Request.Context()` |
| 路由越来越乱 | 没有集中注册 | 用 `RegisterRoutes` |

---

## 10. 今日打卡

- 我知道 Gin 项目可以按 Handler、Service、Repository 分层。
- 我能写基础中间件。
- 我会设计统一错误模型。
- 我能把 GORM 操作包装成 REST API。
- 我理解 `gin.Context` 和 `context.Context` 的边界。

恭喜完成 Go 零基础训练营前 14 天。到这里，你已经从语法基础走到了数据库、ORM 和 Web API，下一阶段就可以做完整项目、认证、部署和性能优化。
