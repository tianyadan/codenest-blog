---
title: "[2026.03.04] 学习日记"
summary: 图片压缩能够显著减少图片文件的大小，从而降低带宽使用和流量消耗，大幅降低成本的同时，提高图片加载速度。 可采用： 将图片格式转为体积更小的格式，比如 We...
author: evan
category: diary
tags: [日记, 学习]
createdAt: 2026-03-04 23:59:36
updatedAt: 2026-03-04 23:59:36
readingMinutes: 4
---
# [2026.03.04] 学习日记

## 1. 学习图片压缩

图片压缩能够显著减少图片文件的大小，从而降低带宽使用和流量消耗，大幅降低成本的同时，提高图片加载速度。

可采用：
- 将图片格式转为体积更小的格式，比如 WebP 或其他现代格式。
- 对图片质量进行压缩
- 缩小图片尺寸

WebP ： 由 Gogle 开发的现代图片格式，支持有损压缩和无损压缩。相比传统格式：
- 比 PNG 文件小约 26%
-  比 JPEG 文件小约 25%-34%
-   支持透明背景（Alpha 通道）
-   兼容性：大部分主流浏览器（Chrome、Edge、FireFox）等都支持

至于图片压缩方案，可以使用本地的图像处理类库自行操作，也可以利用第三方云服务完成。
这里使用数据万象（Tencent）

 提供两种压缩方式：
 - 访问图片时实时压缩
 - [上传图片时实时压缩](https://cloud.tencent.com/document/product/436/115609#.E4.B8.8A.E4.BC.A0.E6.97.B6.E5.A4.84.E7.90.86)，在上传文件时，传入 Rules规则，使用 Http API 调用时，[传入规则参数](https://cloud.tencent.com/document/product/436/113299)。
 如果使用 SDK，需要狗套图片处理规则对象，[参考文档](https://cloud.tencent.com/document/product/436/55377#.E4.B8.8A.E4.BC.A0.E6.97.B6.E5.9B.BE.E7.89.87.E6.8C.81.E4.B9.85.E5.8C.96.E5.A4.84.E7.90.86)。

## 2. 文件秒传

文件秒传是一种基于文件的唯一标识（如 MD5，SHA-256）对文件内容进行快速校验，避免重复上传的方法，在大型文件传输场景下非常重要，可以提很性能，节约带宽和存储资源。举个例子：某信，如果重复上传相同的文件两次（视频），会发现第二次上传速度很快。

实现方案：
- 客户端生成唯一标识：上传前，通过客户端计算文件的哈希值（如 MD5，SHA-256），生成文件的唯一指纹。
- 服务端校验文件指纹，后端接收到文件指纹后，在存储中查询是否已存在相同文件。如果存在相同文件，则直接返回文件的存储路径。若不存在：则接受新文件并记录其指纹信息。

示例代码：

```java
// 计算文件指纹
String md5 = SecureUtil.md5(file);
// 从数据库中查询已有的文件
List<Picture> pictureList = pictureService.lambdaQuery()
        .eq(Picture::getMd5, md5)
        .list();
// 文件已存在，秒传
if (CollUtil.isNotEmpty(pictureList)) {
    // 直接复用已有文件的信息，不必重复上传文件
    Picture existPicture = pictureList.get(0);
} else {
    // 文件不存在，实际上传逻辑
}

```

## 3. 断点续传
将文件拆分 5MB 或1MB ，分开上传。
