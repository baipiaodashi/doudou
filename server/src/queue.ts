import crypto from 'crypto';

interface QueueTask<T> {
  id: string;
  fn: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: any) => void;
  addedAt: number;
}

// 针对弱性能 VPS 的排队与缓冲并发限制器
export class TaskQueue {
  private maxConcurrency: number;
  private runningCount: number = 0;
  private queue: QueueTask<any>[] = [];
  private taskTimeoutMs: number;

  constructor(maxConcurrency: number = 1, taskTimeoutMs: number = 60000) {
    this.maxConcurrency = maxConcurrency;
    this.taskTimeoutMs = taskTimeoutMs;
  }

  get queueLength(): number {
    return this.queue.length;
  }

  get running(): number {
    return this.runningCount;
  }

  // 提交任务进入队列
  enqueue<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const task: QueueTask<T> = {
        id: crypto.randomUUID(),
        fn,
        resolve,
        reject,
        addedAt: Date.now()
      };

      this.queue.push(task);
      this.processNext();
    });
  }

  private async processNext() {
    if (this.runningCount >= this.maxConcurrency || this.queue.length === 0) {
      return;
    }

    const task = this.queue.shift();
    if (!task) return;

    // 检查等待是否已超时
    if (Date.now() - task.addedAt > this.taskTimeoutMs) {
      task.reject(new Error('VPS 排队等待超时，请稍后重试或尝试本地渲染模式'));
      this.processNext();
      return;
    }

    this.runningCount++;

    // 针对弱性能 VPS，给主事件循环让出微任务缓冲间隙 (20ms)，避免单核 CPU 饥饿
    await new Promise(r => setTimeout(r, 20));

    let timer: NodeJS.Timeout | null = null;
    const timeoutPromise = new Promise((_, reject) => {
      timer = setTimeout(() => {
        reject(new Error('VPS 渲染计算超时 (超过 60s)'));
      }, this.taskTimeoutMs);
    });

    try {
      const result = await Promise.race([task.fn(), timeoutPromise]);
      if (timer) clearTimeout(timer);
      task.resolve(result);
    } catch (err) {
      if (timer) clearTimeout(timer);
      task.reject(err);
    } finally {
      this.runningCount--;
      // 处理下一个任务
      setImmediate(() => this.processNext());
    }
  }
}

// 轻量级基于内存与 Hash 的 LRU 缓存，保护弱 VPS 算力
export class MemoryCache<T> {
  private cache = new Map<string, { value: T; time: number }>();
  private maxItems: number;
  private ttlMs: number;

  constructor(maxItems: number = 50, ttlMs: number = 1000 * 60 * 30) {
    this.maxItems = maxItems;
    this.ttlMs = ttlMs;
  }

  static generateKey(...args: any[]): string {
    const hash = crypto.createHash('md5');
    for (const arg of args) {
      if (Buffer.isBuffer(arg)) {
        hash.update(arg);
      } else if (typeof arg === 'object') {
        hash.update(JSON.stringify(arg));
      } else {
        hash.update(String(arg));
      }
    }
    return hash.digest('hex');
  }

  get(key: string): T | undefined {
    const item = this.cache.get(key);
    if (!item) return undefined;
    if (Date.now() - item.time > this.ttlMs) {
      this.cache.delete(key);
      return undefined;
    }
    // 刷新访问顺序
    this.cache.delete(key);
    this.cache.set(key, { value: item.value, time: Date.now() });
    return item.value;
  }

  set(key: string, value: T): void {
    if (this.cache.size >= this.maxItems) {
      // 淘汰最老的一项
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) this.cache.delete(oldestKey);
    }
    this.cache.set(key, { value, time: Date.now() });
  }
}
