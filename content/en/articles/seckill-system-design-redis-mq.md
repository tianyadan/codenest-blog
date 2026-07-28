---
title: Designing a Concurrent Flash Sale System: From DB Row Locks to Redis + MQ
summary: A practical flash-sale architecture path: start with database row locks at moderate concurrency, move inventory deduction to Redis under peak traffic, create orders asynchronously via MQ, and let the frontend poll until checkout is ready.
author: evan
category: learning
tags: [Learning, Redis, MQ, Flash Sale, High Concurrency]
createdAt: 2026-07-27
updatedAt: 2026-07-27
readingMinutes: 8
slug: seckill-system-design-redis-mq
---

# Designing a Concurrent Flash Sale System: From DB Row Locks to Redis + MQ

A flash sale is not mainly about making the order API slightly faster. It is about rejecting most useless requests before they hit the hot path, preventing overselling, and still letting valid users reach payment.

Here is an evolutionary design I recently organized:

- At moderate concurrency, use database row locks.
- When traffic rises, move inventory deduction to Redis.
- Create orders asynchronously through MQ for decoupling and peak shaving.
- Show “grab success” on the frontend first, then poll until the order is ready.

---

## 1. Understand the Core Trade-offs

A flash sale usually has three hard constraints:

1. **No overselling**: if stock is 100, you cannot create 101 paid-eligible orders.
2. **Extreme hot writes**: many requests compete for the same product inventory.
3. **Fast user feedback**: the API must not freeze, and users need a clear result path.

Databases are strong at transactions and consistency, but weak at sudden write spikes. If the hot path writes to the DB directly, connection pools, row-lock waits, and disk I/O become bottlenecks quickly.

So the design principle is:

- Keep the **hot path in memory** (Redis)
- Make the **slow path asynchronous** (MQ → order persistence)
- Accept **eventual consistency** on the frontend (success first, order later)

---

## 2. Phase 1: Database Row Locks (Good for Thousands of QPS)

When concurrency is only around thousands, a database optimistic lock or row lock is often enough:

```sql
-- Optimistic lock: deduct only when stock is still available
UPDATE product_stock
SET stock = stock - 1, version = version + 1
WHERE product_id = #{productId}
  AND stock >= 1
  AND version = #{version};
```

You can also use `SELECT ... FOR UPDATE` so inventory updates for the same product are serialized.

**Pros**

- Simple to implement
- Strong consistency
- Good for early versions, internal tests, and smaller campaigns

**Cons**

- Hot-row lock contention grows fast
- DB connections and transaction overhead become expensive
- Higher concurrency usually fails at the database layer first

Bottom line: **thousands of concurrent requests can still start with the DB. Higher peaks require moving inventory deduction out of the DB.**

---

## 3. Phase 2: Redis Pre-Deduction (No DB on the Hot Path)

The key rule for high-concurrency flash sales:

> Do not touch the database on the hot path. Once you write the DB synchronously, concurrency collapses.

A typical hot path looks like this:

```text
Request comes in
  → Check Redis stock (fast reject when sold out)
  → Deduct Redis stock (check again so result cannot go below 0)
  → On success, publish an MQ order-create message
  → Return "grab success (processing)" immediately
```

### 1. Check stock before deduction

A cheap read filters out most sold-out traffic and avoids useless writes:

```text
GET seckill:stock:{productId}
```

If stock is already `<= 0`, return sold out.

### 2. Validate again during deduction

Check-then-deduct is not atomic by itself. The deduction step must guarantee that stock never becomes invalid. Lua is a common choice:

```lua
-- KEYS[1] = stock key
local stock = tonumber(redis.call('GET', KEYS[1]) or '0')
if stock <= 0 then
  return -1
end
return redis.call('DECR', KEYS[1])
```

In plain words:

1. Read current stock
2. Fail immediately if none left
3. Otherwise `DECR` inside the same atomic script

That combines “check + deduct” into one Redis operation and prevents overselling.

### 3. Why the hot path must avoid DB writes

At peak traffic, the expensive part is rarely one `INSERT` statement. It is:

- Connection contention
- Hot-row lock waits
- Disk write amplification
- Transaction commit latency

If the hot path still writes the DB synchronously, Redis speed cannot save you. Therefore:

- **Pre-deduct inventory in Redis**
- **Persist orders asynchronously**

---

## 4. Phase 3: Asynchronous Order Creation with MQ

After Redis deduction succeeds, do not create the order in the same request. Publish a message instead:

```text
Redis stock deducted
  → Send OrderCreate message to MQ
  → Respond "grab success" to the client
  → Consumer asynchronously writes order tables / details / logs
```

MQ provides two benefits here:

1. **Decoupling**: the flash-sale API only grants eligibility; the order service owns persistence
2. **Peak shaving**: burst traffic enters the queue, and consumers drain it at a sustainable rate

Important engineering details:

- Include a **business idempotency key** (for example `userId + productId + requestId`) to avoid duplicate orders
- If stock was deducted but MQ publish failed, compensate: restore stock, or persist a local outbox and retry
- If the consumer fails to write the DB, retry idempotently; on final failure, restore stock and mark the grab as failed

So “grab success” really means: **the user won the right to place an order, and order creation is in progress.**

---

## 5. Frontend Flow: Optimistic Success + Polling

To keep the UX responsive:

1. User clicks Buy / Grab
2. Backend returns success / processing
3. Frontend shows a success or “creating order” state
4. Poll the order-status API every **1–2 seconds**
5. When the order is created, redirect to the payment page

Polling flow:

```text
POST /seckill/grab
  ← { status: "SUCCESS_PENDING", requestId: "xxx" }

Every 1–2 seconds:
GET /seckill/order-status?requestId=xxx
  ← { status: "CREATED", orderId: "o123" }
  → Navigate to /pay?orderId=o123
```

This feels better than blocking on synchronous order creation, and it matches eventual consistency under high concurrency.

Optional improvements:

- Cap polling attempts and show “order is still being created, check My Orders”
- Use WebSocket / SSE when available to reduce polling traffic

---

## 6. Rough Redis Capacity Expectations

A practical mental model:

- Concurrent Redis read/write around **10k–20k** is already heavy for one instance
- A **single Redis** often handles about **20k–30k** read/write operations under common conditions (hardware, command complexity, network, and value size all matter)
- For around **100k** concurrency, you usually need a **Redis Cluster** so load can scale across nodes

A common evolution path:

```text
Single Redis (validate the pipeline)
  → Redis replica / Sentinel (high availability)
  → Redis Cluster (horizontal throughput)
```

Watch out for single-key hotspots. One product stock key can overwhelm one shard. Bucketed stock helps:

```text
seckill:stock:{productId}:0
seckill:stock:{productId}:1
seckill:stock:{productId}:2
...
```

Deduct from a user-hashed or random bucket while keeping the total equal to overall inventory.

---

## 7. Recommended End-to-End Pipeline

Putting the layers together:

```text
User request
  → Rate limiting / anti-abuse / auth
  → Read Redis stock (fast fail)
  → Atomically deduct Redis stock (no oversell)
  → Publish MQ order-create message
  → Return "grab success (processing)"
  → Frontend polls order status
  → Order created → jump to payment
  → MQ consumer writes DB (order persistence)
```

Responsibility split:

| Stage | Responsibility | On hot path? |
| --- | --- | --- |
| Gateway / rate limit | Block abusive traffic | Yes |
| Redis inventory | Pre-deduct eligibility, prevent oversell | Yes |
| MQ | Decouple and smooth peaks | Yes (publish only) |
| Order service | Persist and create payable orders | No (async) |
| Frontend polling | Wait for final result and open payment | Client side |

---

## 8. Takeaways

This flash-sale approach can be summarized in four points:

1. **Start with DB row locks** when concurrency is moderate and correctness matters most.
2. **Move inventory deduction to Redis** for high concurrency, and ban synchronous DB writes on the hot path.
3. **Check stock first, then deduct atomically** so inventory never goes invalid.
4. **Create orders through MQ**, show success early, and poll until payment is ready.

Flash sale design is a balance among consistency, throughput, and user experience. Get the main pipeline right first, then harden it with rate limiting, idempotency, compensation, and sharding.
