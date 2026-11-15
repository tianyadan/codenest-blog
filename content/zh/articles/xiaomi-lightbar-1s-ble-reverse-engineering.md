---
title: 逆向小米挂灯 1S：旋钮密钥拿到了，Mac 还是没能开灯
summary: 一天的 BLE 逆向实录：FE95 GATT、RC4 认证、MiBeacon v5 的 109 条 AES-CCM 验证，以及 macOS HCI 发射阻塞与后续断点。
author: evan
category: security
tags: [BLE, MiBeacon, 小米挂灯, macOS, HCI, Python, 逆向工程]
createdAt: 2026-11-14
updatedAt: 2026-11-15
readingMinutes: 19
slug: xiaomi-lightbar-1s-ble-reverse-engineering
---

# 逆向小米挂灯 1S：旋钮密钥拿到了，Mac 还是没能开灯

先说结果：**原装旋钮的 RC4 认证成功，12 字节密钥材料已取得，100 条历史广播和 9 条实时广播全部通过 AES-CCM MIC 验证。但 Mac 没有成功控制挂灯。**

这篇记录写给未来的自己，也写给愿意接力的开发者。它不是成功教程。我们已经解决了部分加密问题，却始终没有证明 Mac 内置蓝牙能把目标 MiBeacon 广播真正发到空中。

## 一、目标与边界

设备是小米显示器挂灯 1S，型号 `MJGJD02YL`，MIoT 型号 `yeelink.light.lamp22`。原装圆形无线旋钮可以控制开关、亮度和色温。

我想直接用 Mac 代替原装旋钮，条件是：**Mac 内置蓝牙、原厂固件、不用 Wi-Fi/局域网、不加 ESP32 或其他外设**。挂灯由独立充电头供电，所以 Mac 也不能从 USB 端口切电。

最初的想法是“录一条旋钮信号，重放就行”。实际需要经过：

~~~text
旋钮操作 → MiBeacon 事件编码 → AES-CCM 加密及 MIC
       → BLE FE95 广播 → 挂灯验身份/计数器/密文 → 灯光动作
~~~

录制、解密和构造报文只解决前半段，**真正发射与被挂灯接受是两件独立的事**。

## 二、设备、环境与可复核信息

| 项目 | 已观察到的数据 |
|---|---|
| 挂灯 | MJGJD02YL / yeelink.light.lamp22 |
| 挂灯 PID | 4738 / 0x1282 |
| 挂灯版本字段 | 1.0.0_0088 |
| 原装旋钮 PID | 5582 / 0x15CE |
| 旋钮早期明文读取版本字段 | 2.0.0_0009 |
| 广播 | MiBeacon v5 / FE95 Service Data |
| 主机 | Apple Silicon MacBook Air |
| 软件 | Python 3.12、bleak、cryptography |
| 辅助接收验证 | iPhone 上的 nRF Connect |

Mac 可以使用 Bleak 成功发现、连接挂灯和原装旋钮。CoreBluetooth 默认返回设备 UUID，而不是真实 MAC；我们在 macOS 上通过 Bleak 的实验性 `use_bdaddr=True` 获取了旋钮的候选 48 位地址，并在后续认证与 MIC 验证中使用。真实地址和设备专属密钥不写入公开文章。

这不是通用 macOS API 保证，只是本次机器上的实验结果。

## 三、第一条路线：挂灯 GATT 直控

使用 `lamp_gatt_probe.py` 对挂灯进行了三轮只读观察，每轮订阅支持 Notify 的特征值，再用原装旋钮单击、旋转、长按。

挂灯 FE95 特征如下：

| 特征 | 属性 | 结果 |
|---|---|---|
| `0001` | write / notify | 可订阅，无灯光动作通知 |
| `0002` | read | 空 |
| `0004` | read | 固件信息 |
| `0005` | write / notify | 可订阅，无灯光动作通知 |
| `0010` | write-without-response / notify | 无灯光动作通知 |
| `0019` | write-without-response / notify | 无灯光动作通知 |

`0004` 读取结果：

~~~text
31 2e 30 2e 30 5f 30 30 38 38 00 00 6f 70 63 6f 64 65 5f 73
ASCII: 1.0.0_0088..opcode_s
~~~

三轮中连接正常，旋钮操作没有导致任何可观察的 GATT Notify 或可读字段变化。Codex 后续再次做只读核验，结论一致：**没有找到已验证的灯光控制写入入口**。也没有看到部分 MIoT BLE 属性协议使用的 `001A/001B`。

但必须强调：**缺少 `001A/001B` 不能证明该固件不存在认证后的私有 GATT 命令。** 我们没有挂灯 OTA 固件，也没有抓到原厂应用实际经 BLE 控制这盏灯的会话。

MIoT 规格中的 `siid=2/piid=1`（开关）、`piid=2`（亮度）、`piid=3`（色温），属于属性定义，不能直接作为 FE95 原始写入指令。

## 四、第二条路线：破解原装旋钮的认证与广播

### 4.1 最初为什么没有响应

原装旋钮的 FE95 GATT 包含 `0001 / 0002 / 0004 / 0010 / 0014 / 0019` 等特征。最初只向 `0010` 写入公开旧版绑定流程中的启动字节：

~~~text
90 CA 85 DE
~~~

Mac 报告 GATT 写入成功，但等待 12 秒没有收到 Notify。后来才明白：**这还不是完整挑战响应，等不到通知不代表旋钮拒绝绑定。**

改为订阅 `0001`、`0010`、`0019`，结合真实地址、PID、随机 Token 和 RC4 算法生成挑战，写入 `FE95/0001`，终于得到了设备返回的数据：

~~~text
challenge_prepared         bytes=12 mac_order=reverse
challenge_write_completed  char=0001 length=12
notification               char=0001 length=12
challenge_verified         valid=true
~~~

随后有一次在明确确认后执行了 `bond_complete_written`。需要区分：**挑战验证通过是实测；完成指令写入成功不等于所有长期配对状态均已被证明。**

### 4.2 读取 0004 与 0014

绑定会话之后，`0004` 直接读取看起来是乱码，用会话 RC4 解密后得到：

~~~text
raw:
08 35 45 78 1d e2 51 5a 8b 87 dd 3e ba 69 45 a1 0e 9f 9f 50

decrypted:
32 2e 30 2e 30 5f 30 30 30 31 00 00 00 00 00 00 00 00 00 00

ASCII: 2.0.0_0001
~~~

它和先前读取的 `2.0.0_0009` 不同。**没有证据说明发生过固件升级或降级**，暂记为尚未解释的字段差异。

`FE95/0014` 则返回了 **12 字节解密后材料**，仅保存本地，不公开实际密钥。那时候我们还不能断言它就是能用的 Beacon Key。

### 4.3 为什么 100 条第一次全部解密失败

最初的验证程序错误处理了 MiBeacon 版本和 nonce/密钥格式。旋钮广播前缀实际是：

~~~text
48 50 CE 15 ...
~~~

其中 `48 50` 表示相关 MiBeacon v5 帧控制信息，`CE 15` 是 PID `0x15CE` 的小端编码。

最终有效的兼容构造是：

~~~text
0014 解密所得 12B 材料 + FF FF FF FF → 16B AES-CCM Key
nonce 中使用与实验一致的反向 MAC 字节序
~~~

运行 `verify_remote_beacon_v3.py --live`：

~~~text
MiBeacon v5 历史广播：100
AES-CCM MIC 验证成功：100
候选类型：legacy+FFFFFFFF / mac-reversed

实时有效 v5 广播：9
实时 MIC 验证成功：9
~~~

**109/109 条认证成功。** 这比仅看明文是否可读更有说服力：MIC 是密码学认证标签，能够同时验证密钥与相关输入是否匹配。

动作采样中得到的有效明文包括：

| 操作标签 | 解密后的 payload 示例 |
|---|---|
| click | `01 10 03 00 01 03` |
| clockwise | `01 10 03 00 01 04` |
| 部分 clockwise 采样 | `01 10 03 00 02 04` |

标签来自采集时的实际操作，但**还不能把每一位都解释成精确的亮度/开关语义**。逆时针也进行过采样，尚未整理出足以证明字段含义的完整映射。

历史样本早于主动绑定实验，而新采集样本仍可使用同一材料验证；至少没有观察到旧样本在认证后全部失效。

## 五、第三条路线：Mac 模拟旋钮发送广播

在本地生成了带有效 AES-CCM MIC 的 MiBeacon v5 报文：

~~~text
Service Data FE95: 48 50 CE 15 ...
完整 AD 结构:     15 16 95 FE 48 50 CE 15 ...
AES-CCM MIC: 本地校验通过
~~~

**报文构造成功不等于无线发射成功**，更不等于挂灯接受。

### 5.1 CoreBluetooth 不支持任意 FE95 Service Data

macOS 公开的 `CBPeripheralManager` 广播接口不提供任意自定义 Service Data 注入能力。`mi_remote_advertise.py` 可以算出密文，但不能通过公开 API 把这条指定广告发到空中。

### 5.2 私有 IOBluetooth HCI 调用

参考 `sendhci` 项目，尝试直接提交 HCI 命令：

| Opcode | 作用 |
|---|---|
| `0x2005` | LE Set Random Address |
| `0x2006` | LE Set Advertising Parameters |
| `0x2008` | LE Set Advertising Data |
| `0x200A` | LE Set Advertise Enable |

早期 Python 脚本不断打印 `host submission OK`，我们试过两轮，挂灯没有任何反应。

Codex 后来审查 `0x2006` 的小端参数、广告间隔、`ADV_NONCONN_IND`、`0x2008` 的广告数据与填充，没发现明显结构错误；但发现**一直没核实蓝牙控制器的 Command Complete/Status**。

于是新增原生 Objective-C `mac_hci_event_probe.m`，先执行无状态修改的 `0x1001 Read Local Version Information`：

~~~text
REQUEST_CREATE status=0x00000000 request=0
SEND_RAW status=0x00000000
EVENT_RECEIVED=no
~~~

这意味着主机请求创建和 API 提交成功，但进程**没有收到控制器完成事件**。不能由此证明芯片执行，也不能断言芯片拒绝。

Codex 随后把 `--tx` 改为 **fail-closed**：拿不到 Command Complete / Status，就在修改任何广告状态前停止。这是正确的，不应该绕过门禁继续盲发。

另外，系统日志观察到 `bluetoothd` 持续管理广告实例；是否覆盖了私有命令尚未证实。旧式/扩展广播兼容性也只是待核对线索。

### 5.3 发送者身份不一致

原装旋钮属于 **Public Address**，而 `LE Set Random Address (0x2005)` 设置的是 **Random Address**。即便 48 位地址字节完全相同，蓝牙身份也不等价。

挂灯有可能根据地址类型或绑定身份拒绝广播。不过**我们还没有证明挂灯真的因为这个原因拒绝**，因为连目标广播实际发出都没有被确认。

## 六、iPhone 上的独立接收实验

后来用 iPhone 的 nRF Connect 扫描 BLE 广播，在 Data 过滤中输入：

~~~text
4850CE15
~~~

旋转原装旋钮后，iPhone 成功看到 FE95 数据，例如：

~~~text
48 50 CE 15 E3 7D 2A 17 1F DB 77 38 00 00 EB 3B 8A D2
~~~

这说明 iPhone 能作为观察原装旋钮广播的独立接收器。

但 Mac 再次测试时，经过修复的 `--probe` 仍输出 `EVENT_RECEIVED=no`，`--tx` 没有进入发射阶段。此时 iPhone 上过滤后显示 0 条，**不是证明 Mac 发射失败的独立空中证据，而是本轮根本没有执行发射。**

只有看到 Mac 新生成的**完整 FE95 Service Data** 被另一台设备接收，才能说真正验证了射频发射。

## 七、实验结果总表

| 阶段 | 结论 |
|---|---|
| Mac 发现/连接挂灯与旋钮 | **成功** |
| 原装旋钮 RC4 Challenge-Response | **成功** |
| 读取并会话解密 `0004` | **成功** |
| 取得 `0014` 的 12B 密钥材料 | **成功**，不公开材料 |
| 历史广播 AES-CCM MIC | **100/100 成功** |
| 实时广播 AES-CCM MIC | **9/9 成功** |
| 本地重新生成带有效 MIC 的广播 | **成功**，仅本地 |
| 挂灯 GATT 灯控命令 | **未发现已验证指令** |
| 私有 HCI 主机调用 | **提交成功** |
| 控制器 Command Complete/Status | **未取得** |
| Mac 完整自定义 BLE 空中广播 | **未证实** |
| 挂灯实际响应 Mac | **没有实现** |

**最终失败点：消息会解密、会重新加密，但没有可靠的 Mac 底层发射证据，也没有证实的灯端接收条件。**

## 八、后续研究从哪里继续

**A. 先验证发射能力，不要再破解一次密钥。**

用独立接收器检查一条全新、可区分的自定义 BLE Service Data 是否由 Mac 真正发射；先解决 `0x1001` 完成事件可观测问题。PacketLogger 或适配当前 macOS 的 HCI 日志可以帮助定位，但单凭主机 API 返回成功不够。

**B. 发射确认后，单独排查身份与防重放。**

检查 Public/Random 地址类型、广播计数器单调性，以及与原装旋钮交替发射时挂灯是否拒绝。不要把“没有发射”和“挂灯拒绝”混为一谈。

**C. 寻找挂灯原厂固件或真实控制会话。**

目前没有 `MJGJD02YL / lamp22 / 1.0.0_0088` 的可分析 OTA 或 ELF，也没有得到米家 App 的相关 BLE 会话抓包。若后续取得自有设备的合法固件或日志，可重点分析 FE95 写入回调，判断认证后是否存在私有 GATT 灯控入口。

**D. 已有替代实现不等于满足本次目标。**

ESPHome 社区改造方案需要改动硬件/固件；MiBar 通过 miIO 局域网控制原厂灯。两者都是有用的参考，但都不满足这次“Mac 内置蓝牙、无局域网、无新硬件”的条件。

## 九、文件清单：未来续研直接查这里

这些文件是本地实验目录使用过的名称，**本次博客文章没有附带原始源码和密钥**：

| 文件 | 作用 |
|---|---|
| `get_remote_mac.py` | macOS 实验性 BLE 地址获取 |
| `remote_legacy_bond.py` / `remote_bond_v2.py` | 初始注册命令及通知排查 |
| `remote_bond_v3.py` / `remote_bond_v4.py` | RC4 挑战、完成指令与会话解密 |
| `remote_0014_private.json` | **绝不公开**，包含密钥材料 |
| `remote_bindkey_private.bin` | **绝不公开**，早期候选材料 |
| `remote_capture.csv` | 100 条历史广播 |
| `verify_remote_beacon.py` / `verify_remote_beacon_v2.py` | 失败的旧解密尝试 |
| `verify_remote_beacon_v3.py` | 109 条 MIC 成功的关键验证器 |
| `remote_live_decoder.py` | 实时事件观察 |
| `lamp_gatt_probe.py` / `lamp_gatt_probe.jsonl` | 三轮挂灯 GATT 只读记录 |
| `lamp_gatt_readonly_verify_20261114.jsonl` | Codex 只读核验 |
| `mi_remote_advertise.py` | MiBeacon 构造与本地 MIC 自检 |
| `mac_mibeacon_hci_tx.py` | 私有 HCI 实验，后改为 fail-closed |
| `mac_hci_event_probe.m` | 原生只读 HCI 事件探针 |
| `mac_ble_aircheck.py` | 设计用于独立接收器的检测脚本 |

如果将来公开实验仓库，应先清理账号、Token、设备完整 MAC 和所有密钥。本文未附可直接用于冒充设备的私密材料。

## 十、参考资料

- [ESPHome：小米显示器挂灯 1S 改造](https://github.com/vanzi11a/esphome-xiaomi_monitor_light_bar_s1)
- [MiBar：macOS 通过局域网控制挂灯](https://github.com/extrastu/MiBar)
- [sendhci：macOS 私有 HCI 实验](https://github.com/unixb0y/sendhci)
- [NearDrop：macOS Service Data 广播限制讨论](https://github.com/grishka/NearDrop/issues/91)
- [旧版 MiotLegacyBondClient 参考实现](https://github.com/dentra/esphome-components/blob/master/components/miot_client/miot_legacy_bond_client.cpp)
- [MIoT 设备属性规格](https://miot-spec.org/miot-spec-v2/instance?type=urn%3Amiot-spec-v2%3Adevice%3Alight%3A0000A001%3Ayeelink-lamp22%3A1%3A0000C802)
- [Bleak macOS 后端说明](https://bleak.readthedocs.io/en/latest/backends/macos.html)

## 最后

一天结束，灯还是没听 Mac 的话。这件事不需要包装成成功。

但我们至少留下了确切的断点：**RC4 认证、广播密钥与 109 条 AES-CCM 校验有证据；Mac 自定义广播实际发射和挂灯接收没有证据。**

下次继续，从验证 HCI 完成事件和空中发射开始，不再从头破解旋钮。

*实验日期：2026-11-14；整理日期：2026-11-15。*
