---
title: MySQL Lock Wait Timeout Troubleshooting Log (Large UPDATE JOIN Blocked FDL Sync)
summary: FDL sync into sales_issue failed with Lock wait timeout exceeded. A long-running unbatched UPDATE JOIN held ~187k row locks and blocked subsequent INSERT writes.
author: evan
category: work
tags: [Work Notes, MySQL, FDL, SQL]
createdAt: 2026-08-19 05:27:00
updatedAt: 2026-08-19 05:27:00
readingMinutes: 8
slug: mysql-lock-wait-timeout-fdl-sales-issue-troubleshooting
---

# MySQL Lock Wait Timeout Troubleshooting Log (Large UPDATE JOIN Blocked FDL Sync)

## Symptom

While FDL was syncing data into the `sales_issue` table, an exception suddenly appeared:

Lock wait timeout exceeded; try restarting transaction

At first, the error log printed a large number of fields, so I briefly suspected a field type or data issue. But the real core exception was a MySQL lock wait timeout.

## Investigation

First, I ran:

```sql
SHOW FULL PROCESSLIST;
```

to inspect the connections currently executing in the database.

I found one highly abnormal SQL statement:

```sql
UPDATE sales_issue si
INNER JOIN XSCKD_V1 x
    ON si.upstream_doc_no = x.`上游单据号`
SET si.cust_merchantCharacter_KH01 = x.`客户所属公司`
WHERE x.`客户所属公司` IS NOT NULL;
```

That SQL had already been running for about 4600 seconds (77 minutes).

Next, I queried current InnoDB transactions:

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

The abnormal transaction looked like this:

```
process_id       = 3263
trx_state        = RUNNING
trx_rows_locked  = 187144
runtime          ≈ 77 minutes
```

At the same time, two other FDL `INSERT INTO sales_issue` transactions had already entered:

```
trx_state = LOCK WAIT
```

At this point, the problem chain was clear:

```
Large UPDATE JOIN
        ↓
Locked ~187k rows on sales_issue
        ↓
FDL INSERT tried to write to the same table
        ↓
Waited for row locks
        ↓
Exceeded innodb_lock_wait_timeout
        ↓
Lock wait timeout exceeded
```

Strictly speaking, the entire `sales_issue` table was not explicitly table-locked. Instead, one large transaction held a huge number of InnoDB row locks, with an end result close to "the whole table cannot be written to normally."

## Resolution

After confirming that the UPDATE was an abnormal long-running transaction, I terminated it by MySQL connection ID:

```sql
KILL 3263;
```

Once the transaction was killed and rolled back, locks were gradually released and subsequent FDL writes returned to normal.

## Root Cause

The problematic SQL was a large-range UPDATE JOIN with no batch limit:

```sql
UPDATE sales_issue si
INNER JOIN XSCKD_V1 x
    ON si.upstream_doc_no = x.`上游单据号`
SET si.cust_merchantCharacter_KH01 = x.`客户所属公司`
WHERE x.`客户所属公司` IS NOT NULL;
```

It processed a large amount of data in one shot, and `upstream_doc_no` originally lacked a suitable index, causing the SQL to run for a long time while holding a large number of row locks.

Going forward, consider:

```sql
CREATE INDEX idx_sales_issue_upstream_doc_no
ON sales_issue(upstream_doc_no);
```

For large updates, prefer batched UPDATE + batched commit to avoid a single transaction locking hundreds of thousands of rows at once.

## Takeaways

When encountering:

```
Lock wait timeout exceeded
```

prioritize this investigation flow:

```
SHOW FULL PROCESSLIST
        ↓
information_schema.innodb_trx
        ↓
Find long transactions and LOCK WAIT
        ↓
Check trx_rows_locked
        ↓
Confirm the blocking source
        ↓
KILL the abnormal transaction if necessary
```

This was the first time I personally produced a MySQL "table lock" effect.

More accurately: it was not a real table lock, but 187144 rows locked in one go.
