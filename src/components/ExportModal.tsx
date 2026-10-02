import React, { useState } from 'react';
import type { QuantizeResult } from '../utils/quantize';
import { generatePatternCanvas } from '../utils/exportPattern';
import type { ExportOptions } from '../utils/exportPattern';
import { Download, X, Image as ImageIcon } from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: QuantizeResult;
  pegboardWidth: number;
  pegboardHeight: number;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  result,
  pegboardWidth,
  pegboardHeight
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

  const [downloading, setDownloading] = useState(false);

  if (!isOpen) return null;

  const handleExportHiRes = () => {
    setDownloading(true);
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
        console.error('Export failed', err);
        alert('导出图纸失败，请尝试调小分辨率！');
      } finally {
        setDownloading(false);
      }
    }, 100);
  };

  const handleExportPixel = () => {
    // Export 1:1 pixel art
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Download size={18} />
            </div>
            <h3 className="font-bold text-base text-slate-800">导出制作图纸</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-xs text-slate-600">
          <div>
            <label className="font-semibold text-slate-700 block mb-1.5">图纸标题</label>
            <input
              type="text"
              value={options.title}
              onChange={e => setOptions({ ...options, title: e.target.value })}
              className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="font-semibold text-slate-700 block mb-1.5">分辨率 (单格大小)</label>
              <select
                value={options.cellSize}
                onChange={e => setOptions({ ...options, cellSize: Number(e.target.value) })}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
              >
                <option value={16}>标准 (16px / 格)</option>
                <option value={24}>清晰 (24px / 格)</option>
                <option value={32}>高清推荐 (32px / 格)</option>
                <option value={48}>超高清打印 (48px / 格)</option>
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
              <span>在格子上标注色号 (如 M01, P04)</span>
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
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <button
            onClick={handleExportPixel}
            className="text-xs text-slate-600 hover:text-slate-800 flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition cursor-pointer"
          >
            <ImageIcon size={14} />
            <span>导出 1:1 像素原图</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="text-xs px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-200 transition cursor-pointer"
            >
              取消
            </button>
            <button
              onClick={handleExportHiRes}
              disabled={downloading}
              className="text-xs px-5 py-2 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 shadow-md shadow-indigo-600/20 transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              <Download size={14} />
              <span>{downloading ? '生成中...' : '下载高清PNG图纸'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
