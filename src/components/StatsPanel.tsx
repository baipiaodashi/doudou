import React, { useState } from 'react';
import type { BeadCount } from '../utils/quantize';
import type { BeadColor } from '../data/palettes';
import { exportCsvStats } from '../utils/exportPattern';
import { Download, Search, Check, Copy, X } from 'lucide-react';

interface StatsPanelProps {
  stats: BeadCount[];
  totalBeads: number;
  highlightColor: BeadColor | null;
  onSelectColor: (color: BeadColor | null) => void;
  onClose?: () => void;
}

export const StatsPanel: React.FC<StatsPanelProps> = ({
  stats,
  totalBeads,
  highlightColor,
  onSelectColor,
  onClose
}) => {
  const [search, setSearch] = useState('');
  const [copied, setCopied] = useState(false);

  const filteredStats = stats.filter(s =>
    s.color.code.toLowerCase().includes(search.toLowerCase()) ||
    s.color.name.toLowerCase().includes(search.toLowerCase()) ||
    s.color.brandName.toLowerCase().includes(search.toLowerCase())
  );

  const handleCopySummary = () => {
    let text = `【拼豆用料清单】\n总颗数: ${totalBeads} 颗 | 颜色数: ${stats.length} 种\n------------------\n`;
    stats.forEach(s => {
      text += `${s.color.code} (${s.color.name}): ${s.count} 颗 [${s.color.brandName}]\n`;
    });
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-white border-l border-[#2D2A26]/10 shadow-xs w-full">
      {/* Header */}
      <div className="p-3.5 sm:p-4 border-b border-[#2D2A26]/10 flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-sm sm:text-base font-bold text-[#1F1E1D] flex items-center gap-1.5 sm:gap-2">
            <span>用料统计清单</span>
            <span className="text-[11px] sm:text-xs bg-[#D97757]/10 text-[#C15F3F] font-semibold px-2 py-0.5 rounded-full border border-[#D97757]/20">
              {stats.length} 种颜色
            </span>
          </h2>
          <p className="text-[11px] sm:text-xs text-[#54524E] mt-0.5">
            共需 <strong className="text-[#1F1E1D] font-mono">{totalBeads.toLocaleString()}</strong> 颗拼豆
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={handleCopySummary}
            title="复制清单文本"
            className="p-1.5 hover:bg-[#FAF9F5] rounded-lg text-[#54524E] hover:text-[#D97757] transition text-xs flex items-center gap-1 border border-[#2D2A26]/10 cursor-pointer"
          >
            {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
            <span className="hidden sm:inline">{copied ? '已复制' : '复制'}</span>
          </button>
          <button
            onClick={() => exportCsvStats(stats, totalBeads)}
            title="导出 CSV 表格"
            className="p-1.5 hover:bg-[#FAF9F5] rounded-lg text-[#54524E] hover:text-[#D97757] transition text-xs flex items-center gap-1 border border-[#2D2A26]/10 cursor-pointer"
          >
            <Download size={14} />
            <span className="hidden sm:inline">导出CSV</span>
          </button>
          {onClose && (
            <button
              onClick={onClose}
              title="关闭面板"
              className="lg:hidden p-1.5 hover:bg-[#FAF9F5] rounded-lg text-[#85827C] hover:text-[#1F1E1D] transition cursor-pointer"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Search Input */}
      <div className="px-3.5 py-2.5 border-b border-[#2D2A26]/10 bg-[#FAF9F5]/60 shrink-0">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#85827C]" />
          <input
            type="text"
            placeholder="搜索色号 / 名称..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full text-xs pl-8 pr-3 py-1.5 bg-white border border-[#2D2A26]/10 rounded-lg text-[#1F1E1D] placeholder:text-[#85827C] focus:outline-none focus:ring-2 focus:ring-[#D97757]/20 focus:border-[#D97757] transition"
          />
        </div>
      </div>

      {/* Color List */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#2D2A26]/5 px-2 py-1">
        {filteredStats.length === 0 ? (
          <div className="text-center py-8 text-xs text-[#85827C]">无可匹配色号</div>
        ) : (
          filteredStats.map(item => {
            const isSelected = highlightColor?.code === item.color.code;

            return (
              <div
                key={item.color.code}
                onClick={() => onSelectColor(isSelected ? null : item.color)}
                className={`flex items-center justify-between p-2 rounded-xl transition cursor-pointer text-xs ${
                  isSelected
                    ? 'bg-[#D97757]/10 border border-[#D97757]/35 shadow-xs'
                    : 'hover:bg-[#FAF9F5] border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className="w-5 h-5 rounded-full border border-black/10 shrink-0 shadow-xs"
                    style={{ backgroundColor: item.color.hex }}
                  />
                  <div className="truncate">
                    <div className="font-bold text-[#1F1E1D] flex items-center gap-1.5">
                      <span className="font-mono text-[#D97757]">{item.color.code}</span>
                      <span className="text-[10px] text-[#85827C] font-normal px-1 py-0.2 bg-[#FAF9F5] border border-[#2D2A26]/10 rounded">
                        {item.color.brandName}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#54524E] truncate">{item.color.name}</div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="font-mono font-bold text-[#1F1E1D]">{item.count} 颗</div>
                  <div className="text-[10px] text-[#85827C]">{item.percentage.toFixed(1)}%</div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
