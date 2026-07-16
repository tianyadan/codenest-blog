---
title: SeaTunnel 数据同步实践
summary: 用 Apache SeaTunnel 完成 MySQL 批次同步与 CDC 增量同步，覆盖镜像准备、作业配置与时区处理。
author: CodeNest
category: work
tags: [SeaTunnel, Docker, MySQL, CDC, 数据同步]
createdAt: 2026-07-16
updatedAt: 2026-07-16
readingMinutes: 8
---

# SeaTunnel 数据同步实践

## 适用场景

跨库同步 MySQL 业务表时，常见需求是：先全量搬迁，再靠 CDC 持续追平增量。Apache SeaTunnel 用统一作业配置即可覆盖这两种模式。

本文以 `llm_request_log` 为例，说明 Docker 镜像准备、批次同步与 CDC 增量同步的落地步骤。

## 准备镜像

使用官方镜像 `apache/seatunnel:latest`。在 Apple Silicon 等环境下建议指定平台：

```bash
docker pull --platform linux/amd64 apache/seatunnel:latest
```

进入容器确认环境可用：

```bash
docker run --rm -it \
  --platform linux/amd64 \
  apache/seatunnel:latest \
  bash
```

## 准备作业配置

本地创建配置目录，并编写批次同步配置文件：

```bash
mkdir -p ~/datax-llm/seatunnel
cd ~/datax-llm/seatunnel
vim llm_request_log.conf
```

## 批次同步配置

批次模式适合首次全量迁移。源库查询结果写入目标库，`tenant_id` 可在 SELECT 中用常量补齐。

```hocon
env {
  parallelism = 1
  job.mode = "BATCH"
}

source {
  Jdbc {
    driver = "com.mysql.cj.jdbc.Driver"
    url = "jdbc:mysql://<SOURCE_HOST>:<PORT>/<SOURCE_DB>?useSSL=false&serverTimezone=Asia/Shanghai&allowPublicKeyRetrieval=true&nullCatalogMeansCurrent=true&rewriteBatchedStatements=true"
    user = "<SOURCE_USER>"
    password = "<SOURCE_PASSWORD>"

    query = """
      SELECT
        id,
        request_id,
        user_id,
        api_key_id,
        model_id,
        model_name,
        client_ip,
        request_method,
        request_path,
        target_url,
        stream,
        http_status,
        success,
        latency_ms,
        prompt_tokens,
        completion_tokens,
        total_tokens,
        usage_required,
        usage_recorded,
        error_message,
        creator,
        create_time,
        updater,
        update_time,
        deleted,
        1 AS tenant_id
      FROM llm_request_log
      ORDER BY id
    """
  }
}

sink {
  Jdbc {
    driver = "com.mysql.cj.jdbc.Driver"
    url = "jdbc:mysql://<TARGET_HOST>:<PORT>/<TARGET_DB>?useSSL=false&serverTimezone=Asia/Shanghai&allowPublicKeyRetrieval=true&nullCatalogMeansCurrent=true&rewriteBatchedStatements=true"
    user = "<TARGET_USER>"
    password = "<TARGET_PASSWORD>"

    query = """
      INSERT INTO llm_request_log (
        id,
        request_id,
        user_id,
        api_key_id,
        model_id,
        model_name,
        client_ip,
        request_method,
        request_path,
        target_url,
        stream,
        http_status,
        success,
        latency_ms,
        prompt_tokens,
        completion_tokens,
        total_tokens,
        usage_required,
        usage_recorded,
        error_message,
        creator,
        create_time,
        updater,
        update_time,
        deleted,
        tenant_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """
  }
}
```

## 执行批次同步

跑全量前先清空目标表，避免主键冲突：

```sql
TRUNCATE TABLE `<TARGET_DB>`.llm_request_log;
```

挂载配置目录并指定时区后启动作业：

```bash
docker run -d \
  --rm \
  --platform linux/amd64 \
  -e TZ=Asia/Shanghai \
  -e JAVA_TOOL_OPTIONS="-Duser.timezone=Asia/Shanghai" \
  -v "$PWD:/config" \
  apache/seatunnel:latest \
  ./bin/seatunnel.sh \
  -m local \
  -c /config/llm_request_log.conf
```

时区环境变量用于保证 `create_time` / `update_time` 与业务库一致，避免出现偏移。

## CDC 增量同步

全量完成后，可用 MySQL-CDC 持续同步变更。作业模式改为 `STREAMING`，并通过 SQL Transform 补齐 `tenant_id`；Sink 使用 `ON DUPLICATE KEY UPDATE` 做幂等写入。

```hocon
env {
  parallelism = 1
  job.mode = "STREAMING"
}

source {
  MySQL-CDC {
    result_table_name = "llm_request_log_source"

    base-url = "jdbc:mysql://<SOURCE_HOST>:<PORT>/<SOURCE_DB>?useSSL=false&serverTimezone=Asia/Shanghai&allowPublicKeyRetrieval=true"
    username = "<SOURCE_USER>"
    password = "<SOURCE_PASSWORD>"

    database-names = [
      "<SOURCE_DB>"
    ]
    table-names = [
      "<SOURCE_DB>.llm_request_log"
    ]

    startup.mode = "initial"
    server-time-zone = "Asia/Shanghai"
  }
}

transform {
  Sql {
    source_table_name = "llm_request_log_source"
    result_table_name = "llm_request_log_transform"

    query = """
      SELECT
        id,
        request_id,
        user_id,
        api_key_id,
        model_id,
        model_name,
        client_ip,
        request_method,
        request_path,
        target_url,
        stream,
        http_status,
        success,
        latency_ms,
        prompt_tokens,
        completion_tokens,
        total_tokens,
        usage_required,
        usage_recorded,
        error_message,
        creator,
        create_time,
        updater,
        update_time,
        deleted,
        1 AS tenant_id
      FROM llm_request_log_source
    """
  }
}

sink {
  Jdbc {
    source_table_name = "llm_request_log_transform"

    driver = "com.mysql.cj.jdbc.Driver"
    url = "jdbc:mysql://<TARGET_HOST>:<PORT>/<TARGET_DB>?useSSL=false&serverTimezone=Asia/Shanghai&connectionTimeZone=Asia/Shanghai&forceConnectionTimeZoneToSession=true&sessionVariables=time_zone='%2B08:00'&allowPublicKeyRetrieval=true&nullCatalogMeansCurrent=true&rewriteBatchedStatements=true"
    user = "<TARGET_USER>"
    password = "<TARGET_PASSWORD>"

    query = """
      INSERT INTO llm_request_log (
        id,
        request_id,
        user_id,
        api_key_id,
        model_id,
        model_name,
        client_ip,
        request_method,
        request_path,
        target_url,
        stream,
        http_status,
        success,
        latency_ms,
        prompt_tokens,
        completion_tokens,
        total_tokens,
        usage_required,
        usage_recorded,
        error_message,
        creator,
        create_time,
        updater,
        update_time,
        deleted,
        tenant_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        request_id = VALUES(request_id),
        user_id = VALUES(user_id),
        api_key_id = VALUES(api_key_id),
        model_id = VALUES(model_id),
        model_name = VALUES(model_name),
        client_ip = VALUES(client_ip),
        request_method = VALUES(request_method),
        request_path = VALUES(request_path),
        target_url = VALUES(target_url),
        stream = VALUES(stream),
        http_status = VALUES(http_status),
        success = VALUES(success),
        latency_ms = VALUES(latency_ms),
        prompt_tokens = VALUES(prompt_tokens),
        completion_tokens = VALUES(completion_tokens),
        total_tokens = VALUES(total_tokens),
        usage_required = VALUES(usage_required),
        usage_recorded = VALUES(usage_recorded),
        error_message = VALUES(error_message),
        creator = VALUES(creator),
        create_time = VALUES(create_time),
        updater = VALUES(updater),
        update_time = VALUES(update_time),
        deleted = VALUES(deleted),
        tenant_id = 1
    """
  }
}
```

## 落地建议

- 全量与增量拆成两套作业，职责清晰
- 配置中的主机、账号、密码一律用占位符，不要提交真实凭据
- 统一业务时区（本文为 `Asia/Shanghai`），容器与 JDBC 参数保持一致
- CDC 目标表需有合适主键/唯一键，才能保证 `ON DUPLICATE KEY UPDATE` 生效
- 上线前先在测试库验证行数与抽样字段一致性
