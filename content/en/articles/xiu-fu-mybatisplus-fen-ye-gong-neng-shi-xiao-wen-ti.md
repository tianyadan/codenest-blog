---
title: Fixing Broken Pagination in MybatisPlus [v3.5.9]
summary: Starting with v3.5.9, PaginationInnerInterceptor was split out of MybatisPlus and must be added separately for pagination to work.
author: evan
category: work
tags: [Work Notes, MyBatis]
createdAt: 2026-03-01 17:54:56
updatedAt: 2026-03-01 17:54:56
readingMinutes: 5
---
# Fixing Broken Pagination in MybatisPlus [v3.5.9]

## Main Text

The `PaginationInnerInterceptor` plugin in Mybatis-plus provides powerful pagination support across multiple databases, making paginated queries simple and efficient.

However, starting from v3.5.9, `PaginationInnerInterceptor` has been split out. To use it, you now need to add the `mybatis-plus-jsqlparser` dependency separately.

1. Add the pagination plugin dependency in `pom.xml`:

```xml
<!-- MyBatis Plus pagination plugin -->
<dependency>
    <groupId>com.baomidou</groupId>
    <artifactId>mybatis-plus-jsqlparser-4.9</artifactId>
</dependency>
```

2. Add `mybatis-plus-bom` to the dependency management section in `pom.xml`.

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

3. After the dependencies are loaded, create a Mybatis Plus interceptor configuration class under the `config` package and add the pagination plugin.

```java
@Configuration
@MapperScan("com.yupi.yupicturebackend.mapper")
public class MyBatisPlusConfig {

    /**
     * Interceptor configuration
     *
     * @return {@link MybatisPlusInterceptor}
     */
    @Bean
    public MybatisPlusInterceptor mybatisPlusInterceptor() {
        MybatisPlusInterceptor interceptor = new MybatisPlusInterceptor();
        // Pagination plugin
        interceptor.addInnerInterceptor(new PaginationInnerInterceptor(DbType.MYSQL));
        return interceptor;
    }
}

```

After restarting the project, pagination should work normally again.
