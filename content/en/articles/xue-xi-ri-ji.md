---
title: "[2026.03.04] Study Notes"
summary: Image compression can significantly reduce image size, lower bandwidth costs, speed up loading, and works well alongside instant upload and resumable upload strategies.
author: evan
category: diary
tags: [Diary, Learning]
createdAt: 2026-03-04 23:59:36
updatedAt: 2026-03-04 23:59:36
readingMinutes: 4
---
# [2026.03.04] Study Notes

## 1. Learning About Image Compression

Image compression can significantly reduce image file size, which lowers bandwidth usage and traffic consumption, greatly reduces cost, and improves image loading speed.

Possible approaches:

- Convert images to smaller formats, such as WebP or other modern formats.
- Compress image quality
- Reduce image dimensions

WebP is a modern image format developed by Google that supports both lossy and lossless compression. Compared with traditional formats:

- About 26% smaller than PNG
- About 25%-34% smaller than JPEG
- Supports transparent backgrounds (alpha channel)
- Compatibility: supported by most mainstream browsers such as Chrome, Edge, and Firefox

As for image compression solutions, you can either use a local image-processing library or rely on a third-party cloud service.
Here I used Tencent Cloud CI.

It provides two compression methods:

- Real-time compression when accessing the image
- [Real-time compression when uploading images](https://cloud.tencent.com/document/product/436/115609#.E4.B8.8A.E4.BC.A0.E6.97.B6.E5.A4.84.E7.90.86). When uploading files, pass in `Rules`; if you call the HTTP API, [pass in the rule parameters](https://cloud.tencent.com/document/product/436/113299).
- If you use the SDK, you need to construct an image-processing rule object. See the [reference documentation](https://cloud.tencent.com/document/product/436/55377#.E4.B8.8A.E4.BC.A0.E6.97.B6.E5.9B.BE.E7.89.87.E6.8C.81.E4.B9.85.E5.8C.96.E5.A4.84.E7.90.86).

## 2. Instant File Upload

Instant upload is a method that uses a unique file identifier (such as MD5 or SHA-256) to quickly verify file content and avoid duplicate uploads. It is very important in large-file transfer scenarios because it can greatly improve performance and save bandwidth and storage resources. For example, in some messaging apps, if you upload the same file twice, you will notice that the second upload is much faster.

Implementation approach:

- The client generates a unique identifier: before uploading, the client calculates a file hash (such as MD5 or SHA-256) to create a unique fingerprint.
- The server verifies the file fingerprint: after receiving the fingerprint, the backend checks storage to see whether the same file already exists. If it does, it returns the stored file path directly. Otherwise, it accepts the new file and records the fingerprint information.

Example code:

```java
// Calculate the file fingerprint
String md5 = SecureUtil.md5(file);
// Query the database for an existing file
List<Picture> pictureList = pictureService.lambdaQuery()
        .eq(Picture::getMd5, md5)
        .list();
// File already exists, so use instant upload
if (CollUtil.isNotEmpty(pictureList)) {
    // Reuse the existing file information directly instead of uploading again
    Picture existPicture = pictureList.get(0);
} else {
    // File does not exist, run the actual upload logic
}

```

## 3. Resumable Upload

Split the file into 5 MB or 1 MB chunks and upload them separately.
