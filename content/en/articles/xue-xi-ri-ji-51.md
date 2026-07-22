---
title: "[2026.03.03] Study Notes"
summary: Today I reviewed Redis and Caffeine caching, noted why Redis is so fast, and learned how to batch-fetch Bing images through an API.
author: evan
category: diary
tags: [Diary, Learning]
createdAt: 2026-03-03 23:20:44
updatedAt: 2026-03-03 23:20:44
readingMinutes: 12
---
# [2026.03.03] Study Notes

## 1. Today I Reviewed Redis Operations Again

For example, when caching some hot keys:

```Java
        // Build the cache key
        String queryCondition = JSONUtil.toJsonStr(pictureQueryRequest); // Convert the object to JSON first
        String hashKey = DigestUtils.md5DigestAsHex(queryCondition.getBytes()); // Then use md5 to hash the key and save storage space
        String redisKey = "picture:listPictureVOByPage:"+ hashKey;
        // Query Redis cache
        ValueOperations<String, String> valueOps = stringRedisTemplate.opsForValue();
        String cachedValue = valueOps.get(redisKey);
        if (cachedValue != null){
            // Convert the JSON string back to an object (Bean)
            Page<PictureVO> cachedPage = JSONUtil.toBean(cachedValue, Page.class);
            return ResultUtils.success(cachedPage);
        }

        // Query the database
        Page<Picture> picturePage = pictureService.page(new Page<>(current, pageSize), pictureService.getQueryWrapper(pictureQueryRequest));

        // Get the wrapper object
        Page<PictureVO> pictureVOPage = pictureService.getPictureVOPage(picturePage, request);

        // Store in Redis
        String cacheValue = JSONUtil.toJsonStr(pictureVOPage);
        // Random expiration of 5-10 minutes to prevent cache avalanche
        int cacheExpreTime = 300+  RandomUtil.randomInt(0, 300);
        valueOps.set(redisKey, cacheValue, cacheExpreTime, TimeUnit.SECONDS);
```

## 2. Similarly, I Reviewed How to Use Caffeine

```java

   // Set local cache capacity and expiration time
    private final Cache<String, String> LOCAL_CACHE =
            Caffeine.newBuilder().initialCapacity(1024)
                    .maximumSize(10000L)
                    // Remove after 5 minutes in cache
                    .expireAfterWrite(5L, TimeUnit.MINUTES)
                    .build();

// Build the cache key
        String queryCondition = JSONUtil.toJsonStr(pictureQueryRequest);
        String hashKey = DigestUtils.md5DigestAsHex(queryCondition.getBytes());
        String cacheKey = "listPictureVOByPage:" + hashKey;
        // Query local cache
        String cachedValue = LOCAL_CACHE.getIfPresent(cacheKey);
        if (cachedValue != null) {
            // If the cache hits, return the result
            Page<PictureVO> cachedPage = JSONUtil.toBean(cachedValue, Page.class);
            return ResultUtils.success(cachedPage);
        }

        // Query the database
        Page<Picture> picturePage = pictureService.page(new Page<>(current, pageSize),
                pictureService.getQueryWrapper(pictureQueryRequest));
        // Get the wrapper object
        Page<PictureVO> pictureVOPage = pictureService.getPictureVOPage(picturePage, request);

        // Store in local cache
        String cacheValue = JSONUtil.toJsonStr(pictureVOPage);
        LOCAL_CACHE.put(cacheKey, cacheValue);
```

## 3. I Also Summarized Why Redis Is So Fast

I have already added that topic to the question bank.

## 4. I Learned How to Batch-Fetch Bing Images Through an API

Select icons based on the tags on the page, then download them.

Add the dependency:

```xml
 <!-- HTML parser: https://jsoup.org/ -->
        <dependency>
            <groupId>org.jsoup</groupId>
            <artifactId>jsoup</artifactId>
            <version>1.15.3</version>
        </dependency>
```

```java
   // Target URL to fetch
        String fetchUrl = String.format("https://cn.bing.com/images/async?q=%s&mmasync=1", searchText);
        Document document;
        try {
            document = Jsoup.connect(fetchUrl).get();
        } catch (IOException e) {
            log.error("Failed to fetch page", e);
            throw new BusinessException(ErrorCode.OPERATION_ERROR, "Failed to fetch page");
        }
        Element div = document.getElementsByClass("dgControl").first();
        if (ObjUtil.isNull(div)) {
            throw new BusinessException(ErrorCode.OPERATION_ERROR, "Failed to get element");
        }
       //  Elements imgElementList = div.select("img.mimg");
        Elements imgElementList = div.select(".iusc");  // Update the selector to get elements containing the full data
        int uploadCount = 0;

        for (Element imgElement : imgElementList) {
            // String fileUrl = imgElement.attr("src");
            // Get the JSON string from the data-m attribute
            String dataM = imgElement.attr("m");
            String fileUrl;
            try {
                // Parse the JSON string
                JSONObject jsonObject = JSONUtil.parseObj(dataM);
                // Get the murl field (original image URL)
                fileUrl = jsonObject.getStr("murl");
            } catch (Exception e) {
                log.error("Failed to parse image data", e);
                continue;
            }

            if (StrUtil.isBlank(fileUrl)) {
                log.info("Current URL is empty, skipped: {}", fileUrl);
                continue;
            }
            // Clean up the image upload URL to avoid escaping issues
            int questionMarkIndex = fileUrl.indexOf("?");
            if (questionMarkIndex > -1) {
                fileUrl = fileUrl.substring(0, questionMarkIndex);
            }
```
