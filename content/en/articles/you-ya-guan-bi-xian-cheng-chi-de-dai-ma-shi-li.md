---
title: Code Example for Gracefully Shutting Down a Thread Pool
summary: This code first calls shutdown, waits up to one minute, then forces shutdownNow if needed, while restoring the interrupt flag correctly.
author: evan
category: learning
tags: [Learning]
createdAt: 2025-11-10 13:56:28
updatedAt: 2025-11-10 13:56:28
readingMinutes: 3
---
# Code Example for Gracefully Shutting Down a Thread Pool

### Thread Pool Shutdown Code Example

```Java
threadPool.shutdown(); // Refuse new tasks, but continue executing already submitted tasks, including running tasks and queued tasks.
try {
   if (!threadPool.awaitTermination(60, TimeUnit.SECONDS)) { // Let the current thread (usually the main thread) wait up to 60 seconds for the thread pool to finish all tasks.
       threadPool.shutdownNow(); // If the thread pool still has not terminated after 60 seconds, force it to shut down immediately.
   }
} catch (InterruptedException e) { // If the current thread is interrupted while waiting (for example, during program exit or a manual interrupt), then:
   threadPool.shutdownNow(); // Immediately call shutdownNow() to force the thread pool to close;
   Thread.currentThread().interrupt(); // Restore the interrupt flag
}
```

**This code is like saying to the thread pool:**

"Wrap things up nicely first (`shutdown`), and I will wait for one minute (`awaitTermination`).
If you still do not stop, then I have to pull the power (`shutdownNow`)."

### Extra

Let us talk carefully about what `Thread.currentThread().interrupt();` actually does and why it is written this way.

One-sentence summary:

**"Restore the interrupt flag" = tell the outer logic that this thread was interrupted just now, and do not pretend everything is normal.**

In Java, an interrupt does not forcibly kill a thread.

It is more like saying: "I sent you a signal; now you decide how to handle it."

In other words, when a thread is interrupted, its state is marked as `interrupted = true`. But the thread does not automatically stop unless it checks that flag and decides to exit on its own.

When `InterruptedException` is thrown, the JVM automatically clears the interrupt flag.

So the purpose of `Thread.currentThread().interrupt();` is to set the interrupt flag back again.

-- "I caught `InterruptedException`, but I do not want to swallow that interrupt. I want to pass the signal upward again so the outer logic knows I was interrupted."
