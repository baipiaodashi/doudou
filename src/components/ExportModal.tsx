import React, { useState } from 'react';
import type { QuantizeResult } from '../utils/quantize';
import { generatePatternCanvas } from '../utils/exportPattern';
import type { ExportOptions } from '../utils/exportPattern';
import { requestVpsExport } from '../services/vpsService';
import { Download, X, Image as ImageIcon, Server, Laptop, Loader2 } from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: QuantizeResult;
  pegboardWidth: number;
  pegboardHeight: number;
  vpsAvailable?: boolean;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  result,
  pegboardWidth,
  pegboardHeight,
  vpsAvailable = true
}) => {
  const [options, setOptions] = useState<ExportOptions>({
    cellSize: 28,
    showGrid: true,
    showLabels: true,
    showRuler: true,
    showLegend: true,
    showPegboardSeams: true,
    pegboardWidth,
    pegboardHeight,
    style: 'bead',
    title: '拼豆图纸工坊 - 高清制作图纸'
  });

  const [useVps, setUseVps] = useState<boolean>(vpsAvailable);
  const [downloading, setDownloading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>('');

  if (!isOpen) return null;

  const handleExportHiRes = async () => {
    setDownloading(true);

    if (useVps) {
      try {
        setStatusMessage('VPS 算力队列缓冲中，正在生成打印级图纸...');
        await requestVpsExport(result, {
          ...options,
          pegboardWidth,
          pegboardHeight
        });
      } catch (err: any) {
        console.warn('VPS 导出失败，自动尝试降级为本地浏览器渲染', err);
        setStatusMessage('VPS 队列拥堵，正在自动切换为本地渲染...');
        // 自动降级本地
        try {
          const canvas = generatePatternCanvas(result, {
            ...options,
            pegboardWidth,
            pegboardHeight
          });
          const link = document.createElement('a');
          link.download = `拼豆图纸_${result.width}x${result.height}_单板${pegboardWidth}x${pegboardHeight}_${Date.now()}.png`;
          link.href = canvas.toDataURL('image/png');
          link.click();
        } catch {
          alert('导出图纸失败，请尝试调小分辨率！');
        }
      } finally {
        setDownloading(false);
        setStatusMessage('');
      }
    } else {
      setStatusMessage('正在本地浏览器渲染...');
      setTimeout(() => {
        try {
          const canvas = generatePatternCanvas(result, {
            ...options,
            pegboardWidth,
            pegboardHeight
          });
          const link = document.createElement('a');
          link.download = `拼豆图纸_${result.width}x${result.height}_单板${pegboardWidth}x${pegboardHeight}_${Date.now()}.png`;
          link.href = canvas.toDataURL('image/png');
          link.click();
        } catch (err) {
          console.error('Local export failed', err);
          alert('本地导出图纸内存不足或超限，请尝试切换为 VPS 渲染或调小分辨率！');
        } finally {
          setDownloading(false);
          setStatusMessage('');
        }
      }, 50);
    }
  };

  const handleExportPixel = () => {
    const canvas = document.createElement('canvas');
    canvas.width = result.width;
    canvas.height = result.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    for (let y = 0; y < result.height; y++) {
      for (let x = 0; x < result.width; x++) {
        const bead = result.grid[y][x];
        if (bead) {
          ctx.fillStyle = bead.hex;
          ctx.fillRect(x, y, 1, 1);
        }
      }
    }

    const link = document.createElement('a');
    link.download = `像素图_1x1_${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-5 py-3.5 sm:px-6 sm:py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Download size={18} />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-slate-800">导出制作图纸</h3>
              <p className="text-[10px] sm:text-[11px] text-slate-400">支持服务端高清输出与本地多模式选择</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content (Scrollable) */}
        <div className="p-4 sm:p-6 space-y-4 text-xs text-slate-600 overflow-y-auto flex-1">
          {/* 渲染节点选择 */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
            <label className="font-semibold text-slate-700 block mb-2">生图渲染引擎节点</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setUseVps(true)}
                className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-left transition cursor-pointer ${
                  useVps
                    ? 'border-indigo-600 bg-indigo-50/60 text-indigo-900 shadow-xs'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className={`p-1.5 rounded-md shrink-0 ${useVps ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                  <Server size={14} />
                </div>
                <div>
                  <div className="font-bold flex items-center gap-1">
                    <span>VPS 云端渲染</span>
                    <span className="text-[10px] bg-green-100 text-green-700 px-1 py-0.2 rounded font-normal">推荐</span>
                  </div>
                  <div className="text-[10px] text-slate-400">由服务器排版，手机/低配不崩溃</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setUseVps(false)}
                className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-left transition cursor-pointer ${
                  !useVps
                    ? 'border-indigo-600 bg-indigo-50/60 text-indigo-900 shadow-xs'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className={`p-1.5 rounded-md shrink-0 ${!useVps ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                  <Laptop size={14} />
                </div>
                <div>
                  <div className="font-bold">本地访客设备</div>
                  <div className="text-[10px] text-slate-400">浏览器离线绘制，图纸过大易闪退</div>
                </div>
              </button>
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1.5">图纸标题</label>
            <input
              type="text"
              value={options.title}
              onChange={e => setOptions({ ...options, title: e.target.value })}
              className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="font-semibold text-slate-700 block mb-1.5">分辨率 (单格大小)</label>
              <select
                value={options.cellSize}
                onChange={e => setOptions({ ...options, cellSize: Number(e.target.value) })}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
              >
                <option value={16}>标准 (16px / 格)</option>
                <option value={24}>清晰 (24px / 格)</option>
                <option value={28}>高清制作推荐 (28px / 格)</option>
                <option value={36}>超高清打印 (36px / 格)</option>
                <option value={48}>极清展示 (48px / 格)</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1.5">图纸渲染风格</label>
              <select
                value={options.style}
                onChange={e => setOptions({ ...options, style: e.target.value as 'bead' | 'flat' })}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
              >
                <option value="bead">拟真圆孔拼豆</option>
                <option value="flat">平铺方块格</option>
              </select>
            </div>
          </div>

          <div className="border border-slate-100 rounded-xl p-3 bg-slate-50 space-y-2.5">
            <span className="font-semibold text-slate-700 block">导出附加图层</span>
            
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={options.showLabels}
                onChange={e => setOptions({ ...options, showLabels: e.target.checked })}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span>在格子标注色号 (如 M01, P04)</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={options.showGrid}
                onChange={e => setOptions({ ...options, showGrid: e.target.checked })}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span>包含网格线 (5格/10格粗线辅助对齐)</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={options.showPegboardSeams}
                onChange={e => setOptions({ ...options, showPegboardSeams: e.target.checked })}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-red-600 font-medium">包含拼豆板接缝线与板编号 (单板: {pegboardWidth}×{pegboardHeight})</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={options.showRuler}
                onChange={e => setOptions({ ...options, showRuler: e.target.checked })}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span>包含顶部与左侧数字标尺 (1, 5, 10...)</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={options.showLegend}
                onChange={e => setOptions({ ...options, showLegend: e.target.checked })}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span>附带色号用料统计对照表</span>
            </label>
          </div>

          {/* 缓冲提示 */}
          {downloading && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3 text-amber-800 animate-pulse">
              <Loader2 size={16} className="animate-spin text-amber-600 shrink-0" />
              <div className="text-[11px] leading-tight">
                <span className="font-semibold block">{statusMessage || '正在生成高清图纸...'}</span>
                <span className="text-amber-600/80">服务器已开启并发缓冲保护，请稍候...</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-4 py-3 sm:px-6 sm:py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
          <button
            onClick={handleExportPixel}
            disabled={downloading}
            className="text-xs text-slate-600 hover:text-slate-800 flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition cursor-pointer disabled:opacity-50"
          >
            <ImageIcon size={14} />
            <span className="hidden sm:inline">导出</span> 1:1 像素图
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              disabled={downloading}
              className="text-xs px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-slate-600 hover:bg-slate-200 transition cursor-pointer disabled:opacity-50"
            >
              取消
            </button>
            <button
              onClick={handleExportHiRes}
              disabled={downloading}
              className="text-xs px-3.5 py-1.5 sm:px-5 sm:py-2 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 shadow-md shadow-indigo-600/20 transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              {downloading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>处理中...</span>
                </>
              ) : (
                <>
                  <Download size={14} />
                  <span>下载PNG图纸</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
