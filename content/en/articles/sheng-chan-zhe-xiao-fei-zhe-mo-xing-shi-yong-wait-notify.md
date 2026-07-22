---
title: Producer-Consumer Model (Using wait() / notify())
summary: In this classic producer-consumer example, the producer puts items into a shared warehouse, the consumer takes them out, and wait() / notify() coordinate access when the warehouse can hold only one item.
author: evan
category: learning
tags: [Learning]
createdAt: 2025-11-08 10:11:08
updatedAt: 2025-11-08 10:11:08
readingMinutes: 5
---
# Producer-Consumer Model (Using wait() / notify())

## Classic producer-consumer model

The producer thread puts items into the warehouse.

The consumer thread takes items out of the warehouse.

The warehouse can hold only 1 item at most (to keep the logic simple).

If the warehouse has stock, the consumer can take it. If there is no stock, the consumer must wait.

If the warehouse is full, the producer must wait.

```java
public class ProducerConsumerExample {
    // Shared resource: warehouse
    private static final Object lock = new Object();
    private static boolean hasProduct = false; // Whether the warehouse currently has a product

    public static void main(String[] args) {
        // Start the consumer thread
        Thread consumer = new Thread(() -> {
            try {
                synchronized (lock) {
                    // Consumer: if there is no product, wait
                    while (!hasProduct) {
                        System.out.println("Consumer: warehouse is empty, waiting for producer...");
                        lock.wait(); // Release the lock and enter the waiting state
                    }
                    // A product is available, consume it
                    System.out.println("Consumer: got the product, consuming...");
                    hasProduct = false;
                    lock.notify(); // Tell the producer: the warehouse is empty, you can produce now
                }
            } catch (InterruptedException e) {
                e.printStackTrace();
            }
        });

        // Start the producer thread
        Thread producer = new Thread(() -> {
            try {
                Thread.sleep(2000); // Simulate production delay (produce after 2 seconds)
                synchronized (lock) {
                    // Producer: if the warehouse is full, wait (capacity is 1 here)
                    while (hasProduct) {
                        System.out.println("Producer: warehouse is full, waiting for consumer...");
                        lock.wait();
                    }
                    // The warehouse is empty, start producing
                    System.out.println("Producer: produced one item!");
                    hasProduct = true;
                    lock.notify(); // Tell the consumer: an item is available, come get it
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

Output:

```text
Consumer: warehouse is empty, waiting for producer...
(wait 2 seconds...)
Producer: produced one item!
Consumer: got the product, consuming...
```

> Note: because the consumer starts first, it sees that there is no product and calls `lock.wait()` to wait.
> Two seconds later, the producer starts, places a product into the warehouse, and calls `lock.notify()` to wake the consumer.
> After being awakened, the consumer checks the condition again (`while (!hasProduct)`), sees that a product is now available, and continues execution.
