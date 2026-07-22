---
title: 微信小程序开发指南（入门版）
summary: "推荐阅读：官方文档 pages 用来存放所有小程序的页面 utils 用来存放工具性质的模块 (例如:格式化时间的自定义模块) app.js 小程序项目的..."
author: evan
category: learning
tags: [学习, 小程序]
createdAt: 2025-08-22 15:39:59
updatedAt: 2025-08-22 15:39:59
readingMinutes: 13
---
# 微信小程序开发指南（入门版）

推荐阅读：[官方文档](https://developers.weixin.qq.com/miniprogram/dev/framework/)

## 1.项目基本组成结构

- **pages** 用来存放所有小程序的页面
- utils 用来存放工具性质的模块 (例如:格式化时间的自定义模块)
- app.js 小程序项目的入口文件
- app.json 小程序项目的全局配置文件
- app.wxss小程序项目的全局样式文件

![项目基本组成结构](https://codenest.oss-cn-qingdao.aliyuncs.com/article_images/%E6%88%AA%E5%B1%8F2025-08-22%2013.49.07.png)

**其中，每个页面由 4 个基本文件组成，它们分别是**

- js 文件(页面的脚本文件，存放页面的数据、事件处理函数等）
- json 文件(当前页面的配置文件，配置窗口的外观、表现等)
- wxml文件(页面的模板结构文件)
- wxss 文件(当前页面的样式表文件)

### 1.1  JSON格式文件配置：
小程序项目中有 4种json 配置文件，分别是

- 项目根目录中的 app.json 配置文件
- 项目根目录中的 project.config.json 配置文件
- 项目根目录中的sitemap.json 配置文件
- 每个页面文件夹中的 .json 配置文件

**1. app.json 是当前小程序的全局配置，包括了小程序的所有页面路径、窗口外观、界面表现、底部 tab 等。**
![app.json 基本内容](https://codenest.oss-cn-qingdao.aliyuncs.com/article_images/%E6%88%AA%E5%B1%8F2025-08-22%2014.05.37.png)

 简单了解下这4个配置项的作用:

- pages: 用来记录当前小程序所有页面的**路径**
- window: 全局定义小程序所有页面的背景色、文字颜色等
- style: 全局定义小程序组件所使用的样式版本
- sitemapLocation: 用来指明 sitemap.json 的位置

**2. project.config.json 文件**

project.config,json 是项目配置文件，用来记录对小程序开发工具所做的个性化配置，例如:

- setting 中保存了编译相关的配置
- projectname 中保存的是项目名称
- appid 中保存的是小程序的账号 ID

**3. sitemapjson 文件**

微信现已开放小程序内搜索，效果类似于 PC 网页的 SEO。sitemap.json 文件用来配置小程序页面是否允许微信索引。

当开发者允许微信索引时，微信会通过爬虫的形式，为小程序的页面内容建立索引。当用户的搜索关键字和页面的索引匹配成功的时候，小程序的页面将可能展示在搜索结果中（没见到这个文件在哪里）。

**4. 页面的 json 配置文件**

小程序中的每一个页面，可以使用 .json 文件来对本页面的窗口外观进行配置，页面中的配置项会覆盖app.json 的 window 中相同的配置

### 1.2 小程序页面

 - WXML
(WeiXin Markup Language)是小程序框架设计的一套标签语言，用来构建小程序页面的结构，其作用类似于网页开发中的HTML

**WXML和 HTML的区别:**

① 标签名称不同

HTML (div, span,img,a)

WXML (view, text, image, navigator)

![image](https://codenest.oss-cn-qingdao.aliyuncs.com/article_images/%E6%88%AA%E5%B1%8F2025-08-22%2014.57.10.png)

⚡️ 核心差异总结

	•	Vue: v-if / v-for / v-show / v-model / @click
	•	小程序: wx:if / wx:for / hidden / bindtap / bindinput
    •	div → view
	•	span/p → text
	•	img → image
	•	a → navigator

② 属性节点不同

vue/html: `<a href = "#" > 超链接</a> `

小程序: `<navigator url="/pages/home/home"></navigator>`

③ 提供了类似于 Vue 中的模板语法
- 数据绑定
- 列表渲染
- 条件渲染

vue使用 JS 表达式直接写
`<div>{{ count + 1 }}</div>`

小程序里面要使用大括号
`<view>{{count + 1}}</view>`

### 1.3 组件

小程序中的组件也是由宿主环境提供的，开发者可以基于组件快速搭建出漂亮的页面结构。官方把小程序的组件分为了14大类

这里只列举常用几类分别是:

- 视图容器
- 基础内容
- 表单组件
- 导航组件
- 媒体组件
- map 地图组件
- canvas 画布组件
- 开放能力
- 无障碍访问

详细内容还是要看官方文档为准: [官方组件文档](https://developers.weixin.qq.com/miniprogram/dev/component/)

### 1.4 小程序API

1. 事件监听 API

    特点: 以 on 开头，用来监听某些事件的触发
    举例:` wx.onWindowResize(function callback)` 监听窗口尺寸变化的事件

2. 同步 API

    特点1:以`Sync` 结尾的API 都是同步 API

    特点2:同步 API 的执行结果，可以通过函数返回值直接获取，如果执行出错会抛出异常,
    举例:` wx.setStorageSync(key，value)`向本地存储中写入内容

3. 异步 API

    特点: 类似于jQuery 中的` $.ajax(options)` 函数，需要通过 success、fail、complete 接收调用的结果
    举例:`wx.request( )`发起网络数据请求，通过success 回调函数接收数据

4. UI 交互 API --负责给用户反馈提示

	•	`wx.showToast({ title: '成功', icon: 'success' })` —— 顶部弹出轻提示

	•	`wx.showModal({ title: '提示', content: '确定删除吗？' })` —— 弹出确认框

	•	`wx.showLoading({ title: '加载中...' }) / wx.hideLoading()` —— 全局加载

     类似 Vue + Element Plus 的 ElMessage、ElDialog。

5. 路由导航 API --控制页面跳转

	•	`wx.navigateTo({ url: '/pages/detail/detail?id=1' })` —— 跳转到新页面（可返回）

	•	`wx.redirectTo({ url: '/pages/home/home' })` —— 重定向，当前页面销毁

	•	`wx.switchTab({ url: '/pages/index/index' })` —— 切换 tabBar 页面

	•	`wx.navigateBack({ delta: 1 })` —— 返回上一级

     类似 Vue Router 的 router.push、router.replace。

6. 网络请求 API --小程序内置了请求方法

	•	`wx.request({ url: 'https://api.xxx.com/list', method: 'GET', success(res) { console.log(res) } })`
    类似 axios.get()，但语法更原始。

7. 数据存储 API --本地存储，相当于浏览器的 localStorage

	•	`wx.setStorageSync('token', '123')`

	•	`wx.getStorageSync('token')`

	•	`wx.removeStorageSync('token')`

    👉 类似 localStorage.setItem/getItem。

8. 媒体相关 API --操作相机、相册、录音、视频

	•	`wx.chooseImage({ count: 1, success(res) { console.log(res.tempFilePaths) } })` —— 选图

	•	`wx.previewImage({ urls: ['xx.jpg'] })` —— 图片预览

	•	`wx.startRecord() / wx.stopRecord()` —— 录音

	•	`wx.createVideoContext(id)` —— 视频控制

9. 设备 API --访问手机硬件能力

	•	`wx.getSystemInfo({ success(res) { console.log(res) } })` —— 获取手机信息

	•	`wx.getLocation({ type: 'wgs84', success(res) { console.log(res.latitude, res.longitude) } })` —— 获取定位

	•	`wx.scanCode({ success(res) { console.log(res) } })` —— 扫码

    👉 这是小程序最大的优势：能直接调用硬件。

10. 文件 API --下载/上传文件

	•	`wx.downloadFile({ url: 'https://xx.com/file.pdf', success(res) { console.log(res.tempFilePath) } })`

	•	`wx.uploadFile({ url: 'https://xx.com/upload', filePath: tempPath, name: 'file', success(res){ console.log(res) } })`

11. 支付/登录 API

	•	wx.login() —— 获取登录凭证，后端换取 openid、session_key

	•	wx.requestPayment() —— 调起微信支付

    👉 商业小程序最常用。

**总结**
⚡️ 和 Vue/前端 API 的区别

	1.	更底层、更原始：小程序 API 大多是回调风格，不像 Vue 里有 Promise/async，不过新版支持 wx.request().then()。

	2.	和微信深度绑定：你能调起微信支付、扫一扫，这是普通网页做不到的。

	3.	没有 DOM API：你不能 document.querySelector，因为小程序有自己的渲染引擎。

还是要看: [官方API文档](https://developers.weixin.qq.com/miniprogram/dev/api/)
