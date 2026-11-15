---
title: Reverse-Engineering the Xiaomi Light Bar 1S: I Recovered the Remote Key but Still Could Not Control It from a Mac
summary: A day-long BLE investigation covering GATT, RC4 authentication, 109 authenticated MiBeacon v5 frames, and the unresolved macOS HCI advertising path, with reproducible evidence boundaries.
author: evan
category: security
tags: [BLE, MiBeacon, Xiaomi, macOS, HCI, Python, Reverse Engineering]
createdAt: 2026-11-14
updatedAt: 2026-11-15
readingMinutes: 19
slug: xiaomi-lightbar-1s-ble-reverse-engineering
---

# Reverse-Engineering the Xiaomi Light Bar 1S: I Recovered the Remote Key but Still Could Not Control It from a Mac

The outcome first: **the original dial passed RC4 challenge-response authentication; I retrieved 12 bytes of key material and authenticated 100 historical plus 9 live advertisements using AES-CCM MIC checks. Yet the Mac did not control the lamp.**

This is a technical checkpoint, not a working tutorial. We solved meaningful parts of the encryption problem, but never proved that macOS transmitted the required custom MiBeacon advertisement over the air.

## 1. Goal and constraints

My device is the Xiaomi Mi Computer Monitor Light Bar 1S, model `MJGJD02YL`, MIoT model `yeelink.light.lamp22`. Its original circular wireless dial toggles and adjusts the light.

The target was specific: **Mac built-in Bluetooth, factory firmware, no Wi-Fi/LAN, no ESP32, no additional transmitter**. The lamp uses a separate USB power adapter, so the Mac cannot simply switch its USB supply.

The initial idea was to record a dial command and replay it. The actual chain is:

```text
Dial input → MiBeacon event → AES-CCM encryption and MIC
           → FE95 BLE advertising → lamp identity/replay checks → action
```

Decoding and creating a message is not the same as transmitting it with an acceptable sender identity.

## 2. Device and test environment

| Component | Observed information |
|---|---|
| Lamp | MJGJD02YL / yeelink.light.lamp22 |
| Lamp BLE PID | 4738 / 0x1282 |
| Lamp GATT version field | 1.0.0_0088 |
| Original dial PID | 5582 / 0x15CE |
| Earlier dial version field | 2.0.0_0009 |
| Advertisements | MiBeacon v5, FE95 Service Data |
| Computer | Apple Silicon MacBook Air |
| Python | 3.12, bleak, cryptography |
| Independent receiver | iPhone with nRF Connect |

Both lamp and dial could be discovered and connected through Bleak.

CoreBluetooth normally exposes a device UUID rather than a physical Bluetooth MAC address. In this environment, the experimental macOS Bleak option `use_bdaddr=True` yielded a candidate 48-bit dial address subsequently consistent with authentication and authenticated decoding. The real address and device-specific secrets are intentionally excluded. This is not a guaranteed public macOS API.

## 3. Attempt 1: control the lamp over GATT

I ran `lamp_gatt_probe.py` in three read-only rounds, subscribing to all notifiable characteristics while clicking, rotating, and long-pressing the original dial.

The lamp's FE95 service exposed:

| Characteristic | Properties | Observation |
|---|---|---|
| `0001` | Write / Notify | Subscription worked; no dial-related notification |
| `0002` | Read | Empty |
| `0004` | Read | Firmware information |
| `0005` | Write / Notify | No dial-related notification |
| `0010` | Write Without Response / Notify | No dial-related notification |
| `0019` | Write Without Response / Notify | No dial-related notification |

The `0004` read returned:

```text
31 2e 30 2e 30 5f 30 30 38 38 00 00 6f 70 63 6f 64 65 5f 73
ASCII: 1.0.0_0088..opcode_s
```

No observable GATT notification or readable state changed when the dial operated the lamp. A separate read-only Codex verification agreed. The `001A/001B` characteristics used by some documented MIoT BLE attribute protocols were not exposed.

**That does not prove this firmware lacks every possible authenticated proprietary GATT command.** We did not obtain the factory OTA image or a capture of a genuine BLE lighting-control session. Arbitrary writes to undocumented security/configuration characteristics would be unjustified.

The documented MIoT property identifiers are `siid=2/piid=1` for power, `piid=2` for brightness, and `piid=3` for color temperature. These are *property semantics*, not raw FE95 command bytes.

## 4. Attempt 2: authenticate and decode the original dial

### 4.1 An incomplete handshake produced no reply

The dial's FE95 service exposed characteristics including `0001 / 0002 / 0004 / 0010 / 0014 / 0019`.

My initial script wrote the legacy registration-start opcode to `0010`:

```text
90 CA 85 DE
```

The host reported successful GATT submission, followed by 12 seconds without notifications. This was not sufficient evidence of rejection: **I had not yet sent the encrypted authentication challenge**.

### 4.2 RC4 challenge-response passed

Following the open-source `MiotLegacyBondClient` approach, I constructed a challenge using the dial's address, PID, a random token, and RC4. A 12-byte challenge was written to `FE95/0001`:

```text
challenge_prepared         bytes=12 mac_order=reverse
challenge_write_completed  char=0001 length=12
notification               char=0001 length=12
challenge_verified         valid=true
```

A separate explicitly confirmed run also wrote the binding-completion command, logged as `bond_complete_written`.

**The challenge response really verified.** A completion-write acknowledgment alone does not prove every persistent bond state.

### 4.3 Encrypted reads and key material

A post-authentication raw read of `0004` appeared corrupted until it was decrypted with the active RC4 session:

```text
raw:
08 35 45 78 1d e2 51 5a 8b 87 dd 3e ba 69 45 a1 0e 9f 9f 50

decrypted:
32 2e 30 2e 30 5f 30 30 30 31 00 00 00 00 00 00 00 00 00 00

ASCII: 2.0.0_0001
```

The discrepancy with the earlier `2.0.0_0009` field remains unexplained; **it is not evidence of a firmware upgrade or downgrade**.

Reading and decrypting `FE95/0014` yielded **12 bytes of candidate material** saved only to a local private file. The next question was whether this material could actually authenticate the dial's broadcasts.

## 5. The cryptographic breakthrough: 109/109 MiBeacon frames

The first offline decoder failed on all 100 historical samples because its format assumptions were incorrect.

The captured frames began with:

```text
48 50 CE 15 ...
```

`48 50` encodes the relevant MiBeacon v5 frame-control information, while `CE 15` is the little-endian product ID `0x15CE`.

The compatibility transformation that worked was:

```text
Decrypted 0014 12-byte material + FF FF FF FF → 16-byte AES-CCM key
nonce: reverse MAC byte order as used in the successful verifier
```

I am publishing the derivation, not the device-specific secret.

Running `verify_remote_beacon_v3.py --live` produced:

```text
Historical MiBeacon v5 advertisements: 100
AES-CCM MIC verified: 100
variant: legacy+FFFFFFFF / mac-reversed

Live MiBeacon v5 advertisements: 9
Live AES-CCM MIC verified: 9
```

**109 out of 109 authenticated frames.** AES-CCM MIC validation is substantially stronger than merely obtaining plausible-looking plaintext.

Example correlated event data:

| Captured operation | Authenticated plaintext |
|---|---|
| click | `01 10 03 00 01 03` |
| clockwise | `01 10 03 00 01 04` |
| some clockwise samples | `01 10 03 00 02 04` |

These are sample labels based on the actions performed during capture. **Not every byte's lighting semantics have been proven.** Counterclockwise operations were also sampled, but a complete verified field mapping has not been documented.

Historical messages were captured before active authentication; later live broadcasts authenticated using the same material. We did not observe wholesale invalidation of historical samples.

## 6. Attempt 3: transmit a simulated dial advertisement

A locally self-verifying MiBeacon payload can now be constructed:

```text
FE95 Service Data: 48 50 CE 15 ...
Full BLE AD:       15 16 95 FE 48 50 CE 15 ...
AES-CCM MIC:      local verification passed
```

**A local MIC self-test does not prove RF transmission or lamp acceptance.**

### 6.1 CoreBluetooth advertising limitation

The public macOS `CBPeripheralManager` advertising interface does not support arbitrary FE95 Service Data injection in the form required here. Consequently, `mi_remote_advertise.py` could construct the advertisement but not broadcast it through that public API.

### 6.2 Private IOBluetooth HCI experiment

Inspired by the open-source `sendhci` project, I tried submitting the following LE HCI commands:

| Opcode | Intent |
|---|---|
| `0x2005` | LE Set Random Address |
| `0x2006` | LE Set Advertising Parameters |
| `0x2008` | LE Set Advertising Data |
| `0x200A` | LE Set Advertise Enable |

Early Python output reported `host submission OK`. The lamp did nothing during the attempts.

Codex reviewed the little-endian `0x2006` parameters, advertising intervals, `ADV_NONCONN_IND`, `0x2008` data/padding, and FE95 construction without finding an obvious formatting defect. However, we never obtained trustworthy controller completion statuses.

A native Objective-C diagnostic then sent only a read-only `0x1001 Read Local Version Information`:

```text
REQUEST_CREATE status=0x00000000 request=0
SEND_RAW status=0x00000000
EVENT_RECEIVED=no
```

This establishes **successful host API submission, but no delivered HCI Command Complete/Status event**. It proves neither controller acceptance nor controller rejection. The event path, permissions, OS mediation, and `bluetoothd` scheduling remain potential causes.

Codex changed the transmitter to **fail closed**: without verified HCI completion from the probe, `--tx` stops before any advertisement-state modification. That is the correct result, not a successful transmission.

### 6.3 Public vs random address identity

The genuine dial uses a **public address**. HCI `0x2005` configures a **random address**. Matching the six address bytes does not make their address types equivalent.

The lamp might reject a message on that basis, but **we have not directly proved it does**. We could not even independently verify the target RF frame was transmitted. Potential interference from system-managed advertising and legacy/extended-advertising modes remains unverified.

## 7. Independent iPhone observation

Using nRF Connect on iPhone, I filtered Scanner Data for:

```text
4850CE15
```

Rotating the real dial produced observable FE95 Service Data, for example:

```text
48 50 CE 15 E3 7D 2A 17 1F DB 77 38 00 00 EB 3B 8A D2
```

This positively demonstrated that the phone could receive the **real dial's** target advertisements.

When we later attempted the Mac test, the revised HCI probe still reported `EVENT_RECEIVED=no` and the safety gate prevented transmission. Therefore, zero matching results on the phone did not establish a new RF failure: that run never sent advertising commands.

Definitive proof would require reception of the Mac's newly generated **complete Service Data**, while ruling out the genuine dial.

## 8. Evidence matrix

| Stage | Result |
|---|---|
| Discover/connect lamp and dial | **Succeeded** |
| Remote RC4 challenge-response | **Succeeded** |
| Session-decrypt characteristic `0004` | **Succeeded** |
| Obtain 12-byte `0014` material | **Succeeded**, private |
| Historical AES-CCM MIC | **100/100 passed** |
| Live AES-CCM MIC | **9/9 passed** |
| Construct a locally authenticated advertisement | **Succeeded locally** |
| Find a proven lamp-lighting GATT command | **Not found** |
| Submit private HCI calls to the host API | **Succeeded** |
| Receive controller Command Complete/Status | **Not achieved** |
| Verify custom Mac RF transmission | **Unverified** |
| Make the lamp react to Mac commands | **Not achieved** |

The core problem: **we understand and can regenerate authenticated dial data, but we cannot yet demonstrate transmission from the Mac or acceptance by the lamp.**

## 9. Where the next investigation should begin

**A. Prove arbitrary custom advertising first.** Before touching Xiaomi encryption again, verify that this exact Apple Silicon/macOS combination can emit any deliberately unique BLE Service Data frame observed byte-for-byte by an independent receiver. Investigate the missing `0x1001` completion event using trustworthy HCI logging or PacketLogger. A host API return code is not enough.

**B. Isolate transmitter identity and replay checks.** Only after RF transmission is verified should we test public/random address types, counter monotonicity, replay handling, and switching between the genuine and simulated dial. Do not confuse “never transmitted” with “rejected by lamp.”

**C. Obtain firmware or genuine control-session evidence.** No analyzable `MJGJD02YL/lamp22/1.0.0_0088` factory OTA or verified BLE lighting RPC was obtained. Future analysis of legitimately acquired firmware or the owner's own app-device traffic might identify private FE95 handlers. Absence of `001A/001B` is not a definitive disproof of private GATT commands.

**D. Keep alternate solutions distinct.** Community ESPHome firmware modifications and the MiBar LAN/miIO macOS app demonstrate other approaches but violate this experiment's original no-Wi-Fi, no-extra-hardware, factory-firmware constraints.

## 10. Local experiment file inventory

The following names refer to my original local `test/` directory. **They are not committed to this blog**, and the sensitive material must never be published as-is.

| File | Purpose |
|---|---|
| `get_remote_mac.py` | Experimental BLE address retrieval |
| `remote_legacy_bond.py` / `remote_bond_v2.py` | Initial legacy registration probes |
| `remote_bond_v3.py` / `remote_bond_v4.py` | RC4 challenge, completion, session decryption |
| `remote_0014_private.json` / `remote_bindkey_private.bin` | **Private secret material — do not publish** |
| `remote_capture.csv` | 100 historical advertising samples |
| `verify_remote_beacon.py` / `verify_remote_beacon_v2.py` | Earlier failed decoder variants |
| `verify_remote_beacon_v3.py` | Successful 109-frame MIC verification |
| `remote_live_decoder.py` | Live event decoding |
| `lamp_gatt_probe.py` / `lamp_gatt_probe.jsonl` | Three read-only GATT rounds |
| `lamp_gatt_readonly_verify_20261114.jsonl` | Later read-only verification |
| `mi_remote_advertise.py` | Local advertisement construction / MIC test |
| `mac_mibeacon_hci_tx.py` | Private HCI experiments; later fail-closed |
| `mac_hci_event_probe.m` | Native read-only `0x1001` probe |
| `mac_ble_aircheck.py` | Independent receiver diagnostic concept |

Other relevant logs include `remote_bond_v3_result.json`. Redact identities, credentials, tokens, and MAC addresses before any release.

## 11. References

- [ESPHome project for the 1S](https://github.com/vanzi11a/esphome-xiaomi_monitor_light_bar_s1)
- [MiBar: stock-firmware macOS LAN control](https://github.com/extrastu/MiBar)
- [sendhci private macOS HCI research](https://github.com/unixb0y/sendhci)
- [NearDrop discussion of macOS Service Data advertising](https://github.com/grishka/NearDrop/issues/91)
- [MiotLegacyBondClient implementation](https://github.com/dentra/esphome-components/blob/master/components/miot_client/miot_legacy_bond_client.cpp)
- [MIoT property specification](https://miot-spec.org/miot-spec-v2/instance?type=urn%3Amiot-spec-v2%3Adevice%3Alight%3A0000A001%3Ayeelink-lamp22%3A1%3A0000C802)
- [Bleak macOS documentation](https://bleak.readthedocs.io/en/latest/backends/macos.html)

## Final note

One day later, the light still would not obey my Mac. There is no reason to label that a success.

But we now have a precise checkpoint: **RC4 authentication and 109 AES-CCM MIC checks are supported by test results. Actual custom transmission from the Mac and lamp acceptance are not.**

The next attempt should start at HCI completion and over-the-air verification, not by extracting the dial key again.

*Experiments: November 14, 2026. Write-up: November 15, 2026.*
