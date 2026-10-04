import React from 'react';
import { Sparkles, Palette } from 'lucide-react';

interface FrostedTransitionProps {
  phase: 'in' | 'out';
}

export const FrostedTransition: React.FC<FrostedTransitionProps> = ({ phase }) => {
  const isEntering = phase === 'in';

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center select-none pointer-events-auto ${
        isEntering ? 'animate-frosted-in' : 'animate-frosted-out'
      }`}
      style={{
        backdropFilter: isEntering ? 'blur(32px)' : undefined,
        WebkitBackdropFilter: isEntering ? 'blur(32px)' : undefined,
      }}
    >
      {/* 磨砂光斑光晕 */}
      <div className="absolute w-[440px] h-[440px] rounded-full bg-gradient-to-tr from-[#D97757]/22 to-[#E28C70]/18 blur-3xl pointer-events-none animate-pulse-glow" />

      {/* 磨砂玻璃卡片 */}
      <div
        className={`relative z-10 px-8 py-8 rounded-3xl bg-white/80 backdrop-blur-2xl border border-white/90 shadow-2xl flex flex-col items-center gap-4 text-center max-w-xs sm:max-w-sm mx-4 ${
          isEntering ? 'animate-frosted-card-in' : 'animate-frosted-card-out'
        }`}
      >
        {/* 晶莹发光徽标 */}
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#D97757] to-[#E28C70] flex items-center justify-center text-white shadow-xl animate-pulse-glow">
            <Palette className="w-8 h-8" />
          </div>
          <div className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-white shadow-md flex items-center justify-center text-[#D97757]">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* 文案提示 (随进退场微变) */}
        <div>
          <h3 className="text-base sm:text-lg font-bold text-[#1F1E1D] tracking-tight">
            {isEntering ? '正在步入图纸工坊' : '工坊已就绪，正在呈现'}
          </h3>
          <p className="text-xs text-[#54524E] mt-1.5 leading-relaxed">
            {isEntering
              ? '为您就绪毫米级测色画布与真实色卡...'
              : '即将唤起图片选择，开启拼豆创作'}
          </p>
        </div>

        {/* 优雅磨砂微进度条 (2s 顺滑满格动效) */}
        <div className="w-48 h-1.5 bg-[#2D2A26]/8 rounded-full overflow-hidden mt-1 p-0.5">
          <div className="h-full bg-gradient-to-r from-[#D97757] via-[#E28C70] to-[#D97757] rounded-full animate-progress-sweep" />
        </div>
      </div>
    </div>
  );
};
