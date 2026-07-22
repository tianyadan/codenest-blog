---
title: WeChat Mini Program Development Guide (Beginner Edition)
summary: "Recommended reading: the official documentation. This article introduces the basic project structure, page files, JSON configuration, WXML, components, and common built-in APIs for WeChat Mini Programs."
author: evan
category: learning
tags: [Learning, Mini Program]
createdAt: 2025-08-22 15:39:59
updatedAt: 2025-08-22 15:39:59
readingMinutes: 13
---
# WeChat Mini Program Development Guide (Beginner Edition)

Recommended reading: [Official Documentation](https://developers.weixin.qq.com/miniprogram/dev/framework/)

## 1. Basic Project Structure

- **pages** stores all Mini Program pages
- `utils` stores utility modules (for example, a custom module for formatting time)
- `app.js` is the entry file of the Mini Program project
- `app.json` is the global configuration file of the Mini Program project
- `app.wxss` is the global style file of the Mini Program project

![项目基本组成结构](https://codenest.oss-cn-qingdao.aliyuncs.com/article_images/%E6%88%AA%E5%B1%8F2025-08-22%2013.49.07.png)

**Each page is made up of four basic files:**

- a `js` file (page script: data, event handlers, and related logic)
- a `json` file (page configuration: window appearance and behavior)
- a `wxml` file (page template structure)
- a `wxss` file (page stylesheet)

### 1.1 JSON Configuration Files

There are four kinds of JSON configuration files in a Mini Program project:

- `app.json` in the project root
- `project.config.json` in the project root
- `sitemap.json` in the project root
- a `.json` config file inside each page folder

**1. `app.json` is the global configuration file for the current Mini Program. It includes page paths, window appearance, UI behavior, bottom tab settings, and more.**

![app.json 基本内容](https://codenest.oss-cn-qingdao.aliyuncs.com/article_images/%E6%88%AA%E5%B1%8F2025-08-22%2014.05.37.png)

Briefly, these four configuration items mean:

- `pages`: records the **paths** of all pages in the Mini Program
- `window`: defines global background color, text color, and similar settings for all pages
- `style`: defines the global component style version used by the Mini Program
- `sitemapLocation`: points to the location of `sitemap.json`

**2. `project.config.json`**

`project.config.json` is the project configuration file. It records personalized settings used by the Mini Program development tool, for example:

- `setting` stores build-related configuration
- `projectname` stores the project name
- `appid` stores the Mini Program account ID

**3. `sitemap.json`**

WeChat has enabled in-app search for Mini Programs, somewhat similar to SEO for traditional websites. The `sitemap.json` file controls whether Mini Program pages are allowed to be indexed by WeChat.

If indexing is enabled, WeChat can crawl and index page content. When a user's search keywords match a page's index, that page may appear in the search results.

**4. Page-level `.json` files**

Each page in a Mini Program can use its own `.json` file to configure its window appearance. Page-level config overrides the same settings under `window` in `app.json`.

### 1.2 Mini Program Pages

- **WXML**

WXML (WeiXin Markup Language) is the tag language designed for Mini Programs. It is used to build page structure and plays a role similar to HTML in web development.

**Differences between WXML and HTML**

1. Different tag names

HTML: `div`, `span`, `img`, `a`

WXML: `view`, `text`, `image`, `navigator`

![image](https://codenest.oss-cn-qingdao.aliyuncs.com/article_images/%E6%88%AA%E5%B1%8F2025-08-22%2014.57.10.png)

Core differences at a glance:

- Vue: `v-if` / `v-for` / `v-show` / `v-model` / `@click`
- Mini Program: `wx:if` / `wx:for` / `hidden` / `bindtap` / `bindinput`
- `div` -> `view`
- `span` / `p` -> `text`
- `img` -> `image`
- `a` -> `navigator`

2. Different attribute nodes

Vue/HTML: `<a href = "#" >超链接</a>`

Mini Program: `<navigator url="/pages/home/home"></navigator>`

3. It provides a template syntax similar to Vue

- Data binding
- List rendering
- Conditional rendering

Vue can write JavaScript expressions directly:

`<div>{{ count + 1 }}</div>`

In a Mini Program, you use braces inside WXML:

`<view>{{count + 1}}</view>`

### 1.3 Components

Components in Mini Programs are also provided by the host environment. Developers can use them to build polished page structures quickly. Officially, Mini Program components are divided into 14 major categories.

Here are a few commonly used categories:

- View containers
- Basic content
- Form components
- Navigation components
- Media components
- `map` component
- `canvas` component
- Open capability components
- Accessibility support

For full details, always refer to the official docs: [Official Component Documentation](https://developers.weixin.qq.com/miniprogram/dev/component/)

### 1.4 Mini Program APIs

1. Event listener APIs

   Features: APIs starting with `on`, used to listen for events  
   Example: `wx.onWindowResize(function callback)` listens for window size changes

2. Synchronous APIs

   Feature 1: APIs ending with `Sync` are synchronous APIs

   Feature 2: the result can be obtained directly from the return value, and exceptions are thrown on failure  
   Example: `wx.setStorageSync(key，value)` writes data to local storage

3. Asynchronous APIs

   Feature: similar to jQuery's `$.ajax(options)`, they use `success`, `fail`, and `complete` callbacks to receive results  
   Example: `wx.request()` sends a network request and receives data in the `success` callback

4. UI interaction APIs - used to provide feedback to the user

- `wx.showToast({ title: '成功', icon: 'success' })` -> top toast notification
- `wx.showModal({ title: '提示', content: '确定删除吗？' })` -> confirmation dialog
- `wx.showLoading({ title: '加载中...' }) / wx.hideLoading()` -> global loading indicator

This is roughly similar to `ElMessage` and `ElDialog` in Vue + Element Plus.

5. Routing APIs - used to control page navigation

- `wx.navigateTo({ url: '/pages/detail/detail?id=1' })` -> navigate to a new page (can go back)
- `wx.redirectTo({ url: '/pages/home/home' })` -> redirect and destroy the current page
- `wx.switchTab({ url: '/pages/index/index' })` -> switch to a `tabBar` page
- `wx.navigateBack({ delta: 1 })` -> go back one level

This is similar to `router.push` and `router.replace` in Vue Router.

6. Network request APIs - Mini Programs include built-in request methods

- `wx.request({ url: 'https://api.xxx.com/list', method: 'GET', success(res) { console.log(res) } })`

This is similar to `axios.get()`, but with more low-level syntax.

7. Data storage APIs - local storage, similar to the browser's `localStorage`

- `wx.setStorageSync('token', '123')`
- `wx.getStorageSync('token')`
- `wx.removeStorageSync('token')`

Equivalent to `localStorage.setItem/getItem`.

8. Media-related APIs - camera, album, recording, video

- `wx.chooseImage({ count: 1, success(res) { console.log(res.tempFilePaths) } })` -> choose an image
- `wx.previewImage({ urls: ['xx.jpg'] })` -> preview images
- `wx.startRecord() / wx.stopRecord()` -> audio recording
- `wx.createVideoContext(id)` -> video control

9. Device APIs - access mobile hardware capabilities

- `wx.getSystemInfo({ success(res) { console.log(res) } })` -> get phone information
- `wx.getLocation({ type: 'wgs84', success(res) { console.log(res.latitude, res.longitude) } })` -> get location
- `wx.scanCode({ success(res) { console.log(res) } })` -> scan a QR code

This is one of the biggest advantages of Mini Programs: direct access to device hardware features.

10. File APIs - download and upload files

- `wx.downloadFile({ url: 'https://xx.com/file.pdf', success(res) { console.log(res.tempFilePath) } })`
- `wx.uploadFile({ url: 'https://xx.com/upload', filePath: tempPath, name: 'file', success(res){ console.log(res) } })`

11. Payment and login APIs

- `wx.login()` -> get a login credential, which the backend can exchange for `openid` and `session_key`
- `wx.requestPayment()` -> trigger WeChat Pay

These are among the most commonly used capabilities in commercial Mini Programs.

**Summary**

Differences from Vue/front-end APIs:

1. More low-level and more primitive: many Mini Program APIs use callback style, unlike Promise/async-heavy Vue patterns, although newer versions also support `wx.request().then()`.
2. Deeply tied to WeChat: you can invoke WeChat Pay or the built-in scanner, which normal web pages cannot do.
3. No DOM APIs: you cannot use `document.querySelector`, because Mini Programs use their own rendering engine.

Still, the official docs remain the best source: [Official API Documentation](https://developers.weixin.qq.com/miniprogram/dev/api/)
