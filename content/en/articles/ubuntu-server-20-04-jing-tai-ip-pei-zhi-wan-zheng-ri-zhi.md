---
title: Complete Log for Configuring a Static IP on Ubuntu Server 20.04
summary: "After creating an Ubuntu Server 20.04 VM in a PVE virtualization environment, I ran into networking problems and had to configure a static IP manually. This note records the full diagnosis and Netplan setup process."
author: evan
category: work
tags: [Work Notes, Ubuntu]
createdAt: 2026-04-09 11:07:07
updatedAt: 2026-04-09 11:07:07
readingMinutes: 5
---
# Complete Log for Configuring a Static IP on Ubuntu Server 20.04

# Background

After creating an Ubuntu Server 20.04 virtual machine in a PVE virtualization environment, I ran into network configuration issues and had to configure a static IP address manually.

# Symptoms

## 1. Abnormal initial network state

```bash
$ ip addr
# The output shows that the ens18 NIC is DOWN and has no IP address
```

## 2. Empty routing table

```bash
$ ip route
# No output at all, which means no routes are configured
```

## 3. Missing network tools

```bash
$ route -n
Command 'route' not found, but can be installed with:
sudo apt install net-tools
```

# Resolution Steps

## Step 1. Check the network interface status

```bash
ip link show
# Confirm the NIC name (usually ens18 or something similar)
```

## Step 2. Enable the NIC and configure the IP

```bash
# Enable the NIC
sudo ip link set ens18 up

# Configure the static IP (adjust it to your actual network environment)
sudo ip addr add 10.8.9.33/24 dev ens18

# Configure the default gateway
sudo ip route add default via 10.8.9.1 dev ens18
```

## Step 3. Test network connectivity

```bash
# Incorrect example that is easy to confuse
ping -i ens18 -c 3 10.8.9.1  # -i is the interval parameter, not the interface parameter

# Correct command
ping -I ens18 -c 3 10.8.9.1  # -I specifies the interface
```

## Step 4. Configure DNS

```bash
# Temporary DNS configuration
echo "nameserver 8.8.8.8" | sudo tee /etc/resolv.conf
echo "nameserver 114.114.114.114" | sudo tee -a /etc/resolv.conf
```

## Step 5. Make the configuration persistent with Netplan

Edit the configuration file:

```bash
sudo nano /etc/netplan/00-installer-config.yaml
```

Configuration content (note: it is `renderer:`, not `render:`):
Also note that the indentation uses <span style="color:#f39c12">two spaces</span>.

```bash
network:
  version: 2
  renderer: networkd  # Important: use renderer, not render
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

Apply the configuration:

```bash
sudo netplan apply
```

# Verification Commands

Check the IP configuration:

```bash
ip addr show ens18
```

Check the route configuration:

```bash
ip route
```

Check the DNS configuration:

```bash
cat /etc/resolv.conf
```

Test connectivity:

```bash
ping -I ens18 -c 3 10.8.9.1    # Test the gateway
ping -I ens18 -c 3 8.8.8.8     # Test external network connectivity
nslookup baidu.com             # Test DNS
```

# Optional: Enable SSH

```bash
sudo apt update
sudo apt install -y openssh-server
sudo systemctl enable --now ssh
```

After that, you can connect from another computer with `ssh ubuntu@10.8.9.33`.
