import type { ProcessOptions, QuantizeResult } from '../utils/quantize';
import type { ExportOptions } from '../utils/exportPattern';

export interface VpsHealthInfo {
  status: string;
  vpsMode: boolean;
  concurrencyLimit: number;
  runningTasks: number;
  queuedTasks: number;
}

// 检查 VPS 渲染服务健康状态
export async function checkVpsHealth(timeoutMs: number = 3000): Promise<VpsHealthInfo | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch('/api/health', { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// 将 HTMLImageElement 转换为 base64 dataURL
export function imageElementToBase64(img: HTMLImageElement): string {
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Cannot get canvas 2d context');
  ctx.drawImage(img, 0, 0);
  return canvas.toDataURL('image/png');
}

// 请求 VPS 进行图纸量化与分析（带超时与可取消）
export async function requestVpsQuantize(
  imageEl: HTMLImageElement,
  options: ProcessOptions,
  signal?: AbortSignal
): Promise<QuantizeResult> {
  const base64 = imageElementToBase64(imageEl);

  const res = await fetch('/api/quantize', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      imageBase64: base64,
      options
    }),
    signal
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `VPS 量化请求失败 (HTTP ${res.status})`);
  }

  const json = await res.json();
  return json.data;
}

// 请求 VPS 进行服务端超高清图纸渲染导出
export async function requestVpsExport(
  result: QuantizeResult,
  options: ExportOptions,
  filename?: string
): Promise<void> {
  const res = await fetch('/api/render-export', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      result,
      options
    })
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `VPS 导出渲染失败 (HTTP ${res.status})`);
  }

  const blob = await res.blob();
  const downloadUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = filename || `拼豆图纸_${result.width}x${result.height}_${Date.now()}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
}
