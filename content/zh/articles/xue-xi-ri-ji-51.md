---
title: "[2026.03.03] 学习日记"
summary: 例如要缓存一些热点key： 根据页面中的标签选择图标，然后下载。 引入依赖
author: evan
category: diary
tags: [日记, 学习]
createdAt: 2026-03-03 23:20:44
updatedAt: 2026-03-03 23:20:44
readingMinutes: 12
---
# [2026.03.03] 学习日记

## 1 今天重新复习了一下关于 Redis 的操作

例如要缓存一些热点key：

```Java
        // 构建缓存 key
        String queryCondition = JSONUtil.toJsonStr(pictureQueryRequest); // 先把对象转 JSON
        String hashKey = DigestUtils.md5DigestAsHex(queryCondition.getBytes()); // 再用 md5 对 key 进行加密的同时压缩存储空间
        String redisKey = "picture:listPictureVOByPage:"+ hashKey;
        // 从 Redis 缓存中查询
        ValueOperations<String, String> valueOps = stringRedisTemplate.opsForValue();
        String cachedValue = valueOps.get(redisKey);
        if (cachedValue != null){
            // 将JSON 字符串转成对象（Bean）
            Page<PictureVO> cachedPage = JSONUtil.toBean(cachedValue, Page.class);
            return ResultUtils.success(cachedPage);
        }

        // 查询数据库
        Page<Picture> picturePage = pictureService.page(new Page<>(current, pageSize), pictureService.getQueryWrapper(pictureQueryRequest));

        // 获取封装类
        Page<PictureVO> pictureVOPage = pictureService.getPictureVOPage(picturePage, request);

        // 存入 Redis
        String cacheValue = JSONUtil.toJsonStr(pictureVOPage);
        // 5-10分钟随机过期，防止雪崩
        int cacheExpreTime = 300+  RandomUtil.randomInt(0, 300);
        valueOps.set(redisKey, cacheValue, cacheExpreTime, TimeUnit.SECONDS);
```

## 2 同理对Caffeine（咖啡因）的操作

```java
   
   // 设置本地缓存容量和过期时间
    private final Cache<String, String> LOCAL_CACHE =
            Caffeine.newBuilder().initialCapacity(1024)
                    .maximumSize(10000L)
                    // 缓存 5 分钟移除
                    .expireAfterWrite(5L, TimeUnit.MINUTES)
                    .build();

// 构建缓存 key
        String queryCondition = JSONUtil.toJsonStr(pictureQueryRequest);
        String hashKey = DigestUtils.md5DigestAsHex(queryCondition.getBytes());
        String cacheKey = "listPictureVOByPage:" + hashKey;
        // 从本地缓存中查询
        String cachedValue = LOCAL_CACHE.getIfPresent(cacheKey);
        if (cachedValue != null) {
            // 如果缓存命中，返回结果
            Page<PictureVO> cachedPage = JSONUtil.toBean(cachedValue, Page.class);
            return ResultUtils.success(cachedPage);
        }

        // 查询数据库
        Page<Picture> picturePage = pictureService.page(new Page<>(current, pageSize),
                pictureService.getQueryWrapper(pictureQueryRequest));
        // 获取封装类
        Page<PictureVO> pictureVOPage = pictureService.getPictureVOPage(picturePage, request);

        // 存入本地缓存
        String cacheValue = JSONUtil.toJsonStr(pictureVOPage);
        LOCAL_CACHE.put(cacheKey, cacheValue);
```

## 3 总结一个问题为什么Redis这么快 ？ 已经放到题库中

## 4 学习到了使用 API批量抓取bing（搜索引擎)图片的方法
 根据页面中的标签选择图标，然后下载。

 引入依赖
```xml
 <!-- HTML 解析：https://jsoup.org/ -->
        <dependency>
            <groupId>org.jsoup</groupId>
            <artifactId>jsoup</artifactId>
            <version>1.15.3</version>
        </dependency>
```

```java
   // 要抓取的地址
        String fetchUrl = String.format("https://cn.bing.com/images/async?q=%s&mmasync=1", searchText);
        Document document;
        try {
            document = Jsoup.connect(fetchUrl).get();
        } catch (IOException e) {
            log.error("获取页面失败", e);
            throw new BusinessException(ErrorCode.OPERATION_ERROR, "获取页面失败");
        }
        Element div = document.getElementsByClass("dgControl").first();
        if (ObjUtil.isNull(div)) {
            throw new BusinessException(ErrorCode.OPERATION_ERROR, "获取元素失败");
        }
       //  Elements imgElementList = div.select("img.mimg");
        Elements imgElementList = div.select(".iusc");  // 修改选择器，获取包含完整数据的元素
        int uploadCount = 0;

        for (Element imgElement : imgElementList) {
            // String fileUrl = imgElement.attr("src");
            // 获取data-m属性中的JSON字符串
            String dataM = imgElement.attr("m");
            String fileUrl;
            try {
                // 解析JSON字符串
                JSONObject jsonObject = JSONUtil.parseObj(dataM);
                // 获取murl字段（原始图片URL）
                fileUrl = jsonObject.getStr("murl");
            } catch (Exception e) {
                log.error("解析图片数据失败", e);
                continue;
            }

            if (StrUtil.isBlank(fileUrl)) {
                log.info("当前链接为空，已跳过: {}", fileUrl);
                continue;
            }
            // 处理图片上传地址，防止出现转义问题
            int questionMarkIndex = fileUrl.indexOf("?");
            if (questionMarkIndex > -1) {
                fileUrl = fileUrl.substring(0, questionMarkIndex);
            }
```
