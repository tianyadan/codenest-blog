---
title: Troubleshooting Log: High Disk Usage Caused by Docker overlay2 / Build Cache
summary: This troubleshooting note explains why Docker overlay mounts can look scary in `df -h`, how to identify the real disk pressure, and how to safely reclaim space.
author: evan
category: work
tags: [Work Notes, Docker]
createdAt: 2026-06-04 09:57:28
updatedAt: 2026-06-04 09:57:28
readingMinutes: 9
---

# Troubleshooting Log: High Disk Usage Caused by Docker overlay2 / Build Cache

## 1. Symptom

Run this disk usage command on the server:

`bash df -h`

You may find that the root disk usage is relatively high, for example:

```bash 
Filesystem  Size  Used Avail Use% Mounted on 
/dev/vda2        69G   50G   17G  76% / 
overlay          69G   50G   17G  76% /var/lib/docker/overlay2/xxx/merged 
overlay          69G   50G   17G  76% /var/lib/docker/overlay2/xxx/merged 
overlay          69G   50G   17G  76% /var/lib/docker/overlay2/xxx/merged 
```

At first glance, it looks like there are many `overlay` mount points and each one is consuming tens of gigabytes. In reality, these overlays do not each occupy a separate copy of disk space. They are Docker container union filesystem mount points, and they all map back to the underlying root partition.

What you really need to focus on is the disk usage of the root mount `/`, for example:

```bash
/dev/vda2  69G  50G  17G  76% /
```

## 2. Cause Analysis

In this case, the main problem was Docker build cache.

When a project runs Docker builds frequently, Docker keeps a large amount of build cache to speed up future image builds. If you never clean it up, cached layers will continue to accumulate and consume a lot of disk space.

Typical causes include:

1. Running `docker build` or `docker compose build` frequently
2. Large image layers due to many project dependencies
3. No regular cleanup of Docker build cache
4. No size limit on Docker logs, so long-running logs keep growing
5. Old images, dangling images, and stopped containers not being cleaned up in time

## 3. Quick Investigation Commands

Check disk usage:

`df -h`

Check Docker usage details:

`docker system df`

Check Docker directory usage:

`du -h --max-depth=1 /var/lib/docker | sort -hr`

Check container log usage:

`du -h --max-depth=1 /var/lib/docker/containers | sort -hr | head`

Check large directories under the root path:

`du -h --max-depth=1 / | sort -hr`

## 4. Quick Fix Commands

### 1. Safely clean up unused Docker resources

Run this first:

`docker system prune -f`

This command cleans up:

1. Stopped containers
2. Unused networks
3. Dangling images
4. Docker build cache

Result from this cleanup:

`Total reclaimed space: 40.06GB`

Before cleanup:

`/dev/vda2  69G  50G  17G  76% /`

After cleanup:

`/dev/vda2  69G  14G  53G  21% /`

That confirms the main issue was excessive Docker build cache.

### 2. Clean up build cache only

If you are sure the build cache is the main problem, you can run:

`docker builder prune -f`

If you want to remove even more unused build cache, run:

`docker builder prune -a -f`

Note: `-a` removes all unused build cache. Future image builds may become slower, but it will not affect running containers.

### 3. More aggressively remove unused images

If disk pressure is still high, you can run:

`docker system prune -a -f`

Note: this command removes all images that are not currently used by containers. The next time you start or deploy the related services, Docker may need to pull or rebuild them again if the images are no longer available locally.

## 5. Notes About overlay Mount Points

After cleanup, run:

`df -h`

You may still see output like this:

```bash 
overlay  69G  14G  53G  21% /var/lib/docker/overlay2/xxx/merged 
overlay  69G  14G  53G  21% /var/lib/docker/overlay2/xxx/merged 
overlay  69G  14G  53G  21% /var/lib/docker/overlay2/xxx/merged 
```

This is normal.

These overlays are the mount points of currently running Docker containers. They do not mean each overlay is individually consuming `14G` or `69G`. They are simply showing the host root partition's total capacity and usage.

As long as the disk usage for the root mount `/` has returned to normal, you do not need to do anything about these overlay mount points.

## 6. It Is a Good Idea to Limit Docker Logs

If Docker containers run for a long time, it is a good idea to limit log file size so log files do not grow forever.

Edit the Docker config file:

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

Restart Docker:

`systemctl restart docker`

Note: restarting Docker affects running containers. In production, confirm that a short interruption is acceptable before running this.

## 7. Daily Maintenance Suggestions

Regularly check Docker usage with:

`docker system df`

If build cache is too large, run:

`docker system prune -f`

If you only want to clean build cache, run:

`docker builder prune -f`

If disk usage is extremely high and you have confirmed that unused images can be removed, run:

`docker system prune -a -f`

## 8. Common Handling Flow

The next time disk usage gets too high, you can follow this process:

```bash
df -h 
docker system df 
docker system prune -f 
df -h
```

If cleanup does not help enough, continue with:

```bash
docker builder prune -a -f 
docker system prune -a -f 
df -h
``` 

If that is still not enough, investigate large directories:

```bash 
du -h --max-depth=1 / | sort -hr 
du -h --max-depth=1 /var/lib/docker | sort -hr 
du -h --max-depth=1 /var/lib/docker/containers | sort -hr | head 

```

## 9. Final Conclusion

In this incident, server disk usage dropped from 76% to 21%, reclaiming 40.06GB.

The root cause was long-term accumulation of Docker build cache.

Fix command:

`docker system prune -f`

Result:

`Total reclaimed space: 40.06GB`

Things to keep watching in the future:

1. Check `docker system df` regularly
2. Run `docker system prune -f` regularly
3. Add a size limit to Docker container logs
4. Do not panic when `df -h` shows multiple `overlay` mount points. They are a normal part of how Docker containers are mounted.
