---
title: SeaTunnel Data Sync in Practice
summary: Use Apache SeaTunnel for MySQL batch sync and CDC incremental sync, covering image setup, job config, and timezone handling.
author: CodeNest
category: work
tags: [SeaTunnel, Docker, MySQL, CDC, Data Sync]
createdAt: 2026-07-16
updatedAt: 2026-07-16
readingMinutes: 8
---

# SeaTunnel Data Sync in Practice

## When to use this

When syncing MySQL business tables across databases, a common approach is: full migration first, then CDC to catch up with incremental changes. Apache SeaTunnel covers both modes with a unified job configuration.

This guide uses `llm_request_log` as an example and walks through Docker image setup, batch sync, and CDC incremental sync.

## Prepare the image

Use the official image `apache/seatunnel:latest`. On Apple Silicon and similar environments, pin the platform:

```bash
docker pull --platform linux/amd64 apache/seatunnel:latest
```

Enter the container to confirm the environment works:

```bash
docker run --rm -it \
  --platform linux/amd64 \
  apache/seatunnel:latest \
  bash
```

## Prepare the job config

Create a local config directory and write the batch sync config file:

```bash
mkdir -p ~/datax-llm/seatunnel
cd ~/datax-llm/seatunnel
vim llm_request_log.conf
```

## Batch sync config

Batch mode fits the initial full migration. Query results from the source are written to the target; `tenant_id` can be filled with a constant in the SELECT.

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

## Run the batch sync

Truncate the target table before the full load to avoid primary-key conflicts:

```sql
TRUNCATE TABLE `<TARGET_DB>`.llm_request_log;
```

Mount the config directory, set the timezone, and start the job:

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

Timezone env vars keep `create_time` / `update_time` aligned with the business database and avoid offsets.

## CDC incremental sync

After the full load, use MySQL-CDC to keep changes in sync. Switch the job mode to `STREAMING`, fill `tenant_id` with a SQL Transform, and use `ON DUPLICATE KEY UPDATE` on the sink for idempotent writes.

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

## Production tips

- Split full load and incremental sync into two jobs with clear responsibilities
- Always use placeholders for hosts, accounts, and passwords — never commit real credentials
- Keep one business timezone (here `Asia/Shanghai`) consistent across the container and JDBC params
- The CDC target table needs a suitable primary/unique key so `ON DUPLICATE KEY UPDATE` works
- Before going live, verify row counts and sample field values on a test database
