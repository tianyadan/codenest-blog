---
title: 网页截图并上传至阿里云OSS 服务具体实现方案
summary: 引入了阿里云OSS、Selenium、ZXing等依赖，分别用于文件上传、网页截图和二维码生成。 该工具类负责将文件上传到阿里云OSS，其中包括了文件上传...
author: evan
category: work
tags: [工作总结]
createdAt: 2026-02-10 12:48:00
updatedAt: 2026-02-10 12:48:00
readingMinutes: 44
---
# 网页截图并上传至阿里云OSS 服务具体实现方案

## 网页截图并上传到阿里云OSS，还带有二维码生成功能，适用于将网页生成截图，并将其压缩后上传到阿里云对象存储服务（OSS）。

## 核心功能

- 引入了阿里云OSS、Selenium、ZXing等依赖，分别用于文件上传、网页截图和二维码生成。

### 工具类 OssUtil：

该工具类负责将文件上传到阿里云OSS，其中包括了文件上传时的压缩处理（通过 ImgUtil.scale）。

方法：

uploadFileCompress: 用于上传压缩后的文件，减小文件大小以节省存储空间和加速传输。

uploadFile: 用于上传原文件。

### 工具类 WebScreenshotUtils：

这个类通过 Selenium WebDriver 操作浏览器，打开指定网页并进行截图。

然后生成该网页的二维码，并将二维码嵌入到截图的右下角。

最终将截图和二维码上传到阿里云OSS。

### 方法：

saveWebPageScreenshotToOSS: 核心方法，负责网页截图、二维码生成和上传到OSS。

saveWebPageScreenshot: 仅用于本地保存网页截图（未上传至OSS）。

### 阿里云OSS配置类 AliyunOssConfig：

负责配置阿里云OSS客户端，提供初始化 OSS 客户端的功能。

网页截图上传示例：

### 示例代码展示了如何生成分享链接：获取 Bearer Token，通过 WebScreenshotUtils 生成网页截图并上传到阿里云OSS，最后将截图的 URL 返回给前端。

### 1. 导入依赖

```XML
  <!--  阿里云 oss 服务   -->
        <dependency>
            <groupId>com.aliyun.oss</groupId>
            <artifactId>aliyun-sdk-oss</artifactId>
            <version>3.16.2</version>
        </dependency>
```

```XML
   <!-- Selenium 网页截图依赖 -->
        <dependency>
            <groupId>org.seleniumhq.selenium</groupId>
            <artifactId>selenium-java</artifactId>
            <version>4.33.0</version>
        </dependency>
        <dependency>
            <groupId>io.github.bonigarcia</groupId>
            <artifactId>webdrivermanager</artifactId>
            <version>6.1.0</version>
        </dependency>
```

```XML
 <!-- 生成二维码（推荐 ZXing）-->
        <dependency>
            <groupId>com.google.zxing</groupId>
            <artifactId>core</artifactId>
            <version>3.5.3</version>
        </dependency>

        <dependency>
            <groupId>com.google.zxing</groupId>
            <artifactId>javase</artifactId>
            <version>3.5.3</version>
        </dependency>
```

### 2. 编写工具类

#### 2.1 OSSUtil 工具类
```JAVA

import cn.hutool.core.img.ImgUtil;
import com.aliyun.oss.OSS;
import com.aliyun.oss.OSSException;
import com.aliyun.oss.model.ObjectMetadata;
import com.aliyun.oss.model.PutObjectRequest;
import jakarta.annotation.Resource;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.UUID;

@Component
public class OssUtil {

    @Resource
    private OSS ossClient;

    @Value("${aliyun.oss.bucket-name}")
    private String bucketName;

    @Value("${aliyun.oss.endpoint}")
    private String endpoint;

    @Value("${aliyun.oss.folder}")
    private String folder;

    public String uploadFileCompress(MultipartFile file, float rate) {
        try {
            // 生成唯一文件名
            String originalFilename = file.getOriginalFilename();
            String suffix = originalFilename.substring(originalFilename.lastIndexOf("."));
            String datePath = new SimpleDateFormat("yyyy/MM/dd").format(new Date());
            String fileName = folder + datePath + "/" + UUID.randomUUID() + suffix;

            // 压缩图像到内存
            ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
            ImgUtil.scale(file.getInputStream(), outputStream, rate); // 指定压缩比例

            // 上传压缩后的图像
            ByteArrayInputStream inputStream = new ByteArrayInputStream(outputStream.toByteArray());
            ossClient.putObject(new PutObjectRequest(bucketName, fileName, inputStream));

            // 拼接访问 URL
            return "https://" + bucketName + "." + endpoint + "/" + fileName;

        } catch (OSSException e) {
            throw new RuntimeException("OSS 上传失败：" + e.getErrorMessage(), e);
        } catch (Exception e) {
            throw new RuntimeException("文件上传出错：" + e.getMessage(), e);
        }
    }

    public String uploadFile(MultipartFile file) {
        try {
            if (file == null || file.isEmpty()) {
                throw new RuntimeException("文件不能为空");
            }

            String originalFilename = file.getOriginalFilename();
            if (originalFilename == null || !originalFilename.contains(".")) {
                throw new RuntimeException("非法文件名");
            }

            String suffix = originalFilename.substring(originalFilename.lastIndexOf("."));
            String datePath = new SimpleDateFormat("yyyy/MM/dd").format(new Date());

            String fileName = folder.endsWith("/")
                    ? folder + datePath + "/" + UUID.randomUUID() + suffix
                    : folder + "/" + datePath + "/" + UUID.randomUUID() + suffix;

            ObjectMetadata metadata = new ObjectMetadata();
            metadata.setContentLength(file.getSize());
            metadata.setContentType(file.getContentType());

            ossClient.putObject(
                    bucketName,
                    fileName,
                    file.getInputStream(),
                    metadata
            );

            return "https://" + bucketName + "." + endpoint + "/" + fileName;

        } catch (Exception e) {
            throw new RuntimeException("文件上传失败", e);
        }
    }
}
```

#### 2.2 WebScreenshotUtils 工具类

```Java

import cn.hutool.core.img.ImgUtil;
import cn.hutool.core.io.FileUtil;
import cn.hutool.core.util.RandomUtil;
import cn.hutool.core.util.StrUtil;
import com.google.zxing.BarcodeFormat;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import io.github.bonigarcia.wdm.WebDriverManager;
import jakarta.annotation.PreDestroy;
import lombok.extern.slf4j.Slf4j;
import org.openqa.selenium.JavascriptExecutor;
import org.openqa.selenium.OutputType;
import org.openqa.selenium.TakesScreenshot;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.chrome.ChromeOptions;
import org.openqa.selenium.support.ui.WebDriverWait;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.time.Duration;
import java.util.UUID;

@Slf4j
public class WebScreenshotUtils {

    private static final WebDriver webDriver;

    static {
        final int DEFAULT_WIDTH = 1600;
        final int DEFAULT_HEIGHT = 2680;
        webDriver = initChromeDriver(DEFAULT_WIDTH, DEFAULT_HEIGHT);
    }

    @PreDestroy
    public void destroy() {
        webDriver.quit();
    }

    /**
     * 生成网页截图并上传到 OSS
     *  核心业务类
     * @param webUrl       网页URL
     * @param token        登录 token
     * @param ossUtil      注入的 OssUtil
     * @param compressRate 压缩比例 0~1
     * @return 上传后的图片 URL，失败返回 null
     */
    public static String saveWebPageScreenshotToOSS(String webUrl, String token, OssUtil ossUtil, float compressRate) {
        if (StrUtil.isBlank(webUrl)) {
            log.error("网页URL不能为空");
            return null;
        }

        try {
            // 1. 打开网页并注入 token
            webDriver.get("http://localhost:5173/login"); // 目的是先让浏览器存储 token 方案  ，此处可以替换
            JavascriptExecutor js = (JavascriptExecutor) webDriver;
            js.executeScript("window.localStorage.setItem('snail_token', arguments[0]);", token);
            js.executeScript("window.localStorage.setItem('snail_role', arguments[0]);", "USER");
            js.executeScript("window.localStorage.setItem('screen_shot', arguments[0]);", "yes");
            webDriver.get(webUrl);
            Thread.sleep(500);
            webDriver.navigate().refresh();
            waitForPageLoad(webDriver);

            // 2. 截图 + 链接二维码生成
            byte[] screenshotBytes = ((TakesScreenshot) webDriver).getScreenshotAs(OutputType.BYTES);
            BufferedImage screenshot = ImageIO.read(new ByteArrayInputStream(screenshotBytes));
            BufferedImage qrImage = generateQRCode(webUrl, 200, 200);

            Graphics2D g = screenshot.createGraphics();

            // 建议打开抗锯齿
            g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);

            // 右下角放二维码
            int x = screenshot.getWidth() - qrImage.getWidth() - 20;
            int y = screenshot.getHeight() - qrImage.getHeight() - 20;

            g.drawImage(qrImage, x, y, null);

            // 可选：写提示文字
            g.setFont(new Font("Arial", Font.BOLD, 18));
            g.setColor(Color.BLACK);
            g.drawString("扫码访问原页面", x, y - 10);

            g.dispose();

            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            ImageIO.write(screenshot, "png", baos);
            byte[] finalBytes = baos.toByteArray();

            // 3. 将 byte[] 转 MultipartFile
            MultipartFile multipartFile = new ByteArrayMultipartFile(
                    "screenshot.png",
                    "screenshot.png",
                    "image/png",
                    finalBytes
            );

            // 4. 上传 OSS（压缩）
            return ossUtil.uploadFileCompress(multipartFile, compressRate);

        } catch (Exception e) {
            log.error("网页截图上传 OSS 失败: {}", webUrl, e);
            return null;
        } finally {
            //  清理残留 Chrome / Chromedriver 进程  不清理会导致后续请求无法正常进行
            try {
                String os = System.getProperty("os.name").toLowerCase();
                if (os.contains("mac") || os.contains("linux")) {
                    Runtime.getRuntime().exec("pkill -f chromedriver");
                    Runtime.getRuntime().exec("pkill -f Chrome");
                } else if (os.contains("win")) {
                    Runtime.getRuntime().exec("taskkill /F /IM chromedriver.exe /T");
                    Runtime.getRuntime().exec("taskkill /F /IM chrome.exe /T");
                }
                log.info("已清理残留 Chrome/Chromedriver 进程");
            } catch (Exception ex) {
                log.warn("清理残留 Chrome/Chromedriver 进程失败", ex);
            }
        }
    }

    // 二维码生成
    public static BufferedImage generateQRCode(String text, int width, int height) throws Exception {
        QRCodeWriter writer = new QRCodeWriter();
        BitMatrix matrix = writer.encode(text, BarcodeFormat.QR_CODE, width, height);

        return MatrixToImageWriter.toBufferedImage(matrix);
    }

    /**
     * 生成网页截图 （保存本地）
     *
     * @param webUrl 网页URL
     * @return 压缩后的截图文件路径，失败返回null
     */
    public static String saveWebPageScreenshot(String webUrl) {
        if (StrUtil.isBlank(webUrl)) {
            log.error("网页URL不能为空");
            return null;
        }

        try {
            // 1. 生成临时目录
            String rootPath = System.getProperty("user.dir") + File.separator + "tmp" + File.separator + "screenshots"
                    + File.separator + UUID.randomUUID().toString().substring(0, 8);
            FileUtil.mkdir(rootPath);

            // 2. 原始截图路径
            final String IMAGE_SUFFIX = ".png";
            String imageSavePath = rootPath + File.separator + RandomUtil.randomNumbers(5) + IMAGE_SUFFIX;

            // 3. 打开网页并注入 token
            webDriver.get("http://localhost:5173/login");
            
            JavascriptExecutor js = (JavascriptExecutor) webDriver;
            String token = "xxxxx"
            js.executeScript("window.localStorage.setItem('snail_token', arguments[0]);", token);
            webDriver.get(webUrl);
            Thread.sleep(500);
            webDriver.navigate().refresh();
            waitForPageLoad(webDriver);

            // 4. 截图 + 保存本地
            byte[] screenshotBytes = ((TakesScreenshot) webDriver).getScreenshotAs(OutputType.BYTES);
            saveImage(screenshotBytes, imageSavePath);

            // 5. 压缩图片
            final String COMPRESSION_SUFFIX = "_compressed.jpg";
            String compressedImagePath = rootPath + File.separator + RandomUtil.randomNumbers(5) + COMPRESSION_SUFFIX;
            compressImage(imageSavePath, compressedImagePath);

            // 7. 删除本地临时文件
            FileUtil.del(imageSavePath);
            FileUtil.del(compressedImagePath);

            return compressedImagePath;

        } catch (Exception e) {
            log.error("网页截图上传 OSS 失败: {}", webUrl, e);
            return null;
        }
    }

    /**
     * 保存图片到文件
     */
    private static void saveImage(byte[] imageBytes, String imagePath) {
        try {
            FileUtil.writeBytes(imageBytes, imagePath);
        } catch (Exception e) {
            log.error("保存图片失败: {}", imagePath, e);
            throw new BusinessException(ErrorCode.SYSTEM_ERROR, "保存图片失败");
        }
    }

    /**
     * 压缩图片
     */
    private static void compressImage(String originalImagePath, String compressedImagePath) {
        // 压缩图片质量（0.1 = 10% 质量）
        final float COMPRESSION_QUALITY = 1f;
        try {
            ImgUtil.compress(
                    FileUtil.file(originalImagePath),
                    FileUtil.file(compressedImagePath),
                    COMPRESSION_QUALITY
            );
        } catch (Exception e) {
            log.error("压缩图片失败: {} -> {}", originalImagePath, compressedImagePath, e);
            throw new BusinessException(ErrorCode.SYSTEM_ERROR, "压缩图片失败");
        }
    }

    /**
     * 等待页面加载完成
     */
    private static void waitForPageLoad(WebDriver driver) {
        try {
            // 创建等待页面加载对象
            WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(10));
            // 等待 document.readyState 为complete
            wait.until(webDriver ->
                    ((JavascriptExecutor) webDriver).executeScript("return document.readyState")
                            .equals("complete")
            );
            // 额外等待一段时间，确保动态内容加载完成
            Thread.sleep(2000);
            log.info("页面加载完成");
        } catch (Exception e) {
            log.error("等待页面加载时出现异常，继续执行截图", e);
        }
    }

    /**
     * 初始化 Chrome 浏览器驱动
     */
    private static WebDriver initChromeDriver(int width, int height) {
        try {

            // 自动管理 ChromeDriver
            WebDriverManager.chromedriver().setup();
            // 配置 Chrome 选项
            ChromeOptions options = new ChromeOptions();
            // 无头模式
            options.addArguments("--headless");
            // 禁用GPU（在某些环境下避免问题）
            options.addArguments("--disable-gpu");
            // 禁用沙盒模式（Docker环境需要）
            options.addArguments("--no-sandbox");
            // 禁用开发者shm使用
            options.addArguments("--disable-dev-shm-usage");
            // 设置窗口大小
            options.addArguments(String.format("--window-size=%d,%d", width, height));
            // 禁用扩展
            options.addArguments("--disable-extensions");
            // 允许跨域
            options.addArguments("--disable-web-security");
            options.addArguments("--allow-running-insecure-content");
            // 设置用户代理
            options.addArguments("--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36");
            // 创建驱动
            WebDriver driver = new ChromeDriver(options);
            // 设置页面加载超时
            driver.manage().timeouts().pageLoadTimeout(Duration.ofSeconds(30));
            // 设置隐式等待
            driver.manage().timeouts().implicitlyWait(Duration.ofSeconds(10));

            return driver;
        } catch (Exception e) {
            log.error("初始化 Chrome 浏览器失败", e);
            throw new BusinessException(ErrorCode.SYSTEM_ERROR, "初始化 Chrome 浏览器失败");
        }
    }
}

```

#### 2.3  阿里云配置类

```Java
import com.aliyun.oss.OSS;
import com.aliyun.oss.OSSClientBuilder;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class AliyunOssConfig {

    @Value("${aliyun.oss.endpoint:oss-cn-qingdao.aliyuncs.com}")
    private String endpoint;

    @Value("${aliyun.oss.access-key-id}")
    private String accessKeyId;

    @Value("${aliyun.oss.access-key-secret}")
    private String accessKeySecret;

    @Bean
    public OSS ossClient() {
        return new OSSClientBuilder().build(endpoint, accessKeyId, accessKeySecret);
    }
}

```

### 3. 请求示例

```Java
  /**
     * 用户生成分享链接
     */
    @Operation(summary = "用户生成分享链接")
    @GetMapping("/share")
    public BaseResponse<?> share(@RequestParam String url, HttpServletRequest request) {
        try {
            // 1. 获取请求头中的 Bearer token
            String authHeader = request.getHeader("Authorization");
            if (StrUtil.isBlank(authHeader) || !authHeader.startsWith("Bearer ")) {
                return ResultUtils.error(ErrorCode.SYSTEM_ERROR,"Authorization 不能为空或格式错误");
            }
            String token = authHeader.substring(7); // 去掉 "Bearer "

            // 2. 生成网页截图并上传 OSS
            // 假设你在 Controller 中注入了 OssUtil
            float compressRate = 0.9f; // 压缩比例，可调整
            String screenshotUrl = WebScreenshotUtils.saveWebPageScreenshotToOSS(url, token, ossUtil, compressRate);

            if (screenshotUrl == null) {
                return ResultUtils.error(ErrorCode.SYSTEM_ERROR,"生成网页截图失败");
            }

            // 3. 返回 OSS 链接给前端
            return ResultUtils.success(screenshotUrl);

        } catch (Exception e) {
            throw new BusinessException(ErrorCode.SYSTEM_ERROR, "用户生成分享链接失败");
        }
    }

```
