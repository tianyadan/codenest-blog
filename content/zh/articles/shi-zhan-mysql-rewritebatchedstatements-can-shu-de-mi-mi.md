---
title: 实战 mysql - rewriteBatchedStatements 参数的秘密
summary: 1000 条耗时 121011 毫秒，耗时 2 分钟。 耗时 约 59927 毫秒 2275 毫秒 ，比 saveBatch 快了 26 倍。 把这个参数...
author: evan
category: work
tags: [工作总结, MySQL, SQL]
createdAt: 2026-03-27 21:02:07
updatedAt: 2026-03-27 21:02:07
readingMinutes: 9
---
# 实战 mysql - rewriteBatchedStatements 参数的秘密

### 单条循环插入:

```sql
@Test
void MybatisPlusSaveOne() {
    SqlSession sqlSession = sqlSessionFactory.openSession();
    try {
        StopWatch stopWatch = new StopWatch();
        stopWatch.start("mybatis plus save one");
        for (int i = 0; i < 1000; i++) {
            OpenTest openTest = new OpenTest();
            openTest.setA("a" + i);
            openTest.setB("b" + i);
            // ... 省略其他字段
            openTestService.save(openTest);
        }
        sqlSession.commit();
        stopWatch.stop();
        log.info("mybatis plus save one：" + stopWatch.getTotalTimeMillis());
    } finally {
        sqlSession.close();
    }
}

```

![截屏2026-03-27 20.52.45](https://codenest.oss-cn-qingdao.aliyuncs.com/images/2026/03/27/378095a7-0258-4a95-aeeb-20bc6dd7bca9.png)

1000  条耗时 121011 毫秒，耗时 2 分钟。

### MyBatis-Plus saveBatch:

```sql
@Test
void MybatisPlusSaveBatch() {
    SqlSession sqlSession = sqlSessionFactory.openSession();
    try {
        List<OpenTest> openTestList = new ArrayList<>();
        for (int i = 0; i < 1000; i++) {
            OpenTest openTest = new OpenTest();
            openTest.setA("a" + i);
            // ... 省略其他字段
            openTestList.add(openTest);
        }
        StopWatch stopWatch = new StopWatch();
        stopWatch.start("mybatis plus save batch");
        openTestService.saveBatch(openTestList);
        sqlSession.commit();
        stopWatch.stop();
        log.info("mybatis plus save batch：" + 
        stopWatch.getTotalTimeMillis());
    } finally {
        sqlSession.close();
    }
}

```

 耗时 约 59927  毫秒

![截屏2026-03-27 20.55.02](https://codenest.oss-cn-qingdao.aliyuncs.com/images/2026/03/27/04793130-4cae-489e-b707-0747c9196de1.png)

### 手动拼接 SQL :

```sql
@Test
void MapperSaveBatch() {
    SqlSession sqlSession = sqlSessionFactory.openSession();
    try {
        List<OpenTest> openTestList = new ArrayList<>();
        for (int i = 0; i < 1000; i++) {
            OpenTest openTest = new OpenTest();
            openTest.setA("a" + i);
            // ... 省略其他字段
            openTestList.add(openTest);
        }
        StopWatch stopWatch = new StopWatch();
        stopWatch.start("mapper save batch");
        openTestMapper.saveBatch(openTestList);
        sqlSession.commit();
        stopWatch.stop();
        log.info("mapper save batch：" + stopWatch.getTotalTimeMillis());
    } finally {
        sqlSession.close();
    }
}

```

![截屏2026-03-27 20.55.54](https://codenest.oss-cn-qingdao.aliyuncs.com/images/2026/03/27/bb48ba66-858d-49d1-8522-0f89cc17c2dc.png)

2275  毫秒 ，比 saveBatch  快了 26  倍。

### rewriteBatchedStatements
把这个参数 `rewriteBatchedStatements` 改成 true 默认是 false ，加入到 JDBC URL 中

![截屏2026-03-27 20.56.41](https://codenest.oss-cn-qingdao.aliyuncs.com/images/2026/03/27/0cd97076-061a-423e-bea5-6013397731bc.png)

再跑 saveBatch:

![截屏2026-03-27 20.58.07](https://codenest.oss-cn-qingdao.aliyuncs.com/images/2026/03/27/d440837d-dc75-4b60-a05f-a821238d2853.png)

 性能飙升，跟手动拼接 SQL 一个档次。 原因是 ： SQL 被重写成了多值形式 。
 
 
![截屏2026-03-27 20.59.10](https://codenest.oss-cn-qingdao.aliyuncs.com/images/2026/03/27/f278e394-1395-48c0-be97-2823b627e893.png)

rewrite 的本质就是把一批 insert 拼成 `insert into xxx values (a),(b),(c) ...` 。

### 弊端：

- 批量语句中某条失败导致整批失败 ，不好定位问题。

-  参数不同的批量语句可能导致查询缓存失效。

但对于实际项目影响不大 ，直接开 ！
