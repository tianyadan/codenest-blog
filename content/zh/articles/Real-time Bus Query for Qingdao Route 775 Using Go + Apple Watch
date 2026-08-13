---
title: 用 Go + Apple Watch 实现青岛 775 路实时公交查询
summary: 从实时公交数据解析、Go 服务封装、Authorization 鉴权、Bark 推送到 Apple Watch 快捷指令，完整记录一个个人通勤工具的实现过程。
author: CodeNest
category: learning
tags: [Go, Apple Watch, Bark, 快捷指令, HTTP, AES, 自动化]
createdAt: 2026-08-12
updatedAt: 2026-08-12
readingMinutes: 12
slug: apple-watch-go-real-time-bus
---

# 用 Go + Apple Watch 实现青岛 775 路实时公交查询

最近我一直想解决一个很具体的问题：

**下班的时候，能不能不掏手机、不打开公交 App，只需要在 Apple Watch 上执行一个快捷指令，就知道下一辆公交还有多久到？**

最后我把这件事做出来了。

现在实际使用流程已经变成：

```text
Apple Watch 捏两下
↓
执行快捷指令
↓
请求自己的 Go 服务
↓
查询 775 路实时公交
↓
解析最近两辆车
↓
Bark 推送结果
↓
Apple Watch 收到通知
```

整个过程只需要几秒钟。

这篇文章主要记录这个功能的实现思路、技术拆分、服务端实现以及最终使用效果。

---

## 一、需求背景

正常情况下查询公交，需要经历：

```text
打开公交 App
↓
找到线路
↓
选择方向
↓
找到站点
↓
查看车辆位置
```

功能当然没有问题。

但对于我每天固定的上下班路线来说，这套操作有些重复。

我真正需要的其实只有两件事：

1. 最近一辆车还有多久到
2. 下一辆车还有多久到

所以我没有打算重新做一个公交 App，而是把自己每天最常用的查询能力抽出来，封装成两个固定接口。

当前有两个通勤方向：

### 下班回家

```text
775 路

白沙湾站
→
天山一路公交停车场
```

### 上班方向

```text
775 路

和阳路华城路站
→
新韵路①
```

服务端最终只需要提供两个接口即可：

```http
GET /watch/bus/work
GET /watch/bus/home
```

虽然 `home/work` 是项目最开始留下来的命名，后续更合理的命名应该是：

```http
GET /watch/bus/to-home
GET /watch/bus/to-work
```

语义会更加清晰。

---

## 二、整体实现架构

整个系统可以拆成四层：

```text
┌──────────────────────────┐
│      Apple Watch         │
│      快捷指令入口          │
└─────────────┬────────────┘
              │ HTTP
              ▼
┌──────────────────────────┐
│      watch-gateway       │
│          Go 服务          │
│                          │
│ Authorization 鉴权       │
│ 公交查询                  │
│ 数据解析                  │
│ Bark Push                │
└─────────────┬────────────┘
              │
              ▼
┌──────────────────────────┐
│      公交实时数据接口       │
│                          │
│ cryptoSign               │
│ AES-256-ECB              │
└─────────────┬────────────┘
              │
              ▼
        实时公交车辆数据
```

服务端负责把第三方复杂数据转换成我自己的统一结构。

Apple Watch 不需要知道：

```text
lineId
stationId
targetOrder
cryptoSign
AES
```

它只需要请求：

```text
/watch/bus/work
```

然后等待结果即可。

---

## 三、第一阶段：使用 Python 验证实时公交协议

整个功能最开始并不是直接用 Go 写的。

我先使用 Python 做协议验证。

这是因为 Python 很适合这种快速实验：

```text
构造请求
↓
发送 HTTP
↓
打印原始响应
↓
验证签名
↓
调用 OpenSSL
↓
解析 JSON
```

当时查询白沙湾站的核心配置类似：

```python
CITY_ID = "009"
LINE_ID = "0532-775-0"
TARGET_ORDER = "22"
STATION_ID = "0532-1598"
STATION_LAT = "36.265886"
STATION_LNG = "120.354766"
```

另一个方向：

```python
CITY_ID = "009"
LINE_ID = "0532-775-1"
TARGET_ORDER = "11"
STATION_ID = "0532-10040"
STATION_LAT = "36.302546"
STATION_LNG = "120.381146"
```

两个方向真正不同的其实只有：

```text
lineId
targetOrder
stationId
latitude
longitude
```

其他签名、请求、解密以及车辆筛选逻辑完全一致。

因此后续迁移 Go 时，没有继续保留两份重复代码，而是把公交方向抽成配置。

---

## 四、请求参数和 cryptoSign

实时公交接口并不是普通的：

```http
GET /bus
```

直接返回 JSON。

请求参数中包含大量业务字段，例如：

```text
s
wxs
sign
h5RealData
cityId
lineId
targetOrder
stationId
lat
lng
...
```

同时还需要一个：

```text
cryptoSign
```

签名。

签名逻辑可以概括为：

```text
固定顺序参数
↓
拼接成字符串
↓
追加 SIGN_SALT
↓
MD5
↓
cryptoSign
```

Python 原型逻辑：

```python
source = "&".join(
    f'"{key}"="{value}"'
    for key, value in params.items()
)

crypto_sign = hashlib.md5(
    (source + SIGN_SALT).encode("utf-8")
).hexdigest()
```

这里有一个很重要的细节：

**参数顺序会影响签名结果。**

因此 Go 版本不能简单使用：

```go
map[string]string
```

因为 Go 的 `map` 遍历顺序不保证稳定。

所以我定义了：

```go
type param struct {
	Key   string
	Value string
}
```

然后使用：

```go
[]param
```

维护严格的参数顺序。

例如：

```go
return []param{
	{Key: "s", Value: "h5"},
	{Key: "wxs", Value: "wx_app"},
	{Key: "sign", Value: "1"},
	{Key: "h5RealData", Value: "1"},
	// ...
}
```

最后按照数组顺序计算签名。

这是迁移过程中一个非常容易踩坑的地方。

---

## 五、解析加密后的实时数据

公交接口返回的并不是最终业务 JSON。

外层结构类似：

```json
{
  "jsonr": {
    "data": {
      "encryptResult": "..."
    }
  }
}
```

真正的数据位于：

```text
encryptResult
```

内部。

这个字段需要经过：

```text
Base64 Decode
↓
AES-256-ECB
↓
PKCS#7 Unpadding
↓
JSON
```

才能得到真正的车辆数据。

---

## 六、Python 版本使用 OpenSSL 解密

最初为了快速验证，我没有自己实现 AES，而是直接调用操作系统里的 OpenSSL：

```bash
openssl enc \
-d \
-aes-256-ecb \
-K ... \
-a \
-A
```

Python 中使用：

```python
subprocess.run(...)
```

执行。

这种方式非常适合验证协议。

因为目标只是先确认：

```text
请求是否正确
签名是否正确
AES Key 是否正确
```

当能够顺利解出 JSON 时，就说明协议链路已经跑通。

但是正式部署时，我不想让 Go 服务依赖：

```text
openssl
```

这种外部程序。

所以正式版本使用 Go 标准库自己完成 AES 解密。

---

## 七、Go 实现 AES-256-ECB

Go 标准库提供：

```go
crypto/aes
```

但是没有直接提供：

```text
ECB Mode
```

其实 ECB 本身并不复杂。

AES Block Size 是：

```text
16 bytes
```

ECB 的核心就是把密文每 16 字节拆成一个 Block，然后分别执行：

```go
block.Decrypt(...)
```

例如：

```go
for start := 0; start < len(decoded); start += blockSize {
	block.Decrypt(
		plaintext[start:start+blockSize],
		decoded[start:start+blockSize],
	)
}
```

所有 Block 解密完成后，再去掉：

```text
PKCS#7 Padding
```

就能得到最终 JSON。

这样正式服务器上就不再需要 OpenSSL。

---

## 八、为什么正式服务选择 Go

协议验证阶段使用 Python 很舒服。

但当协议已经确认以后，这个项目本质上就是一个：

**轻量 HTTP Gateway。**

主要工作包括：

```text
HTTP Client
HTTP Server
JSON
MD5
AES
鉴权
Bark API
网络 IO
```

这些都是 Go 非常适合的场景。

另外我很喜欢 Go 在部署上的特点。

最终可以直接：

```text
Mac
↓
Go 交叉编译
↓
Linux ELF 文件
↓
scp
↓
服务器运行
```

服务器不需要：

```text
Go SDK
Python
venv
pip
JRE
Maven
node_modules
```

一个二进制文件就够了。

---

## 九、项目目录设计

最终项目目录如下：

```text
watch-gateway/
├── go.mod
├── main.go
└── internal/
    └── bus/
        ├── auth.go
        ├── bark.go
        ├── chelaile.go
        ├── crypto.go
        ├── routes.go
        └── service.go
```

每个文件只负责一个职责。

### main.go

负责：

```text
HTTP Server
路由注册
端口监听
```

服务监听端口：

```go
server := &http.Server{
	Addr:              ":28085",
	Handler:           mux,
	ReadHeaderTimeout: 5 * time.Second,
}
```

---

### routes.go

负责定义：

```text
/watch/bus/home
/watch/bus/work
```

以及两个固定通勤场景。

例如：

```go
var workRoute = RouteConfig{
	Name:        "work",
	From:        "白沙湾站",
	To:          "天山一路公交停车场",
	CityID:      "009",
	LineID:      "0532-775-0",
	TargetOrder: 22,
	StationID:   "0532-1598",
	StationLat:  "36.265886",
	StationLng:  "120.354766",
}
```

这种设计的好处是：

以后再增加一个站点，并不需要复制整个公交查询实现。

只需要增加一个新的：

```go
RouteConfig
```

即可。

---

### chelaile.go

负责第三方公交请求。

主要工作：

```text
生成请求参数
↓
计算 cryptoSign
↓
GET 请求
↓
gzip / deflate
↓
提取 encryptResult
↓
调用解密
```

这一层可以理解成：

```text
第三方公交 Adapter
```

---

### crypto.go

只负责：

```text
MD5 cryptoSign
Base64
AES-256-ECB
PKCS#7
```

与 HTTP 和业务逻辑完全分离。

---

### service.go

这是业务层。

负责从大量车辆数据中找到：

**即将到达目标站点的最近两辆车。**

---

## 十、筛选最近两辆公交

实时数据中可能包含多辆公交。

但 Apple Watch 不需要显示所有车辆。

我的需求很明确：

```text
最近一辆
+
下一辆
```

所以筛选流程是：

```text
遍历 buses
↓
没有 travels → 跳过
↓
已经经过目标站 → 跳过
↓
travelTime <= 0 → 跳过
↓
按照 travelTime 升序
↓
取前两辆
```

Python 原型：

```python
candidates.sort(
    key=lambda item: item["travel"]["travelTime"]
)

return candidates[:2]
```

Go 中使用：

```go
sort.Slice(
	items,
	func(i, j int) bool {
		return items[i].Travel.TravelTime.Value <
			items[j].Travel.TravelTime.Value
	},
)
```

最后：

```go
if len(items) > 2 {
	items = items[:2]
}
```

---

## 十一、统一自己的返回结构

我没有把第三方原始数据直接返回给 Apple Watch。

而是重新定义自己的 DTO：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "route": "work",
    "line": "775",
    "from": "白沙湾站",
    "to": "天山一路公交停车场",
    "realData": true,
    "queryTime": "2026-08-12T11:11:56+08:00",
    "buses": [
      {
        "plate": "鲁B06688D",
        "distanceMeters": 2003,
        "distanceText": "2003 米",
        "remainingSeconds": 405,
        "remainingText": "约 6 分 45 秒",
        "arrivalTime": "11:18"
      }
    ]
  }
}
```

这么做有一个重要意义：

**Apple Watch 永远只依赖我的 API，而不是第三方公交协议。**

以后即使公交接口发生变化：

```text
字段变了
签名变了
加密方式变了
```

我也只需要修改：

```text
chelaile.go
crypto.go
```

Apple Watch 快捷指令不用动。

---

## 十二、增加 Authorization 鉴权

因为服务最终会暴露到公网，所以不能直接让任何人访问：

```http
GET /watch/bus/work
```

于是增加一个简单的 Header 鉴权：

```http
Authorization: <token>
```

如果没有 Token：

```bash
curl http://SERVER:28085/watch/bus/work
```

服务器返回：

```json
{
  "code": 403,
  "message": "Forbidden"
}
```

只有：

```bash
curl \
-H "Authorization: <token>" \
http://SERVER:28085/watch/bus/work
```

才允许查询。

这是一个个人服务，所以第一版并没有引入复杂的：

```text
JWT
OAuth2
用户体系
权限模型
```

一个固定 Token 已经足够。

如果后续把代码上传到公开仓库，应该把 Token 改成：

```text
环境变量
```

而不是写死到源码。

---

## 十三、增加 Bark 推送

公交查询成功后，我还希望结果直接出现在 Apple Watch 通知里。

所以增加了：

```text
Bark Push
```

流程变成：

```text
公交查询
↓
解析结果
↓
组装 Bark Message
↓
POST https://api.day.app/push
```

请求结构类似：

```json
{
  "device_key": "...",
  "title": "775 路公交车 下班回家方向 白沙湾车站查询结果",
  "body": "...",
  "group": "bus"
}
```

通知正文：

```text
白沙湾站 → 天山一路公交停车场

第1辆：约 6 分 45 秒
距离：2003 米
预计到站：11:18
车牌：鲁B06688D

第2辆：约 39 分 52 秒
距离：14225 米
预计到站：11:51
车牌：鲁B00998D
```

---

## 十四、Bark 失败不能影响公交查询

这里做了一个很重要的小设计。

Bark 只是：

```text
附加通知能力
```

真正核心功能还是：

```text
公交查询
```

所以如果：

```text
公交查询成功
但是 Bark 请求失败
```

不能返回：

```http
502
```

否则就相当于通知系统把核心业务拖垮了。

所以当前逻辑是：

```go
if err := barkClient.PushBusResult(...); err != nil {
	log.Printf("push bark failed: %v", err)
}
```

然后接口仍然正常：

```http
200 OK
```

这种设计本质上就是：

```text
核心链路
和
非核心链路
解耦
```

虽然这个项目很小，但这个原则同样适用于大型业务系统。

---

## 十五、部署到 Linux 服务器

一开始我准备使用 Docker。

结果服务器拉 Docker Hub 镜像一直超时：

```text
context deadline exceeded
```

本机 Docker 后来也遇到了相同问题。

最后我发现：

对于 Go 服务来说，根本没有必要被 Docker 镜像拉取问题卡住。

直接交叉编译。

我的服务器是 Linux AMD64，所以在 Mac 上执行：

```bash
CGO_ENABLED=0 \
GOOS=linux \
GOARCH=amd64 \
go build \
-trimpath \
-ldflags="-s -w" \
-o watch-gateway-linux \
.
```

编译完成后：

```bash
scp watch-gateway-linux \
root@SERVER:/home/watch-gateway/
```

服务器：

```bash
cd /home/watch-gateway

chmod +x watch-gateway-linux

./watch-gateway-linux
```

启动成功：

```text
watch-gateway started on :28085
```

整个部署不需要服务器安装 Go。

---

## 十六、使用 systemd 后台运行

手动执行：

```bash
./watch-gateway-linux
```

关闭 SSH 后不方便长期管理。

所以正式运行可以交给：

```text
systemd
```

例如：

```ini
[Unit]
Description=Watch Gateway
After=network.target

[Service]
Type=simple
WorkingDirectory=/home/watch-gateway
ExecStart=/home/watch-gateway/watch-gateway-linux

Restart=always
RestartSec=3

User=root

[Install]
WantedBy=multi-user.target
```

然后：

```bash
systemctl daemon-reload

systemctl enable --now watch-gateway
```

以后更新项目只需要：

```text
Mac 重新编译
↓
scp 覆盖
↓
systemctl restart watch-gateway
```

部署过程非常轻。

---

## 十七、公网接口测试

服务器上线以后，在自己的电脑上直接测试：

```bash
curl \
-H "Authorization: <token>" \
http://SERVER:28085/watch/bus/work
```

实际成功返回：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "route": "work",
    "line": "775",
    "from": "白沙湾站",
    "to": "天山一路公交停车场",
    "realData": true,
    "buses": [
      {
        "plate": "鲁B06688D",
        "distanceMeters": 2003,
        "distanceText": "2003 米",
        "remainingSeconds": 405,
        "remainingText": "约 6 分 45 秒",
        "arrivalTime": "11:18"
      }
    ]
  }
}
```

不带 Token：

```bash
curl http://SERVER:28085/watch/bus/work
```

返回：

```json
{
  "code": 403,
  "message": "Forbidden"
}
```

说明公网链路和鉴权都正常。

---

## 十八、创建 Apple Watch 快捷指令

服务端完成以后，最后一步就是 Apple 快捷指令。

在 iPhone 中创建一个：

```text
775 回家
```

添加动作：

```text
URL
↓
获取 URL 内容
```

请求：

```http
GET http://SERVER:28085/watch/bus/work
```

然后设置 Header：

```text
Authorization
<token>
```

最后打开：

```text
在 Apple Watch 上显示
```

这样快捷指令就会同步到 Apple Watch。

---

## 十九、最终使用体验

现在下班的时候，我不需要拿出手机。

直接在 Apple Watch 上执行快捷指令。

目前我已经可以通过手表上的手势快速触发。

完整链路：

```text
Apple Watch
↓
捏两下
↓
775 回家
↓
GET /watch/bus/work
↓
Authorization
↓
Go watch-gateway
↓
实时公交接口
↓
cryptoSign
↓
AES 解密
↓
筛选最近两辆
↓
Bark
↓
Apple Watch 通知
```

最终通知类似：

```text
775 路公交车 下班回家方向

白沙湾站 → 天山一路公交停车场

第1辆：约 6 分 45 秒
距离：2003 米
预计到站：11:18

第2辆：约 39 分 52 秒
距离：14225 米
预计到站：11:51
```

这样我立刻就能决定：

```text
现在下楼
还是
晚几分钟再走
```

---

## 二十、为什么我觉得这个小项目很有价值

从技术复杂度来说，它其实不算一个大项目。

没有：

```text
数据库
Redis
MQ
微服务
前端框架
复杂业务系统
```

但它完成了一个完整的工程闭环：

```text
真实需求
↓
协议分析
↓
Python 验证
↓
MD5 签名
↓
AES 解密
↓
Go 服务化
↓
API 设计
↓
Authorization
↓
Bark
↓
Linux 部署
↓
Apple Watch
```

最重要的是：

**它解决了我每天真实存在的问题。**

我越来越喜欢这种开发方式。

不是：

> 为了学习 Go，所以找个 Demo 写。

而是：

> 我生活里有一个问题，我刚好会编程，所以我自己做一个工具解决它。

这种项目往往比单纯照着教程写 CRUD 更有意思。

---

## 二十一、从 Python 原型到 Go 正式服务

这次开发过程中，我也更明显地感受到 Python 和 Go 不同的优势。

Python 非常适合：

```text
协议验证
快速实验
数据解析
调试请求
自动化脚本
```

Go 非常适合：

```text
HTTP Gateway
长期运行服务
并发 IO
API
CLI
部署
```

所以这次实际上采用的是：

```text
Python
负责把未知问题研究明白

↓

Go
负责把已经验证的方案工程化
```

我认为这是一种很舒服的组合方式。

---

## 二十二、后续规划

项目名字目前叫：

```text
watch-gateway
```

而不是：

```text
bus-api
```

因为实时公交只是第一个能力。

以后可以继续往里面加入：

```text
/watch/bus/to-home

/watch/bus/to-work

/watch/metro/...

/watch/weather

/watch/server/status

/watch/codex/status

/watch/task/approve

/watch/task/reject
```

最终可能形成：

```text
                 Apple Watch
                      │
                      ▼
              watch-gateway
                      │
       ┌──────────────┼──────────────┐
       ▼              ▼              ▼
     公交            AI Agent       Server
       │              │              │
       ▼              ▼              ▼
     地铁          Codex/Cursor      运维状态
       │
       ▼
     天气
```

Apple Watch 对我来说就不只是：

```text
看时间
看通知
运动记录
```

而可以逐渐变成：

**一个连接自己所有服务的轻量远程终端。**

---

## 总结

这次实现的核心并不是“写了一个公交查询接口”。

真正完整的链路是：

```text
第三方实时公交数据
↓
签名算法
↓
AES 解密
↓
Go Gateway
↓
业务数据抽象
↓
Authorization
↓
Bark
↓
Linux Server
↓
Apple 快捷指令
↓
Apple Watch
```

最终效果则非常简单：

**戴着手表，执行一次快捷指令，就能知道回家的 775 路公交还有多久到站。**

复杂技术最终被压缩成了一个极其简单的用户操作。

我觉得这就是这个项目最有意思的地方。
