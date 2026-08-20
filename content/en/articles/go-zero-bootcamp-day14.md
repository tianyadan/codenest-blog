---
title: Go Zero-to-One Bootcamp Day 14 | Gin Middleware, Layering, Error Handling, and a Small REST Project
summary: Build a more complete Gin backend structure with middleware, handlers, services, repositories, unified errors, and a user REST API.
author: CodeNest
category: backend
tags: [Syntax, Go, Golang, Beginner Bootcamp, Day14, Gin, Middleware, REST, Project]
createdAt: 2026-08-20
updatedAt: 2026-08-20
readingMinutes: 58
slug: go-zero-bootcamp-day14
---

# Go Zero-to-One Bootcamp Day 14 | Gin Middleware, Layering, Error Handling, and a Small REST Project

> Previous: [Day 13 | Gin basics, routes, binding, and JSON responses](/articles/go-zero-bootcamp-day13)
> Goal: connect Gin, GORM, and earlier Go fundamentals into a layered REST API with middleware and error handling.
> Next stage: authentication, configuration, logging, deployment, and a complete project.

---

## Table of Contents

1. Today's map
2. Recommended project structure
3. Middleware
4. Unified error model
5. Handler, Service, and Repository
6. User REST API
7. Route registration
8. Next extension ideas
9. Exercises and checklist

---

## 0. Today's Map

| Topic | Ability |
|-------|---------|
| Middleware | Run common logic before and after requests |
| Error Model | Map business errors to HTTP responses |
| Handler | Own HTTP input and output |
| Service | Own business rules |
| Repository | Own database access |

Today closes the first 14 days. Go syntax, context, errors, GORM, and Gin now meet inside one backend API.

---

## 1. Project Structure

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

The `internal` directory means these packages are private to this project. Beginners do not need excessive layers, but Handler, Service, and Repository are worth practicing.

---

## 2. Middleware

Request ID:

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

Access log:

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

Middleware is for logging, CORS, auth, rate limiting, request IDs, and panic recovery. Keep business rules in services.

---

## 3. Unified Error Model

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

Services return business errors; handlers map them to HTTP.

---

## 4. Model and Repository

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

Repositories should not know about HTTP status codes.

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

Services own business meaning: validation, status transitions, permissions, and transaction orchestration. They should depend on `context.Context`, not `*gin.Context`.

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

Handlers parse HTTP input, call services, and write HTTP responses.

---

## 7. Route Registration

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

`main.go` wires dependencies:

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

That is a small but clean REST API.

---

## 8. Next Extension Ideas

1. Configuration: read port and DSN from environment variables.
2. Logging: replace standard `log` with structured logs.
3. Authentication: add JWT or session auth.
4. Testing: use `httptest` for handlers and fake repositories for services.
5. Deployment: build a Docker image and add health checks.

---

## 9. Checklist

- I can layer a Gin project into Handler, Service, and Repository.
- I can write basic middleware.
- I can design a unified error model.
- I can expose GORM operations as REST APIs.
- I understand the boundary between `gin.Context` and `context.Context`.

Congratulations on finishing the first 14 days of the Go bootcamp. You have moved from syntax fundamentals to databases, ORM, and Web APIs. The next stage can become a complete project with auth, deployment, and performance work.
