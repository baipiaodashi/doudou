import React, { useEffect, useState } from 'react';

interface PaletteStudioTransitionProps {
  onSwappedView: () => void;
  onFinished: () => void;
}

export const PaletteStudioTransition: React.FC<PaletteStudioTransitionProps> = ({
  onSwappedView,
  onFinished,
}) => {
  // 'entering': 平滑放大 + 丝滑连续360°旋转 + 雾化升起
  // 'dispersing': 旋转完成，页面切换，雾气与调色盘向外消散
  const [phase, setPhase] = useState<'entering' | 'dispersing'>('entering');

  useEffect(() => {
    // 旋转一圈耗时约 820ms，此时雾化达到峰值，执行静默页面切换
    const swapTimer = setTimeout(() => {
      onSwappedView();
      setPhase('dispersing');
    }, 820);

    // 调色盘与雾化散尽，彻底结束转场
    const finishTimer = setTimeout(() => {
      onFinished();
    }, 1250);

    return () => {
      clearTimeout(swapTimer);
      clearTimeout(finishTimer);
    };
  }, [onSwappedView, onFinished]);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center select-none pointer-events-auto transition-all duration-400 ${
        phase === 'entering'
          ? 'bg-[#FAF9F5]/75 backdrop-blur-[28px]'
          : 'bg-[#FAF9F5]/0 backdrop-blur-none pointer-events-none'
      }`}
      style={{
        transitionTimingFunction: 'cubic-bezier(0.25, 1, 0.35, 1)',
      }}
    >
      {/* 雾化光圈扩散层 1 */}
      <div className="absolute w-[320px] sm:w-[480px] h-[320px] sm:h-[480px] rounded-full bg-gradient-to-tr from-[#D97757]/30 via-[#E28C70]/20 to-transparent blur-2xl pointer-events-none animate-mist-ring-1" />

      {/* 雾化光圈扩散层 2 */}
      <div className="absolute w-[260px] sm:w-[380px] h-[260px] sm:h-[380px] rounded-full bg-gradient-to-br from-white/90 via-[#FAF9F5]/70 to-[#D97757]/15 blur-3xl pointer-events-none animate-mist-ring-2" />

      {/* 雾状朦胧背景 */}
      <div className="absolute inset-0 bg-radial from-[#FAF9F5]/60 via-[#F4F1EA]/80 to-transparent pointer-events-none animate-mist-haze" />

      {/* 外层容器：负责放大与消散 */}
      <div
        className={`relative z-10 flex flex-col items-center justify-center ${
          phase === 'entering' ? 'animate-palette-scale-in' : 'animate-palette-disperse-out'
        }`}
      >
        {/* 调色盘外圈投影微光 (静态投影，不随每帧重算，避免掉帧) */}
        <div className="absolute -inset-6 rounded-full bg-gradient-to-tr from-[#D97757]/35 via-[#F59E0B]/25 to-[#D97757]/10 blur-xl animate-pulse-glow pointer-events-none" />

        {/* 核心旋转图层：纯净 GPU 硬件加速旋转 360°，绝无一顿一顿的卡顿感 */}
        <div className="animate-smooth-spin will-change-transform flex items-center justify-center">
          <div className="relative w-28 h-28 sm:w-36 sm:h-36 drop-shadow-2xl">
            <svg
              viewBox="0 0 100 100"
              className="w-full h-full transform"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                {/* 木质/陶质渐变底色 */}
                <linearGradient id="paletteBody2" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#FFFFFF" />
                  <stop offset="50%" stopColor="#FAF6F0" />
                  <stop offset="100%" stopColor="#EDE5D8" />
                </linearGradient>

                {/* 颜料立体高光 */}
                <radialGradient id="beadHighlight2" cx="35%" cy="35%" r="65%">
                  <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.85" />
                  <stop offset="40%" stopColor="#FFFFFF" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#000000" stopOpacity="0.15" />
                </radialGradient>
              </defs>

              {/* 调色盘主体轮廓 */}
              <path
                d="M 50,8
                   C 25,8 10,24 10,48
                   C 10,72 26,92 50,92
                   C 64,92 74,86 78,76
                   C 81,69 88,67 92,72
                   C 94,74 96,72 96,68
                   C 96,36 78,8 50,8 Z"
                fill="url(#paletteBody2)"
                stroke="#D97757"
                strokeWidth="2.5"
                strokeLinejoin="round"
              />

              {/* 拇指孔 */}
              <ellipse
                cx="74"
                cy="64"
                rx="7"
                ry="10"
                transform="rotate(-25 74 64)"
                fill="#E5DDD0"
                stroke="#D97757"
                strokeWidth="1.5"
              />

              {/* 拼豆颜料点 1: 珊瑚朱红 */}
              <circle cx="28" cy="32" r="6" fill="#D97757" />
              <circle cx="28" cy="32" r="6" fill="url(#beadHighlight2)" />

              {/* 颜料点 2: 暖杏黄 */}
              <circle cx="48" cy="22" r="5.5" fill="#F59E0B" />
              <circle cx="48" cy="22" r="5.5" fill="url(#beadHighlight2)" />

              {/* 颜料点 3: 抹茶绿 */}
              <circle cx="68" cy="26" r="5.5" fill="#10B981" />
              <circle cx="68" cy="26" r="5.5" fill="url(#beadHighlight2)" />

              {/* 颜料点 4: 天青蓝 */}
              <circle cx="82" cy="42" r="5" fill="#3B82F6" />
              <circle cx="82" cy="42" r="5" fill="url(#beadHighlight2)" />

              {/* 颜料点 5: 薰衣草紫 */}
              <circle cx="34" cy="54" r="5" fill="#8B5CF6" />
              <circle cx="34" cy="54" r="5" fill="url(#beadHighlight2)" />

              {/* 颜料点 6: 浅樱粉 */}
              <circle cx="24" cy="72" r="4.5" fill="#EC4899" />
              <circle cx="24" cy="72" r="4.5" fill="url(#beadHighlight2)" />
            </svg>
          </div>
        </div>

        {/* 提示文案 */}
        <div className="mt-5 text-center">
          <span className="inline-block px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold tracking-wide text-[#1F1E1D] bg-white/85 border border-[#D97757]/30 shadow-sm backdrop-blur-md">
            正在开启空白图纸工坊...
          </span>
        </div>
      </div>
    </div>
  );
};
