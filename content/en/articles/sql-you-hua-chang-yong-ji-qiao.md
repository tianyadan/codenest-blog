---
title: Common SQL Optimization Tips
summary: "A lot of SQL performance issues come from habits such as using select *, forcing heavy deduplication with union, driving joins from large tables, or fetching more rows than the business actually needs. This note collects practical optimization ideas."
author: evan
category: learning
tags: [Learning, SQL]
createdAt: 2025-09-18 19:53:26
updatedAt: 2025-09-18 19:53:26
readingMinutes: 5
---
# Common SQL Optimization Tips

## 1. Avoid `select *`

- In many cases, we like to use `select *` to fetch every column at once. But in real business scenarios, we may only need one or two columns. Fetching unused data **wastes database resources**, such as memory and CPU.
- In addition, `select *` often prevents the query from using a **covering index**, which can cause a large number of **table lookups** and lead to very poor SQL performance.

- Better approach: **query only the fields you actually need**.

`select name, age from users where id = 1;`

## 2. Use `union all` instead of `union`

- After using `union`, SQL returns deduplicated data. `union all` returns all rows, including duplicates. But deduplication requires traversal, sorting, and comparison.
- That means it takes more time and consumes more CPU resources. So if `union all` is acceptable, prefer it over `union`.

## 3. Let small tables drive large tables

- This means that during a join, if one table is small and the other is large, query from the small table first and then access the large table. This reduces the amount of data scanned from the large table and improves efficiency.
- Example: suppose there are two tables. The `user` table has only **1,000** rows, while the `orders` table has **1,000,000** rows.
- Wrong example: let the large table drive the query by querying `orders` directly:

```sql
SELECT o.*
FROM orders o
JOIN user u ON o.user_id = u.id
WHERE u.id IN (1, 2, 3);
```

- Problem: MySQL / PostgreSQL may scan `orders` first (1,000,000 rows) and then perform the join. If `orders` does not have an index on `user_id`, performance will be poor.

- **Optimized example: let the small table drive the large table**
- Step 1: query the user IDs needed from the small table. Step 2: query the large table with those results by writing a subquery:

```sql
SELECT *
FROM orders
WHERE user_id IN (
    SELECT id FROM user WHERE id IN (1, 2, 3)
);
```

- **Advantage: the small table has only 1,000 rows, so it is very fast to query. The large table scans based on the small table's result set (using the `user_id` index), which greatly reduces the amount of scanned data.**
- Principle: in joins, try to let the query start from the small table so the large table scan is reduced.
- **Extra note: `in` is suitable when the left side is a large table and the right side is a small table. `exists` is suitable when the left side is a small table and the right side is a large table.**

## 4. Batch operations

- Do not frequently loop in business code and insert rows one by one. Use the database's batch insert capability to reduce overhead.

## 5. Use `limit` more often

- Sometimes we only need the first matching row. For example, if we want the time of a user's first order and write:

```sql
select id, create_date from order where user_id = 123 order by create_date asc;
```

this returns a full result set, and then the code takes the first element. **That is inefficient because it queries all rows and wastes resources.**

**The better approach is:**

```sql
select id, create_date from order where user_id = 123 order by create_date asc limit 1;
```

Use `limit 1` so only the earliest row is returned.

- Another example: **when checking whether data exists, stop using `count` blindly.**

If you only care whether a record exists and do not care how many rows match, just use `limit 1`. The database can return as soon as it finds one row, which saves a lot of resources.

## 7. Too many values in `in`

## 8. Incremental queries

## 9. Efficient pagination

## 10. Use joins instead of subqueries when appropriate

## 11. Do not join too many tables

## 12. Use indexes

## 13. Optimize indexes

The Alibaba Java Development Manual recommends keeping the number of indexes on a single table within `5`, and the number of columns in one index within `5` as well. MySQL uses B+ trees to maintain indexes, so `insert`, `update`, and `delete` operations all need to update those index structures. Too many indexes bring extra overhead.
