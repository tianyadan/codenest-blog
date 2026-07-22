---
title: Hands-On MySQL: The Secret Behind the rewriteBatchedStatements Parameter
summary: "In one benchmark, inserting 1,000 rows one by one took 121011 ms, MyBatis-Plus saveBatch took about 59927 ms, and manual batch SQL took only 2275 ms. The real breakthrough came from enabling rewriteBatchedStatements=true."
author: evan
category: work
tags: [Work Notes, MySQL, SQL]
createdAt: 2026-03-27 21:02:07
updatedAt: 2026-03-27 21:02:07
readingMinutes: 9
---
# Hands-On MySQL: The Secret Behind the rewriteBatchedStatements Parameter

### Insert one row at a time in a loop

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
            // ... other fields omitted
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

![Screenshot 2026-03-27 20.52.45](https://codenest.oss-cn-qingdao.aliyuncs.com/images/2026/03/27/378095a7-0258-4a95-aeeb-20bc6dd7bca9.png)

Inserting 1,000 rows took `121011 ms`, nearly **2 minutes**.

### MyBatis-Plus `saveBatch`

```sql
@Test
void MybatisPlusSaveBatch() {
    SqlSession sqlSession = sqlSessionFactory.openSession();
    try {
        List<OpenTest> openTestList = new ArrayList<>();
        for (int i = 0; i < 1000; i++) {
            OpenTest openTest = new OpenTest();
            openTest.setA("a" + i);
            // ... other fields omitted
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

It took about `59927 ms`.

![Screenshot 2026-03-27 20.55.02](https://codenest.oss-cn-qingdao.aliyuncs.com/images/2026/03/27/04793130-4cae-489e-b707-0747c9196de1.png)

### Manually concatenate SQL

```sql
@Test
void MapperSaveBatch() {
    SqlSession sqlSession = sqlSessionFactory.openSession();
    try {
        List<OpenTest> openTestList = new ArrayList<>();
        for (int i = 0; i < 1000; i++) {
            OpenTest openTest = new OpenTest();
            openTest.setA("a" + i);
            // ... other fields omitted
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

![Screenshot 2026-03-27 20.55.54](https://codenest.oss-cn-qingdao.aliyuncs.com/images/2026/03/27/bb48ba66-858d-49d1-8522-0f89cc17c2dc.png)

`2275 ms`, which is **26x faster** than `saveBatch`.

### `rewriteBatchedStatements`

Change the `rewriteBatchedStatements` parameter to `true`. The default is `false`. Add it to the JDBC URL.

![Screenshot 2026-03-27 20.56.41](https://codenest.oss-cn-qingdao.aliyuncs.com/images/2026/03/27/0cd97076-061a-423e-bea5-6013397731bc.png)

Run `saveBatch` again:

![Screenshot 2026-03-27 20.58.07](https://codenest.oss-cn-qingdao.aliyuncs.com/images/2026/03/27/d440837d-dc75-4b60-a05f-a821238d2853.png)

Performance jumps dramatically and reaches roughly the same level as manually concatenated SQL. The reason is that the SQL is rewritten into a multi-value form.

![Screenshot 2026-03-27 20.59.10](https://codenest.oss-cn-qingdao.aliyuncs.com/images/2026/03/27/f278e394-1395-48c0-be97-2823b627e893.png)

The essence of the rewrite is to turn a batch of inserts into:

`insert into xxx values (a),(b),(c) ...`

### Drawbacks

- If one statement in the batch fails, the whole batch may fail, which makes it harder to locate the bad row.
- Batch statements with different parameters may reduce query cache effectiveness.

But in most real projects, the downside is limited. Turn it on.
