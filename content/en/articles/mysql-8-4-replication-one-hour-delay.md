---
title: MySQL 8.4 Replication with a One-Hour Delayed Replica
summary: Full init with Clone Plugin, incremental sync with binlog replication, and SOURCE_DELAY=3600 for about an hour of recovery time after accidental deletes. End-to-end notes from environment checks to cutover ideas.
author: evan
category: work
tags: [Work Notes, MySQL, Replication, Clone Plugin, Docker]
createdAt: 2026-09-28
updatedAt: 2026-09-28
readingMinutes: 18
slug: mysql-8-4-replication-one-hour-delay
---

# MySQL 8.4 Replication with a One-Hour Delayed Replica

The goal this time was not a one-off SQL dump. It was to sync MySQL from the old server to a new one and keep a long-lived replica. The business keeps writing the old primary. The primary keeps writing binlog. The new replica keeps pulling it, but deliberately waits one hour before applying. That prepares for migration and leaves roughly an hour of buffer after a bad write.

```text
Business keeps writing the old primary
        ↓
    Primary keeps producing binlog
        ↓
New replica keeps pulling binlog
        ↓
Replica applies with a deliberate 1-hour delay
```

If the primary deletes data by mistake, stopping SQL apply on the replica within that hour still gives a chance to recover from the replica.

## Environment

Old server as primary:

```text
IP: <PRIMARY_HOST>
MySQL: 8.4.5
Docker image: mysql:8.4
Host port: <MYSQL_PORT>
server_id: 1
```

New server as replica:

```text
IP: <REPLICA_HOST>
MySQL: 8.4.5
Docker image: mysql:8.4
Host port: <MYSQL_PORT>
server_id: 2
```

Replication direction:

```text
<PRIMARY_HOST>:<MYSQL_PORT>
        ↓
<REPLICA_HOST>:<MYSQL_PORT>
```

## Why not a plain SQL dump

The old database was already tens of GB. `mysqldump` would work, but export is slow, the file is huge, import is slow, and the primary keeps taking writes during the dump.

The approach used here:

```text
MySQL Clone Plugin
        +
binlog replication
        +
SOURCE_DELAY
```

Clone Plugin copies a full physical dataset quickly. Replication catches up on incremental changes after Clone finishes. `SOURCE_DELAY` makes the replica apply those changes one hour late.

## Confirm the old primary is ready for replication

On the old server:

```bash
docker exec -it <MYSQL_CONTAINER> mysql -uroot -p
```

Check version, `server_id`, binlog, and format:

```sql
SELECT VERSION();
SHOW VARIABLES LIKE 'server_id';
SHOW VARIABLES LIKE 'log_bin';
SHOW VARIABLES LIKE 'binlog_format';
```

Results in this case looked like:

```text
VERSION = 8.4.5
server_id = 1
log_bin = ON
binlog_format = ROW
```

GTID was off:

```sql
SHOW VARIABLES LIKE 'gtid_mode';
SHOW VARIABLES LIKE 'enforce_gtid_consistency';
```

```text
gtid_mode = OFF
enforce_gtid_consistency = OFF
```

So replication used classic `binlog file + position`, not GTID.

Check the current binlog:

```sql
SHOW BINARY LOG STATUS;
```

At that moment it looked roughly like:

```text
File: binlog.000073
Position: <SOME_POSITION>
```

That position was only a live snapshot. Later replication did not start from it. The primary kept writing. The real starting point is the consistent binlog coordinates Clone Plugin records after Clone completes.

## Install the same MySQL image on the new server

If the new host does not have `mysql:8.4`, export it from the old host and load it.

On the old server:

```bash
docker save mysql:8.4 | gzip > /tmp/mysql-8.4.tar.gz
```

Copy to the new server:

```bash
scp /tmp/mysql-8.4.tar.gz <USER>@<REPLICA_HOST>:/tmp/
```

Load on the new server:

```bash
gzip -dc /tmp/mysql-8.4.tar.gz | docker load
docker images | grep mysql
```

That keeps both hosts on the same MySQL image.

## Prepare the MySQL data directory on the new server

Data lives under:

```text
/data/mysql
```

Create directories:

```bash
mkdir -p /data/mysql/{data,conf,logs}
```

Config file `/data/mysql/conf/mysql.cnf`:

```ini
[mysqld]

server-id=2

log-bin=mysql-bin
binlog-format=ROW

relay-log=relay-bin
relay-log-recovery=ON

read_only=ON
super_read_only=ON

skip-name-resolve

character-set-server=utf8mb4
collation-server=utf8mb4_0900_ai_ci
```

The critical rule is unique `server_id` values: primary `1`, replica `2`. `read_only=ON` and `super_read_only=ON` reduce the chance that apps or operators write to the replica by mistake.

## Start the new MySQL instance

```bash
docker run -itd \
  --name=<MYSQL_CONTAINER> \
  --restart=unless-stopped \
  -e TZ=Asia/Shanghai \
  -e MYSQL_ROOT_PASSWORD='<PASSWORD>' \
  -p <MYSQL_PORT>:3306 \
  -v /data/mysql/data:/var/lib/mysql \
  -v /data/mysql/conf/mysql.cnf:/etc/mysql/mysql.cnf \
  -v /data/mysql/logs:/var/log/mysql \
  -v /etc/localtime:/etc/localtime \
  mysql:8.4
```

Put the real password only in the live environment. Do not commit it.

```bash
docker ps | grep <MYSQL_CONTAINER>
```

## Full init with Clone Plugin

Install Clone Plugin on the old primary:

```sql
INSTALL PLUGIN clone SONAME 'mysql_clone.so';

SELECT
    PLUGIN_NAME,
    PLUGIN_STATUS
FROM INFORMATION_SCHEMA.PLUGINS
WHERE PLUGIN_NAME = 'clone';
```

Expected:

```text
clone    ACTIVE
```

Create a Clone user and a replication user on the primary:

```sql
CREATE USER 'clone_user'@'<REPLICA_HOST>'
IDENTIFIED BY '<PASSWORD>';

GRANT BACKUP_ADMIN ON *.* TO
'clone_user'@'<REPLICA_HOST>';

CREATE USER 'repl'@'<REPLICA_HOST>'
IDENTIFIED BY '<PASSWORD>';

GRANT REPLICATION SLAVE ON *.* TO
'repl'@'<REPLICA_HOST>';

FLUSH PRIVILEGES;
```

Install Clone Plugin on the replica and allow the donor:

```sql
INSTALL PLUGIN clone SONAME 'mysql_clone.so';

SET GLOBAL clone_valid_donor_list =
'<PRIMARY_HOST>:<MYSQL_PORT>';

SHOW VARIABLES LIKE 'clone_valid_donor_list';
```

## Run Clone

On the new server MySQL:

```sql
CLONE INSTANCE FROM
'clone_user'@'<PRIMARY_HOST>':<MYSQL_PORT>
IDENTIFIED BY '<PASSWORD>';
```

The command can sit with no return for a long time. That is normal; it is copying physical data. Watch progress in another session:

```sql
SELECT
  ID,
  PID,
  STATE,
  BEGIN_TIME,
  END_TIME,
  SOURCE,
  ERROR_NO,
  ERROR_MESSAGE
FROM performance_schema.clone_status\G
```

While running:

```text
STATE: In Progress
SOURCE: <PRIMARY_HOST>:<MYSQL_PORT>
ERROR_NO: 0
```

Stage detail:

```sql
SELECT
  STAGE,
  STATE,
  BEGIN_TIME,
  END_TIME,
  THREADS,
  ESTIMATE,
  DATA,
  NETWORK
FROM performance_schema.clone_progress;
```

Stages in order:

```text
DROP DATA
FILE COPY
PAGE COPY
REDO COPY
FILE SYNC
RESTART
RECOVERY
```

When every stage shows `Completed`, Clone succeeded. `FILE COPY` moved about 47GB in this run.

## Get the consistent binlog coordinates after Clone

```sql
SELECT * FROM performance_schema.clone_status\G
```

Example result:

```text
STATE: Completed
SOURCE: <PRIMARY_HOST>:<MYSQL_PORT>

BINLOG_FILE: binlog.000073
BINLOG_POSITION: <CLONE_BINLOG_POS>
```

These coordinates matter. Replication must start here. Do not reuse the earlier `SHOW BINARY LOG STATUS` position, because the primary kept writing during Clone. The file and position from Clone Plugin are the incremental start that matches the replica dataset.

## Recheck replica settings after Clone

After Clone, `server_id`, `read_only`, and `super_read_only` may have been overwritten by primary values:

```text
server_id = 1
read_only = 0
super_read_only = 0
```

Reset them:

```sql
SET PERSIST server_id = 2;
SET PERSIST read_only = ON;
SET PERSIST super_read_only = ON;
```

```bash
docker restart <MYSQL_CONTAINER>
```

Confirm:

```sql
SELECT
    @@server_id,
    @@read_only,
    @@super_read_only;
```

Expected:

```text
server_id = 2
read_only = 1
super_read_only = 1
```

Matching `server_id` values on primary and replica will break replication.

## Establish replication

On the replica:

```sql
CHANGE REPLICATION SOURCE TO
  SOURCE_HOST='<PRIMARY_HOST>',
  SOURCE_PORT=<MYSQL_PORT>,
  SOURCE_USER='repl',
  SOURCE_PASSWORD='<PASSWORD>',
  SOURCE_LOG_FILE='binlog.000073',
  SOURCE_LOG_POS=<CLONE_BINLOG_POS>,
  GET_SOURCE_PUBLIC_KEY=1;

START REPLICA;
SHOW REPLICA STATUS\G
```

Field meanings:

```text
SOURCE_HOST / SOURCE_PORT  old primary address and port
SOURCE_USER                replication account
SOURCE_LOG_FILE / POS      consistent Clone coordinates
GET_SOURCE_PUBLIC_KEY      allow MySQL 8 default auth public key fetch
```

Healthy output:

```text
Replica_IO_Running: Yes
Replica_SQL_Running: Yes
Last_IO_Errno: 0
Last_SQL_Errno: 0
```

## How replication actually works

Every `INSERT` / `UPDATE` / `DELETE` / `DDL` on the primary lands in binlog. The replica does two jobs:

```text
IO thread
Stays connected to the primary and pulls new binlog into local relay log.

SQL thread
Reads relay log and applies the same changes on the replica.
```

So primary inserts, updates, and deletes become replica inserts, updates, and deletes. That is why:

```text
replication ≠ backup
```

Ordinary replication only keeps the replica in sync. If the primary deletes by mistake, the replica deletes too.

## Add a one-hour delay

To stop accidental deletes from applying immediately on the replica, add a one-hour delay:

```sql
STOP REPLICA;

CHANGE REPLICATION SOURCE TO
  SOURCE_DELAY = 3600;

START REPLICA;
SHOW REPLICA STATUS\G
```

`3600` seconds is one hour. Healthy delayed status looks like:

```text
Replica_IO_Running: Yes
Replica_SQL_Running: Yes
SQL_Delay: 3600
SQL_Remaining_Delay: <seconds left>

Replica_SQL_Running_State:
Waiting until SOURCE_DELAY seconds after source executed event
```

## What delayed replication really does

Delayed replication does **not** mean “wait one hour before fetching binlog from the primary.” The actual flow is:

```text
Primary produces binlog
        ↓
Replica IO thread pulls it immediately
        ↓
Events land in relay log
        ↓
SQL thread waits 3600 seconds
        ↓
Then applies
```

Network sync stays near real time. Applied data on the replica is about one hour behind. If a bad delete happens at 10:00, the replica already has that DELETE in relay log, but it will not apply until 11:00. That hour is the recovery window.

## What to do after an accidental delete on the primary

The first move is not root-cause analysis. Stop SQL apply on the replica first. You can stop only the SQL thread:

```sql
STOP REPLICA SQL_THREAD;
```

That keeps the IO thread pulling binlog while SQL apply stops. Or stop everything:

```sql
STOP REPLICA;
```

Either way, the bad delete is blocked from landing on the replica. Then export what you need from the replica.

## How to tell if replication is healthy

The command that matters most day to day:

```sql
SHOW REPLICA STATUS\G
```

Watch:

```text
Replica_IO_Running: Yes
Replica_SQL_Running: Yes
Last_IO_Errno: 0
Last_SQL_Errno: 0
```

On a delayed replica also check `SQL_Delay: 3600`. This state is usually fine:

```text
Replica_IO_State: Waiting for source to send event
```

It means the replica has caught up to the latest primary binlog and is waiting for the next event.

Besides `server_id`, each instance must have a different `server_uuid`:

```sql
SELECT @@server_uuid;
```

Different UUIDs on primary and replica are correct.

## What this setup delivers

```text
                    App traffic
                       │
                       ▼
             Old MySQL primary
          <PRIMARY_HOST>:<MYSQL_PORT>
               server_id=1
                       │
                       │ binlog
                       ▼
             New MySQL replica
          <REPLICA_HOST>:<MYSQL_PORT>
               server_id=2
                       │
                       │ delay 3600 seconds
                       ▼
                  Apply changes
```

Outcomes:

1. The old dataset is fully copied to the new server.
2. The new server keeps pulling new primary binlog.
3. The replica applies changes one hour late.
4. After a bad delete on the primary, there is roughly one hour to stop the replica SQL thread and recover.
5. The new server is ready as a future primary candidate.

## This still does not replace real backups

A delayed replica is safer than a live replica, but it is not a full backup strategy. If the bad change is not noticed within an hour, the replica will still apply primary `DELETE` / `DROP TABLE` / `DROP DATABASE`.

A better long-term pattern:

```text
replication
+
delayed replica
+
scheduled full backups
```

For example, daily backups kept for 7 days, and weekly long-term backups kept for 4 weeks. That is a more complete disaster-recovery setup.

## Turn off the delay later

```sql
STOP REPLICA;

CHANGE REPLICATION SOURCE TO
  SOURCE_DELAY = 0;

START REPLICA;
SHOW REPLICA STATUS\G
```

Confirm `SQL_Delay: 0`.

## Later cutover to the new primary

If traffic should move to the new server later, the rough sequence is:

```text
1. Temporarily stop writes to the old primary
2. Set SOURCE_DELAY to 0
3. Wait for the replica to catch up fully
4. Confirm replication has no errors
5. STOP REPLICA
6. Turn off read_only / super_read_only on the new host
7. Point the app at the new database
8. Start the app
9. Verify writes, reads, and transactions
10. Keep the old primary for a while as a rollback point
```

Write a dedicated cutover checklist before doing this for real. Do not rely on memory alone.

## Summary

Instead of “dump SQL and restore,” this run used:

```text
MySQL Clone Plugin
    +
binlog replication
    +
one-hour delayed apply
```

Clone Plugin handles full init. Binlog replication handles ongoing incremental sync. `SOURCE_DELAY=3600` buys reaction time after a bad write. It fits a scenario where the old database stays online, the new server syncs ahead of cutover, and a short accidental-delete recovery window is still required. Overall it is a better long-term migration and resilience prep than a one-shot SQL backup alone.
