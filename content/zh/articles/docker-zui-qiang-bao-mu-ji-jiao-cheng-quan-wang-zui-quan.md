---
title: Docker 最强保姆级教程（全网最全）
summary: "基础概念 ● 什么是镜像？ 将应用所需的函数库、依赖、配置等与应用一起打包得到的就是镜像 ● 什么是容器? 为每个镜像的应用进程创建的隔离运行环境就是容器..."
author: evan
category: learning
tags: [Docker]
createdAt: 2026-05-17 21:06:17
updatedAt: 2026-05-17 21:06:17
readingMinutes: 15
---
# Docker 最强保姆级教程（全网最全）

基础概念

● 什么是镜像？	将应用所需的函数库、依赖、配置等与应用一起打包得到的就是镜像
● 什么是容器?	为每个镜像的应用进程创建的隔离运行环境就是容器
● 什么是镜像仓库?	存储和管理镜像的服务就是镜像仓库
DockerHub是目前最大的镜像仓库，其中包含各种常见的应用镜像

基础命令

# 启动 Docker
sudo systemctl start docker
# 设置 Docker 开机自启（推荐）
sudo systemctl enable docker
# 查看 Docker 服务状态
sudo systemctl status docker
# 查看 Docker 版本
docker version
# 查看 Docker 信息
docker info
#从仓库拉取
docker pull
#推向仓库
docker push
#查看所有镜像
docker images
#删除镜像
docker rmi diy01:latest

#构建自定义镜像  -t命名tag默认latest    
docker build -t diy01:1.0 .
#保存镜像到本地为压缩文件
docker save -o diy01.tar diy01:latest
#加载本地压缩文件为镜像 -q输出信息  
docker load -i diy01.tar -q
#🔍区别：Build是食材和菜谱；load是预制菜
#创建并运行容器 ⚠️没有相关镜像会先自动下载镜像/一般运行后无法修改配置
docker run -d --name diy01 -p 80:80 nginx
#删除容器 -f强制
docker rm diy01 -f
#暂停运行的容器
docker stop diy01
#启动暂停的容器
docker start diy01

#查看正在运行容器 -a查看所有
docker ps -a  缩写：dps -a
#查看容器详情🔎
docker inspect diy01

#查看容器日志
docker logs -f 容器名
#进入容器内部修改  -it可交互 命令行方式
docker exec -it diy01 bash

#自定义命令别名*

#请求指令帮助
docker --help
数据卷
数据卷（volume）是一个虚拟目录，是容器内目录与宿主机目录(linux 或 win)之间映射的桥梁
docker volume create	#创建数据卷	
docker volume ls			#查看所有数据卷	
docker volume rm			#删除指定数据卷	
docker volume inspect	#查看某个数据卷的详情	
docker volume prune		#清除数据卷	
----------------------------------------------------------------------------------------
#数据卷挂载
#1️⃣数据卷不存的话会自动创建   #自动挂到Linux下目录/var/lib/docker/volumes中的html                  
docker run -d --name diy01 -p 80:80 -v html:/usr/share/nginx/html nginx
                     容器别名          数据卷  容器内目录          容器本名
                   
#2️⃣指定本地目录挂载✅
docker run -d --name diy01 -p 80:80 -v /aaa:/usr/share/nginx/html nginx
                                   本地目录:容器内目录
#mysql容器的数据挂载
#挂载/root/mysql/data到容器内的/var/lib/mysql目录
#挂载/root/mysql/init到容器内的/docker-entrypoint-initdb.d目录，
#挂载/root/mysql/conf到容器内的/etc/mysql/conf.d目录，
#MYSQL_ROOT_PASSWORD=<PASSWORD>
docker run -d \
--name mymysql \
-p 3306:3306 \
-e MYSQL_ROOT_PASSWORD=<PASSWORD> \
-e TZ=Asia/Shanghai \
-v /root/mount/mysql/data:/var/lib/mysql \
-v /root/mount/mysql/init:/docker-entrypoint-initdb.d \
-v /root/mount/mysql/conf:/etc/mysql/conf.d \
mysql:8

本地目录必须以“/”或 "./" 开头，如果直接以名称开头，会被识别为数据卷而非本地目录
-v mysql : /var/lib/mysql 会被识别为一个数据卷叫mysql
-v ./mysql : /var/lib/mysql 会被识别为当前目录下的mysql目录             
自定义镜像

Dockerfile 就像 AI 里的 skills 一样，帮助用户更快的用指令构建镜像

参考官网文档： https://docs.docker.com/engine/reference/builder 

#1.构建自定义镜像  
docker load -i jdk.tar -q
#自动加载执行Dockerfile文件里面命令①指定JDK基础镜像②拷贝jar包
docker build -t diyimage:1.0 .
#-t命名tag默认latest 
# .表示当前目录的Dockerfile
# :指定Dockerfile所在目录 创建并运行容器

#2.创建并运行容器
docker run -d --name hmall -p 8080:8080 diyimage
网络链接

#自定义网络的容器可以只用名字访问，IP地址变了也没关系
docker network create mynet
#将已有容器加入网络
docker network connect mynet mycontainer
docker network connect mynet mycontainer
#创建容器时加入网络
docker run -d --name diy01 -p 80:80 --network mynet mycontainer
DockerCompose 文件
为了快速运行容器的文件，文件中描述各个容器信息和 dock run 的命令几乎一样

#docker compose [OPTIONS] [COMMAND]
#启动所有, -d 参数是后台启动
docker compose up -d
#运行指定的compose文件
docker compose -f docker-compose1.yml up -d
#启动compose文件中一个容器
docker compose start es01
#关闭compose文件中一个容器
docker compose stop es01
#停止并移除
docker compose down
#查看镜像
docker compose images
#查看容器
docker compose ps

项目部署-Dockfile 版本
1. 打包 Java 资源

2. 构建 JDK 镜像docker load -i jdk.tar -q和 Java 基础镜像docker build -t hmall .
3. 创建并运行后端项目容器docker run -d --name hm -p 8080:8080 --network hm hmall
4. 创建运行Mysql 容器
#挂载到服务器本地
docker run -d \
--name mysql \
-p 3306:3306 \
-e MYSQL_ROOT_PASSWORD=<PASSWORD> \
-e TZ=Asia/Shanghai \
-v /root/mount/mysql/data:/var/lib/mysql \
-v /root/mount/mysql/init:/docker-entrypoint-initdb.d \
-v /root/mount/mysql/conf:/etc/mysql/conf.d \
mysql:8
5. 部署nginx 前端： 挂载静态资源 +配置文件
docker run -d \
--name nginx \
-p 18080:18080 \
-p 18081:18081 \
-v /root/mount/nginx/html:/usr/share/nginx/html \
-v /root/mount/nginx/nginx.conf:/etc/nginx/nginx.conf \
--network mynet \
nginx
#⚠️./代表当前目录 /代表绝对路径 
#⚠️换行有空格会被截断1
项目部署-Compose 版本
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
version: "3.8" # Docker Compose 配置文件版本

services:
  mysql: # MySQL 数据库服务
    image: mysql # 使用 MySQL 官方镜像
    container_name: mysql # 容器名称
    ports:
      - "3306:3306"
    environment:
      TZ: Asia/Shanghai # 设置时区为上海
      MYSQL_ROOT_PASSWORD: <PASSWORD> # MySQL root 用户密码
    volumes:
      - "./mysql/conf:/etc/mysql/conf.d" # 挂载自定义配置文件
      - "./mysql/data:/var/lib/mysql" # 挂载数据目录，持久化数据
      - "./mysql/init:/docker-entrypoint-initdb.d" #挂载初始化 SQL 脚本
    networks:
      - my-net 

  hmall: # 业务应用服务
    build: # 从 Dockerfile 构建镜像
      context: . # 构建上下文，当前目录
      dockerfile: Dockerfile # 指定 Dockerfile 文件
    container_name: hmall 
    ports:
      - "8080:8080"
    networks:
      - my-net
    depends_on: # 依赖关系，等待 mysql 启动后再启动
      - mysql

  nginx: # Nginx 反向代理服务
    image: nginx 
    container_name: nginx 
    ports:
      - "18080:18080" # 端口映射：静态资源或前端页面
      - "18081:18081" # 端口映射：反向代理后端服务
    volumes:
      - "./nginx/nginx.conf:/etc/nginx/nginx.conf" # 挂载 Nginx 配置文件
      - "./nginx/html:/usr/share/nginx/html" # 挂载静态资源目录
    depends_on: # 依赖关系，等待 hmall 启动后再启动
      - hmall
    networks:
      - my-net 

networks:
  my-net: # 自定义网络配置
    name: hmall # Docker 网络名称，实现容器间服务发现

# JDK基础镜像
FROM openjdk:11.0-jre-buster
#FROM eclipse-temurin:11-jre

# 设定时区
ENV TZ=Asia/Shanghai
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# 拷贝自己的jar包
COPY hm-service.jar /app.jar

# 入口 java项目启动命令
ENTRYPOINT ["java", "-jar", "/app.jar"]
项目部署-微服务版本
