---
title: Docker overlay2 / build cache 导致磁盘占用过高排查日志
summary: 服务器执行磁盘查看命令： bash df h 发现根目录磁盘占用较高，例如： 表面看起来有很多 overlay 挂载点，好像每个都占用了几十 GB，实际上...
author: evan
category: work
tags: [工作总结, Docker]
createdAt: 2026-06-04 09:57:28
updatedAt: 2026-06-04 09:57:28
readingMinutes: 9
---
# Docker overlay2 / build cache 导致磁盘占用过高排查日志

## 一、问题现象

服务器执行磁盘查看命令：

`bash df -h `

发现根目录磁盘占用较高，例如：

```bash 
Filesystem  Size  Used Avail Use% Mounted on 
/dev/vda2        69G   50G   17G  76% / 
overlay          69G   50G   17G  76% /var/lib/docker/overlay2/xxx/merged 
overlay          69G   50G   17G  76% /var/lib/docker/overlay2/xxx/merged 
overlay          69G   50G   17G  76% /var/lib/docker/overlay2/xxx/merged 
```

表面看起来有很多 overlay 挂载点，好像每个都占用了几十 GB，实际上这些 overlay 并不是每个都单独占用一份磁盘空间，而是 Docker 容器的联合文件系统挂载点，它们最终都映射到底层根分区。

真正需要关注的是根目录 / 的磁盘使用率，例如：

```bash
 /dev/vda2  69G  50G  17G  76% / 
```

## 二、原因分析

本次问题主要由 Docker 构建缓存导致。

项目频繁执行 Docker 构建时，Docker 会保留大量 build cache，用于加速后续镜像构建。如果长时间不清理，缓存层会不断堆积，占用大量磁盘空间。

典型原因包括：

1. 经常执行 docker build 或 docker compose build。
2. 项目依赖较多，镜像层较大。
3. 没有定期清理 Docker 构建缓存。
4. Docker 日志没有限制大小，长期运行后日志也可能膨胀。
5. 老镜像、悬空镜像、停止的容器没有及时清理。

## 三、快速排查命令

查看磁盘占用：

 `df -h `

查看 Docker 占用详情：

 `docker system df` 

查看 Docker 目录占用：

 `du -h --max-depth=1 /var/lib/docker | sort -hr `

查看容器日志占用：

 `du -h --max-depth=1 /var/lib/docker/containers | sort -hr | head `

查看根目录下大目录：

 `du -h --max-depth=1 / | sort -hr` 

## 四、快速处理命令

### 1. 安全清理无用 Docker 资源

优先执行：

 `docker system prune -f `

该命令会清理：

1. 已停止的容器。
2. 未使用的网络。
3. 悬空镜像。
4. Docker 构建缓存。

本次执行结果：

 `Total reclaimed space: 40.06GB` 

清理前：

 `/dev/vda2  69G  50G  17G  76% /` 

清理后：

 `/dev/vda2  69G  14G  53G  21% /` 

说明本次主要问题就是 Docker build cache 占用过高。

### 2. 单独清理构建缓存

如果确认是构建缓存过大，可以执行：

 `docker builder prune -f` 

如果想清理更多未使用的构建缓存，可以执行：

 `docker builder prune -a -f `

注意：-a 会清理所有未使用的构建缓存，后续重新构建镜像时可能会变慢，但不会影响正在运行的容器。

### 3. 更彻底清理未使用镜像

如果磁盘压力仍然较大，可以执行：

 `docker system prune -a -f` 

注意：该命令会清理所有当前没有被容器使用的镜像。下次启动或部署相关服务时，如果本地镜像不存在，需要重新拉取或重新构建。

## 五、overlay 挂载点说明

清理后再次查看：

 `df -h `

可能仍然会看到类似内容：

```bash 
overlay  69G  14G  53G  21% /var/lib/docker/overlay2/xxx/merged 
overlay  69G  14G  53G  21% /var/lib/docker/overlay2/xxx/merged 
overlay  69G  14G  53G  21% /var/lib/docker/overlay2/xxx/merged 
```

这是正常现象。

这些 overlay 是当前正在运行的 Docker 容器挂载点，并不代表每个 overlay 都单独占用了 14G 或 69G。它们显示的是宿主机根分区的整体容量和使用情况。

只要根目录 / 的磁盘占用恢复正常，就不用处理这些 overlay 挂载点。

## 六、建议增加 Docker 日志限制

如果 Docker 容器长期运行，建议限制容器日志大小，避免日志文件无限增长。

编辑 Docker 配置文件：

```bash 
cat > /etc/docker/daemon.json <<'EOF'
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "100m",
    "max-file": "3"
  }
}
EOF
```

重启 Docker：

 `systemctl restart docker` 

注意：重启 Docker 会影响正在运行的容器，生产环境执行前需要确认是否可以短暂中断。

## 七、日常维护建议

建议定期执行以下命令查看 Docker 占用：

 `docker system df `

如果发现 build cache 过大，直接执行：

 `docker system prune -f` 

如果只是想清理构建缓存，可以执行：

 `docker builder prune -f` 

如果磁盘占用非常高，并且确认可以清理未使用镜像，可以执行：

 `docker system prune -a -f` 

## 八、常用处理流程

下次遇到磁盘占用过高，可以按下面流程处理：

 ```bash
 df -h 
 docker system df 
 docker system prune -f 
 df -h
 ```

如果清理后效果不明显，再继续执行：

 ```bash
 docker builder prune -a -f 
 docker system prune -a -f 
 df -h
 ``` 

如果还是不够，再排查大目录：

```bash 
du -h --max-depth=1 / | sort -hr 
du -h --max-depth=1 /var/lib/docker | sort -hr 
du -h --max-depth=1 /var/lib/docker/containers | sort -hr | head 

```

## 九、本次结论

本次服务器磁盘占用从 76% 降到 21%，释放了 40.06GB 空间。

根因是 Docker build cache 长期堆积。

处理命令：

` docker system prune -f `

处理结果：

` Total reclaimed space: 40.06GB `

后续重点关注：

1. 定期查看 docker system df。
2. 定期执行 docker system prune -f。
3. 给 Docker 容器日志增加大小限制。
4. 不要被 df -h 中多个 overlay 挂载点吓到，它们是 Docker 容器的正常挂载表现。
