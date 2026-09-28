---
title: MySQL 8.4 主从复制与 1 小时延迟备份
summary: 用 Clone Plugin 做全量初始化，再用 binlog 主从复制接增量，并设置 SOURCE_DELAY=3600，给误删留出约一小时的抢救窗口。记录从环境检查到切库思路的完整过程。
author: evan
category: work
tags: [工作总结, MySQL, 主从复制, Clone Plugin, Docker]
createdAt: 2026-09-28
updatedAt: 2026-09-28
readingMinutes: 18
slug: mysql-8-4-replication-one-hour-delay
---

# MySQL 8.4 主从复制与 1 小时延迟备份

这次的目标不是单纯做一份数据库备份，而是把旧服务器上的 MySQL 数据同步到新服务器，并长期保留一套从库。业务继续写旧主库，主库持续产生 binlog，新服务器从库持续拉取，但从库故意延迟 1 小时再执行。这样既能完成迁移准备，也能在误操作后留下大约一小时的缓冲。

```text
业务继续写旧主库
        ↓
    主库持续产生 binlog
        ↓
新服务器从库持续拉取 binlog
        ↓
从库故意延迟 1 小时执行
```

如果主库误删数据，只要在一小时内停掉从库的 SQL 回放，就有机会从从库把数据救回来。

## 本次环境

旧服务器作为主库：

```text
IP：<PRIMARY_HOST>
MySQL：8.4.5
Docker 镜像：mysql:8.4
宿主机端口：<MYSQL_PORT>
server_id：1
```

新服务器作为从库：

```text
IP：<REPLICA_HOST>
MySQL：8.4.5
Docker 镜像：mysql:8.4
宿主机端口：<MYSQL_PORT>
server_id：2
```

复制方向：

```text
<PRIMARY_HOST>:<MYSQL_PORT>
        ↓
<REPLICA_HOST>:<MYSQL_PORT>
```

## 为什么不用普通 SQL 备份

旧库数据量已经比较大，大约几十 GB。直接用 `mysqldump` 虽然能用，但会遇到导出时间长、SQL 文件大、导入时间长，以及主库在导出过程中仍持续写入等问题。

这次采用的方案是：

```text
MySQL Clone Plugin
        +
binlog 主从复制
        +
SOURCE_DELAY 延迟执行
```

Clone Plugin 负责快速复制一份完整的物理数据。主从复制负责 Clone 完成后继续同步增量。`SOURCE_DELAY` 负责让从库晚 1 小时执行这些增量。

## 先确认旧主库是否满足复制条件

进入旧服务器 MySQL：

```bash
docker exec -it <MYSQL_CONTAINER> mysql -uroot -p
```

检查版本、`server_id`、binlog 与格式：

```sql
SELECT VERSION();
SHOW VARIABLES LIKE 'server_id';
SHOW VARIABLES LIKE 'log_bin';
SHOW VARIABLES LIKE 'binlog_format';
```

本次结果类似：

```text
VERSION = 8.4.5
server_id = 1
log_bin = ON
binlog_format = ROW
```

旧库没有开启 GTID：

```sql
SHOW VARIABLES LIKE 'gtid_mode';
SHOW VARIABLES LIKE 'enforce_gtid_consistency';
```

```text
gtid_mode = OFF
enforce_gtid_consistency = OFF
```

所以这次没有使用 GTID，而是用传统的 `binlog 文件名 + position` 建立复制关系。

检查当前 binlog：

```sql
SHOW BINARY LOG STATUS;
```

当时看到的位置类似：

```text
File: binlog.000073
Position: <SOME_POSITION>
```

这个位置只是当时的实时位置，后面真正建立复制时没有直接使用它。主库一直有新写入，真正应该使用的是 Clone 完成后由 Clone Plugin 记录下来的一致性 binlog 位点。

## 新服务器安装与旧服务器一致的 MySQL 镜像

新服务器没有 `mysql:8.4` 镜像时，可以从旧服务器导出再加载。

旧服务器执行：

```bash
docker save mysql:8.4 | gzip > /tmp/mysql-8.4.tar.gz
```

传到新服务器：

```bash
scp /tmp/mysql-8.4.tar.gz <USER>@<REPLICA_HOST>:/tmp/
```

新服务器加载：

```bash
gzip -dc /tmp/mysql-8.4.tar.gz | docker load
docker images | grep mysql
```

这样可以保证新旧服务器使用同一套 MySQL 镜像。

## 新服务器准备 MySQL 数据目录

数据目录单独放在：

```text
/data/mysql
```

创建目录：

```bash
mkdir -p /data/mysql/{data,conf,logs}
```

准备配置文件 `/data/mysql/conf/mysql.cnf`：

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

最重要的是主从 `server_id` 不能重复：旧主库 `1`，新从库 `2`。`read_only=ON` 和 `super_read_only=ON` 用来避免业务或运维误写从库。

## 启动新 MySQL

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

密码只在实际环境中填写，不要写进公开文档。

```bash
docker ps | grep <MYSQL_CONTAINER>
```

## 使用 Clone Plugin 做全量初始化

先在旧主库安装 Clone Plugin：

```sql
INSTALL PLUGIN clone SONAME 'mysql_clone.so';

SELECT
    PLUGIN_NAME,
    PLUGIN_STATUS
FROM INFORMATION_SCHEMA.PLUGINS
WHERE PLUGIN_NAME = 'clone';
```

正常结果：

```text
clone    ACTIVE
```

旧主库创建 Clone 专用账号和复制账号：

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

新从库也安装 Clone Plugin，并配置允许从旧主库拉数据：

```sql
INSTALL PLUGIN clone SONAME 'mysql_clone.so';

SET GLOBAL clone_valid_donor_list =
'<PRIMARY_HOST>:<MYSQL_PORT>';

SHOW VARIABLES LIKE 'clone_valid_donor_list';
```

## 正式执行 Clone

在新服务器 MySQL 中执行：

```sql
CLONE INSTANCE FROM
'clone_user'@'<PRIMARY_HOST>':<MYSQL_PORT>
IDENTIFIED BY '<PASSWORD>';
```

这个命令执行时看起来可能会长时间没有返回，这是正常的，因为它会直接从旧库拷贝物理数据。可以另开一个会话查看状态：

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

进行中时类似：

```text
STATE: In Progress
SOURCE: <PRIMARY_HOST>:<MYSQL_PORT>
ERROR_NO: 0
```

查看详细阶段：

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

Clone 会依次经历：

```text
DROP DATA
FILE COPY
PAGE COPY
REDO COPY
FILE SYNC
RESTART
RECOVERY
```

全部变成 `Completed` 即成功。本次 `FILE COPY` 拷贝了约 47GB 数据。

## Clone 完成后获取一致性 binlog 位点

```sql
SELECT * FROM performance_schema.clone_status\G
```

本次拿到类似：

```text
STATE: Completed
SOURCE: <PRIMARY_HOST>:<MYSQL_PORT>

BINLOG_FILE: binlog.000073
BINLOG_POSITION: <CLONE_BINLOG_POS>
```

这个位置非常重要。后面的主从复制必须从这里开始，不能直接拿之前 `SHOW BINARY LOG STATUS` 看到的旧位置，因为 Clone 期间主库还在不断写入。Clone Plugin 给出的文件名和位点，才是和新库当前数据一致的增量起点。

## Clone 后重新检查从库配置

Clone 完成后，新库的 `server_id`、`read_only`、`super_read_only` 可能被主库的值覆盖。当时看到：

```text
server_id = 1
read_only = 0
super_read_only = 0
```

需要重新设置：

```sql
SET PERSIST server_id = 2;
SET PERSIST read_only = ON;
SET PERSIST super_read_only = ON;
```

```bash
docker restart <MYSQL_CONTAINER>
```

再次确认：

```sql
SELECT
    @@server_id,
    @@read_only,
    @@super_read_only;
```

期望结果：

```text
server_id = 2
read_only = 1
super_read_only = 1
```

如果主从 `server_id` 一样，复制关系会出问题。

## 建立真正的主从复制

新从库执行：

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

关键字段含义：

```text
SOURCE_HOST / SOURCE_PORT  旧主库地址与端口
SOURCE_USER                复制专用账号
SOURCE_LOG_FILE / POS      Clone 给出的一致性位点
GET_SOURCE_PUBLIC_KEY      允许 MySQL 8 默认认证获取公钥
```

正常时应看到：

```text
Replica_IO_Running: Yes
Replica_SQL_Running: Yes
Last_IO_Errno: 0
Last_SQL_Errno: 0
```

## 主从复制到底是怎么工作的

主库每一次 `INSERT` / `UPDATE` / `DELETE` / `DDL` 都会写入 binlog。从库有两部分工作：

```text
IO 线程
持续连接主库，把新的 binlog 拉到本地 relay log。

SQL 线程
读取 relay log，再在从库上执行同样的操作。
```

所以主库增删改，从库也会跟着增删改。这也是为什么：

```text
主从复制 ≠ 备份
```

普通主从只能保证同步。如果主库误删，从库也会跟着删。

## 增加 1 小时延迟复制

为了避免主库误删后从库马上跟着删，再增加 1 小时延迟：

```sql
STOP REPLICA;

CHANGE REPLICATION SOURCE TO
  SOURCE_DELAY = 3600;

START REPLICA;
SHOW REPLICA STATUS\G
```

`3600` 秒就是 1 小时。正常时应看到：

```text
Replica_IO_Running: Yes
Replica_SQL_Running: Yes
SQL_Delay: 3600
SQL_Remaining_Delay: <剩余秒数>

Replica_SQL_Running_State:
Waiting until SOURCE_DELAY seconds after source executed event
```

## 延迟复制到底是什么效果

延迟复制不是「1 小时后才去主库拿 binlog」。实际逻辑是：

```text
主库产生 binlog
        ↓
从库 IO 线程马上拉下来
        ↓
先放在 relay log
        ↓
SQL 线程等待 3600 秒
        ↓
再执行
```

网络同步依然是实时的，只是数据真正落到从库时会晚 1 小时。例如 10:00 主库误删，从库虽然已经拿到这条 DELETE 的 binlog，但要到 11:00 才真正执行。这中间就留下了一小时的抢救窗口。

## 如果发现主库误删怎么办

第一件事不是去查原因，而是先把从库的 SQL 回放停下来。可以只停 SQL 线程：

```sql
STOP REPLICA SQL_THREAD;
```

好处是 IO 线程继续从主库收 binlog，SQL 线程停止执行。也可以直接全部停掉：

```sql
STOP REPLICA;
```

这样就能阻止那条误删操作在从库真正落地，然后再从从库导出需要恢复的数据。

## 如何判断主从状态是否正常

平时最重要的一条命令：

```sql
SHOW REPLICA STATUS\G
```

重点看：

```text
Replica_IO_Running: Yes
Replica_SQL_Running: Yes
Last_IO_Errno: 0
Last_SQL_Errno: 0
```

延迟从库还要看 `SQL_Delay: 3600`。如果看到：

```text
Replica_IO_State: Waiting for source to send event
```

通常是正常状态，意思是当前已经追到主库最新 binlog，正在等主库产生下一条新事件。

除了 `server_id`，每个实例的 `server_uuid` 也不能相同：

```sql
SELECT @@server_uuid;
```

主从两边 UUID 不同才是正确的。

## 这套方案最后实现了什么

```text
                    业务服务
                       │
                       ▼
             旧 MySQL 主库
          <PRIMARY_HOST>:<MYSQL_PORT>
               server_id=1
                       │
                       │ binlog
                       ▼
             新 MySQL 从库
          <REPLICA_HOST>:<MYSQL_PORT>
               server_id=2
                       │
                       │ 延迟 3600 秒
                       ▼
                  执行数据变更
```

最终效果：

1. 旧库数据已完整复制到新服务器。
2. 新服务器持续拉取旧主库的新 binlog。
3. 新从库延迟 1 小时执行变更。
4. 主库误删时，大约有一小时可以停掉从库 SQL 线程抢救数据。
5. 新服务器已具备后续切换成正式主库的基础。

## 这套方案不能替代正式备份

延迟主从比普通主从安全很多，但仍然不是完整备份方案。如果一小时内没有发现误操作，从库最终还是会执行主库的 `DELETE` / `DROP TABLE` / `DROP DATABASE`。

长期建议仍然是：

```text
主从复制
+
延迟从库
+
定期全量备份
```

例如每天一次备份保留 7 天，每周一次长期备份保留 4 周。这样才是更完整的容灾方案。

## 后续如果要取消延迟

```sql
STOP REPLICA;

CHANGE REPLICATION SOURCE TO
  SOURCE_DELAY = 0;

START REPLICA;
SHOW REPLICA STATUS\G
```

确认 `SQL_Delay: 0` 即可。

## 后续如果要正式切换主库

如果未来决定把业务正式切到新服务器，可以按下面思路做：

```text
1. 临时停止业务写入旧主库
2. 把 SOURCE_DELAY 改成 0
3. 等从库完全追平
4. 确认主从无错误
5. STOP REPLICA
6. 关闭新库 read_only / super_read_only
7. 修改业务数据库地址到新库
8. 启动业务
9. 验证写入、查询、事务
10. 旧主库暂时保留作为回滚点
```

真正切库时再单独做一份操作清单，不建议直接凭记忆操作。

## 总结

这次没有采用传统的「导出 SQL 再恢复」，而是用了：

```text
MySQL Clone Plugin
    +
binlog 主从复制
    +
1 小时延迟回放
```

Clone Plugin 解决全量初始化，binlog replication 解决持续增量，`SOURCE_DELAY=3600` 解决误操作后没有反应时间的问题。适合当前这种场景：旧库继续在线运行，新服务器提前同步，后续可能切库，同时希望保留一定的误删恢复窗口。整体上比单纯做一份 SQL 备份，更适合作为长期迁移和容灾准备。
