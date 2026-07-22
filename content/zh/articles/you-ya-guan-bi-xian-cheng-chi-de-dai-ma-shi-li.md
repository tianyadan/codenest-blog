---
title: 优雅关闭线程池的代码示例
summary: 这段代码就像对线程池说： “你先好好收尾（shutdown），我等你一分钟（awaitTermination）。 如果你还不走，那我只能强制拉闸断电（sh...
author: evan
category: learning
tags: [学习]
createdAt: 2025-11-10 13:56:28
updatedAt: 2025-11-10 13:56:28
readingMinutes: 3
---
# 优雅关闭线程池的代码示例

### 关闭线程池代码示例：

```Java
threadPool.shutdown(); // 拒绝接收新的任务，但会继续执行已提交的任务（包括正在执行和队列中等待的任务）。
try {
   if (!threadPool.awaitTermination(60, TimeUnit.SECONDS)) { //当前线程（通常是主线程）等待线程池在 60 秒内执行完所有任务。
       threadPool.shutdownNow(); // 如果在等待 60 秒后线程池仍未终止，就强制立即关闭。
   }
} catch (InterruptedException e) { // 如果当前线程在等待期间被打断（例如程序退出或手动中断），那就：
   threadPool.shutdownNow(); // 立即调用 shutdownNow() 强制关闭线程池；
   Thread.currentThread().interrupt(); // 再次设置中断标志位
}
```

**这段代码就像对线程池说：**

“你先好好收尾（shutdown），我等你一分钟（awaitTermination）。
如果你还不走，那我只能强制拉闸断电（shutdownNow）了。”

### 扩展：

仔细讲讲——Thread.currentThread().interrupt(); 这一行到底干了什么、为什么这么写。

总结一句话：

**“再次设置中断标志位” = 告诉外层逻辑：这个线程刚才被中断过，不要假装一切正常。**

在 Java 里，「中断」不是强制杀死线程。

它更像是：“我给你发了一个信号，你自己看着办。”

也就是说，当一个线程被“中断”时，它的状态会被标记为 interrupted = true。但是！线程不会自动停下来，除非它自己去检查这个标志并决定退出。 

InterruptedException 抛出时，JVM 会自动清除中断标志！

所以 `Thread.currentThread().interrupt();`这行代码的意义是：就是重新把中断标志“补回来”！ 

-- “我捕获到了 InterruptedException，但我不打算吞掉这个中断。我要把这个信号重新传递出去，让上层逻辑知道我被中断过。”
