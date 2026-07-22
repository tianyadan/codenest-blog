---
title: 使用 nacos 实现动态 IP 黑名单过滤
summary: 🌟需求分析： 恶意用户频繁访问（DDOS、爬虫、黑客）频繁请求服务器资源，导致资源占用率过高，需要一定手段实时阻止恶意用户、减少攻击风险。通过 IP 封禁...
author: evan
category: learning
tags: [学习, Nacos]
createdAt: 2025-09-08 09:22:44
updatedAt: 2025-09-08 09:22:44
readingMinutes: 16
---
# 使用 nacos 实现动态 IP 黑名单过滤

## 正文

**🌟需求分析：**
-  恶意用户频繁访问（DDOS、爬虫、黑客）频繁请求服务器资源，导致资源占用率过高，需要一定手段实时阻止恶意用户、减少攻击风险。通过 IP 封禁，可以有效拉黑攻击者、防止资源滥用。最终实现被拉黑的 IP 禁止访问任何接口。

**📎方案设计**

1. IP 黑名单存储在哪里？
    - 最高效的存储往往是**基于内存**，但要实现**持久化**就要考虑数据库存储或者文件存储。
2. 如何便捷的动态修改 IP 黑名单？
    - 要有增删改查接口的前端页面，可以考虑**配置中心 nacos**
3. 黑白名单的判断逻辑应该在哪里处理？
    - 可以考虑高性能网关或 CDN、能更早地拦截非法请求、减少后端压力，在这里考虑用过滤器中处理。
4. 使用什么结构保存黑名单？如何快速匹配？
    - 少规模使用 set、大规模使用**布隆过滤器**，节约内存、提高检索效率

什么是布隆过滤器？
链接：

**🤛🏻实操：**

**1. 去 github 下载 Nacos Server。**
github 搜索 Nacos，按照 star 数量由高向低排序。选择最多的，基本就是。 找到 release，查看历史版本，选择与当前 SpringBoot 适配的版本，版本选择可以去问 AI。**值得注意的是 Mac M 芯片要从 2.4.3 版本开始使用，之前的版本都是 x86 的架构，M 芯片都是 arm 架构，不适配。**

**2. 命令启动**

        **mac/Linux**：

        sh startup.sh -m standalone

        **Windows：**

        startup.cmd -m standalone

 单机部署使用-m standalone 参数。
 
 
**3. 通过 Nacos 控制台添加配置**
 
 访问控制台:http://localhost:8848/nacos, 默认用户名和密码都是：nacos。
 
-  进入配置管理菜单栏
-  选择配置列表
-  点击创建配置
-  推荐使用 yaml 格式
-  填写 DataID（此处要与 application.yaml 文件naocs 配置保持一致）
-  Group 默认为 default group。
-  配置格式选择 yaml

配置内容:

```
 blackIpList:
 - "1.1.1.1"
 - "2.2.2.2" 
```

**4.  项目引入 Nacos 依赖**

```
<dependency>
    <groupId>com.alibaba.boot</groupId>
    <artifactId>nacos-config-spring-boot-starter</artifactId>
    <version>0.2.12</version>
</dependency>
```

修改 yaml 配置，添加如下：

```# 配置中心
nacos:
  config:
    server-addr: 127.0.0.1:8848  # nacos 地址
    bootstrap:
      enable: true  # 预加载
    data-id: mianshiya # 控制台填写的 Data ID
    group: DEFAULT_GROUP # 控制台填写的 group
    type: yaml  # 选择的文件格式
    auto-refresh: true # 开启自动刷新
```

**5. 在项目包路径下创建一个子包（blackfilter）**

 **5.1  创建BlackIpUtils工具类**
   
   
```
import cn.hutool.bloomfilter.BitMapBloomFilter;
import cn.hutool.core.collection.CollectionUtil;
import cn.hutool.core.util.StrUtil;
import lombok.extern.slf4j.Slf4j;
import org.yaml.snakeyaml.Yaml;

import java.util.List;
import java.util.Map;
// 从 nacos 中获取黑名单
@Slf4j
public class BlackIpUtils {

    private static BitMapBloomFilter bloomFilter;

    // 判断 ip 是否在黑名单内
    public static boolean isBlackIp(String ip) {
        return bloomFilter.contains(ip);
    }

    // 重建 ip 黑名单
    public static void rebuildBlackIp(String configInfo) {
        if (StrUtil.isBlank(configInfo)) {
            configInfo = "{}";
        }
        // 解析 yaml 文件
        Yaml yaml = new Yaml();
        Map map = yaml.loadAs(configInfo, Map.class);
        // 获取 ip 黑名单
        List<String> blackIpList = (List<String>) map.get("blackIpList");
        // 加锁防止并发
        synchronized (BlackIpUtils.class) {
            if (CollectionUtil.isNotEmpty(blackIpList)) {
                // 注意构造参数的设置
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

**5.2 创建NacosListener监听 Nacos 配置类**

```
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

// 用于监听动态变化的黑名单
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
        log.info("nacos 监听器启动");

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

            // 通过线程池异步处理黑名单变化的逻辑
            @Override
            public Executor getExecutor() {
                return executorService;
            }

            // 监听后续黑名单变化
            @Override
            public void receiveConfigInfo(String configInfo) {
                log.info("监听到配置信息变化：{}", configInfo);
                BlackIpUtils.rebuildBlackIp(configInfo);
            }
        });
        // 初始化黑名单
        BlackIpUtils.rebuildBlackIp(config);
    }
}
```

**5.3 创建Servlet 过滤器，用于过滤 IP 黑名单：BlackIpFilter**

```
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
            servletResponse.getWriter().write("{\"errorCode\":\"-1\",\"errorMsg\":\"黑名单IP，禁止访问\"}");
            return;
        }
        filterChain.doFilter(servletRequest, servletResponse);
    }
}
```

启动项目测试结果即可，本地测试地址是：`0:0:0:0:0:0:0:1` ，在Nacos 中添加此地址即可拦截本地所有请求，实现黑名单过滤效果。
