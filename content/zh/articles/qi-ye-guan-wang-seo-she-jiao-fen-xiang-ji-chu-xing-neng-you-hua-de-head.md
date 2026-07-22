---
title: "企业官网 SEO + 社交分享 + 基础性能优化 的 <head> 模板"
summary: "description、keywords、title → 填写你公司的核心信息 og:url、og:image、twitter:image → 使用你公司..."
author: evan
category: work
tags: [工作总结]
createdAt: 2025-10-10 10:18:08
updatedAt: 2025-10-10 10:18:08
readingMinutes: 8
---
# 企业官网 SEO + 社交分享 + 基础性能优化 的 <head> 模板

## 直接复制以下内容根据要求替换即可。
 

```
<head>
  <!-- 基础 Meta -->
  <meta charset="UTF-8">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="这里写你公司或产品的简介，120~160字最佳">
  <meta name="keywords" content="公司名称, 产品, 服务, 关键技术, 行业关键词">
  <meta name="author" content="公司名称">
  <meta name="robots" content="index, follow"> <!-- 告诉搜索引擎抓取 -->

  <!-- 页面标题 -->
  <title>公司名称 - 核心产品或服务</title>

  <!-- Favicon -->
  <link rel="icon" href="/favicon.ico" type="image/x-icon">
  <link rel="shortcut icon" href="/favicon.ico" type="image/x-icon">

  <!-- Open Graph (社交分享优化) -->
  <meta property="og:title" content="公司名称 - 核心产品或服务">
  <meta property="og:description" content="这里写公司或产品简介，用于社交平台分享">
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://www.yourcompany.com/">
  <meta property="og:image" content="https://www.yourcompany.com/share-image.png">

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="公司名称 - 核心产品或服务">
  <meta name="twitter:description" content="这里写公司或产品简介">
  <meta name="twitter:image" content="https://www.yourcompany.com/share-image.png">

  <!-- 预加载关键字体，提高首屏速度 -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">

  <!-- CSS 样式文件 -->
  <link rel="stylesheet" href="/css/main.css">

  <!-- 网站统计（可选，百度/谷歌等） -->
  <!-- 百度统计 -->
  <script>
    var _hmt = _hmt || [];
    (function() {
      var hm = document.createElement("script");
      hm.src = "https://hm.baidu.com/hm.js?你的统计ID";
      var s = document.getElementsByTagName("script")[0];
      s.parentNode.insertBefore(hm, s);
    })();
  </script>

  <!-- Google Analytics (gtag.js) -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-你的GAID"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-你的GAID');
  </script>
</head>
```
## 替换要求：

### 替换内容
- description、keywords、title → 填写你公司的核心信息
- og:url、og:image、twitter:image → 使用你公司域名和分享图
- 统计 ID 替换成你自己的百度/GA ID

#### 注意：
想用这个` <script>` 做百度统计，你的统计ID 就是 百度统计给你的唯一标识符（Site ID），必须先去百度申请。流程如下：

1️⃣ 注册/登录百度统计
	1.	打开官网：百度统计
	2.	用百度账号登录（可以注册一个企业/个人账号）
	3.	如果是公司网站，建议用企业邮箱注册，方便管理和归档
        
2️⃣ 创建统计网站
	1.	登录后，点击 “添加新网站”
	2.	填写网站信息：
	•	网站名称（公司官网名称）
	•	网站 URL（例如：https://www.yourcompany.com）
	•	网站行业类别（可选，便于统计分析）
	3.	提交保存
        
3️⃣ 获取统计 ID
	•	创建成功后，百度统计会生成一个 Site ID（格式类似 702b760894a434f58ec2b765f9ad39ba）
	•	你在 `<script>` 里替换：
        
4️⃣ 安装到网站
	•	把 `<script> `放到 `<head>` 里（推荐）或 `<body>` 底部都可以
	•	网站上线后，百度统计后台就会开始收集访问数据

### SEO优化小技巧
- description 保持 120–160 字，清晰描述公司价值
- keywords 不必堆砌，但选择核心关键词
- 社交分享图尺寸建议：1200x630px
### 性能优化
- 预加载字体提高首屏速度
- CSS 尽量打包成一个文件，减少 HTTP 请求
### 可扩展
- 后续如果网站有多语言，可以加 <link rel="alternate" hreflang="zh-CN" href="...">
- 对产品页或新闻页可以单独定制 description 和 og:image
