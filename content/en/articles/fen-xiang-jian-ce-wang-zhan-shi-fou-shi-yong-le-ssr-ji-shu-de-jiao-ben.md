---
title: Sharing a Script to Detect Whether a Website Uses SSR
summary: Open the browser console, allow pasting, and run this script to quickly check whether a site may be using SSR or SSG.
author: evan
category: work
tags: [Work Notes]
createdAt: 2025-10-10 09:59:19
updatedAt: 2025-10-10 09:59:19
readingMinutes: 4
---

# Sharing a Script to Detect Whether a Website Uses SSR

## Main Content

1. Open the browser console and enter `allow pasting`

2. Copy the following code and run it in the console

```javascript
(function checkSSR() {
  const result = {
    isReact: !!document.getElementById('root') || !!document.getElementById('__next'),
    hasNextData: typeof window.__NEXT_DATA__ !== 'undefined',
    htmlHasContent: false,
    poweredByNext: false,
    ssrSuspect: false,
  };

  // Check whether the HTML already contains real content
  const bodyText = document.body.innerText.trim();
  result.htmlHasContent = bodyText.length > 50; // If the first screen already has readable content, it may be SSR

  // Check HTTP response headers (supported only in some browsers)
  fetch(window.location.href, { method: 'GET', cache: 'no-store' })
    .then(res => {
      const headers = Array.from(res.headers.entries());
      const xPoweredBy = headers.find(([k]) => k.toLowerCase() === 'x-powered-by');
      if (xPoweredBy && xPoweredBy[1].toLowerCase().includes('next')) {
        result.poweredByNext = true;
      }

      // Decision logic
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
