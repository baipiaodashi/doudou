import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { TaskQueue, MemoryCache } from './queue.js';
import { quantizeImageServer } from './quantize.js';
import { renderPatternImageServer } from './exportPattern.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;

// 针对弱性能 VPS 的保护机制：限制并发处理任务数（默认单核 1，避免 CPU 100% 占满假死）
const MAX_CONCURRENT = process.env.MAX_CONCURRENT_TASKS ? parseInt(process.env.MAX_CONCURRENT_TASKS, 10) : 1;
const queue = new TaskQueue(MAX_CONCURRENT);

// LRU 内存缓存，避免重复计算相同图片与相同参数
const quantizeCache = new MemoryCache<any>(50, 30 * 60 * 1000);
const exportCache = new MemoryCache<Buffer>(30, 30 * 60 * 1000);

// 中间件配置
app.use(cors());
// 提高 JSON 解析上限以接收 Base64 原始大图
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// 1. 健康检查与状态汇报接口
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    vpsMode: true,
    concurrencyLimit: MAX_CONCURRENT,
    runningTasks: queue.running,
    queuedTasks: queue.queueLength,
    timestamp: Date.now()
  });
});

// 2. 图像量化与色卡比对接口
app.post('/api/quantize', async (req, res) => {
  try {
    const { imageBase64, options } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: 'Missing imageBase64 data' });
    }

    // 尝试查询缓存
    const cacheKey = MemoryCache.generateKey(imageBase64, options);
    const cached = quantizeCache.get(cacheKey);
    if (cached) {
      return res.json({
        cached: true,
        data: cached
      });
    }

    // 排队进入单核算力队列处理，保护弱机 VPS
    const result = await queue.enqueue(async () => {
      return await quantizeImageServer(imageBase64, options);
    });

    quantizeCache.set(cacheKey, result);

    res.json({
      cached: false,
      data: result,
      queueStatus: { running: queue.running, queued: queue.queueLength }
    });
  } catch (err: any) {
    console.error('[VPS Quantize Error]:', err);
    res.status(500).json({
      error: err.message || 'VPS 量化处理失败',
      queueStatus: { running: queue.running, queued: queue.queueLength }
    });
  }
});

// 3. 高清图纸与色号用料对照表渲染导出接口 (无头输出超大 PNG)
app.post('/api/render-export', async (req, res) => {
  try {
    const { result, options } = req.body;
    if (!result || !result.grid) {
      return res.status(400).json({ error: 'Missing pattern grid data' });
    }

    const cacheKey = MemoryCache.generateKey(result, options);
    const cachedPng = exportCache.get(cacheKey);
    if (cachedPng) {
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Content-Disposition', `attachment; filename="pixel_bead_${Date.now()}.png"`);
      return res.send(cachedPng);
    }

    // 排队进入 VPS Canvas 渲染流程
    const pngBuffer = await queue.enqueue(async () => {
      return await renderPatternImageServer(result, options);
    });

    exportCache.set(cacheKey, pngBuffer);

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', `attachment; filename="pixel_bead_${Date.now()}.png"`);
    res.send(pngBuffer);
  } catch (err: any) {
    console.error('[VPS Render Export Error]:', err);
    res.status(500).json({
      error: err.message || 'VPS 高清渲染失败',
      queueStatus: { running: queue.running, queued: queue.queueLength }
    });
  }
});

// 4. 多路径自适应的静态资源托管 (单容器开箱即用)
const candidatePaths = [
  path.resolve(process.cwd(), 'dist'),
  path.resolve(__dirname, '../../dist'),
  path.resolve(__dirname, '../dist'),
  path.resolve('/app/dist')
];
const distPath = candidatePaths.find(p => fs.existsSync(p));
if (distPath) {
  console.log(`[Static] Serving frontend static assets from: ${distPath}`);
  app.use(express.static(distPath, { maxAge: '1d' }));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`=================================================`);
  console.log(` 拼豆图纸工坊 VPS 渲染服务已启动`);
  console.log(` 监听端口: http://0.0.0.0:${PORT}`);
  console.log(` 单核并发保护数: ${MAX_CONCURRENT}`);
  console.log(`=================================================`);
});
