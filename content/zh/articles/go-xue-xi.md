---
title: Go 学习
summary: 一个现代 Go + Gin 项目结构 Controller 长啥样？ Router main.go
author: evan
category: learning
tags: [学习, Go]
createdAt: 2026-05-24 22:12:01
updatedAt: 2026-05-24 22:12:01
readingMinutes: 4
---
# Go 学习

## 正文

一个现代 Go + Gin 项目结构
```txt
codenest-go/
├── cmd/
│   └── main.go                 # 程序入口
│
├── internal/
│   ├── controller/             # 控制器
│   │   └── article_controller.go
│   │
│   ├── service/                # 业务逻辑
│   │   └── article_service.go
│   │
│   ├── repository/             # 数据库操作
│   │   └── article_repository.go
│   │
│   ├── model/                  # 数据实体
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
├── pkg/                        # 公共工具
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

**Controller 长啥样？**

``` Go
func GetArticle(c *gin.Context)
```

``` Go
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

```Go
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
