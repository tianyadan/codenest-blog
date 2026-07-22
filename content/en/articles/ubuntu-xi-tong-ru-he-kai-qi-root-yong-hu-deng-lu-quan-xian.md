---
title: How to Enable root User Login on Ubuntu
summary: "1. First log in to the server with the ubuntu user. 2. Set a password for the root user with `sudo passwd root`. 3. Edit the SSH configuration file with `sudo vim /etc/ssh/sshd_config`."
author: evan
category: work
tags: [Work Notes, Ubuntu]
createdAt: 2026-01-19 17:21:02
updatedAt: 2026-01-19 17:21:02
readingMinutes: 1
---
# How to Enable root User Login on Ubuntu

## Notes

1. First, log in to the server with the `ubuntu` user.

2. Set a password for the `root` user: `sudo passwd root`

3. Edit the SSH configuration file:

- `sudo vim /etc/ssh/sshd_config`

Find this line: `#PermitRootLogin prohibit-password`

Replace it with: `PermitRootLogin yes`

4. Restart the SSH service: `sudo systemctl restart ssh`
