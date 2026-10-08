import React, { useEffect, useState } from 'react';

interface BookGuideTransitionProps {
  onSwappedView: () => void;
  onFinished: () => void;
}

export const BookGuideTransition: React.FC<BookGuideTransitionProps> = ({
  onSwappedView,
  onFinished,
}) => {
  // 动画阶段：
  // 1. 'intro': 书本浮现居中放大 (0 ~ 380ms)
  // 2. 'flipping': 3D书页掀开 (380 ~ 1100ms)
  // 3. 'opened': 翻开完毕，视线聚焦右页内容 (1100 ~ 1380ms)
  // 4. 'expanding': GPU 纯硬件加速平滑铺满全屏，绝无文字重排与分辨率顿挫 (1380 ~ 2180ms)
  // 5. 'settled': 完成铺满，底层无感交接并淡出 (2180 ~ 2400ms)
  const [stage, setStage] = useState<'intro' | 'flipping' | 'opened' | 'expanding' | 'settled'>('intro');

  useEffect(() => {
    const flipTimer = setTimeout(() => setStage('flipping'), 380);
    const openTimer = setTimeout(() => setStage('opened'), 1100);
    const expandTimer = setTimeout(() => setStage('expanding'), 1380);
    const settleTimer = setTimeout(() => {
      onSwappedView();
      setStage('settled');
    }, 2180);
    const finishTimer = setTimeout(() => onFinished(), 2420);

    return () => {
      clearTimeout(flipTimer);
      clearTimeout(openTimer);
      clearTimeout(expandTimer);
      clearTimeout(settleTimer);
      clearTimeout(finishTimer);
    };
  }, [onSwappedView, onFinished]);

  const isExpandingOrSettled = stage === 'expanding' || stage === 'settled';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden select-none"
      style={{
        backgroundColor: isExpandingOrSettled ? '#FAF9F5' : 'rgba(28, 25, 23, 0.45)',
        backdropFilter: isExpandingOrSettled ? 'none' : 'blur(16px)',
        WebkitBackdropFilter: isExpandingOrSettled ? 'none' : 'blur(16px)',
        opacity: stage === 'settled' ? 0 : 1,
        // 采用苹果级物理平滑曲线，杜绝任何中间拐点
        transition: 'background-color 0.8s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease-out',
        willChange: 'background-color, opacity',
      }}
    >
      <div className="perspective-1600 w-full h-full flex items-center justify-center relative">
        {/* 外层书本投影与定位容器 */}
        <div
          className="preserve-3d relative flex items-center justify-center w-full h-full"
          style={{
            transform: stage === 'intro' ? 'scale(0.35) translateY(40px)' : 'scale(1) translateY(0)',
            opacity: stage === 'intro' ? 0 : 1,
            transition: 'transform 0.45s cubic-bezier(0.34, 1.3, 0.64, 1), opacity 0.35s ease-out',
            willChange: 'transform, opacity',
          }}
        >
          {/* 外部阴影底托 */}
          <div
            className="absolute bg-[#7A3E26]/20 rounded-3xl blur-2xl pointer-events-none"
            style={{
              width: 'min(90vw, 840px)',
              height: '560px',
              opacity: isExpandingOrSettled ? 0 : 1,
              transition: 'opacity 0.5s ease-out',
            }}
          />

          {/* 双页书本主体容器 */}
          <div
            className="preserve-3d relative flex overflow-hidden"
            style={{
              width: isExpandingOrSettled ? '100vw' : 'min(90vw, 820px)',
              height: isExpandingOrSettled ? '100vh' : '540px',
              borderRadius: isExpandingOrSettled ? '0px' : '16px',
              borderWidth: isExpandingOrSettled ? '0px' : '1px',
              borderColor: 'rgba(66, 38, 29, 0.15)',
              padding: isExpandingOrSettled ? '0px' : '8px',
              backgroundColor: isExpandingOrSettled ? '#FAF9F5' : '#EDE8DE',
              boxShadow: isExpandingOrSettled ? 'none' : '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              // 关键：单一连贯的缓动，禁止在每一帧重排文字，保证 60/120fps
              transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
              willChange: 'width, height, border-radius, background-color',
            }}
          >
            {/* 左页：手账风工坊扉页印章（展开时通过 GPU transform 滑离并淡出，杜绝挤压重排顿挫） */}
            <div
              className="h-full bg-[#FAF7F0] border-r border-[#E2DDD2] rounded-l-xl p-5 sm:p-7 flex flex-col justify-between overflow-hidden shadow-inner relative shrink-0"
              style={{
                backgroundImage: 'radial-gradient(#E2DDD2 0.75px, transparent 0.75px)',
                backgroundSize: '16px 16px',
                width: isExpandingOrSettled ? '0px' : '50%',
                transform: isExpandingOrSettled ? 'translateX(-30px)' : 'translateX(0)',
                opacity: isExpandingOrSettled ? 0 : 1,
                padding: isExpandingOrSettled ? '0px' : undefined,
                transition: 'width 0.8s cubic-bezier(0.16, 1, 0.3, 1), transform 0.6s ease-out, opacity 0.4s ease-out, padding 0.8s ease',
                willChange: 'width, transform, opacity',
              }}
            >
              <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#3A2518]/15 to-transparent pointer-events-none" />

              <div className="space-y-4">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#D97757]/10 text-[#D97757] border border-[#D97757]/20">
                  <span>✨ 豆豆图纸工坊 · 指南卷</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-[#1F1E1D] tracking-tight">
                  手作艺术家的
                  <br />
                  <span className="text-[#D97757]">拼豆实操入门备忘</span>
                </h3>
                <p className="text-xs sm:text-sm text-[#54524E] leading-relaxed">
                  翻开本页，即刻进入为您精心准备的《新手全流程速成手册》。从智能抠图到熨烫定型，让每一次创作都能完美还原心动时刻。
                </p>
                <div className="p-3 bg-white/70 rounded-xl border border-[#2D2A26]/8 text-xs text-[#54524E] space-y-1.5 shadow-2xs">
                  <div className="font-semibold text-[#1F1E1D]">💡 阅读小锦囊：</div>
                  <div>• 遵循四步标准流程，新手零失误</div>
                  <div>• 善用色号清单，提前备齐豆子</div>
                  <div>• 推荐使用美纹胶带翻板法保护底板</div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-[#E2DDD2] text-xs text-[#85827C]">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full border border-dashed border-[#D97757] flex items-center justify-center text-[#D97757] font-bold text-[10px]">
                    MARD
                  </span>
                  <span>Crafting v2.6 / 5.0</span>
                </div>
                <span>第 I 卷 · 基础篇</span>
              </div>
            </div>

            {/* 3D 翻转书页 (从右向左翻转 180 度) */}
            <div
              className="preserve-3d absolute top-2 bottom-2 left-1/2 pointer-events-none"
              style={{
                width: isExpandingOrSettled ? '0px' : '50%',
                opacity: isExpandingOrSettled ? 0 : 1,
                transformOrigin: 'left center',
                transform: stage === 'intro' ? 'rotateY(0deg)' : 'rotateY(-180deg)',
                transition: 'transform 0.72s cubic-bezier(0.25, 1, 0.35, 1), opacity 0.35s ease-out, width 0.8s ease',
                zIndex: 35,
                willChange: 'transform, opacity',
              }}
            >
              {/* 翻页正面 (精装封面，初始朝右) */}
              <div className="backface-hidden absolute inset-0 bg-gradient-to-br from-[#E28C70] via-[#D97757] to-[#C15F3F] text-white p-6 sm:p-8 rounded-r-xl flex flex-col justify-between shadow-2xl border-l border-white/20">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-widest text-white/70 font-mono">
                    Doudou Studio
                  </span>
                  <span>📖</span>
                </div>
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shadow-lg text-2xl">
                    📖
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                    新手使用指南
                  </h2>
                  <p className="text-xs sm:text-sm text-white/80 leading-relaxed">
                    从一张图到毫米级拼豆图纸 · 翻开即可查看
                  </p>
                </div>
                <div className="flex items-center justify-between text-xs text-white/70 pt-4 border-t border-white/15">
                  <span>点击即翻开</span>
                  <span className="animate-pulse">翻开中...</span>
                </div>
              </div>

              {/* 翻页背面 (翻到左侧后呈现的页面) */}
              <div
                className="backface-hidden absolute inset-0 bg-[#FAF7F0] text-[#1F1E1D] p-6 rounded-l-xl shadow-lg border-r border-[#E2DDD2]"
                style={{ transform: 'rotateY(180deg)' }}
              >
                <div className="w-full h-full border border-dashed border-[#D97757]/30 rounded-lg p-4 flex flex-col items-center justify-center text-center text-xs text-[#85827C] space-y-2">
                  <span className="text-xl">✨</span>
                  <span className="font-semibold text-[#1F1E1D]">拼豆工坊创作誓约</span>
                  <p className="max-w-[200px]">把心动转化为指尖的温润温度，愿你在每一颗拼豆中收获专注与平静。</p>
                </div>
              </div>
            </div>

            {/* 右页：翻开的那一页 —— 真实渲染新手指南内容，随后像画布般连续平滑铺满整个视口！ */}
            {/* 关键优化：在动画展开期间设置 overflow-hidden，杜绝 Windows 滚动条在动画末尾弹出引起的 17px 跳动顿挫！ */}
            <div
              className={`h-full bg-white relative flex-1 ${isExpandingOrSettled ? 'overflow-y-auto' : 'overflow-hidden'}`}
              style={{
                width: isExpandingOrSettled ? '100%' : '50%',
                borderRadius: isExpandingOrSettled ? '0px' : '0 12px 12px 0',
                padding: isExpandingOrSettled ? '40px 24px 80px 24px' : '24px 20px',
                transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
                willChange: 'width, border-radius, padding',
              }}
            >
              {/* 书脊阴影 */}
              <div
                className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-[#3A2518]/15 to-transparent pointer-events-none z-10"
                style={{
                  opacity: isExpandingOrSettled ? 0 : 1,
                  transition: 'opacity 0.4s ease',
                }}
              />

              {/* 指南内容容器：标准固定版心（max-w-4xl），文字保持固定度量，绝不在动画中改变 fontSize 触发重排 */}
              <div className="mx-auto text-left max-w-4xl w-full">
                {/* 顶栏标题区 */}
                <div className="mb-6 sm:mb-8 border-b border-[#2D2A26]/10 pb-5">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#D97757]/10 text-[#C15F3F] mb-3">
                    <span>✨ 新手使用指南 · 完整篇</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-[#1F1E1D]">
                    从一张图到精致拼豆实物
                  </h2>
                  <p className="text-[#54524E] leading-relaxed mt-2 text-xs sm:text-sm">
                    无需任何美术基础，跟着工坊标准四步法，轻松做出第一件令人惊艳的拼豆作品。
                  </p>
                </div>

                {/* 四大核心标准流程卡片 */}
                <div className="grid grid-cols-1 gap-4 sm:gap-5 mb-8">
                  {/* Step 01 */}
                  <div className="bg-[#FAF9F5] border border-[#2D2A26]/10 rounded-xl p-4 sm:p-5 shadow-2xs">
                    <div className="flex items-start gap-3.5">
                      <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-lg bg-[#F4F1EA] border border-[#2D2A26]/10 text-[#D97757] font-black text-base sm:text-lg flex items-center justify-center shrink-0">
                        01
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm sm:text-base font-bold text-[#1F1E1D] mb-1">
                          选图与智能抠图预处理
                        </h4>
                        <p className="text-xs sm:text-sm text-[#54524E] leading-relaxed">
                          推荐挑选主体轮廓清晰的素材（二次元动漫、像素画、宠物照片）。系统支持自动容差扣除背景，突出创作主体。
                        </p>
                        <div className="mt-2.5 bg-white/80 p-2 rounded-lg border-l-3 border-[#D97757] text-xs text-[#54524E]">
                          💡 <strong>新手避坑：</strong>尽量避免背景过于复杂或大面积渐变的照片。
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Step 02 */}
                  <div className="bg-[#FAF9F5] border border-[#2D2A26]/10 rounded-xl p-4 sm:p-5 shadow-2xs">
                    <div className="flex items-start gap-3.5">
                      <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-lg bg-[#F4F1EA] border border-[#2D2A26]/10 text-[#D97757] font-black text-base sm:text-lg flex items-center justify-center shrink-0">
                        02
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm sm:text-base font-bold text-[#1F1E1D] mb-1">
                          选择物理规格与拼板尺寸
                        </h4>
                        <p className="text-xs sm:text-sm text-[#54524E] leading-relaxed">
                          工坊自动计算毫米物理尺寸：2.6mm 极细豆细节极其细腻，适合钥匙扣胸针；5.0mm 标准豆好抓取易上手，适合新手。
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Step 03 */}
                  <div className="bg-[#FAF9F5] border border-[#2D2A26]/10 rounded-xl p-4 sm:p-5 shadow-2xs">
                    <div className="flex items-start gap-3.5">
                      <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-lg bg-[#F4F1EA] border border-[#2D2A26]/10 text-[#D97757] font-black text-base sm:text-lg flex items-center justify-center shrink-0">
                        03
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm sm:text-base font-bold text-[#1F1E1D] mb-1">
                          色卡对色与图纸阅读
                        </h4>
                        <p className="text-xs sm:text-sm text-[#54524E] leading-relaxed">
                          深度适配 Mard 标准色卡，基于感知色彩空间 Delta-E 智能匹配色号。每个孔位均标有清晰色号，一键导出防呆编号清单。
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Step 04 */}
                  <div className="bg-[#FAF9F5] border border-[#2D2A26]/10 rounded-xl p-4 sm:p-5 shadow-2xs">
                    <div className="flex items-start gap-3.5">
                      <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-lg bg-[#F4F1EA] border border-[#2D2A26]/10 text-[#D97757] font-black text-base sm:text-lg flex items-center justify-center shrink-0">
                        04
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm sm:text-base font-bold text-[#1F1E1D] mb-1">
                          物理排珠与熨烫定型
                        </h4>
                        <p className="text-xs sm:text-sm text-[#54524E] leading-relaxed">
                          排插完成后，使用手作圈最稳妥的「美纹胶带翻板法」保护拼豆板不被高温烫弯，熨烫时中温画圈匀速移动，厚书重压平整定型。
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
