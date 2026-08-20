---
title: Go Zero-to-One Bootcamp Day 13 | Gin Basics, Routes, Binding, and JSON Responses
summary: Install Gin, create a server, group routes, read path and query parameters, bind JSON, validate input, and return consistent API responses.
author: CodeNest
category: backend
tags: [Syntax, Go, Golang, Beginner Bootcamp, Day13, Gin, HTTP, Web API]
createdAt: 2026-08-20
updatedAt: 2026-08-20
readingMinutes: 53
slug: go-zero-bootcamp-day13
---

# Go Zero-to-One Bootcamp Day 13 | Gin Basics, Routes, Binding, and JSON Responses

> Previous: [Day 12 | GORM transactions, locks, performance, and engineering practices](/articles/go-zero-bootcamp-day12)
> Goal: write clear HTTP APIs with Gin, including routes, parameters, request bodies, validation, and responses.
> Next: [Day 14 | Gin Middleware, Layering, Error Handling, and a Small REST Project](/articles/go-zero-bootcamp-day14)

---

## Table of Contents

1. Today's map
2. What Gin is
3. First server
4. Routes and route groups
5. Path and query parameters
6. JSON binding and validation
7. Consistent responses
8. Connect Gin to GORM
9. Exercises and checklist

---

## 0. Today's Map

| Topic | Ability |
|-------|---------|
| Router | Define HTTP routes |
| Context | Read requests and write responses |
| Binding | Bind JSON to structs |
| Validation | Check required fields |
| Group | Manage API prefixes and versions |

Gin is a common Go web framework for REST APIs, admin services, and medium-sized backends. It saves boilerplate compared with `net/http`, but HTTP fundamentals still matter.

---

## 1. Install Gin

```bash
go get github.com/gin-gonic/gin
```

First server:

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

Try it:

```bash
curl http://127.0.0.1:8080/ping
```

`gin.Default()` includes logging and recovery middleware. `gin.New()` starts empty.

---

## 2. Routes and Groups

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

Route habits:

- Use plural nouns for resources, such as `/users` and `/posts`.
- Use HTTP methods for actions.
- Put the version in the prefix, such as `/api/v1`.

---

## 3. Parameters

Path parameter:

```go
func getUser(c *gin.Context) {
	id := c.Param("id")
	c.JSON(200, gin.H{"id": id})
}
```

Query parameter:

```go
func listUsers(c *gin.Context) {
	page := c.DefaultQuery("page", "1")
	keyword := c.Query("keyword")

	c.JSON(200, gin.H{"page": page, "keyword": keyword})
}
```

Parse positive integers:

```go
func parsePositiveInt(value string, fallback int) int {
	n, err := strconv.Atoi(value)
	if err != nil || n <= 0 {
		return fallback
	}
	return n
}
```

Never trust request parameters. Validate page, sort, ID, and request body fields.

---

## 4. JSON Binding

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

	c.JSON(201, gin.H{"name": req.Name, "email": req.Email, "age": req.Age})
}
```

`ShouldBindJSON` returns an error and lets you decide the response.

---

## 5. Consistent Responses

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

Consistent responses make frontend code, logs, and tests easier.

---

## 6. Connect Gin to GORM

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

`WithContext(c.Request.Context())` lets database work react to request cancellation or timeout.

---

## 7. Pagination Endpoint

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

This connects pagination, GORM queries, and HTTP request parameters.

---

## 8. Exercises

1. Add `POST /api/v1/users`.
2. Add a maximum `pageSize`.
3. Use `Fail` for all error responses.
4. Test success, invalid input, and not-found cases with `curl`.

---

## 9. Checklist

- I can start a Gin server.
- I can define route groups.
- I can read path params, query params, and JSON bodies.
- I can return consistent JSON responses.
- I know how to pass request context into GORM.

Next, we shape Gin into a project structure with middleware, services, repositories, and a small REST API.
