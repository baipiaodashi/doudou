import React from 'react';
import { Upload, BookOpen, Sparkles, Ruler, Grid, Palette } from 'lucide-react';

interface LandingHeroProps {
  onImageSelected?: (file: File) => void;
  onImportClick: () => void;
  onEnterStudio: () => void;
  onOpenGuide: () => void;
}

export const LandingHero: React.FC<LandingHeroProps> = ({
  onImportClick,
  onEnterStudio,
  onOpenGuide,
}) => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-12 sm:py-16 text-center max-w-4xl mx-auto">
      {/* 顶部小标贴 */}
      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-medium bg-[#D97757]/10 border border-[#D97757]/25 text-[#C15F3F] mb-6">
        <span className="w-2 h-2 rounded-full bg-[#D97757] animate-pulse" />
        <span>Crafting Intelligence · 毫米级拼豆图纸工坊</span>
      </div>

      {/* 主标题 */}
      <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-[#1F1E1D] leading-tight mb-5">
        把每一次心动灵感<br />
        化作指尖<span className="text-[#D97757]">温润真实的拼豆艺术</span>
      </h1>

      {/* 副标题 */}
      <p className="text-base sm:text-lg text-[#54524E] max-w-2xl leading-relaxed mb-10">
        为手作艺术家与像素爱好者打造。采用 Delta-E 智能测色匹配 Mard 与主流色卡，一键导出具备毫米标尺与清晰编号的拼合切板图纸。
      </p>

      {/* 核心操作按钮组 */}
      <div className="flex flex-wrap items-center justify-center gap-4 mb-14">
        <button
          onClick={onImportClick}
          className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl font-semibold text-base bg-[#D97757] text-white shadow-md hover:bg-[#C15F3F] hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:scale-98 transition-all cursor-pointer group"
        >
          <Upload className="w-5 h-5 transition-transform group-hover:scale-110" />
          <span>导入图片生成图纸</span>
        </button>

        <button
          onClick={onEnterStudio}
          className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl font-medium text-base bg-white/90 text-[#1F1E1D] border border-[#2D2A26]/10 hover:border-[#D97757]/40 hover:bg-[#FAF9F5] shadow-sm hover:shadow transition-all cursor-pointer"
        >
          <Palette className="w-5 h-5 text-[#D97757]" />
          <span>进入空白工作台</span>
        </button>

        <button
          onClick={onOpenGuide}
          className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl font-medium text-base bg-white/90 text-[#54524E] border border-[#2D2A26]/10 hover:border-[#D97757]/40 hover:bg-[#FAF9F5] shadow-sm hover:shadow transition-all cursor-pointer"
        >
          <BookOpen className="w-5 h-5 text-[#85827C]" />
          <span>新手使用指南</span>
        </button>
      </div>

      {/* 特性卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 w-full text-left">
        <div className="bg-white/85 border border-[#2D2A26]/10 rounded-2xl p-5 sm:p-6 backdrop-blur-md shadow-xs hover:shadow-md hover:border-[#D97757]/35 transition-all">
          <div className="w-10 h-10 rounded-lg bg-[#F4F1EA] border border-[#2D2A26]/10 flex items-center justify-center mb-3">
            <Sparkles className="w-5 h-5 text-[#D97757]" />
          </div>
          <div className="text-base font-bold text-[#1F1E1D] mb-1">专业级精准对色</div>
          <div className="text-xs sm:text-sm text-[#54524E] leading-relaxed">
            深度适配 Mard 标准色谱，基于 Lab 感知色彩空间计算，杜绝怪异色偏与断阶。
          </div>
        </div>

        <div className="bg-white/85 border border-[#2D2A26]/10 rounded-2xl p-5 sm:p-6 backdrop-blur-md shadow-xs hover:shadow-md hover:border-[#D97757]/35 transition-all">
          <div className="w-10 h-10 rounded-lg bg-[#F4F1EA] border border-[#2D2A26]/10 flex items-center justify-center mb-3">
            <Ruler className="w-5 h-5 text-[#D97757]" />
          </div>
          <div className="text-base font-bold text-[#1F1E1D] mb-1">毫米级实物预测</div>
          <div className="text-xs sm:text-sm text-[#54524E] leading-relaxed">
            适配 2.6mm 极细豆与 5.0mm 标准豆，提前自动预估画框尺寸与用珠总数。
          </div>
        </div>

        <div className="bg-white/85 border border-[#2D2A26]/10 rounded-2xl p-5 sm:p-6 backdrop-blur-md shadow-xs hover:shadow-md hover:border-[#D97757]/35 transition-all">
          <div className="w-10 h-10 rounded-lg bg-[#F4F1EA] border border-[#2D2A26]/10 flex items-center justify-center mb-3">
            <Grid className="w-5 h-5 text-[#D97757]" />
          </div>
          <div className="text-base font-bold text-[#1F1E1D] mb-1">工程级连拼切板</div>
          <div className="text-xs sm:text-sm text-[#54524E] leading-relaxed">
            大幅作品自动拆解为 28×28 独立打印单板，附带接缝防呆编号，对照零压力。
          </div>
        </div>
      </div>
    </div>
  );
};
