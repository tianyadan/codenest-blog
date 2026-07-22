---
title: A <head> Template for Corporate Website SEO, Social Sharing, and Basic Performance Optimization
summary: A reusable <head> template for company websites covering SEO, social sharing metadata, analytics placeholders, and basic performance optimization.
author: evan
category: work
tags: [Work Notes]
createdAt: 2025-10-10 10:18:08
updatedAt: 2025-10-10 10:18:08
readingMinutes: 8
---
# A <head> Template for Corporate Website SEO, Social Sharing, and Basic Performance Optimization

## Copy the following content directly and replace the placeholders as needed.

```
<head>
  <!-- Basic meta -->
  <meta charset="UTF-8">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="Write a brief introduction to your company or product here. 120-160 characters is ideal.">
  <meta name="keywords" content="Company Name, Product, Service, Core Technology, Industry Keywords">
  <meta name="author" content="Company Name">
  <meta name="robots" content="index, follow"> <!-- Tell search engines to crawl -->

  <!-- Page title -->
  <title>Company Name - Core Product or Service</title>

  <!-- Favicon -->
  <link rel="icon" href="/favicon.ico" type="image/x-icon">
  <link rel="shortcut icon" href="/favicon.ico" type="image/x-icon">

  <!-- Open Graph (social sharing optimization) -->
  <meta property="og:title" content="Company Name - Core Product or Service">
  <meta property="og:description" content="Write your company or product description here for social sharing.">
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://www.yourcompany.com/">
  <meta property="og:image" content="https://www.yourcompany.com/share-image.png">

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="Company Name - Core Product or Service">
  <meta name="twitter:description" content="Write your company or product description here.">
  <meta name="twitter:image" content="https://www.yourcompany.com/share-image.png">

  <!-- Preconnect key fonts to improve first paint speed -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">

  <!-- CSS stylesheet -->
  <link rel="stylesheet" href="/css/main.css">

  <!-- Site analytics (optional, Baidu / Google, etc.) -->
  <!-- Baidu Analytics -->
  <script>
    var _hmt = _hmt || [];
    (function() {
      var hm = document.createElement("script");
      hm.src = "https://hm.baidu.com/hm.js?your-baidu-site-id";
      var s = document.getElementsByTagName("script")[0];
      s.parentNode.insertBefore(hm, s);
    })();
  </script>

  <!-- Google Analytics (gtag.js) -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-your-ga-id"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-your-ga-id');
  </script>
</head>
```

## Replacement requirements:

### What to replace

- `description`, `keywords`, and `title` -> fill in your company's core information
- `og:url`, `og:image`, and `twitter:image` -> use your own domain and social sharing image
- Replace the analytics IDs with your own Baidu Analytics / GA IDs

#### Notes:

If you want to use this `<script>` for Baidu Analytics, your analytics ID is the unique Site ID assigned by Baidu Analytics, and you must apply for it first. The process is as follows:

1. Register for or sign in to Baidu Analytics
   1. Open the official Baidu Analytics website
   2. Sign in with your Baidu account (or register a personal or company account)
   3. If this is a company website, it is recommended to register with a corporate email for easier management and archiving

2. Create a website entry
   1. After logging in, click "Add New Website"
   2. Fill in the website information:
      - Website name (your company website name)
      - Website URL (for example: `https://www.yourcompany.com`)
      - Website industry category (optional, useful for analytics)
   3. Submit and save

3. Get the analytics ID
   - After the website is created successfully, Baidu Analytics will generate a Site ID (something like `702b760894a434f58ec2b765f9ad39ba`)
   - Replace it in the `<script>`

4. Install it on your website
   - Put the `<script>` inside `<head>` (recommended) or at the bottom of `<body>`
   - After the site goes live, the Baidu Analytics dashboard will start collecting visit data

### SEO tips

- Keep the `description` within 120-160 characters and clearly describe your company's value
- Do not stuff `keywords`, but choose the core ones carefully
- Recommended social sharing image size: `1200x630px`

### Performance optimization

- Preload fonts to improve initial page speed
- Bundle CSS into as few files as possible to reduce HTTP requests

### Extensibility

- If your website becomes multilingual later, you can add `<link rel="alternate" hreflang="zh-CN" href="...">`
- For product pages or news pages, you can customize `description` and `og:image` separately
