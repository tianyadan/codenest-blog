---
title: Docker: The Most Beginner-Friendly Complete Guide
summary: A broad Docker primer covering images, containers, volumes, Dockerfile, networking, Docker Compose, and basic deployment workflows.
author: evan
category: learning
tags: [Docker]
createdAt: 2026-05-17 21:06:17
updatedAt: 2026-05-17 21:06:17
readingMinutes: 15
---

# Docker: The Most Beginner-Friendly Complete Guide

## Core Concepts

- What is an image? An image is the package you get after bundling the application's required libraries, dependencies, configuration, and other runtime files together.
- What is a container? A container is the isolated runtime environment created for the application process inside an image.
- What is an image registry? An image registry is a service used to store and manage images.

Docker Hub is currently the largest image registry and contains images for many common applications.

## Basic Commands

```bash
# Start Docker
sudo systemctl start docker
# Enable Docker to start on boot (recommended)
sudo systemctl enable docker
# Check Docker service status
sudo systemctl status docker
# Check Docker version
docker version
# Check Docker information
docker info
# Pull from a registry
docker pull
# Push to a registry
docker push
# List all images
docker images
# Remove an image
docker rmi diy01:latest

# Build a custom image; -t sets the tag and defaults to latest
docker build -t diy01:1.0 .
# Save an image locally as a compressed file
docker save -o diy01.tar diy01:latest
# Load a local compressed file as an image; -q suppresses output
docker load -i diy01.tar -q
# Difference: build is like ingredients plus a recipe; load is like a ready-made meal
# Create and run a container. If the image does not exist, it will be downloaded automatically first.
# In most cases, after startup you cannot easily change the configuration.
docker run -d --name diy01 -p 80:80 nginx
# Remove a container; -f forces removal
docker rm diy01 -f
# Stop a running container
docker stop diy01
# Start a stopped container
docker start diy01

# List running containers; -a shows all containers
docker ps -a  缩写：dps -a
# Inspect container details
docker inspect diy01

# View container logs
docker logs -f 容器名
# Enter the container for interactive changes
docker exec -it diy01 bash

# Define custom command aliases*

# Request command help
docker --help
```

## Volumes

A volume is a virtual directory. It acts as a bridge between a directory inside a container and a directory on the host machine, whether Linux or Windows.

```bash
docker volume create	# Create a volume
docker volume ls			# List all volumes
docker volume rm			# Remove a specified volume
docker volume inspect	# Inspect a volume
docker volume prune		# Clean up volumes
```

----------------------------------------------------------------------------------------

## Volume Mounting

```bash
# 1. If the volume does not exist, Docker creates it automatically.
# It is automatically mounted under /var/lib/docker/volumes on Linux.
docker run -d --name diy01 -p 80:80 -v html:/usr/share/nginx/html nginx
                     容器别名          数据卷  容器内目录          容器本名
                   
# 2. Mount a specific local directory
docker run -d --name diy01 -p 80:80 -v /aaa:/usr/share/nginx/html nginx
                                   本地目录:容器内目录
# MySQL container data mounts
# Mount /root/mysql/data to /var/lib/mysql inside the container
# Mount /root/mysql/init to /docker-entrypoint-initdb.d inside the container
# Mount /root/mysql/conf to /etc/mysql/conf.d inside the container
# MYSQL_ROOT_PASSWORD=<PASSWORD>
docker run -d \
--name mymysql \
-p 3306:3306 \
-e MYSQL_ROOT_PASSWORD=<PASSWORD> \
-e TZ=Asia/Shanghai \
-v /root/mount/mysql/data:/var/lib/mysql \
-v /root/mount/mysql/init:/docker-entrypoint-initdb.d \
-v /root/mount/mysql/conf:/etc/mysql/conf.d \
mysql:8
```

Local directories must start with `/` or `./`. If the value starts directly with a plain name, Docker treats it as a volume name instead of a local directory.

`-v mysql:/var/lib/mysql` will be recognized as a volume named `mysql`.

`-v ./mysql:/var/lib/mysql` will be recognized as the `mysql` directory under the current path.

## Custom Images

`Dockerfile` is a little like AI skills: it helps users build images faster through a repeatable set of instructions.

Reference documentation: https://docs.docker.com/engine/reference/builder

```bash
# 1. Build a custom image
docker load -i jdk.tar -q
# Automatically load and execute the commands in Dockerfile:
# 1) specify the JDK base image
# 2) copy the jar package
docker build -t diyimage:1.0 .
# -t sets the tag and defaults to latest
# . means the Dockerfile in the current directory
# : specifies the directory where the Dockerfile is located, then creates and runs the container

# 2. Create and run the container
docker run -d --name hmall -p 8080:8080 diyimage
```

## Network Connectivity

Containers on a custom network can access each other by name, so it does not matter if their IP addresses change.

```bash
docker network create mynet
# Join an existing container to the network
docker network connect mynet mycontainer
docker network connect mynet mycontainer
# Join the network when creating a container
docker run -d --name diy01 -p 80:80 --network mynet mycontainer
```

## Docker Compose Files

A Docker Compose file is used to run multiple containers quickly. It describes each container's configuration and is very similar to a set of `docker run` commands.

```bash
# docker compose [OPTIONS] [COMMAND]
# Start all services; -d runs them in the background
docker compose up -d
# Run a specific compose file
docker compose -f docker-compose1.yml up -d
# Start one container in the compose file
docker compose start es01
# Stop one container in the compose file
docker compose stop es01
# Stop and remove everything
docker compose down
# View images
docker compose images
# View containers
docker compose ps
```

## Project Deployment - Dockerfile Version

1. Package the Java application

2. Build the JDK image with `docker load -i jdk.tar -q` and the Java base image with `docker build -t hmall .`

3. Create and run the backend project container with `docker run -d --name hm -p 8080:8080 --network hm hmall`

4. Create and run the MySQL container

```bash
# Mount to the server's local filesystem
docker run -d \
--name mysql \
-p 3306:3306 \
-e MYSQL_ROOT_PASSWORD=<PASSWORD> \
-e TZ=Asia/Shanghai \
-v /root/mount/mysql/data:/var/lib/mysql \
-v /root/mount/mysql/init:/docker-entrypoint-initdb.d \
-v /root/mount/mysql/conf:/etc/mysql/conf.d \
mysql:8
```

5. Deploy the Nginx frontend: mount static assets and the config file

```bash
docker run -d \
--name nginx \
-p 18080:18080 \
-p 18081:18081 \
-v /root/mount/nginx/html:/usr/share/nginx/html \
-v /root/mount/nginx/nginx.conf:/etc/nginx/nginx.conf \
--network mynet \
nginx
# ./ means the current directory, / means an absolute path
# Be careful with spaces after line breaks or the command may be truncated
```

## Project Deployment - Compose Version

```txt
├── docker-compose.yml
├── hm-service/
│   ├── Dockerfile
│   └── app.jar
├── mysql/
│   ├── conf/
│   │   └── my.cnf
│   ├── data/ 
│   └── init/
│       └── init.sql
└── nginx/
    ├── nginx.conf
    └── html/
        └── index.html
```

```yaml
version: "3.8" # Docker Compose config file version

services:
  mysql: # MySQL database service
    image: mysql # Use the official MySQL image
    container_name: mysql # Container name
    ports:
      - "3306:3306"
    environment:
      TZ: Asia/Shanghai # Set timezone to Shanghai
      MYSQL_ROOT_PASSWORD: <PASSWORD> # Password for the MySQL root user
    volumes:
      - "./mysql/conf:/etc/mysql/conf.d" # Mount custom config files
      - "./mysql/data:/var/lib/mysql" # Mount the data directory for persistence
      - "./mysql/init:/docker-entrypoint-initdb.d" # Mount initialization SQL scripts
    networks:
      - my-net 

  hmall: # Business application service
    build: # Build the image from Dockerfile
      context: . # Build context: current directory
      dockerfile: Dockerfile # Specify the Dockerfile
    container_name: hmall 
    ports:
      - "8080:8080"
    networks:
      - my-net
    depends_on: # Dependency order: wait for mysql before starting
      - mysql

  nginx: # Nginx reverse proxy service
    image: nginx 
    container_name: nginx 
    ports:
      - "18080:18080" # Port mapping for static assets or frontend pages
      - "18081:18081" # Port mapping for reverse proxy to backend services
    volumes:
      - "./nginx/nginx.conf:/etc/nginx/nginx.conf" # Mount the Nginx config file
      - "./nginx/html:/usr/share/nginx/html" # Mount the static assets directory
    depends_on: # Dependency order: wait for hmall before starting
      - hmall
    networks:
      - my-net 

networks:
  my-net: # Custom network configuration
    name: hmall # Docker network name for service discovery between containers
```

```dockerfile
# JDK base image
FROM openjdk:11.0-jre-buster
#FROM eclipse-temurin:11-jre

# Set the timezone
ENV TZ=Asia/Shanghai
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# Copy your jar package
COPY hm-service.jar /app.jar

# Entry point command for starting the Java project
ENTRYPOINT ["java", "-jar", "/app.jar"]
```

## Project Deployment - Microservice Version
