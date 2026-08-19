---
title: MySQL 锁等待超时排查日志（大范围 UPDATE JOIN 踩坑记录）
summary: FDL 向 sales_issue 表同步数据时出现 Lock wait timeout exceeded。排查发现一条无批次限制的大范围 UPDATE JOIN 长事务锁住了约 18.7 万行，阻塞后续 INSERT 写入。
author: evan
category: work
tags: [工作总结, MySQL, FDL, SQL]
createdAt: 2026-08-19 05:27:00
updatedAt: 2026-08-19 05:27:00
readingMinutes: 8
slug: mysql-lock-wait-timeout-fdl-sales-issue-troubleshooting
---

# MySQL 锁等待超时排查日志（大范围 UPDATE JOIN 踩坑记录）

## 问题现象

FDL 向 sales_issue 表同步数据时突然出现异常：

Lock wait timeout exceeded; try restarting transaction

最开始错误信息还打印了大量字段，因此一度怀疑是字段类型或数据问题。但真正的核心异常是 MySQL 锁等待超时。

## 排查过程

首先通过：

```sql
SHOW FULL PROCESSLIST;
```

查看数据库当前正在执行的连接。

发现一条非常异常的 SQL：

```sql
UPDATE sales_issue si
INNER JOIN XSCKD_V1 x
    ON si.upstream_doc_no = x.`上游单据号`
SET si.cust_merchantCharacter_KH01 = x.`客户所属公司`
WHERE x.`客户所属公司` IS NOT NULL;
```

该 SQL 已经运行了约 4600 秒（77 分钟）。

随后查询 InnoDB 当前事务：

```sql
SELECT
    trx_id,
    trx_state,
    trx_started,
    TIMESTAMPDIFF(SECOND, trx_started, NOW()) AS trx_seconds,
    trx_mysql_thread_id AS process_id,
    trx_rows_locked,
    trx_rows_modified,
    trx_query
FROM information_schema.innodb_trx
ORDER BY trx_started;
```

发现异常事务：

```
process_id       = 3263
trx_state        = RUNNING
trx_rows_locked  = 187144
运行时间          ≈ 77 分钟
```

同时另外两个 FDL INSERT INTO sales_issue 事务已经变成：

```
trx_state = LOCK WAIT
```

至此可以确认问题链路：

```
大批量 UPDATE JOIN
        ↓
锁住 sales_issue 约 18.7 万行
        ↓
FDL INSERT 尝试写入相同表
        ↓
等待行锁
        ↓
超过 innodb_lock_wait_timeout
        ↓
Lock wait timeout exceeded
```

严格来说并不是整个 sales_issue 被显式加了表锁，而是一个大事务持有了大量 InnoDB 行锁，最终效果接近"整张表无法正常写入"。

## 解决方式

确认该 UPDATE 属于异常长事务后，通过 MySQL 连接 ID 终止事务：

```sql
KILL 3263;
```

事务被终止并回滚后，锁逐渐释放，后续 FDL 写入恢复正常。

## 根因

问题 SQL 是一个没有批次限制的大范围 UPDATE JOIN：

```sql
UPDATE sales_issue si
INNER JOIN XSCKD_V1 x
    ON si.upstream_doc_no = x.`上游单据号`
SET si.cust_merchantCharacter_KH01 = x.`客户所属公司`
WHERE x.`客户所属公司` IS NOT NULL;
```

它一次处理大量数据，并且 upstream_doc_no 原本缺少合适索引，导致 SQL 长时间运行并持有大量行锁。

后续应考虑：

```sql
CREATE INDEX idx_sales_issue_upstream_doc_no
ON sales_issue(upstream_doc_no);
```

同时大批量更新尽量采用 分批 UPDATE + 分批提交，避免单个事务一次锁住十几万行。

## 本次经验

以后遇到：

```
Lock wait timeout exceeded
```

优先按照下面的思路排查：

```
SHOW FULL PROCESSLIST
        ↓
information_schema.innodb_trx
        ↓
找到长事务和 LOCK WAIT
        ↓
查看 trx_rows_locked
        ↓
确认阻塞源
        ↓
必要时 KILL 异常事务
```

这次算是第一次亲手把 MySQL "锁表"效果干出来了。

更准确地说：没有真正锁表，但一口气锁了 187144 行。
