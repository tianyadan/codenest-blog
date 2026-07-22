---
title: Zabbix Deployment YAML
summary: This article includes a Docker Compose YAML for deploying Zabbix, plus a standalone Bash script alternative for starting the same services manually.
author: evan
category: work
tags: [Work Notes]
createdAt: 2026-04-09 13:51:48
updatedAt: 2026-04-09 13:51:48
readingMinutes: 9
---
# Zabbix Deployment YAML

```yml
version: "3.9"

networks:
  zabbix-net:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16
          ip_range: 172.20.240.0/20

services:
  mysql-server:
    image: mysql:8.0
    container_name: mysql-server
    restart: unless-stopped
    networks:
      - zabbix-net
    environment:
      MYSQL_DATABASE: "zabbix"
      MYSQL_USER: "zabbix"
      MYSQL_PASSWORD: "zabbix_pwd"
      MYSQL_ROOT_PASSWORD: "root_pwd"
    command:
      - --character-set-server=utf8mb4
      - --collation-server=utf8mb4_bin
      - --default-authentication-plugin=mysql_native_password
    ports:
      - "3306:3306"
    healthcheck:
      test: [ "CMD", "mysqladmin", "ping", "-uzabbix", "-pzabbix_pwd" ]
      interval: 10s
      retries: 5
      start_period: 30s
      timeout: 5s

  zabbix-java-gateway:
    image: zabbix/zabbix-java-gateway:latest
    container_name: zabbix-java-gateway
    restart: unless-stopped
    networks:
      - zabbix-net

  zabbix-server-mysql:
    image: zabbix/zabbix-server-mysql:latest
    container_name: zabbix-server-mysql
    restart: unless-stopped
    networks:
      - zabbix-net
    depends_on:
      mysql-server:
        condition: service_healthy
      zabbix-java-gateway:
        condition: service_started
    environment:
      DB_SERVER_HOST: "mysql-server"
      MYSQL_DATABASE: "zabbix"
      MYSQL_USER: "zabbix"
      MYSQL_PASSWORD: "zabbix_pwd"
      MYSQL_ROOT_PASSWORD: "root_pwd"
      ZBX_JAVAGATEWAY: "zabbix-java-gateway"
    ports:
      - "10051:10051"

  zabbix-web-nginx-mysql:
    image: zabbix/zabbix-web-nginx-mysql:latest
    container_name: zabbix-web-nginx-mysql
    restart: unless-stopped
    networks:
      - zabbix-net
    depends_on:
      - mysql-server
      - zabbix-server-mysql
    environment:
      ZBX_SERVER_HOST: "zabbix-server-mysql"
      DB_SERVER_HOST: "mysql-server"
      MYSQL_DATABASE: "zabbix"
      MYSQL_USER: "zabbix"
      MYSQL_PASSWORD: "zabbix_pwd"
      MYSQL_ROOT_PASSWORD: "root_pwd"
    ports:
      - "80:8080"

```

Standalone Bash script approach:

Save it as `start-zabbix.sh`:

```bash
#!/bin/bash
# Create the network
docker network create --subnet 172.20.0.0/16 --ip-range 172.20.240.0/20 zabbix-net

# Start MySQL
docker run -d --name mysql-server \
  --network=zabbix-net \
  --restart unless-stopped \
  -e MYSQL_DATABASE="zabbix" \
  -e MYSQL_USER="zabbix" \
  -e MYSQL_PASSWORD="zabbix_pwd" \
  -e MYSQL_ROOT_PASSWORD="root_pwd" \
  mysql:8.0 \
  --character-set-server=utf8mb4 \
  --collation-server=utf8mb4_bin \
  --default-authentication-plugin=mysql_native_password

# Start Zabbix Java Gateway
docker run -d --name zabbix-java-gateway \
  --network=zabbix-net \
  --restart unless-stopped \
  zabbix/zabbix-java-gateway:latest

# Start Zabbix Server
docker run -d --name zabbix-server-mysql \
  --network=zabbix-net \
  --restart unless-stopped \
  -e DB_SERVER_HOST="mysql-server" \
  -e MYSQL_DATABASE="zabbix" \
  -e MYSQL_USER="zabbix" \
  -e MYSQL_PASSWORD="zabbix_pwd" \
  -e MYSQL_ROOT_PASSWORD="root_pwd" \
  -e ZBX_JAVAGATEWAY="zabbix-java-gateway" \
  -p 10051:10051 \
  zabbix/zabbix-server-mysql:latest

# Start Zabbix Web
docker run -d --name zabbix-web-nginx-mysql \
  --network=zabbix-net \
  --restart unless-stopped \
  -e ZBX_SERVER_HOST="zabbix-server-mysql" \
  -e DB_SERVER_HOST="mysql-server" \
  -e MYSQL_DATABASE="zabbix" \
  -e MYSQL_USER="zabbix" \
  -e MYSQL_PASSWORD="zabbix_pwd" \
  -e MYSQL_ROOT_PASSWORD="root_pwd" \
  -p 80:8080 \
  zabbix/zabbix-web-nginx-mysql:latest
```

Run:

```bash
chmod +x start-zabbix.sh
./start-zabbix.sh
```
