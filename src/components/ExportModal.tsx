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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-3 sm:p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-[#2D2A26]/10 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 sm:px-6 border-b border-[#2D2A26]/10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#D97757]/10 text-[#D97757] flex items-center justify-center shrink-0">
              <Download size={20} />
            </div>
            <div>
              <h3 className="font-bold text-base text-[#1F1E1D]">导出制作图纸</h3>
              <p className="text-xs text-[#85827C]">支持服务端高清输出与本地多模式选择</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-[#FAF9F5] rounded-xl text-[#85827C] hover:text-[#1F1E1D] transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content (Scrollable) */}
        <div className="p-4 sm:p-6 space-y-4 text-xs text-[#54524E] overflow-y-auto flex-1">
          {/* 渲染节点选择 */}
          <div className="bg-[#FAF9F5] border border-[#2D2A26]/10 rounded-2xl p-3.5">
            <label className="font-bold text-[#1F1E1D] block mb-2">生图渲染引擎节点</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setUseVps(true)}
                className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition cursor-pointer ${
                  useVps
                    ? 'border-[#D97757] bg-[#D97757]/10 text-[#1F1E1D] shadow-xs'
                    : 'border-[#2D2A26]/10 bg-white text-[#54524E] hover:bg-[#FAF9F5]'
                }`}
              >
                <div className={`p-1.5 rounded-lg shrink-0 ${useVps ? 'bg-[#D97757] text-white' : 'bg-[#FAF9F5] text-[#85827C]'}`}>
                  <Server size={14} />
                </div>
                <div>
                  <div className="font-bold flex items-center gap-1 text-[#1F1E1D]">
                    <span>VPS 云端渲染</span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1 py-0.2 rounded font-medium">推荐</span>
                  </div>
                  <div className="text-[10px] text-[#85827C]">由服务器排版，手机/低配不崩溃</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setUseVps(false)}
                className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition cursor-pointer ${
                  !useVps
                    ? 'border-[#D97757] bg-[#D97757]/10 text-[#1F1E1D] shadow-xs'
                    : 'border-[#2D2A26]/10 bg-white text-[#54524E] hover:bg-[#FAF9F5]'
                }`}
              >
                <div className={`p-1.5 rounded-lg shrink-0 ${!useVps ? 'bg-[#D97757] text-white' : 'bg-[#FAF9F5] text-[#85827C]'}`}>
                  <Laptop size={14} />
                </div>
                <div>
                  <div className="font-bold text-[#1F1E1D]">本地访客设备</div>
                  <div className="text-[10px] text-[#85827C]">浏览器离线绘制，图纸过大易闪退</div>
                </div>
              </button>
            </div>
          </div>

          <div>
            <label className="font-bold text-[#1F1E1D] block mb-1.5">图纸标题</label>
            <input
              type="text"
              value={options.title}
              onChange={e => setOptions({ ...options, title: e.target.value })}
              className="w-full text-xs px-3 py-2 border border-[#2D2A26]/10 rounded-xl bg-white text-[#1F1E1D] focus:ring-2 focus:ring-[#D97757]/20 focus:border-[#D97757] transition"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="font-bold text-[#1F1E1D] block mb-1.5">分辨率 (单格大小)</label>
              <select
                value={options.cellSize}
                onChange={e => setOptions({ ...options, cellSize: Number(e.target.value) })}
                className="w-full text-xs px-3 py-2 border border-[#2D2A26]/10 rounded-xl focus:ring-2 focus:ring-[#D97757]/20 focus:border-[#D97757] bg-white text-[#1F1E1D]"
              >
                <option value={16}>标准 (16px / 格)</option>
                <option value={24}>清晰 (24px / 格)</option>
                <option value={28}>高清制作推荐 (28px / 格)</option>
                <option value={36}>超高清打印 (36px / 格)</option>
                <option value={48}>极清展示 (48px / 格)</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-[#1F1E1D] block mb-1.5">图纸渲染风格</label>
              <select
                value={options.style}
                onChange={e => setOptions({ ...options, style: e.target.value as 'bead' | 'flat' })}
                className="w-full text-xs px-3 py-2 border border-[#2D2A26]/10 rounded-xl focus:ring-2 focus:ring-[#D97757]/20 focus:border-[#D97757] bg-white text-[#1F1E1D]"
              >
                <option value="bead">拟真圆孔拼豆</option>
                <option value="flat">平铺方块格</option>
              </select>
            </div>
          </div>

          <div className="border border-[#2D2A26]/10 rounded-2xl p-3.5 bg-[#FAF9F5] space-y-2.5">
            <span className="font-bold text-[#1F1E1D] block">导出附加图层</span>
            
            <label className="flex items-center gap-2 cursor-pointer text-[#54524E]">
              <input
                type="checkbox"
                checked={options.showLabels}
                onChange={e => setOptions({ ...options, showLabels: e.target.checked })}
                className="rounded border-[#2D2A26]/20 text-[#D97757] focus:ring-[#D97757]"
              />
              <span>在格子上标注色号 (推荐开启)</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-[#54524E]">
              <input
                type="checkbox"
                checked={options.showGrid}
                onChange={e => setOptions({ ...options, showGrid: e.target.checked })}
                className="rounded border-[#2D2A26]/20 text-[#D97757] focus:ring-[#D97757]"
              />
              <span>网格分割线</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-[#54524E]">
              <input
                type="checkbox"
                checked={options.showPegboardSeams}
                onChange={e => setOptions({ ...options, showPegboardSeams: e.target.checked })}
                className="rounded border-[#2D2A26]/20 text-[#D97757] focus:ring-[#D97757]"
              />
              <span className="text-[#C15F3F] font-medium">拼豆板拼接防呆红线与分块编号</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-[#54524E]">
              <input
                type="checkbox"
                checked={options.showRuler}
                onChange={e => setOptions({ ...options, showRuler: e.target.checked })}
                className="rounded border-[#2D2A26]/20 text-[#D97757] focus:ring-[#D97757]"
              />
              <span>外框行列标尺</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-[#54524E]">
              <input
                type="checkbox"
                checked={options.showLegend}
                onChange={e => setOptions({ ...options, showLegend: e.target.checked })}
                className="rounded border-[#2D2A26]/20 text-[#D97757] focus:ring-[#D97757]"
              />
              <span>底部用料统计与色卡对照表</span>
            </label>
          </div>

          {statusMessage && (
            <div className="bg-[#D97757]/10 border border-[#D97757]/30 text-[#C15F3F] p-3 rounded-xl flex items-center gap-2 text-xs">
              <Loader2 size={14} className="animate-spin shrink-0" />
              <span>{statusMessage}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 sm:px-6 sm:py-4 border-t border-[#2D2A26]/10 bg-[#FAF9F5] flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={handleExportPixel}
            disabled={downloading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#2D2A26]/10 text-[#54524E] hover:text-[#D97757] hover:bg-white transition cursor-pointer text-xs font-medium"
            title="导出每个拼豆占 1 像素的精细源图"
          >
            <ImageIcon size={14} />
            <span>导出 1:1 像素图</span>
          </button>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-[#2D2A26]/10 text-[#54524E] hover:bg-white transition cursor-pointer text-xs font-medium"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleExportHiRes}
              disabled={downloading}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[#D97757] hover:bg-[#C15F3F] text-white transition shadow-sm hover:shadow cursor-pointer text-xs font-bold disabled:opacity-50"
            >
              {downloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              <span>{downloading ? '导出中...' : '生成高清图纸并保存'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
