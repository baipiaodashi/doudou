import React from 'react';
import { Upload, Sliders, Palette, Flame, HelpCircle, Lightbulb, ArrowRight } from 'lucide-react';

interface UserGuideProps {
  onStartCreating: () => void;
}

export const UserGuide: React.FC<UserGuideProps> = ({ onStartCreating }) => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-16 text-[#1F1E1D]">
      {/* 头部标题 */}
      <div className="mb-10 text-left border-b border-[#2D2A26]/10 pb-8">
        <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-3 text-[#1F1E1D]">
          从一张图到精致拼豆实物
        </h2>
        <p className="text-base sm:text-lg text-[#54524E] leading-relaxed">
          无需任何美术基础，跟着工坊标准四步法，轻松做出第一件令人惊艳的拼豆作品。
        </p>
      </div>

      {/* 四步流程卡片 */}
      <div className="flex flex-col gap-6 mb-12">
        {/* Step 1 */}
        <div className="bg-white/90 border border-[#2D2A26]/10 rounded-2xl p-6 sm:p-8 backdrop-blur-md shadow-sm hover:border-[#D97757]/40 transition-colors">
          <div className="flex flex-col sm:flex-row gap-5">
            <div className="flex sm:flex-col items-center">
              <div className="w-12 h-12 rounded-xl bg-[#F4F1EA] border border-[#2D2A26]/10 text-[#D97757] font-extrabold text-xl flex items-center justify-center">
                01
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-[#1F1E1D] mb-2 flex items-center gap-2">
                <Upload className="w-5 h-5 text-[#D97757]" />
                选图与智能抠图预处理
              </h3>
              <p className="text-sm sm:text-base text-[#54524E] leading-relaxed mb-4">
                推荐挑选主体轮廓清晰、明暗对比分明的高清素材（动漫二次元角色、像素插画、宠物大头照效果最好）。在工坊上传图片后，系统支持自动容差扣除背景，突出创作主体。
              </p>
              <div className="bg-[#F4F1EA] border-l-4 border-[#D97757] p-3 rounded-r-lg text-sm text-[#54524E] mb-3">
                💡 <strong>新手避坑：</strong>尽量避免背景复杂或大面积渐变过度的照片，纯色背景或高对比图更容易生成干净利落的像素边缘。
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="text-xs px-2.5 py-1 rounded bg-[#2D2A26]/5 text-[#85827C]">#智能扣背景</span>
                <span className="text-xs px-2.5 py-1 rounded bg-[#2D2A26]/5 text-[#85827C]">#对比度调节</span>
                <span className="text-xs px-2.5 py-1 rounded bg-[#2D2A26]/5 text-[#85827C]">#清晰主体</span>
              </div>
            </div>
          </div>
        </div>

        {/* Step 2 */}
        <div className="bg-white/90 border border-[#2D2A26]/10 rounded-2xl p-6 sm:p-8 backdrop-blur-md shadow-sm hover:border-[#D97757]/40 transition-colors">
          <div className="flex flex-col sm:flex-row gap-5">
            <div className="flex sm:flex-col items-center">
              <div className="w-12 h-12 rounded-xl bg-[#F4F1EA] border border-[#2D2A26]/10 text-[#D97757] font-extrabold text-xl flex items-center justify-center">
                02
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-[#1F1E1D] mb-2 flex items-center gap-2">
                <Sliders className="w-5 h-5 text-[#D97757]" />
                选择物理规格与拼板尺寸
              </h3>
              <p className="text-sm sm:text-base text-[#54524E] leading-relaxed mb-4">
                根据您的制品用途选择豆子口径与连拼规模。工坊会自动为您计算出以毫米（mm）为单位的真实成品物理尺寸：
              </p>
              <div className="bg-[#F4F1EA] border-l-4 border-[#D97757] p-3 rounded-r-lg text-sm text-[#54524E] space-y-1 mb-3">
                <div>• <strong>2.6mm 极细豆</strong>：精度高、细节丰富细腻，适合做钥匙扣、胸针、小立牌。</div>
                <div>• <strong>5.0mm 标准豆</strong>：颗粒大、好抓取、易上手，非常适合新手入门与亲子创作。</div>
                <div>• <strong>单板 (28×28) vs 连拼</strong>：标准单板尺寸约 7.3cm；大幅作品可选择 2×2（56×56）无缝组合。</div>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="text-xs px-2.5 py-1 rounded bg-[#2D2A26]/5 text-[#85827C]">#2.6mm极细</span>
                <span className="text-xs px-2.5 py-1 rounded bg-[#2D2A26]/5 text-[#85827C]">#5.0mm入门</span>
                <span className="text-xs px-2.5 py-1 rounded bg-[#2D2A26]/5 text-[#85827C]">#毫米级物理预览</span>
              </div>
            </div>
          </div>
        </div>

        {/* Step 3 */}
        <div className="bg-white/90 border border-[#2D2A26]/10 rounded-2xl p-6 sm:p-8 backdrop-blur-md shadow-sm hover:border-[#D97757]/40 transition-colors">
          <div className="flex flex-col sm:flex-row gap-5">
            <div className="flex sm:flex-col items-center">
              <div className="w-12 h-12 rounded-xl bg-[#F4F1EA] border border-[#2D2A26]/10 text-[#D97757] font-extrabold text-xl flex items-center justify-center">
                03
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-[#1F1E1D] mb-2 flex items-center gap-2">
                <Palette className="w-5 h-5 text-[#D97757]" />
                色卡对色与图纸阅读
              </h3>
              <p className="text-sm sm:text-base text-[#54524E] leading-relaxed mb-4">
                系统内置权威的 <strong>Mard 标准色卡</strong>，基于人类视觉感知的 Delta-E 算法精准推荐色号。图纸生成后，每个格子均清晰标有对应色号，右侧还会统计所需豆子总数与色号清单。
              </p>
              <div className="bg-[#F4F1EA] border-l-4 border-[#D97757] p-3 rounded-r-lg text-sm text-[#54524E] mb-3">
                🏷️ <strong>备料技巧：</strong>提前查看工坊输出的「色号消耗清单」，按清单准备豆子，避免做到一半发现缺色的尴尬。
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="text-xs px-2.5 py-1 rounded bg-[#2D2A26]/5 text-[#85827C]">#Mard精准色号</span>
                <span className="text-xs px-2.5 py-1 rounded bg-[#2D2A26]/5 text-[#85827C]">#用量清单</span>
                <span className="text-xs px-2.5 py-1 rounded bg-[#2D2A26]/5 text-[#85827C]">#单格色号显隐</span>
              </div>
            </div>
          </div>
        </div>

        {/* Step 4 */}
        <div className="bg-white/90 border border-[#2D2A26]/10 rounded-2xl p-6 sm:p-8 backdrop-blur-md shadow-sm hover:border-[#D97757]/40 transition-colors">
          <div className="flex flex-col sm:flex-row gap-5">
            <div className="flex sm:flex-col items-center">
              <div className="w-12 h-12 rounded-xl bg-[#F4F1EA] border border-[#2D2A26]/10 text-[#D97757] font-extrabold text-xl flex items-center justify-center">
                04
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-[#1F1E1D] mb-2 flex items-center gap-2">
                <Flame className="w-5 h-5 text-[#D97757]" />
                物理排珠与熨烫定型
              </h3>
              <p className="text-sm sm:text-base text-[#54524E] leading-relaxed mb-4">
                根据图纸将豆子依次摆放在塑料底板上。拼插完成后，使用手作圈最稳妥的<strong>「美纹胶带翻板法」</strong>保护拼豆板不被高温烫弯：
              </p>
              <div className="bg-[#F4F1EA] border-l-4 border-[#D97757] p-3 rounded-r-lg text-sm text-[#54524E] space-y-1 mb-3">
                <div>1. 铺上耐高温助烫片（光面亮光、哑光雾面任选）；</div>
                <div>2. 熨斗调至中温（羊毛档），<strong>切忌单点长按</strong>，保持顺时针小幅度匀速画圈移动；</div>
                <div>3. 观察豆孔微缩融合即可停手，趁热用厚书本重压 15 分钟直至彻底冷却，防止成品翘边。</div>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="text-xs px-2.5 py-1 rounded bg-[#2D2A26]/5 text-[#85827C]">#胶带翻板法</span>
                <span className="text-xs px-2.5 py-1 rounded bg-[#2D2A26]/5 text-[#85827C]">#均匀打圈</span>
                <span className="text-xs px-2.5 py-1 rounded bg-[#2D2A26]/5 text-[#85827C]">#重物压平防翘</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 进阶与 FAQ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
        <div className="bg-white/90 border border-[#2D2A26]/10 rounded-2xl p-6 backdrop-blur-md">
          <h3 className="text-lg font-bold text-[#1F1E1D] mb-4 flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-[#D97757]" />
            高手进阶技巧
          </h3>
          <div className="space-y-4 text-sm text-[#54524E]">
            <div className="border-b border-[#2D2A26]/10 pb-3">
              <div className="font-semibold text-[#1F1E1D] mb-1">大幅连拼壁画怎么不散架？</div>
              <div>多块 28×28 板拼满后，整面贴满美纹胶带并用刮板压实，整体脱板后再移至隔热垫上熨烫，既保护模板又绝对不散。</div>
            </div>
            <div>
              <div className="font-semibold text-[#1F1E1D] mb-1">双面烫还是单面烫？</div>
              <div>日常挂件建议微融双面烫，结构牢固耐摔；画框裱装作品建议单面深烫作为背面，正面保留完整中空圆孔，立体感最强。</div>
            </div>
          </div>
        </div>

        <div className="bg-white/90 border border-[#2D2A26]/10 rounded-2xl p-6 backdrop-blur-md">
          <h3 className="text-lg font-bold text-[#1F1E1D] mb-4 flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-[#D97757]" />
            常见问题 FAQ
          </h3>
          <div className="space-y-4 text-sm text-[#54524E]">
            <div className="border-b border-[#2D2A26]/10 pb-3">
              <div className="font-semibold text-[#1F1E1D] mb-1">为什么打印出来的大小对不上？</div>
              <div>打印导出 PDF 图纸时，打印机设置务必勾选「实际大小 / 100% 比例」，切勿勾选「适应纸张大小」，即可 1:1 垫在透明板下直接拼。</div>
            </div>
            <div>
              <div className="font-semibold text-[#1F1E1D] mb-1">不同品牌的拼豆能混用吗？</div>
              <div>同一口径（如均为 2.6mm）不同品牌可以混合拼插，但因熔点略有差异，熨烫时需格外留意打圈均匀。</div>
            </div>
          </div>
        </div>
      </div>

      {/* 底部 CTA */}
      <div className="bg-gradient-to-br from-[#D97757]/10 via-[#F4F1EA] to-white border border-[#D97757]/25 rounded-2xl p-8 text-center">
        <h3 className="text-2xl font-bold text-[#1F1E1D] mb-2">准备好开启你的拼豆之旅了吗？</h3>
        <p className="text-[#54524E] text-sm sm:text-base mb-6">
          导入一张你喜爱的图，一秒生成专属于你的色号工程图纸
        </p>
        <button
          onClick={onStartCreating}
          className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-semibold text-white bg-[#D97757] hover:bg-[#C15F3F] transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
        >
          <span>立即进入设计工作台</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
