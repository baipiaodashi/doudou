import React, { useState, useRef, useCallback } from 'react';
import type { BeadColor } from './data/palettes';
import { PatternCanvas } from './components/PatternCanvas';
import { StatsPanel } from './components/StatsPanel';
import { ExportModal } from './components/ExportModal';
import { PixelWaveCanvas } from './components/PixelWaveCanvas';
import { LandingHero } from './components/LandingHero';
import { UserGuide } from './components/UserGuide';
import { PaletteStudioTransition } from './components/PaletteStudioTransition';
import { BookGuideTransition } from './components/BookGuideTransition';
import { FrostedTransition } from './components/FrostedTransition';
import { StudioControlsSidebar } from './components/studio/StudioControlsSidebar';
import { useViewTransitions } from './hooks/useViewTransitions';
import { usePegboard } from './hooks/usePegboard';
import { useImageProcessor } from './hooks/useImageProcessor';
import {
  Download,
  Sparkles,
  Server,
  Laptop,
  Loader2,
  ListFilter,
  Grid,
  Sliders,
  ArrowLeft,
  BookOpen
} from 'lucide-react';

export const App: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // 1. 视图与转场控制 Hook
  const {
    pageView,
    setPageView,
    isPaletteTransition,
    setIsPaletteTransition,
    isBookTransition,
    setIsBookTransition,
    transitionStage,
    navigateTo,
    handleEnterStudioWithPaletteTransition,
    handleOpenGuideWithBookTransition,
    handleImportImageFromLanding
  } = useViewTransitions(useCallback(() => {
    fileInputRef.current?.click();
  }, []));

  // 2. 图像量化与色彩处理 Hook (先初始化占位 aspect，后面通过引用配合)
  const [aspectRatio, setAspectRatio] = useState<number>(1);

  // 3. 拼豆板规划 Hook
  const pegboard = usePegboard(aspectRatio);

  // 当图片完成载入时的自适应尺寸排布回调
  const { sizeInputMode, currentBoard, handleBoardGridChange } = pegboard;

  // 当图片完成载入时的自适应尺寸排布回调
  const handleImageLoaded = useCallback((_img: HTMLImageElement, aspect: number) => {
    setAspectRatio(aspect);
    if (sizeInputMode === 'board_grid') {
      const boardRatio = currentBoard.width / currentBoard.height;
      const targetRatio = aspect / boardRatio;
      if (targetRatio > 1.3) {
        handleBoardGridChange(2, 1);
      } else if (targetRatio < 0.7) {
        handleBoardGridChange(1, 2);
      } else {
        handleBoardGridChange(1, 1);
      }
    }
  }, [sizeInputMode, currentBoard.width, currentBoard.height, handleBoardGridChange]);

  const processor = useImageProcessor({
    width: pegboard.width,
    height: pegboard.height,
    onImageLoaded: handleImageLoaded
  });

  // Mobile Tab Navigation State
  const [mobileTab, setMobileTab] = useState<'canvas' | 'controls' | 'stats'>('canvas');

  // 画布视图控制
  const [renderMode, setRenderMode] = useState<'bead' | 'flat'>('bead');
  const [showLabels, setShowLabels] = useState<boolean>(true);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [showRuler, setShowRuler] = useState<boolean>(true);
  const [showPegboardSeams, setShowPegboardSeams] = useState<boolean>(true);

  // 结果高亮与导出弹窗
  const [highlightColor, setHighlightColor] = useState<BeadColor | null>(null);
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);

  return (
    <>
      {/* 全局高级磨砂玻璃转场蒙版 */}
      {transitionStage !== 'idle' && (
        <FrostedTransition phase={transitionStage === 'in' ? 'in' : 'out'} />
      )}

      {/* 调色盘放大旋转转场 */}
      {isPaletteTransition && (
        <PaletteStudioTransition
          onSwappedView={() => {
            setPageView('studio');
            window.location.hash = '#studio';
          }}
          onFinished={() => {
            setIsPaletteTransition(false);
          }}
        />
      )}

      {/* 书本翻页转场 */}
      {isBookTransition && (
        <BookGuideTransition
          onSwappedView={() => {
            setPageView('guide');
            window.location.hash = '#guide';
            window.scrollTo({ top: 0, behavior: 'instant' });
          }}
          onFinished={() => {
            setIsBookTransition(false);
          }}
        />
      )}

      {/* 首页或指南视图 */}
      {pageView !== 'studio' ? (
        <div className="min-h-screen bg-[#FAF9F5] text-[#1F1E1D] flex flex-col relative selection:bg-[#D97757]/20 font-sans">
          <PixelWaveCanvas />

          {/* 全局统一顶栏 */}
          <header className="sticky top-0 z-50 px-4 sm:px-8 py-3.5 backdrop-blur-md bg-[#FAF9F5]/90 border-b border-[#2D2A26]/8 flex items-center justify-between">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigateTo('home')}>
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#D97757] to-[#E28C70] flex items-center justify-center text-white shadow-sm font-bold text-base shadow-[#D97757]/25">
                🧶
              </div>
              <span className="font-bold text-lg text-[#1F1E1D] tracking-tight">拼豆灵感工坊</span>
            </div>

            <nav className="flex items-center gap-6 sm:gap-8 text-sm font-medium text-[#54524E]">
              <button
                onClick={() => navigateTo('home')}
                className={`hover:text-[#D97757] transition-colors cursor-pointer relative py-1 ${pageView === 'home' ? 'text-[#D97757] font-semibold' : ''}`}
              >
                首页
                {pageView === 'home' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#D97757] rounded-full" />}
              </button>
              <button
                onClick={() => {
                  if (pageView === 'home') {
                    handleOpenGuideWithBookTransition();
                  } else {
                    navigateTo('guide');
                  }
                }}
                className={`hover:text-[#D97757] transition-colors cursor-pointer relative py-1 ${pageView === 'guide' ? 'text-[#D97757] font-semibold' : ''}`}
              >
                使用指南
                {pageView === 'guide' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#D97757] rounded-full" />}
              </button>
            </nav>

            <button
              onClick={() => {
                if (pageView === 'home') {
                  handleEnterStudioWithPaletteTransition();
                } else {
                  navigateTo('studio');
                }
              }}
              className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-white bg-[#1F1E1D] hover:bg-[#D97757] transition-all shadow-sm hover:shadow-md cursor-pointer"
            >
              进入设计工作台 →
            </button>
          </header>

          {/* 核心内容区 */}
          <main className="relative z-10 flex-1 flex flex-col">
            {pageView === 'home' ? (
              <LandingHero
                onImportClick={handleImportImageFromLanding}
                onEnterStudio={handleEnterStudioWithPaletteTransition}
                onOpenGuide={handleOpenGuideWithBookTransition}
              />
            ) : (
              <UserGuide onStartCreating={handleEnterStudioWithPaletteTransition} />
            )}
          </main>
        </div>
      ) : (
        /* 工作台界面 */
        <div
          className="flex flex-col h-screen w-screen overflow-hidden bg-[#FAF9F5] text-[#1F1E1D] touch-manipulation font-sans"
          onDragOver={e => e.preventDefault()}
          onDrop={processor.handleDrop}
        >
          {/* 1. Header Bar */}
          <header className="h-14 bg-[#FAF9F5]/95 backdrop-blur-md border-b border-[#2D2A26]/10 px-3 sm:px-6 flex items-center justify-between shadow-xs z-20 shrink-0">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <button
                onClick={() => navigateTo('home')}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-[#2D2A26]/10 text-[#54524E] hover:text-[#D97757] hover:border-[#D97757]/30 bg-white/80 hover:bg-[#FAF9F5] text-xs font-medium transition cursor-pointer shrink-0 shadow-xs"
                title="返回工坊首页"
              >
                <ArrowLeft size={14} />
                <span className="hidden sm:inline">首页</span>
              </button>
              <button
                onClick={() => navigateTo('guide')}
                className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-[#2D2A26]/10 text-[#54524E] hover:text-[#D97757] hover:border-[#D97757]/30 bg-white/80 hover:bg-[#FAF9F5] text-xs font-medium transition cursor-pointer shrink-0 shadow-xs"
                title="查看使用指南"
              >
                <BookOpen size={14} />
                <span>指南</span>
              </button>

              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#D97757] to-[#E28C70] flex items-center justify-center text-white shadow-sm shadow-[#D97757]/25 shrink-0">
                <Sparkles size={16} />
              </div>
              <div className="min-w-0">
                <h1 className="text-xs sm:text-base font-bold text-[#1F1E1D] leading-tight flex items-center gap-1.5">
                  <span className="truncate">拼豆图纸工坊</span>
                  <span className="hidden sm:inline text-[10px] font-medium px-2 py-0.5 bg-[#D97757]/10 text-[#C15F3F] border border-[#D97757]/20 rounded-md">
                    PixelBead Studio
                  </span>
                </h1>
                <p className="hidden md:block text-[11px] text-[#85827C] truncate">
                  支持自定义拼豆板 · VPS 云端生图 · 真实色卡匹配
                </p>
              </div>
            </div>

            {/* Header Right Actions */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <button
                onClick={() => processor.setRenderBackend(processor.renderBackend === 'vps' ? 'local' : 'vps')}
                title="点击切换渲染引擎节点"
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border text-[11px] sm:text-xs font-medium transition cursor-pointer ${
                  processor.renderBackend === 'vps'
                    ? 'bg-emerald-50/80 text-emerald-800 border-emerald-300 hover:bg-emerald-100/80'
                    : 'bg-amber-50/80 text-amber-800 border-amber-300 hover:bg-amber-100/80'
                }`}
              >
                {processor.renderBackend === 'vps' ? <Server size={13} /> : <Laptop size={13} />}
                <span className="hidden xs:inline">
                  {processor.renderBackend === 'vps' ? (processor.vpsOnline ? 'VPS 云端' : 'VPS 连接中') : '本地渲染'}
                </span>
                <span className="xs:hidden">
                  {processor.renderBackend === 'vps' ? '云端' : '本地'}
                </span>
                {processor.isProcessing && <Loader2 size={12} className="animate-spin ml-0.5" />}
              </button>

              {processor.quantizeResult && (
                <div className="hidden xl:flex items-center gap-3 text-xs bg-white/80 px-3.5 py-1.5 rounded-xl border border-[#2D2A26]/10 text-[#54524E] shadow-xs">
                  <span>
                    总规格: <strong className="text-[#1F1E1D] font-mono">{processor.quantizeResult.width}×{processor.quantizeResult.height}</strong> 格
                  </span>
                  <span className="text-[#2D2A26]/20">|</span>
                  <span>
                    拼板数: <strong className="text-[#D97757] font-mono">{pegboard.totalBoardsCount}</strong> 块 ({pegboard.currentBoard.width}×{pegboard.currentBoard.height}板)
                  </span>
                  <span className="text-[#2D2A26]/20">|</span>
                  <span>
                    成品尺寸: <strong className="text-[#1F1E1D] font-mono">{pegboard.physicalWidthCm}×{pegboard.physicalHeightCm} cm</strong> ({pegboard.beadDiameter}mm豆)
                  </span>
                  <span className="text-[#2D2A26]/20">|</span>
                  <span>
                    总用量: <strong className="text-[#D97757] font-mono">{processor.quantizeResult.totalBeads}</strong> 颗
                  </span>
                </div>
              )}

              <button
                onClick={() => setIsExportOpen(true)}
                disabled={!processor.quantizeResult}
                className="flex items-center gap-1.5 sm:gap-2 bg-[#D97757] hover:bg-[#C15F3F] text-white text-[11px] sm:text-xs font-semibold px-3 sm:px-4 py-2 rounded-xl shadow-sm hover:shadow transition disabled:opacity-50 cursor-pointer"
              >
                <Download size={14} />
                <span>导出图纸</span>
              </button>
            </div>
          </header>

          {/* 2. Main Workspace Layout */}
          <div className="flex-1 flex overflow-hidden relative">
            {/* Left Sidebar Controls */}
            <StudioControlsSidebar
              mobileTab={mobileTab}
              setMobileTab={setMobileTab}
              fileInputRef={fileInputRef}
              handleFileUpload={processor.handleFileUpload}
              loadImageUrl={processor.loadImageUrl}
              pegboardList={pegboard.pegboardList}
              activeBoardId={pegboard.activeBoardId}
              currentBoard={pegboard.currentBoard}
              handleSelectPegboard={pegboard.handleSelectPegboard}
              showAddBoard={pegboard.showAddBoard}
              setShowAddBoard={pegboard.setShowAddBoard}
              newBoardName={pegboard.newBoardName}
              setNewBoardName={pegboard.setNewBoardName}
              newBoardW={pegboard.newBoardW}
              setNewBoardW={pegboard.setNewBoardW}
              newBoardH={pegboard.newBoardH}
              setNewBoardH={pegboard.setNewBoardH}
              handleCreateCustomBoard={pegboard.handleCreateCustomBoard}
              handleDeleteCustomBoard={pegboard.handleDeleteCustomBoard}
              sizeInputMode={pegboard.sizeInputMode}
              setSizeInputMode={pegboard.setSizeInputMode}
              boardCols={pegboard.boardCols}
              boardRows={pegboard.boardRows}
              handleBoardGridChange={pegboard.handleBoardGridChange}
              handleAdaptAspect={pegboard.handleAdaptAspect}
              width={pegboard.width}
              height={pegboard.height}
              setWidth={pegboard.setWidth}
              setHeight={pegboard.setHeight}
              handleWidthChange={pegboard.handleWidthChange}
              handleHeightChange={pegboard.handleHeightChange}
              lockAspect={pegboard.lockAspect}
              setLockAspect={pegboard.setLockAspect}
              totalBoardsX={pegboard.totalBoardsX}
              totalBoardsY={pegboard.totalBoardsY}
              totalBoardsCount={pegboard.totalBoardsCount}
              beadDiameter={pegboard.beadDiameter}
              setBeadDiameter={pegboard.setBeadDiameter}
              physicalWidthCm={pegboard.physicalWidthCm}
              physicalHeightCm={pegboard.physicalHeightCm}
              selectedBrand={processor.selectedBrand}
              setSelectedBrand={processor.setSelectedBrand}
              maxColors={processor.maxColors}
              setMaxColors={processor.setMaxColors}
              dither={processor.dither}
              setDither={processor.setDither}
              removeBg={processor.removeBg}
              setRemoveBg={processor.setRemoveBg}
              bgTolerance={processor.bgTolerance}
              setBgTolerance={processor.setBgTolerance}
              brightness={processor.brightness}
              setBrightness={processor.setBrightness}
              contrast={processor.contrast}
              setContrast={processor.setContrast}
              saturation={processor.saturation}
              setSaturation={processor.setSaturation}
            />

            {/* Center Canvas Area */}
            <main className="flex-1 flex flex-col min-w-0 bg-[#F4F1EA] overflow-hidden relative">
              <div className="absolute top-2.5 sm:top-4 left-2.5 sm:left-4 right-2.5 sm:right-auto z-10 overflow-x-auto no-scrollbar py-0.5">
                <div className="inline-flex items-center gap-2 sm:gap-3 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-[#2D2A26]/10 shadow-sm text-xs whitespace-nowrap">
                  <div className="flex items-center bg-[#FAF9F5] p-0.5 rounded-xl border border-[#2D2A26]/8 text-[#54524E] font-medium shrink-0">
                    <button
                      onClick={() => setRenderMode('bead')}
                      className={`px-2.5 sm:px-3 py-1 rounded-lg transition cursor-pointer text-[11px] sm:text-xs ${
                        renderMode === 'bead' ? 'bg-white text-[#D97757] shadow-xs font-bold' : ''
                      }`}
                    >
                      圆孔拼豆
                    </button>
                    <button
                      onClick={() => setRenderMode('flat')}
                      className={`px-2.5 sm:px-3 py-1 rounded-lg transition cursor-pointer text-[11px] sm:text-xs ${
                        renderMode === 'flat' ? 'bg-white text-[#D97757] shadow-xs font-bold' : ''
                      }`}
                    >
                      平铺格
                    </button>
                  </div>

                  <div className="h-3.5 w-px bg-[#2D2A26]/10 shrink-0" />

                  <label className="flex items-center gap-1.5 cursor-pointer text-[#54524E] select-none text-[11px] sm:text-xs shrink-0">
                    <input
                      type="checkbox"
                      checked={showLabels}
                      onChange={e => setShowLabels(e.target.checked)}
                      className="rounded border-[#2D2A26]/20 text-[#D97757] focus:ring-[#D97757] h-3.5 w-3.5 accent-[#D97757]"
                    />
                    <span>色号</span>
                  </label>

                  <label className="flex items-center gap-1.5 cursor-pointer text-[#54524E] select-none text-[11px] sm:text-xs shrink-0">
                    <input
                      type="checkbox"
                      checked={showGrid}
                      onChange={e => setShowGrid(e.target.checked)}
                      className="rounded border-[#2D2A26]/20 text-[#D97757] focus:ring-[#D97757] h-3.5 w-3.5 accent-[#D97757]"
                    />
                    <span>网格</span>
                  </label>

                  <label className="flex items-center gap-1.5 cursor-pointer text-[#54524E] select-none text-[11px] sm:text-xs shrink-0">
                    <input
                      type="checkbox"
                      checked={showPegboardSeams}
                      onChange={e => setShowPegboardSeams(e.target.checked)}
                      className="rounded border-[#2D2A26]/20 text-[#D97757] focus:ring-[#D97757] h-3.5 w-3.5 accent-[#D97757]"
                    />
                    <span className="text-[#C15F3F] font-semibold">拼板线</span>
                  </label>

                  <label className="flex items-center gap-1.5 cursor-pointer text-[#54524E] select-none text-[11px] sm:text-xs shrink-0">
                    <input
                      type="checkbox"
                      checked={showRuler}
                      onChange={e => setShowRuler(e.target.checked)}
                      className="rounded border-[#2D2A26]/20 text-[#D97757] focus:ring-[#D97757] h-3.5 w-3.5 accent-[#D97757]"
                    />
                    <span>标尺</span>
                  </label>
                </div>
              </div>

              {processor.isProcessing && (
                <div className="absolute top-12 sm:top-4 right-2.5 sm:right-4 z-10 bg-[#1F1E1D]/90 text-white backdrop-blur-md px-3.5 py-1.5 rounded-2xl border border-white/10 shadow-md flex items-center gap-2 text-[11px] sm:text-xs">
                  <Loader2 size={13} className="animate-spin text-[#D97757] shrink-0" />
                  <span>{processor.processingTip || 'VPS 计算中...'}</span>
                </div>
              )}

              <div className="flex-1 w-full h-full pb-14 lg:pb-0">
                {processor.quantizeResult ? (
                  <PatternCanvas
                    result={processor.quantizeResult}
                    highlightColor={highlightColor}
                    onSelectColor={setHighlightColor}
                    renderMode={renderMode}
                    showLabels={showLabels}
                    showGrid={showGrid}
                    showRuler={showRuler}
                    showPegboardSeams={showPegboardSeams}
                    pegboardWidth={pegboard.currentBoard.width}
                    pegboardHeight={pegboard.currentBoard.height}
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-[#85827C] gap-2">
                    <Loader2 size={32} className="animate-spin text-[#D97757]" />
                    <span className="text-xs">正在渲染拼豆图纸，请稍候...</span>
                  </div>
                )}
              </div>
            </main>

            {/* Right Sidebar Stats */}
            {processor.quantizeResult && (
              <aside
                className={`
                  ${mobileTab === 'stats' ? 'fixed inset-0 z-40 bg-white flex flex-col pt-0 pb-16' : 'hidden'}
                  lg:flex lg:static lg:w-80 xl:w-88 flex-shrink-0 bg-white border-l border-[#2D2A26]/10 flex-col h-full overflow-hidden shadow-xs z-20
                `}
              >
                <StatsPanel
                  stats={processor.quantizeResult.stats}
                  totalBeads={processor.quantizeResult.totalBeads}
                  highlightColor={highlightColor}
                  onSelectColor={color => {
                    setHighlightColor(color);
                    if (window.innerWidth < 1024) {
                      setMobileTab('canvas');
                    }
                  }}
                  onClose={() => setMobileTab('canvas')}
                />
              </aside>
            )}
          </div>

          {/* 3. Mobile Bottom Navigation Bar */}
          <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-14 bg-[#FAF9F5]/95 backdrop-blur-md border-t border-[#2D2A26]/10 flex items-center justify-around z-30 px-2 pb-[env(safe-area-inset-bottom)]">
            <button
              onClick={() => setMobileTab('canvas')}
              className={`flex flex-col items-center justify-center flex-1 py-1 transition cursor-pointer ${
                mobileTab === 'canvas' ? 'text-[#D97757] font-bold' : 'text-[#85827C]'
              }`}
            >
              <Grid size={18} />
              <span className="text-[10px] mt-0.5">图纸画板</span>
            </button>

            <button
              onClick={() => setMobileTab('controls')}
              className={`flex flex-col items-center justify-center flex-1 py-1 transition cursor-pointer ${
                mobileTab === 'controls' ? 'text-[#D97757] font-bold' : 'text-[#85827C]'
              }`}
            >
              <Sliders size={18} />
              <span className="text-[10px] mt-0.5">参数调节</span>
            </button>

            <button
              onClick={() => setMobileTab('stats')}
              className={`flex flex-col items-center justify-center flex-1 py-1 transition cursor-pointer relative ${
                mobileTab === 'stats' ? 'text-[#D97757] font-bold' : 'text-[#85827C]'
              }`}
            >
              <ListFilter size={18} />
              <span className="text-[10px] mt-0.5">用料清单</span>
              {processor.quantizeResult && (
                <span className="absolute top-1 right-1/4 w-2 h-2 bg-[#D97757] rounded-full" />
              )}
            </button>

            <button
              onClick={() => setIsExportOpen(true)}
              disabled={!processor.quantizeResult}
              className="flex flex-col items-center justify-center flex-1 py-1 text-[#54524E] transition cursor-pointer disabled:opacity-40"
            >
              <Download size={18} className="text-[#D97757]" />
              <span className="text-[10px] mt-0.5 font-medium">导出图纸</span>
            </button>
          </nav>

          {/* Export Modal */}
          {processor.quantizeResult && (
            <ExportModal
              isOpen={isExportOpen}
              onClose={() => setIsExportOpen(false)}
              result={processor.quantizeResult}
              pegboardWidth={pegboard.currentBoard.width}
              pegboardHeight={pegboard.currentBoard.height}
              vpsAvailable={processor.vpsOnline}
            />
          )}
        </div>
      )}
    </>
  );
};
export default App;

