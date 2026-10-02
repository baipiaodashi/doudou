import React, { useState } from 'react';
import type { BeadCount } from '../utils/quantize';
import type { BeadColor } from '../data/palettes';
import { exportCsvStats } from '../utils/exportPattern';
import { Download, Search, Check, Copy } from 'lucide-react';

interface StatsPanelProps {
  stats: BeadCount[];
  totalBeads: number;
  highlightColor: BeadColor | null;
  onSelectColor: (color: BeadColor | null) => void;
}

export const StatsPanel: React.FC<StatsPanelProps> = ({
  stats,
  totalBeads,
  highlightColor,
  onSelectColor
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
    <div className="flex flex-col h-full bg-white border-l border-slate-200 shadow-sm">
      {/* Header */}
      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <span>用料统计清单</span>
            <span className="text-xs bg-indigo-50 text-indigo-600 font-semibold px-2 py-0.5 rounded-full border border-indigo-100">
              {stats.length} 种颜色
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            共需 <strong>{totalBeads.toLocaleString()}</strong> 颗拼豆
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={handleCopySummary}
            title="复制清单文本"
            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition text-xs flex items-center gap-1 border border-slate-200"
          >
            {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
            <span className="hidden sm:inline">{copied ? '已复制' : '复制'}</span>
          </button>
          <button
            onClick={() => exportCsvStats(stats, totalBeads)}
            title="导出 CSV 表格"
            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition text-xs flex items-center gap-1 border border-slate-200"
          >
            <Download size={14} />
            <span className="hidden sm:inline">导出CSV</span>
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="px-4 py-2 border-b border-slate-100 bg-slate-50/50">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="搜索色号 / 名称..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full text-xs pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
          />
        </div>
      </div>

      {/* Color List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100 px-2 py-1">
        {filteredStats.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-400">无匹配色号</div>
        ) : (
          filteredStats.map(item => {
            const isSelected = highlightColor?.code === item.color.code;

            return (
              <div
                key={item.color.code}
                onClick={() => onSelectColor(isSelected ? null : item.color)}
                className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition select-none ${
                  isSelected
                    ? 'bg-amber-50 border border-amber-300 shadow-sm'
                    : 'hover:bg-slate-50 border border-transparent'
                }`}
              >
                {/* Color Block */}
                <div
                  className="w-7 h-7 rounded-lg border border-black/10 shadow-sm flex-shrink-0 flex items-center justify-center relative"
                  style={{ backgroundColor: item.color.hex }}
                >
                  {isSelected && (
                    <div className="w-2.5 h-2.5 bg-white rounded-full shadow" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs font-mono text-slate-800">
                      {item.color.code}
                    </span>
                    <span className="text-xs font-mono font-semibold text-slate-700">
                      {item.count} 颗
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mt-0.5">
                    <span className="truncate mr-2">{item.color.name}</span>
                    <span>{item.percentage.toFixed(1)}%</span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-1 bg-slate-100 rounded-full mt-1.5 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.max(4, item.percentage)}%`,
                        backgroundColor: item.color.hex
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Info */}
      <div className="p-3 bg-slate-50 border-t border-slate-200 text-center">
        <p className="text-[11px] text-slate-500">
          💡 点击任意色号可在画布中单独高亮显示
        </p>
      </div>
    </div>
  );
};
