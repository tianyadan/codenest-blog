---
title: Learning Go
summary: A quick look at what a modern Go + Gin project structure can look like, including a simple Controller, Router, and `main.go`.
author: evan
category: learning
tags: [Learning, Go]
createdAt: 2026-05-24 22:12:01
updatedAt: 2026-05-24 22:12:01
readingMinutes: 4
---

# Learning Go

## Main Content

A modern Go + Gin project structure:

```txt
codenest-go/
├── cmd/
│   └── main.go                 # Program entry point
│
├── internal/
│   ├── controller/             # Controller layer
│   │   └── article_controller.go
│   │
│   ├── service/                # Business logic
│   │   └── article_service.go
│   │
│   ├── repository/             # Database operations
│   │   └── article_repository.go
│   │
│   ├── model/                  # Data entities
│   │   └── article.go
│   │
│   ├── dto/
│   │   └── article_dto.go
│   │
│   ├── middleware/
│   │   └── jwt.go
│   │
│   ├── router/
│   │   └── router.go
│   │
│   └── config/
│       └── config.go
│
├── pkg/                        # Shared utilities
│   └── response/
│       └── response.go
│
├── configs/
│   └── config.yaml
│
├── go.mod
└── go.sum
```

---

**What does a Controller look like?**

```go
func GetArticle(c *gin.Context)
```

```go
package controller

import (
    "github.com/gin-gonic/gin"
    "net/http"
)

func GetArticle(c *gin.Context) {
    id := c.Param("id")

    c.JSON(http.StatusOK, gin.H{
        "id": id,
        "title": "CodeNest",
    })
}
```

---

**Router**

```go
package router

import (
    "github.com/gin-gonic/gin"
    "codenest/internal/controller"
)

func SetupRouter() *gin.Engine {
    r := gin.Default()

    r.GET("/article/:id", controller.GetArticle)

    return r
}
```

**main.go**

```go
package main

import (
    "codenest/internal/router"
)

func main() {
    r := router.SetupRouter()

    r.Run(":8080")
}
```
