---
title: TCP 1900 on the TL-XDR3010 Accepted an HTTP Management Request
summary: On my own TP-LINK TL-XDR3010, TCP 1900 accepted an HTTP request whose path looks like /stok=. That is not how SSDP usually behaves. The exposure is real; authentication bypass and command execution are not confirmed.
author: evan
category: security
tags: [Security, TP-LINK, Router, HTTP]
createdAt: 2026-09-21
updatedAt: 2026-09-21
readingMinutes: 8
slug: tplink-tl-xdr3010-tcp-1900-http-exposure
---

# TCP 1900 on the TL-XDR3010 Accepted an HTTP Management Request

I was looking at open ports on my own TP-LINK TL-XDR3010 EasyMesh router. Port 1900 is a familiar number. It usually means SSDP / UPnP, and it usually means UDP. On this unit, TCP 1900 accepted a connection and treated the request as HTTP. The path used the `/stok=` form that shows up in TP-LINK's web admin. That is worth writing down. It is not yet a vulnerability. Nothing here shows a broken login check, a config change, or command execution.

The test stayed on hardware I own, on my own LAN, and it was a plain HTTP probe. The address below is `<ROUTER_LAN_IP>`, the LAN management address of this router.

## The port answered, and it did not answer as SSDP 🔍

I sent one request with a token that is obviously not a real session:

```bash
curl -v "http://<ROUTER_LAN_IP>:1900/stok=abc"
```

In the TP-LINK web UI, `stok` is the path segment that carries the session token. `abc` was not issued by a login. It was only there to see whether this port would hand an HTTP request to the management logic. The TCP connection succeeded, and the request was accepted as HTTP.

That does not match the usual picture. SSDP is mostly UDP 1900, used for discovery, not for changing router settings. What showed up here was:

```text
TCP 1900
    ↓
HTTP request
    ↓
/stok=...
    ↓
the device's own web / management logic
```

So TCP 1900 is likely running an extra HTTP service, and that service shares the stok path style with the existing admin UI. I do not yet know whether it is a separate process, or the same code that serves the management page on port 80.

## What is confirmed, and what is not

The chain that is actually confirmed:

```text
TL-XDR3010
    ↓
<ROUTER_LAN_IP>:1900
    ↓
TCP connects
    ↓
HTTP is accepted
    ↓
a /stok=... style path exists
```

Still open: whether an invalid stok can reach an interface that should require login, whether diagnostic parameters are passed into system commands, whether configuration can be changed, whether sensitive data can be read, whether the device can be knocked offline, and whether the port is reachable from the WAN. Until there is evidence for any of those, the accurate label is an unexpectedly exposed HTTP management interface on TCP 1900, a potential attack surface. It should not be called RCE, and it should not be called a confirmed authentication bypass.

## Three questions worth answering next ⚠️

The first is whether `stok` is checked. Putting a token in the path does not prove that every request compares it to a live session. An authentication problem exists only if a token that was never issued can still read or change configuration. Right now I only know the path is accepted. I do not know the result of the check behind it.

The second is whether any management call works without a login. A path shaped like `/stok=.../...` only means the URL looks like an admin API. The next useful step is to capture the requests the browser sends after a normal login, then see which of those calls require a real admin session and which answer without one. Without that comparison, unauthorized access is a guess.

The third is the network diagnostics: ping, traceroute, DNS tests, WAN tests. The risk is not that the router can ping. It is whether an address or option typed into the page is passed through to a system command or an internal call without a real check. That has to be read from the firmware's handling of the request. A button on the page is not evidence.

## How the impact gets settled

The rest of this stays on the same device. Record the hardware and firmware versions, then identify which process is listening on TCP 1900. Capture the browser traffic from a normal logged-in session and list the real HTTP endpoints, including when a stok is created and when it stops working. Diagnostic calls can be judged only after it is clear where their parameters go. If the implementation itself has to be read, unpack this unit's firmware and match the HTTP handler in Ghidra.

A formal vulnerability write-up makes sense only if the input skips a check it should have had and lands on a sensitive operation. That note would need the affected versions, the conditions, the impact, and a fix. Until then, this page is a research log.

This work was done only on a TL-XDR3010 I own and control, to understand HTTP services and session handling on an embedded device. It does not involve anyone else's equipment.
