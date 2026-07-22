---
title: Use Nacos to Implement Dynamic IP Blacklist Filtering
summary: "When malicious users hammer your server with DDoS traffic, crawlers, or probing requests, you need a way to block them in real time. This article shows how to store an IP blacklist in Nacos and refresh it dynamically in a filter."
author: evan
category: learning
tags: [Learning, Nacos]
createdAt: 2025-09-08 09:22:44
updatedAt: 2025-09-08 09:22:44
readingMinutes: 16
---
# Use Nacos to Implement Dynamic IP Blacklist Filtering

## Main Text

**Requirement analysis:**

- Malicious users may repeatedly access server resources through DDoS traffic, crawlers, or hacking attempts, causing high resource consumption. We need a way to block them in real time and reduce attack risk. By banning IPs, we can effectively blacklist attackers, prevent resource abuse, and ultimately deny blacklisted IPs from accessing any API.

**Solution design**

1. Where should the IP blacklist be stored?
   - The most efficient storage is usually **in memory**, but if you need **persistence**, you should consider a database or file storage.
2. How can the IP blacklist be modified dynamically and conveniently?
   - You need a UI or management entry for CRUD operations. A **configuration center such as Nacos** works well here.
3. Where should whitelist/blacklist checks be handled?
   - A high-performance gateway or CDN can intercept illegal requests earlier and reduce backend pressure. Here, we handle it in a filter.
4. What structure should be used to store the blacklist, and how can matching stay efficient?
   - Use a set for smaller scale scenarios. For larger scale scenarios, use a **Bloom filter** to save memory and improve lookup efficiency.

What is a Bloom filter?
Link:

**Hands-on implementation:**

**1. Download Nacos Server from GitHub.**

Search for Nacos on GitHub, sort by stars from highest to lowest, and choose the main repository. Open Releases, review the historical versions, and pick one that matches your current Spring Boot version. If you are unsure about version compatibility, you can ask an AI assistant. **One important note: on Apple Silicon Macs, you should use version 2.4.3 or later. Earlier versions are built for x86, while Apple Silicon uses ARM and is not compatible.**

**2. Start it from the command line**

**mac/Linux:**

```bash
sh startup.sh -m standalone
```

**Windows:**

```bash
startup.cmd -m standalone
```

For standalone deployment, use the `-m standalone` parameter.

**3. Add configuration through the Nacos console**

Open the console at: http://localhost:8848/nacos. The default username and password are both `nacos`.

- Open the Configuration Management menu
- Select Configuration List
- Click Create Configuration
- YAML format is recommended
- Fill in the Data ID (it must match the Nacos configuration in `application.yaml`)
- The Group can stay as `DEFAULT_GROUP`
- Set the configuration format to YAML

Configuration content:

```yaml
blackIpList:
  - "1.1.1.1"
  - "2.2.2.2"
```

**4. Add the Nacos dependency to the project**

```xml
<dependency>
    <groupId>com.alibaba.boot</groupId>
    <artifactId>nacos-config-spring-boot-starter</artifactId>
    <version>0.2.12</version>
</dependency>
```

Update your YAML configuration and add the following:

```yaml
# Config center
nacos:
  config:
    server-addr: 127.0.0.1:8848  # Nacos address
    bootstrap:
      enable: true  # Preload
    data-id: mianshiya # Data ID configured in the console
    group: DEFAULT_GROUP # Group configured in the console
    type: yaml  # Selected file format
    auto-refresh: true # Enable automatic refresh
```

**5. Create a subpackage under your project package path (for example, `blackfilter`)**

**5.1 Create the `BlackIpUtils` utility class**

```java
import cn.hutool.bloomfilter.BitMapBloomFilter;
import cn.hutool.core.collection.CollectionUtil;
import cn.hutool.core.util.StrUtil;
import lombok.extern.slf4j.Slf4j;
import org.yaml.snakeyaml.Yaml;

import java.util.List;
import java.util.Map;

// Load the blacklist from Nacos
@Slf4j
public class BlackIpUtils {

    private static BitMapBloomFilter bloomFilter;

    // Check whether the IP is in the blacklist
    public static boolean isBlackIp(String ip) {
        return bloomFilter.contains(ip);
    }

    // Rebuild the IP blacklist
    public static void rebuildBlackIp(String configInfo) {
        if (StrUtil.isBlank(configInfo)) {
            configInfo = "{}";
        }
        // Parse the YAML file
        Yaml yaml = new Yaml();
        Map map = yaml.loadAs(configInfo, Map.class);
        // Get the IP blacklist
        List<String> blackIpList = (List<String>) map.get("blackIpList");
        // Lock to avoid concurrency issues
        synchronized (BlackIpUtils.class) {
            if (CollectionUtil.isNotEmpty(blackIpList)) {
                // Pay attention to the constructor argument size
                BitMapBloomFilter bitMapBloomFilter = new BitMapBloomFilter(1000);
                for (String ip : blackIpList) {
                    bitMapBloomFilter.add(ip);
                }
                bloomFilter = bitMapBloomFilter;
            } else {
                bloomFilter = new BitMapBloomFilter(100);
            }
        }
    }
}
```

**5.2 Create a `NacosListener` class to listen for Nacos configuration changes**

```java
import com.alibaba.nacos.api.annotation.NacosInjected;
import com.alibaba.nacos.api.config.ConfigService;
import com.alibaba.nacos.api.config.listener.Listener;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.InitializingBean;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.validation.constraints.NotNull;
import java.util.concurrent.Executor;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.ThreadFactory;
import java.util.concurrent.atomic.AtomicInteger;

// Listen for dynamic blacklist changes
@Slf4j
@Component
public class NacosListener implements InitializingBean {

    @NacosInjected
    private ConfigService configService;

    @Value("${nacos.config.data-id}")
    private String dataId;

    @Value("${nacos.config.group}")
    private String group;

    @Override
    public void afterPropertiesSet() throws Exception {
        log.info("Nacos listener started");

        String config = configService.getConfigAndSignListener(dataId, group, 3000L, new Listener() {
            final ThreadFactory threadFactory = new ThreadFactory() {
                private final AtomicInteger poolNumber = new AtomicInteger(1);

                @Override
                public Thread newThread(@NotNull Runnable r) {
                    Thread thread = new Thread(r);
                    thread.setName("refresh-ThreadPool" + poolNumber.getAndIncrement());
                    return thread;
                }
            };
            final ExecutorService executorService = Executors.newFixedThreadPool(1, threadFactory);

            // Process blacklist change logic asynchronously through a thread pool
            @Override
            public Executor getExecutor() {
                return executorService;
            }

            // Listen for subsequent blacklist changes
            @Override
            public void receiveConfigInfo(String configInfo) {
                log.info("Configuration change detected: {}", configInfo);
                BlackIpUtils.rebuildBlackIp(configInfo);
            }
        });
        // Initialize the blacklist
        BlackIpUtils.rebuildBlackIp(config);
    }
}
```

**5.3 Create a Servlet filter to block blacklisted IPs: `BlackIpFilter`**

```java
import com.thw.dabaie.utils.NetUtils;

import javax.servlet.*;
import javax.servlet.annotation.WebFilter;
import javax.servlet.http.HttpServletRequest;
import java.io.IOException;

@WebFilter(urlPatterns = "/*", filterName = "blackIpFilter")
public class BlackIpFilter implements Filter {

    @Override
    public void doFilter(ServletRequest servletRequest, ServletResponse servletResponse, FilterChain filterChain) throws IOException, ServletException {

        String ipAddress = NetUtils.getIpAddress((HttpServletRequest) servletRequest);
        if (BlackIpUtils.isBlackIp(ipAddress)) {
            servletResponse.setContentType("text/json;charset=UTF-8");
            servletResponse.getWriter().write("{\"errorCode\":\"-1\",\"errorMsg\":\"Blacklisted IP, access denied\"}");
            return;
        }
        filterChain.doFilter(servletRequest, servletResponse);
    }
}
```

Start the project and test it. For local testing, the address is usually `0:0:0:0:0:0:0:1`. Add that address in Nacos and you can block all local requests to verify the blacklist filtering effect.
