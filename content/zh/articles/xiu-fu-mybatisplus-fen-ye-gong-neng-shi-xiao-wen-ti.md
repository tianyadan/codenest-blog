---
title: "修复 MybatisPlus [v3.5.9]分页功能失效问题"
summary: Mybatis plus 的分页插件 PaginationInnerInterceptor 提供了强大的分页功能，支持多种数据库，使得分页查询变的简单高效...
author: evan
category: work
tags: [工作总结, MyBatis]
createdAt: 2026-03-01 17:54:56
updatedAt: 2026-03-01 17:54:56
readingMinutes: 5
---
# 修复 MybatisPlus [v3.5.9]分页功能失效问题

## 正文

Mybatis-plus 的分页插件 **PaginationInnerInterceptor** 提供了强大的分页功能，支持多种数据库，使得分页查询变的简单高效。

但 v3.5.9 开始，PaginationInnerInterceptor 已经分离出来，如需使用，则需单独引入 `mybatis-plus-jsqlparser` 依赖 。

1. 在 pom.xml 中引入分页插件依赖:

```xml
<!-- MyBatis Plus 分页插件 -->
<dependency>
    <groupId>com.baomidou</groupId>
    <artifactId>mybatis-plus-jsqlparser-4.9</artifactId>
</dependency>
```

2. 在 pom.xml 的依赖配置管理中补充 mybatis-plus-bom 。

```xml
<dependencyManagement>
    <dependencies>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-dependencies</artifactId>
            <version>${spring-boot.version}</version>
            <type>pom</type>
            <scope>import</scope>
        </dependency>
        <dependency>
            <groupId>com.baomidou</groupId>
            <artifactId>mybatis-plus-bom</artifactId>
            <version>3.5.9</version>
            <type>pom</type>
            <scope>import</scope>
        </dependency>
    </dependencies>
</dependencyManagement>

```

3. 依赖加载完毕后，在 config 包下新建 Mybatis Plus 配置拦截器，添加分页插件。

```java
@Configuration
@MapperScan("com.yupi.yupicturebackend.mapper")
public class MyBatisPlusConfig {

    /**
     * 拦截器配置
     *
     * @return {@link MybatisPlusInterceptor}
     */
    @Bean
    public MybatisPlusInterceptor mybatisPlusInterceptor() {
        MybatisPlusInterceptor interceptor = new MybatisPlusInterceptor();
        // 分页插件
        interceptor.addInnerInterceptor(new PaginationInnerInterceptor(DbType.MYSQL));
        return interceptor;
    }
}

```

重启项目就可以正常完成分页了。
