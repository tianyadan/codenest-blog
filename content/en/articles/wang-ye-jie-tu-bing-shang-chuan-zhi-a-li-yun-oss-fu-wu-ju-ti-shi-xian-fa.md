---
title: A Complete Implementation for Taking Webpage Screenshots and Uploading Them to Alibaba Cloud OSS
summary: "This article introduces dependencies such as Alibaba Cloud OSS, Selenium, and ZXing for file uploads, webpage screenshots, and QR code generation. It also explains an OSS upload utility, screenshot generation, compression, and a practical upload flow."
author: evan
category: work
tags: [Work Notes]
createdAt: 2026-02-10 12:48:00
updatedAt: 2026-02-10 12:48:00
readingMinutes: 44
---
# A Complete Implementation for Taking Webpage Screenshots and Uploading Them to Alibaba Cloud OSS

## Take a webpage screenshot, upload it to Alibaba Cloud OSS, and also generate a QR code. This solution is suitable for creating screenshots from web pages, compressing them, and uploading them to Alibaba Cloud Object Storage Service (OSS).

## Core Features

- Dependencies such as Alibaba Cloud OSS, Selenium, and ZXing are introduced for file uploads, webpage screenshots, and QR code generation.

### Utility class `OssUtil`

This utility class uploads files to Alibaba Cloud OSS and also supports upload-time compression via `ImgUtil.scale`.

Methods:

- `uploadFileCompress`: uploads a compressed file to reduce size, save storage space, and speed up transmission
- `uploadFile`: uploads the original file without compression

### Utility class `WebScreenshotUtils`

This class uses Selenium WebDriver to control a browser, open a target web page, and capture a screenshot.

It then generates a QR code for that page and embeds it in the lower-right corner of the screenshot.

Finally, it uploads both the screenshot and the QR code composition to Alibaba Cloud OSS.

### Methods

- `saveWebPageScreenshotToOSS`: the core method, responsible for taking a screenshot, generating the QR code, and uploading to OSS
- `saveWebPageScreenshot`: saves a webpage screenshot locally only (without uploading to OSS)

### Alibaba Cloud OSS config class `AliyunOssConfig`

This class configures the Alibaba Cloud OSS client and provides the initialization logic for the OSS client.

Example screenshot upload flow:

### The example code below shows how to generate a share link: obtain a Bearer Token, use `WebScreenshotUtils` to create a webpage screenshot and upload it to Alibaba Cloud OSS, then return the screenshot URL to the frontend.

### 1. Import dependencies

```XML
  <!-- Alibaba Cloud OSS service -->
        <dependency>
            <groupId>com.aliyun.oss</groupId>
            <artifactId>aliyun-sdk-oss</artifactId>
            <version>3.16.2</version>
        </dependency>
```

```XML
   <!-- Selenium webpage screenshot dependencies -->
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
 <!-- QR code generation (ZXing recommended) -->
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

### 2. Write the utility classes

#### 2.1 `OSSUtil` utility class

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
            // Generate a unique file name
            String originalFilename = file.getOriginalFilename();
            String suffix = originalFilename.substring(originalFilename.lastIndexOf("."));
            String datePath = new SimpleDateFormat("yyyy/MM/dd").format(new Date());
            String fileName = folder + datePath + "/" + UUID.randomUUID() + suffix;

            // Compress the image into memory
            ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
            ImgUtil.scale(file.getInputStream(), outputStream, rate); // Specify compression ratio

            // Upload the compressed image
            ByteArrayInputStream inputStream = new ByteArrayInputStream(outputStream.toByteArray());
            ossClient.putObject(new PutObjectRequest(bucketName, fileName, inputStream));

            // Build the access URL
            return "https://" + bucketName + "." + endpoint + "/" + fileName;

        } catch (OSSException e) {
            throw new RuntimeException("OSS upload failed: " + e.getErrorMessage(), e);
        } catch (Exception e) {
            throw new RuntimeException("File upload error: " + e.getMessage(), e);
        }
    }

    public String uploadFile(MultipartFile file) {
        try {
            if (file == null || file.isEmpty()) {
                throw new RuntimeException("File must not be empty");
            }

            String originalFilename = file.getOriginalFilename();
            if (originalFilename == null || !originalFilename.contains(".")) {
                throw new RuntimeException("Invalid file name");
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
            throw new RuntimeException("File upload failed", e);
        }
    }
}
```

#### 2.2 `WebScreenshotUtils` utility class

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
     * Generate a webpage screenshot and upload it to OSS
     * Core business method
     * @param webUrl       webpage URL
     * @param token        login token
     * @param ossUtil      injected OssUtil
     * @param compressRate compression ratio, from 0 to 1
     * @return uploaded image URL, or null if failed
     */
    public static String saveWebPageScreenshotToOSS(String webUrl, String token, OssUtil ossUtil, float compressRate) {
        if (StrUtil.isBlank(webUrl)) {
            log.error("Webpage URL must not be empty");
            return null;
        }

        try {
            // 1. Open the page and inject the token
            webDriver.get("http://localhost:5173/login"); // Used to let the browser store the token first; replace as needed
            JavascriptExecutor js = (JavascriptExecutor) webDriver;
            js.executeScript("window.localStorage.setItem('snail_token', arguments[0]);", token);
            js.executeScript("window.localStorage.setItem('snail_role', arguments[0]);", "USER");
            js.executeScript("window.localStorage.setItem('screen_shot', arguments[0]);", "yes");
            webDriver.get(webUrl);
            Thread.sleep(500);
            webDriver.navigate().refresh();
            waitForPageLoad(webDriver);

            // 2. Capture screenshot + generate QR code for the link
            byte[] screenshotBytes = ((TakesScreenshot) webDriver).getScreenshotAs(OutputType.BYTES);
            BufferedImage screenshot = ImageIO.read(new ByteArrayInputStream(screenshotBytes));
            BufferedImage qrImage = generateQRCode(webUrl, 200, 200);

            Graphics2D g = screenshot.createGraphics();

            // Anti-aliasing is recommended
            g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);

            // Place the QR code in the lower-right corner
            int x = screenshot.getWidth() - qrImage.getWidth() - 20;
            int y = screenshot.getHeight() - qrImage.getHeight() - 20;

            g.drawImage(qrImage, x, y, null);

            // Optional: draw a prompt label
            g.setFont(new Font("Arial", Font.BOLD, 18));
            g.setColor(Color.BLACK);
            g.drawString("Scan to visit the original page", x, y - 10);

            g.dispose();

            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            ImageIO.write(screenshot, "png", baos);
            byte[] finalBytes = baos.toByteArray();

            // 3. Convert byte[] into MultipartFile
            MultipartFile multipartFile = new ByteArrayMultipartFile(
                    "screenshot.png",
                    "screenshot.png",
                    "image/png",
                    finalBytes
            );

            // 4. Upload to OSS (compressed)
            return ossUtil.uploadFileCompress(multipartFile, compressRate);

        } catch (Exception e) {
            log.error("Failed to upload webpage screenshot to OSS: {}", webUrl, e);
            return null;
        } finally {
            // Clean up leftover Chrome / Chromedriver processes
            // If they are not cleaned up, later requests may fail
            try {
                String os = System.getProperty("os.name").toLowerCase();
                if (os.contains("mac") || os.contains("linux")) {
                    Runtime.getRuntime().exec("pkill -f chromedriver");
                    Runtime.getRuntime().exec("pkill -f Chrome");
                } else if (os.contains("win")) {
                    Runtime.getRuntime().exec("taskkill /F /IM chromedriver.exe /T");
                    Runtime.getRuntime().exec("taskkill /F /IM chrome.exe /T");
                }
                log.info("Cleaned up leftover Chrome/Chromedriver processes");
            } catch (Exception ex) {
                log.warn("Failed to clean up leftover Chrome/Chromedriver processes", ex);
            }
        }
    }

    // Generate QR code
    public static BufferedImage generateQRCode(String text, int width, int height) throws Exception {
        QRCodeWriter writer = new QRCodeWriter();
        BitMatrix matrix = writer.encode(text, BarcodeFormat.QR_CODE, width, height);

        return MatrixToImageWriter.toBufferedImage(matrix);
    }

    /**
     * Generate a webpage screenshot and save it locally
     *
     * @param webUrl webpage URL
     * @return path to the compressed screenshot file, or null if failed
     */
    public static String saveWebPageScreenshot(String webUrl) {
        if (StrUtil.isBlank(webUrl)) {
            log.error("Webpage URL must not be empty");
            return null;
        }

        try {
            // 1. Create a temporary directory
            String rootPath = System.getProperty("user.dir") + File.separator + "tmp" + File.separator + "screenshots"
                    + File.separator + UUID.randomUUID().toString().substring(0, 8);
            FileUtil.mkdir(rootPath);

            // 2. Path for the original screenshot
            final String IMAGE_SUFFIX = ".png";
            String imageSavePath = rootPath + File.separator + RandomUtil.randomNumbers(5) + IMAGE_SUFFIX;

            // 3. Open the page and inject the token
            webDriver.get("http://localhost:5173/login");

            JavascriptExecutor js = (JavascriptExecutor) webDriver;
            String token = "xxxxx"
            js.executeScript("window.localStorage.setItem('snail_token', arguments[0]);", token);
            webDriver.get(webUrl);
            Thread.sleep(500);
            webDriver.navigate().refresh();
            waitForPageLoad(webDriver);

            // 4. Capture the screenshot and save it locally
            byte[] screenshotBytes = ((TakesScreenshot) webDriver).getScreenshotAs(OutputType.BYTES);
            saveImage(screenshotBytes, imageSavePath);

            // 5. Compress the image
            final String COMPRESSION_SUFFIX = "_compressed.jpg";
            String compressedImagePath = rootPath + File.separator + RandomUtil.randomNumbers(5) + COMPRESSION_SUFFIX;
            compressImage(imageSavePath, compressedImagePath);

            // 7. Delete local temporary files
            FileUtil.del(imageSavePath);
            FileUtil.del(compressedImagePath);

            return compressedImagePath;

        } catch (Exception e) {
            log.error("Failed to upload webpage screenshot to OSS: {}", webUrl, e);
            return null;
        }
    }

    /**
     * Save image bytes to a file
     */
    private static void saveImage(byte[] imageBytes, String imagePath) {
        try {
            FileUtil.writeBytes(imageBytes, imagePath);
        } catch (Exception e) {
            log.error("Failed to save image: {}", imagePath, e);
            throw new BusinessException(ErrorCode.SYSTEM_ERROR, "Failed to save image");
        }
    }

    /**
     * Compress an image
     */
    private static void compressImage(String originalImagePath, String compressedImagePath) {
        // Image quality during compression (0.1 = 10% quality)
        final float COMPRESSION_QUALITY = 1f;
        try {
            ImgUtil.compress(
                    FileUtil.file(originalImagePath),
                    FileUtil.file(compressedImagePath),
                    COMPRESSION_QUALITY
            );
        } catch (Exception e) {
            log.error("Failed to compress image: {} -> {}", originalImagePath, compressedImagePath, e);
            throw new BusinessException(ErrorCode.SYSTEM_ERROR, "Failed to compress image");
        }
    }

    /**
     * Wait until the page is fully loaded
     */
    private static void waitForPageLoad(WebDriver driver) {
        try {
            // Create a page-load wait object
            WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(10));
            // Wait until document.readyState becomes complete
            wait.until(webDriver ->
                    ((JavascriptExecutor) webDriver).executeScript("return document.readyState")
                            .equals("complete")
            );
            // Wait a little longer to ensure dynamic content is finished loading
            Thread.sleep(2000);
            log.info("Page load completed");
        } catch (Exception e) {
            log.error("Exception while waiting for page load; continuing with screenshot", e);
        }
    }

    /**
     * Initialize the Chrome browser driver
     */
    private static WebDriver initChromeDriver(int width, int height) {
        try {

            // Automatically manage ChromeDriver
            WebDriverManager.chromedriver().setup();
            // Configure Chrome options
            ChromeOptions options = new ChromeOptions();
            // Headless mode
            options.addArguments("--headless");
            // Disable GPU (helps avoid issues in some environments)
            options.addArguments("--disable-gpu");
            // Disable sandbox mode (needed in Docker)
            options.addArguments("--no-sandbox");
            // Disable dev shm usage
            options.addArguments("--disable-dev-shm-usage");
            // Set window size
            options.addArguments(String.format("--window-size=%d,%d", width, height));
            // Disable extensions
            options.addArguments("--disable-extensions");
            // Allow cross-origin access
            options.addArguments("--disable-web-security");
            options.addArguments("--allow-running-insecure-content");
            // Set user agent
            options.addArguments("--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36");
            // Create the driver
            WebDriver driver = new ChromeDriver(options);
            // Set page-load timeout
            driver.manage().timeouts().pageLoadTimeout(Duration.ofSeconds(30));
            // Set implicit wait
            driver.manage().timeouts().implicitlyWait(Duration.ofSeconds(10));

            return driver;
        } catch (Exception e) {
            log.error("Failed to initialize Chrome browser", e);
            throw new BusinessException(ErrorCode.SYSTEM_ERROR, "Failed to initialize Chrome browser");
        }
    }
}
```

#### 2.3 Alibaba Cloud config class

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

### 3. Request example

```Java
  /**
     * User generates a share link
     */
    @Operation(summary = "User generates a share link")
    @GetMapping("/share")
    public BaseResponse<?> share(@RequestParam String url, HttpServletRequest request) {
        try {
            // 1. Get the Bearer token from the request header
            String authHeader = request.getHeader("Authorization");
            if (StrUtil.isBlank(authHeader) || !authHeader.startsWith("Bearer ")) {
                return ResultUtils.error(ErrorCode.SYSTEM_ERROR,"Authorization must not be empty and must have the correct format");
            }
            String token = authHeader.substring(7); // Remove "Bearer "

            // 2. Generate a webpage screenshot and upload it to OSS
            // Assume OssUtil has been injected into the Controller
            float compressRate = 0.9f; // Compression ratio, adjustable
            String screenshotUrl = WebScreenshotUtils.saveWebPageScreenshotToOSS(url, token, ossUtil, compressRate);

            if (screenshotUrl == null) {
                return ResultUtils.error(ErrorCode.SYSTEM_ERROR,"Failed to generate webpage screenshot");
            }

            // 3. Return the OSS link to the frontend
            return ResultUtils.success(screenshotUrl);

        } catch (Exception e) {
            throw new BusinessException(ErrorCode.SYSTEM_ERROR, "Failed to generate user share link");
        }
    }

```
