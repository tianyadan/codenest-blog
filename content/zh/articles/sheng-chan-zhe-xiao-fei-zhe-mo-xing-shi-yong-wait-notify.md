---
title: 生产者-消费者模型（使用 wait() / notify()）
summary: 生产者线程：往仓库里放商品。 消费者线程：从仓库里取商品。 仓库最多只能放 1 个商品（简化逻辑）。 如果仓库有货，消费者才能取；如果没有，消费者必须等待...
author: evan
category: learning
tags: [学习]
createdAt: 2025-11-08 10:11:08
updatedAt: 2025-11-08 10:11:08
readingMinutes: 5
---
# 生产者-消费者模型（使用 wait() / notify()）

## 经典生产者 - 消费者模型

生产者线程：往仓库里放商品。

消费者线程：从仓库里取商品。

仓库最多只能放 1 个商品（简化逻辑）。

如果仓库有货，消费者才能取；如果没有，消费者必须等待。

如果仓库满了，生产者必须等待。

```Java
public class ProducerConsumerExample {
    // 共享资源：仓库
    private static final Object lock = new Object();
    private static boolean hasProduct = false; // 仓库是否有商品

    public static void main(String[] args) {
        // 启动消费者线程
        Thread consumer = new Thread(() -> {
            try {
                synchronized (lock) {
                    // 消费者：如果没货，就等待
                    while (!hasProduct) {
                        System.out.println("消费者：仓库没货了，等生产者...");
                        lock.wait(); // 释放锁，进入等待
                    }
                    // 有货了，消费掉
                    System.out.println("消费者：拿到商品，正在消费...");
                    hasProduct = false;
                    lock.notify(); // 告诉生产者：仓库空了，你可以生产了
                }
            } catch (InterruptedException e) {
                e.printStackTrace();
            }
        });

        // 启动生产者线程
        Thread producer = new Thread(() -> {
            try {
                Thread.sleep(2000); // 模拟生产延迟（2秒后才生产）
                synchronized (lock) {
                    // 生产者：如果仓库有货，就等待（这里因为容量为1）
                    while (hasProduct) {
                        System.out.println("生产者：仓库满了，等消费者...");
                        lock.wait();
                    }
                    // 仓库空，开始生产
                    System.out.println("生产者：生产了一个商品！");
                    hasProduct = true;
                    lock.notify(); // 告诉消费者：有货了，快来拿！
                }
            } catch (InterruptedException e) {
                e.printStackTrace();
            }
        });

        consumer.start();
        producer.start();
    }
}
```

输出结果：

```
消费者：仓库没货了，等生产者...
（等待2秒...）
生产者：生产了一个商品！
消费者：拿到商品，正在消费...
```

> 注意：因为消费者先启动，发现没货，就调用 lock.wait() 等待；
> 2秒后，生产者启动，放入商品，并调用 lock.notify() 唤醒消费者；
> 消费者被唤醒后，重新检查条件（while (!hasProduct)），发现有货了，于是继续执行。
