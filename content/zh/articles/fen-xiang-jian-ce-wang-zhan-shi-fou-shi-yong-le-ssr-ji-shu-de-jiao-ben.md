---
title: 分享检测网站是否使用了 SSR 技术的脚本
summary: 1. 打开浏览器的控制台 输入 allow pasting 2. 复制代码在console 中输入以下内容
author: evan
category: work
tags: [工作总结]
createdAt: 2025-10-10 09:59:19
updatedAt: 2025-10-10 09:59:19
readingMinutes: 4
---
# 分享检测网站是否使用了 SSR 技术的脚本

## 正文

1. 打开浏览器的控制台 输入 `allow pasting `

2. 复制代码在console 中输入以下内容

```
(function checkSSR() {
  const result = {
    isReact: !!document.getElementById('root') || !!document.getElementById('__next'),
    hasNextData: typeof window.__NEXT_DATA__ !== 'undefined',
    htmlHasContent: false,
    poweredByNext: false,
    ssrSuspect: false,
  };

  // 检查 HTML 中是否有真实内容
  const bodyText = document.body.innerText.trim();
  result.htmlHasContent = bodyText.length > 50; // 如果首屏已有可读内容，可能是 SSR

  // 检查 HTTP 响应头（仅部分浏览器支持）
  fetch(window.location.href, { method: 'GET', cache: 'no-store' })
    .then(res => {
      const headers = Array.from(res.headers.entries());
      const xPoweredBy = headers.find(([k]) => k.toLowerCase() === 'x-powered-by');
      if (xPoweredBy && xPoweredBy[1].toLowerCase().includes('next')) {
        result.poweredByNext = true;
      }

      // 判断逻辑
      result.ssrSuspect =
        result.hasNextData ||
        result.poweredByNext ||
        (result.htmlHasContent && !result.isReact);

      console.log('%c🔍 SSR 检测结果：', 'color: #00c853; font-weight: bold;');
      console.table({
        'React 应用': result.isReact,
        '检测到 __NEXT_DATA__': result.hasNextData,
        'HTML 含可读内容': result.htmlHasContent,
        'Header 含 Next.js 标识': result.poweredByNext,
        '是否可能 SSR/SSG': result.ssrSuspect ? '✅ 是' : '❌ 否（CSR）',
      });
    })
    .catch(() => {
      console.log('%c⚠️ 无法获取响应头，但仍可参考其他特征。', 'color: #f39c12');
    });
})();
```
