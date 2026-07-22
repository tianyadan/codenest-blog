---
title: Ubuntu Server 20.04 静态 IP 配置完整日志
summary: 在 PVE 虚拟化环境中创建 Ubuntu Server 20.04 虚拟机后，遇到网络配置问题，需要手动配置静态 IP 地址。 编辑配置文件： 配置内容...
author: evan
category: work
tags: [工作总结, Ubuntu]
createdAt: 2026-04-09 11:07:07
updatedAt: 2026-04-09 11:07:07
readingMinutes: 5
---
# Ubuntu Server 20.04 静态 IP 配置完整日志

# 问题背景:

在 PVE 虚拟化环境中创建 Ubuntu Server 20.04 虚拟机后，遇到网络配置问题，需要手动配置静态 IP 地址。

# 问题现象:

## 1.初始网络状态异常

```bash
$ ip addr
# 输出显示 ens18 网卡状态为 DOWN，且无 IP 地址
```

## 2.路由表为空

```bash
$ ip route
# 无任何输出，表示没有配置路由
```

## 3. 网络工具缺失

```bash
$ route -n
Command 'route' not found, but can be installed with:
sudo apt install net-tools
```

# 解决步骤

## step1. 检查网卡状态

```bash
ip link show
# 确认网卡名称（通常是 ens18 或类似）
```

## step2. 启用网卡并配置 IP

```bash
# 启用网卡
sudo ip link set ens18 up

# 配置静态 IP（根据实际网络环境调整）
sudo ip addr add 10.8.9.33/24 dev ens18

# 配置默认网关
sudo ip route add default via 10.8.9.1 dev ens18
```
## step3. 测试网络连通性

```bash
# ❌ 错误命令示例（容易混淆）
ping -i ens18 -c 3 10.8.9.1  # -i 是间隔参数，不是接口参数

# ✅ 正确命令
ping -I ens18 -c 3 10.8.9.1  # -I 是指定接口参数
```

## step4. 配置 DNS

```bash
# 临时配置 DNS
echo "nameserver 8.8.8.8" | sudo tee /etc/resolv.conf
echo "nameserver 114.114.114.114" | sudo tee -a /etc/resolv.conf
```

## step5. 永久化配置（Netplan）

编辑配置文件：

```bash
sudo nano /etc/netplan/00-installer-config.yaml
```

配置内容（注意：是 renderer: 不是 render:）：
注意缩进是<span style="color:#f39c12">两行空格</span>

```bash
network:
  version: 2
  renderer: networkd  # 关键：此处是 renderer，不是 render
  ethernets:
    ens18:
      dhcp4: false
      addresses:
        - 10.8.9.33/24
      gateway4: 10.8.9.1
      nameservers:
        addresses:
          - 8.8.8.8
          - 114.114.114.114
```

应用配置：

```bash
sudo netplan apply
```

# 验证命令

检查 IP 配置

```bash
ip addr show ens18
```

检查路由配置

```bash
ip route
```

检查 DNS 配置

```bash
cat /etc/resolv.conf
```

测试网络连通性
```bash
ping -I ens18 -c 3 10.8.9.1    # 测试网关
ping -I ens18 -c 3 8.8.8.8     # 测试外网
nslookup baidu.com             # 测试 DNS
```

# 可选：开启 SSH 服务

```bash
sudo apt update
sudo apt install -y openssh-server
sudo systemctl enable --now ssh
```

之后可以从其他电脑通过 ssh ubuntu@10.8.9.33 连接。
