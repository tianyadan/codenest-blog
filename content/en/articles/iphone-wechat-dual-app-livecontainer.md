---
title: Running Two WeChat Accounts on an iPhone Without Jailbreaking: AltStore, LiveContainer, and FChat
summary: A hands-on November 2026 record of installing LiveContainer with AltServer, importing FChat, signing limitations, the Mach-O loading model, and why background notifications remain unreliable.
author: evan
category: learning
tags: [iOS, iPhone, WeChat, LiveContainer, AltStore, IPA, FChat, Sideloading]
createdAt: 2026-11-15
updatedAt: 2026-11-15
readingMinutes: 12
slug: iphone-wechat-dual-app-livecontainer
---

# Running Two WeChat Accounts on an iPhone Without Jailbreaking: AltStore, LiveContainer, and FChat

**The experiment worked.** On November 15, 2026, I kept the official App Store version of WeChat on my iPhone and launched FChat through LiveContainer, signing into a **second, separate WeChat account**. I did not jailbreak the device or install Android.

This is a record of the actual installation process and what I learned afterward, not a guarantee that every iPhone or version of WeChat will behave the same way. **I verified two usable account environments, not reliable background push delivery, long-term stability, or simultaneous independent execution of two iOS processes.**

## 1. Why I tried this

Unlike many Android phones, iOS offers no built-in app-cloning toggle for WeChat. WeChat's account-switching feature is not the same as keeping separate account environments ready on one phone.

I initially considered running Android on an iPhone. There are experimental Android ports for selected older iPhones, but that is not a practical route for a daily-use device running a modern iOS release.

I eventually found [LiveContainer](https://github.com/LiveContainer/LiveContainer). It does not virtualize Android or install another operating system. Instead, it loads certain iOS applications inside a host app as **guest applications**.

## 2. My setup

| Component | Role | What I used |
|---|---|---|
| iPhone | Physical host device | iOS 26.2 |
| Mac | Sideloading companion | Existing Xcode environment |
| [AltServer / AltStore](https://altstore.io/) | Signs and installs LiveContainer | Installed successfully |
| [LiveContainer](https://github.com/LiveContainer/LiveContainer) | Loads guest IPA applications | Installed successfully |
| [FChat](https://github.com/Taosky/unsigned-ipa-cn/releases/tag/fchat) | Modified WeChat IPA | `fchat_8.0.71.ipa` |
| Official WeChat | First account | Kept the App Store installation |

FChat is a third-party modified package, not an official Tencent release. I used it for the experiment; that does not establish its security.

## 3. Installation walkthrough

### Step 1: Install AltServer on the Mac

Download AltServer from the [official AltStore website](https://altstore.io/) and follow the [macOS installation guide](https://faq.altstore.io/altstore-classic/how-to-install-altstore-macos).

After launching AltServer, it appears in the macOS menu bar. My first attempt showed `No Connected Devices` under `Install AltStore`.

I connected the unlocked iPhone with a cable, accepted the **Trust This Computer** prompt, and checked that it appeared in Finder. I could then select:

```text
AltServer
  └── Install AltStore
        └── <Your iPhone>
```

Complete the installation prompts using the Apple account associated with your developer signing. Do not share Apple account or certificate passwords with third-party IPA distributors.

### Step 2: Finish setting up AltStore on the iPhone

If iOS asks you to trust a developer app, go to:

```text
Settings → General → VPN & Device Management
```

Trust the relevant developer profile as prompted. If Developer Mode is required, enable it under **Settings → Privacy & Security → Developer Mode** and follow the restart instructions.

AltServer is the Mac-side companion; AltStore is the app installed on the iPhone for sideloading IPAs.

### Step 3: Install LiveContainer

From [LiveContainer Releases](https://github.com/LiveContainer/LiveContainer/releases), I selected:

```text
LiveContainer.ipa
```

I did not select the `LiveContainer+SideStore.ipa` variant because my setup used AltServer and AltStore.

Transfer the IPA to the iPhone, open **AltStore → My Apps → +**, and select the file. LiveContainer will appear on the Home Screen after installation.

### Step 4: Configure LiveContainer

Open LiveContainer and follow the settings flow to import the signing certificate from AltStore and diagnose the JIT-Less launch environment. The UI and exact options may change between versions, so use the [official documentation](https://livecontainer.github.io/docs/) when your screen differs.

**Successful installation of the container does not guarantee that an arbitrary IPA will run.** Guest apps may still be blocked by encryption, signing, dynamic-library dependencies, entitlement restrictions, or application integrity checks.

### Step 5: Choose a FChat IPA

I compared two GitHub projects:

- [missuo / Inject-IPA](https://github.com/missuo/Inject-IPA/releases), which has older modified WeChat releases, including 8.0.42.
- [Taosky / unsigned-ipa-cn](https://github.com/Taosky/unsigned-ipa-cn/releases/tag/fchat), which publishes FChat packages and documents the modifications.

I chose:

```text
fchat_8.0.71.ipa
```

The asset was uploaded to GitHub on June 2, 2026. It is **not an untouched, officially distributed WeChat IPA**. A newer version number does not prove the package is safe.

### Step 6: Import and launch FChat

Download the IPA into the iPhone Files app, then use:

```text
LiveContainer → Apps → + → fchat_8.0.71.ipa
                         → Import → Launch
```

I kept the official WeChat installed. Inside FChat, I signed into a **second independent WeChat account**. That was the successful result of this experiment.

I did **not** establish that both clients run indefinitely as independent background processes or receive notifications reliably while the screen is locked.

## 4. How it works

The setup looks like this:

```text
Mac: AltServer
       │ Apple developer signing / installation
       ▼
iPhone: AltStore
       │ Install IPA
       ▼
       LiveContainer (installed host app)
       │ Guest code loading / runtime adjustments
       └── FChat (modified WeChat)
               └── Account B

iPhone: Official App Store WeChat
        └── Account A
```

There are three distinct pieces.

**Code signing:** AltStore uses Apple's developer-signing mechanisms to get the LiveContainer host onto the device. This is not a jailbreak or a general bypass of iOS code-signing rules.

**Guest application loading:** LiveContainer transforms and loads parts of the guest application's Mach-O executable while adapting the runtime environment. Relevant concepts include `Mach-O`, `MH_EXECUTE`, `MH_DYLIB`, `dlopen`, and runtime hooking. The real implementation involves more than a single library-loading call: it must handle launch behavior, bundle metadata, code-signing conditions, and filesystem paths.

**Application identity and data:** The normal WeChat Bundle ID is `com.tencent.xin`. The FChat release notes describe changing the identifier to `com.tencent.fchat`, changing the icon and URL schemes, and injecting an iPad-login-related tweak. LiveContainer provides distinct data-container behavior for guest apps.

**Changing a Bundle ID alone is not the whole mechanism.** FChat changes the application identity and some behavior; LiveContainer supplies the guest execution environment and container management.

## 5. What FChat modifies

The [FChat release notes](https://github.com/Taosky/unsigned-ipa-cn/releases/tag/fchat) document the following:

| Change | Purpose |
|---|---|
| Use a decrypted IPA | Enable repackaging |
| Remove `plugins` and `watch` folders | Adjust included extensions |
| Change icon and Bundle ID | Distinguish the clone; `com.tencent.fchat` |
| Modify URL schemes | Support `fchat://` and reduce conflicts |
| Inject an iPad-login tweak | Offer an iPad login path |

These are **the publisher's claims**, not a complete binary audit of the specific `fchat_8.0.71.ipa` file I used. An injected dynamic library running in a messaging app's process may potentially access sensitive runtime data.

## 6. Limitations that matter

**Free developer signing:** Apple's free Personal Team workflow typically limits how many development-signed apps can be active on a device and uses short-lived provisioning, often around seven days. AltStore, LiveContainer, and an app I built and installed with Xcode (Atolla) may all count, depending on the signing team and identifiers. Importing another guest IPA into LiveContainer is usually not the same as installing another separately signed iOS app.

**Paid Apple Developer membership:** A paid membership provides more complete development signing and distribution options. It does **not** magically give a LiveContainer guest app independent APNs push-notification capabilities.

**Background notifications:** LiveContainer documents limitations for remote notifications in guest apps, while the FChat release itself says normal background push is unavailable. Receiving messages while FChat is open is not proof that messages arrive reliably after the app is backgrounded or the device is locked.

**Security:** The package was modified by a third party. Plugins can create privacy, account, and compatibility risks. Use a low-risk test account, avoid sensitive payments, and back up important chat data before experimenting.

## 7. Troubleshooting notes

| Symptom | What to check |
|---|---|
| AltServer reports `No Connected Devices` | Cable, iPhone trust prompt, and Finder device detection |
| AltStore won't launch | Developer trust and Developer Mode |
| LiveContainer installs but the guest fails | Certificate import, JIT-Less diagnostics, encrypted IPA |
| Guest app crashes immediately | Signing, dynamic libraries, OS compatibility |
| WeChat opens but won't sign in | Server-side checks, old version restrictions, or modified-client detection |
| Messages arrive in foreground but not background | Known LiveContainer/FChat push limitations |
| Need more guest apps | LiveContainer can import more than one, but reliable simultaneous background execution is a separate question |

Test one variable at a time: verify a harmless guest IPA first, then FChat launch, then sign-in, message delivery, and stability.

## 8. Final outcome

**Verified in my own experiment:**

- Installed LiveContainer on a non-jailbroken iPhone using AltServer and AltStore.
- Imported `fchat_8.0.71.ipa` as a guest application.
- Kept the official WeChat and signed into a **second independent account** in FChat.

**Not verified:** reliable all-day background push, independent long-running guest processes, complete iOS entitlement support, package integrity, or universal compatibility.

The real lesson was that running two WeChat account environments does not require another operating system. **Guest app loading, data-container management, and modified app identity** can achieve it under certain conditions.

My next technical questions are about LiveContainer's Mach-O loader and the exact dynamic libraries injected into FChat, rather than collecting more opaque modified IPAs.

## References

- [AltStore](https://altstore.io/)
- [AltStore macOS installation guide](https://faq.altstore.io/altstore-classic/how-to-install-altstore-macos)
- [LiveContainer source](https://github.com/LiveContainer/LiveContainer)
- [LiveContainer documentation](https://livecontainer.github.io/docs/)
- [Taosky FChat releases](https://github.com/Taosky/unsigned-ipa-cn/releases/tag/fchat)
- [Taosky unsigned-ipa-cn README](https://github.com/Taosky/unsigned-ipa-cn)
- [missuo Inject-IPA releases](https://github.com/missuo/Inject-IPA/releases)
