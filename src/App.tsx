import React, { useState, useEffect, useRef } from 'react';
import { PALETTES } from './data/palettes';
import type { BeadColor, BrandKey } from './data/palettes';
import { DEFAULT_PEGBOARDS, BEAD_DIAMETERS } from './data/pegboard';
import type { PegboardConfig } from './data/pegboard';
import { processImageToPattern } from './utils/quantize';
import type { QuantizeResult, ProcessOptions } from './utils/quantize';
import { PatternCanvas } from './components/PatternCanvas';
import { StatsPanel } from './components/StatsPanel';
import { ExportModal } from './components/ExportModal';
import { generateSampleHeart, generateSampleMushroom, generateSamplePikachu } from './utils/sampleImages';
import { checkVpsHealth, requestVpsQuantize } from './services/vpsService';
import { PixelWaveCanvas } from './components/PixelWaveCanvas';
import { LandingHero } from './components/LandingHero';
import { UserGuide } from './components/UserGuide';
import { FrostedTransition } from './components/FrostedTransition';
import {
  Upload,
  Image as ImageIcon,
  Palette,
  Sliders,
  Grid,
  Download,
  Sparkles,
  Lock,
  Unlock,
  Plus,
  Trash2,
  Server,
  Laptop,
  Loader2,
  Check,
  ListFilter,
  ArrowLeft,
  BookOpen
} from 'lucide-react';

export const App: React.FC = () => {
  // 页面全局视图状态: 'home' (首页落地页) | 'guide' (使用指南) | 'studio' (设计工作台)
  const [pageView, setPageView] = useState<'home' | 'guide' | 'studio'>(() => {
    if (typeof window !== 'undefined') {
      if (window.location.hash === '#guide') return 'guide';
      if (window.location.hash === '#studio') return 'studio';
    }
    return 'home';
  });

  // 磨砂玻璃转场动画阶段: 'idle' (无) | 'in' (磨砂渐入) | 'out' (磨砂渐出消散)
  const [transitionStage, setTransitionStage] = useState<'idle' | 'in' | 'out'>('idle');

  const navigateTo = (view: 'home' | 'guide' | 'studio') => {
    setPageView(view);
    if (view === 'home') window.location.hash = '#home';
    else if (view === 'guide') window.location.hash = '#guide';
    else if (view === 'studio') window.location.hash = '#studio';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    const handleHashChange = () => {
      const h = window.location.hash;
      if (h === '#guide') setPageView('guide');
      else if (h === '#studio') setPageView('studio');
      else if (h === '#home' || !h) setPageView('home');
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // 从首页点击“导入图片生成图纸”：触发约 2 秒舒缓优雅的磨砂玻璃跨屏平滑过渡，并在退散完成后弹出系统文件选择窗口
  const handleImportImageFromLanding = () => {
    // 阶段 1: 磨砂玻璃薄雾从容渐入 (0 ~ 950ms，约 1 秒)
    setTransitionStage('in');

    setTimeout(() => {
      // 阶段 2: 背景处于深度磨砂状态，无感平滑切换至工作台 (950ms)
      setPageView('studio');
      window.location.hash = '#studio';
      // 阶段 3: 磨砂玻璃伴随呼吸光晕柔和散去，工作台温润浮现 (950ms ~ 1900ms)
      setTransitionStage('out');

      setTimeout(() => {
        // 阶段 4: 约 2 秒整，转场完全就绪，卸载遮罩
        setTransitionStage('idle');
        // 磨砂散尽瞬间，顺畅唤起系统本地文件选择窗口
        setTimeout(() => {
          fileInputRef.current?.click();
        }, 100);
      }, 950);
    }, 950);
  };

  // Mobile Tab Navigation State
  const [mobileTab, setMobileTab] = useState<'canvas' | 'controls' | 'stats'>('canvas');

  // Image & Processing State
  const [imageEl, setImageEl] = useState<HTMLImageElement | null>(null);
  const [aspectRatio, setAspectRatio] = useState<number>(1);
  const [lockAspect, setLockAspect] = useState<boolean>(true);

  // Settings
  const [width, setWidth] = useState<number>(28);
  const [height, setHeight] = useState<number>(28);
  const [selectedBrand, setSelectedBrand] = useState<BrandKey | 'all'>('mard');
  const [dither, setDither] = useState<boolean>(false);
  const [removeBg, setRemoveBg] = useState<boolean>(false);
  const [bgTolerance, setBgTolerance] = useState<number>(10);
  const [maxColors, setMaxColors] = useState<number>(0); // 0 = unlimited

  // VPS 渲染架构与状态
  const [renderBackend, setRenderBackend] = useState<'vps' | 'local'>('vps');
  const [vpsOnline, setVpsOnline] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingTip, setProcessingTip] = useState<string>('');

  // Pegboard (单块拼豆板) 管理状态
  const [pegboardList, setPegboardList] = useState<PegboardConfig[]>(() => {
    try {
      const saved = localStorage.getItem('pixel_pegboard_list');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // ignore
    }
    return DEFAULT_PEGBOARDS;
  });

  const [activeBoardId, setActiveBoardId] = useState<string>('28x28');
  const currentBoard = pegboardList.find(b => b.id === activeBoardId) || pegboardList[0];

  // 拼板连拼块数
  const [boardCols, setBoardCols] = useState<number>(1);
  const [boardRows, setBoardRows] = useState<number>(1);
  const [sizeInputMode, setSizeInputMode] = useState<'board_grid' | 'custom_pixels'>('board_grid');

  // 颗粒物理尺寸估算 (mm)
  const [beadDiameter, setBeadDiameter] = useState<number>(2.6);

  // 图像微调滤镜
  const [brightness, setBrightness] = useState<number>(0);
  const [contrast, setContrast] = useState<number>(0);
  const [saturation, setSaturation] = useState<number>(0);

  // 视图控制
  const [renderMode, setRenderMode] = useState<'bead' | 'flat'>('bead');
  const [showLabels, setShowLabels] = useState<boolean>(true);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [showRuler, setShowRuler] = useState<boolean>(true);
  const [showPegboardSeams, setShowPegboardSeams] = useState<boolean>(true);

  // 结果数据与色号高亮
  const [quantizeResult, setQuantizeResult] = useState<QuantizeResult | null>(null);
  const [highlightColor, setHighlightColor] = useState<BeadColor | null>(null);
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);

  // 自定义单板表单
  const [showAddBoard, setShowAddBoard] = useState(false);
  const [newBoardName, setNewBoardName] = useState('');
  const [newBoardW, setNewBoardW] = useState(28);
  const [newBoardH, setNewBoardH] = useState(28);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // 探测 VPS 服务健康状态
  useEffect(() => {
    let mounted = true;
    checkVpsHealth().then(health => {
      if (mounted) {
        const isOnline = !!(health && health.status === 'ok');
        setVpsOnline(isOnline);
        if (!isOnline) {
          setRenderBackend('local');
        }
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  // 预置默认示例图
  useEffect(() => {
    const defaultMushroom = generateSampleMushroom();
    loadImageUrl(defaultMushroom);
  }, []);

  // 拼板数计算
  const totalBoardsX = Math.ceil(width / currentBoard.width);
  const totalBoardsY = Math.ceil(height / currentBoard.height);
  const totalBoardsCount = totalBoardsX * totalBoardsY;

  // 成品物理尺寸 (cm)
  const physicalWidthCm = ((width * beadDiameter) / 10).toFixed(1);
  const physicalHeightCm = ((height * beadDiameter) / 10).toFixed(1);

  // 加载图片 URL
  const loadImageUrl = (url: string) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setImageEl(img);
      setAspectRatio(img.width / img.height);
      if (sizeInputMode === 'board_grid') {
        const boardRatio = currentBoard.width / currentBoard.height;
        const targetRatio = (img.width / img.height) / boardRatio;
        if (targetRatio > 1.3) {
          setBoardCols(2);
          setBoardRows(1);
          setWidth(currentBoard.width * 2);
          setHeight(currentBoard.height * 1);
        } else if (targetRatio < 0.7) {
          setBoardCols(1);
          setBoardRows(2);
          setWidth(currentBoard.width * 1);
          setHeight(currentBoard.height * 2);
        } else {
          setBoardCols(1);
          setBoardRows(1);
          setWidth(currentBoard.width);
          setHeight(currentBoard.height);
        }
      }
    };
    img.src = url;
  };

  // 本地文件上传处理
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      if (typeof event.target?.result === 'string') {
        loadImageUrl(event.target.result);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // 拖拽上传
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = event => {
        if (typeof event.target?.result === 'string') {
          loadImageUrl(event.target.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // 切换单板规格
  const handleSelectPegboard = (board: PegboardConfig) => {
    setActiveBoardId(board.id);
    if (sizeInputMode === 'board_grid') {
      setWidth(board.width * boardCols);
      setHeight(board.height * boardRows);
    }
  };

  // 修改连拼块数
  const handleBoardGridChange = (cols: number, rows: number) => {
    setBoardCols(cols);
    setBoardRows(rows);
    setWidth(currentBoard.width * cols);
    setHeight(currentBoard.height * rows);
  };

  // 自由格数修改
  const handleWidthChange = (val: number) => {
    const newW = Math.max(4, Math.min(240, val));
    setWidth(newW);
    if (lockAspect && aspectRatio > 0) {
      const newH = Math.max(4, Math.min(240, Math.round(newW / aspectRatio)));
      setHeight(newH);
    }
  };

  const handleHeightChange = (val: number) => {
    const newH = Math.max(4, Math.min(240, val));
    setHeight(newH);
    if (lockAspect && aspectRatio > 0) {
      const newW = Math.max(4, Math.min(240, Math.round(newH * aspectRatio)));
      setWidth(newW);
    }
  };

  // 自适应原图比例
  const handleAdaptAspect = () => {
    if (!aspectRatio) return;
    if (sizeInputMode === 'board_grid') {
      const boardAspect = currentBoard.width / currentBoard.height;
      const targetAspect = aspectRatio / boardAspect;

      let bestCols = 1;
      let bestRows = 1;
      let minDiff = 999;

      for (let c = 1; c <= 4; c++) {
        for (let r = 1; r <= 4; r++) {
          const diff = Math.abs(c / r - targetAspect);
          if (diff < minDiff) {
            minDiff = diff;
            bestCols = c;
            bestRows = r;
          }
        }
      }
      handleBoardGridChange(bestCols, bestRows);
    } else {
      if (aspectRatio >= 1) {
        setWidth(width);
        setHeight(Math.max(4, Math.round(width / aspectRatio)));
      } else {
        setHeight(height);
        setWidth(Math.max(4, Math.round(height * aspectRatio)));
      }
    }
  };

  // 添加自定义单板
  const handleCreateCustomBoard = () => {
    if (!newBoardName.trim()) return;
    const newBoard: PegboardConfig = {
      id: `custom_${Date.now()}`,
      name: newBoardName.trim(),
      width: newBoardW,
      height: newBoardH,
      isCustom: true
    };
    const updated = [...pegboardList, newBoard];
    setPegboardList(updated);
    setActiveBoardId(newBoard.id);
    localStorage.setItem('pixel_pegboard_list', JSON.stringify(updated));
    setShowAddBoard(false);
    setNewBoardName('');

    if (sizeInputMode === 'board_grid') {
      setWidth(newBoard.width * boardCols);
      setHeight(newBoard.height * boardRows);
    }
  };

  // 删除自定义单板
  const handleDeleteCustomBoard = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = pegboardList.filter(b => b.id !== id);
    setPegboardList(updated);
    localStorage.setItem('pixel_pegboard_list', JSON.stringify(updated));
    if (activeBoardId === id) {
      setActiveBoardId(DEFAULT_PEGBOARDS[0].id);
    }
  };

  // 拼豆图纸量化生成 (支持防抖与 VPS 降级)
  useEffect(() => {
    if (!imageEl) return;

    const controller = new AbortController();
    setIsProcessing(true);
    setProcessingTip(renderBackend === 'vps' ? 'VPS 云端量化测色中...' : '本地算力渲染中...');

    const timer = setTimeout(async () => {
      const palette = selectedBrand === 'all'
        ? [...PALETTES.mard, ...PALETTES.perler, ...PALETTES.artkal]
        : PALETTES[selectedBrand];

      const options: ProcessOptions = {
        width,
        height,
        palette,
        dither,
        removeBackground: removeBg,
        bgTolerance,
        brightness,
        contrast,
        saturation,
        maxColors
      };

      if (renderBackend === 'vps' && vpsOnline) {
        try {
          const res = await requestVpsQuantize(imageEl, options);
          setQuantizeResult(res);
        } catch (err: any) {
          console.warn('VPS Quantize failed, fallback to local', err);
          setProcessingTip('VPS 拥堵，自动切换本地计算...');
          const res = await processImageToPattern(imageEl, options);
          setQuantizeResult(res);
        } finally {
          setIsProcessing(false);
          setProcessingTip('');
        }
      } else {
        try {
          const res = await processImageToPattern(imageEl, options);
          setQuantizeResult(res);
        } catch (err) {
          console.error('Local quantize error', err);
        } finally {
          setIsProcessing(false);
          setProcessingTip('');
        }
      }
    }, 280);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [
    imageEl,
    width,
    height,
    selectedBrand,
    dither,
    removeBg,
    bgTolerance,
    brightness,
    contrast,
    saturation,
    maxColors,
    renderBackend,
    vpsOnline
  ]);

  return (
    <>
      {/* 全局高级磨砂玻璃转场蒙版 (约 2 秒舒缓呼吸节奏，告别突兀跳转) */}
      {transitionStage !== 'idle' && (
        <FrostedTransition phase={transitionStage === 'in' ? 'in' : 'out'} />
      )}

      {/* 首页或指南视图 */}
      {pageView !== 'studio' ? (
        <div className="min-h-screen bg-[#FAF9F5] text-[#1F1E1D] flex flex-col relative selection:bg-[#D97757]/20 font-sans">
          <PixelWaveCanvas />

          {/* 全局统一顶栏 */}
          <header className="sticky top-0 z-50 px-4 sm:px-8 py-3.5 backdrop-blur-md bg-[#FAF9F5]/90 border-b border-[#2D2A26]/8 flex items-center justify-between">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigateTo('home')}>
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#D97757] to-[#E28C70] flex items-center justify-center text-white shadow-sm font-bold text-base shadow-[#D97757]/25">
                🧵
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
                onClick={() => navigateTo('guide')}
                className={`hover:text-[#D97757] transition-colors cursor-pointer relative py-1 ${pageView === 'guide' ? 'text-[#D97757] font-semibold' : ''}`}
              >
                使用指南
                {pageView === 'guide' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#D97757] rounded-full" />}
              </button>
            </nav>

            <button
              onClick={() => navigateTo('studio')}
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
                onEnterStudio={() => navigateTo('studio')}
                onOpenGuide={() => navigateTo('guide')}
              />
            ) : (
              <UserGuide onStartCreating={() => navigateTo('studio')} />
            )}
          </main>
        </div>
      ) : (
        /* 工作台界面 (与网站首页暖调手作美学统一) */
        <div
          className="flex flex-col h-screen w-screen overflow-hidden bg-[#FAF9F5] text-[#1F1E1D] touch-manipulation font-sans"
          onDragOver={e => e.preventDefault()}
          onDrop={handleDrop}
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
                onClick={() => setRenderBackend(renderBackend === 'vps' ? 'local' : 'vps')}
                title="点击切换渲染引擎节点"
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border text-[11px] sm:text-xs font-medium transition cursor-pointer ${
                  renderBackend === 'vps'
                    ? 'bg-emerald-50/80 text-emerald-800 border-emerald-300 hover:bg-emerald-100/80'
                    : 'bg-amber-50/80 text-amber-800 border-amber-300 hover:bg-amber-100/80'
                }`}
              >
                {renderBackend === 'vps' ? <Server size={13} /> : <Laptop size={13} />}
                <span className="hidden xs:inline">
                  {renderBackend === 'vps' ? (vpsOnline ? 'VPS 云端' : 'VPS 连接中') : '本地渲染'}
                </span>
                <span className="xs:hidden">
                  {renderBackend === 'vps' ? '云端' : '本地'}
                </span>
                {isProcessing && <Loader2 size={12} className="animate-spin ml-0.5" />}
              </button>

              {quantizeResult && (
                <div className="hidden xl:flex items-center gap-3 text-xs bg-white/80 px-3.5 py-1.5 rounded-xl border border-[#2D2A26]/10 text-[#54524E] shadow-xs">
                  <span>
                    总规格: <strong className="text-[#1F1E1D] font-mono">{quantizeResult.width}×{quantizeResult.height}</strong> 格
                  </span>
                  <span className="text-[#2D2A26]/20">|</span>
                  <span>
                    拼板数: <strong className="text-[#D97757] font-mono">{totalBoardsCount}</strong> 块 ({currentBoard.width}×{currentBoard.height}板)
                  </span>
                  <span className="text-[#2D2A26]/20">|</span>
                  <span>
                    成品尺寸: <strong className="text-[#1F1E1D] font-mono">{physicalWidthCm}×{physicalHeightCm} cm</strong> ({beadDiameter}mm豆)
                  </span>
                  <span className="text-[#2D2A26]/20">|</span>
                  <span>
                    总用量: <strong className="text-[#D97757] font-mono">{quantizeResult.totalBeads}</strong> 颗
                  </span>
                </div>
              )}

              <button
                onClick={() => setIsExportOpen(true)}
                disabled={!quantizeResult}
                className="flex items-center gap-1.5 sm:gap-2 bg-[#D97757] hover:bg-[#C15F3F] text-white text-[11px] sm:text-xs font-semibold px-3 sm:px-4 py-2 rounded-xl shadow-sm hover:shadow transition disabled:opacity-50 cursor-pointer"
              >
                <Download size={14} />
                <span>导出图纸</span>
              </button>
            </div>
          </header>

          {/* 2. Main Workspace Layout */}
          <div className="flex-1 flex overflow-hidden relative">
            {/* Left Sidebar */}
            <aside
              className={`
                ${mobileTab === 'controls' ? 'fixed inset-0 z-40 bg-white flex flex-col pt-0 pb-16' : 'hidden'}
                lg:flex lg:static lg:w-80 xl:w-88 flex-shrink-0 bg-white border-r border-[#2D2A26]/10 flex-col h-full overflow-y-auto z-20
              `}
            >
              <div className="lg:hidden px-4 py-3 bg-[#FAF9F5] border-b border-[#2D2A26]/10 flex items-center justify-between sticky top-0 z-10 shrink-0">
                <span className="font-bold text-[#1F1E1D] text-sm flex items-center gap-1.5">
                  <Sliders size={16} className="text-[#D97757]" />
                  <span>图纸与色彩参数</span>
                </span>
                <button
                  onClick={() => setMobileTab('canvas')}
                  className="px-3 py-1 bg-[#D97757] text-white text-xs font-semibold rounded-xl shadow-xs cursor-pointer flex items-center gap-1"
                >
                  <Check size={14} />
                  <span>完成并查看</span>
                </button>
              </div>

              {/* Upload & Samples */}
              <div className="p-3.5 sm:p-4 border-b border-[#2D2A26]/10 space-y-3">
                <span className="text-xs font-bold text-[#1F1E1D] uppercase tracking-wider flex items-center gap-1.5">
                  <ImageIcon size={14} className="text-[#D97757]" />
                  图片来源
                </span>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileUpload}
                />

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-[#2D2A26]/15 hover:border-[#D97757] hover:bg-[#D97757]/5 rounded-2xl p-3.5 text-center transition flex flex-col items-center justify-center gap-1.5 group cursor-pointer"
                >
                  <Upload size={20} className="text-[#85827C] group-hover:text-[#D97757] group-hover:scale-110 transition" />
                  <span className="text-xs font-semibold text-[#54524E] group-hover:text-[#D97757]">
                    点击上传图片 或 直接拖拽到此处
                  </span>
                  <span className="text-[10px] text-[#85827C]">支持 PNG / JPG / WebP 等</span>
                </button>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-[#85827C]">内置示例:</span>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => {
                        loadImageUrl(generateSampleMushroom());
                        if (window.innerWidth < 1024) setMobileTab('canvas');
                      }}
                      className="px-2.5 py-1 bg-[#FAF9F5] hover:bg-[#F2EFE9] rounded-xl text-[11px] font-medium text-[#54524E] hover:text-[#D97757] border border-[#2D2A26]/10 transition cursor-pointer"
                    >
                      🍄 蘑菇
                    </button>
                    <button
                      onClick={() => {
                        loadImageUrl(generateSamplePikachu());
                        if (window.innerWidth < 1024) setMobileTab('canvas');
                      }}
                      className="px-2.5 py-1 bg-[#FAF9F5] hover:bg-[#F2EFE9] rounded-xl text-[11px] font-medium text-[#54524E] hover:text-[#D97757] border border-[#2D2A26]/10 transition cursor-pointer"
                    >
                      ⚡ 皮卡丘
                    </button>
                    <button
                      onClick={() => {
                        loadImageUrl(generateSampleHeart());
                        if (window.innerWidth < 1024) setMobileTab('canvas');
                      }}
                      className="px-2.5 py-1 bg-[#FAF9F5] hover:bg-[#F2EFE9] rounded-xl text-[11px] font-medium text-[#54524E] hover:text-[#D97757] border border-[#2D2A26]/10 transition cursor-pointer"
                    >
                      ❤️ 爱心
                    </button>
                  </div>
                </div>
              </div>

              {/* Pegboard & Dimensions */}
              <div className="p-3.5 sm:p-4 border-b border-[#2D2A26]/10 space-y-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#1F1E1D] uppercase tracking-wider flex items-center gap-1.5">
                    <Grid size={14} className="text-[#D97757]" />
                    拼豆板（单板）规格
                  </span>
                  <button
                    onClick={() => setShowAddBoard(!showAddBoard)}
                    className="text-[11px] text-[#D97757] hover:text-[#C15F3F] font-semibold flex items-center gap-0.5 cursor-pointer"
                  >
                    <Plus size={13} />
                    <span>自定义单板</span>
                  </button>
                </div>

                {showAddBoard && (
                  <div className="p-3 bg-[#FAF9F5] border border-[#D97757]/30 rounded-2xl space-y-2 text-xs">
                    <div className="font-bold text-[#1F1E1D] flex items-center justify-between">
                      <span>添加自定义拼豆板</span>
                      <button
                        onClick={() => setShowAddBoard(false)}
                        className="text-[#85827C] hover:text-[#1F1E1D] text-[11px]"
                      >
                        取消
                      </button>
                    </div>
                    <div>
                      <label className="text-[11px] text-[#85827C] block mb-0.5">板名称/描述</label>
                      <input
                        type="text"
                        placeholder="如：我的特大方板 / 29格方板"
                        value={newBoardName}
                        onChange={e => setNewBoardName(e.target.value)}
                        className="w-full text-xs px-2.5 py-1.5 bg-white border border-[#2D2A26]/10 rounded-xl text-[#1F1E1D] focus:ring-1 focus:ring-[#D97757]"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] text-[#85827C] block mb-0.5">单板宽度 (钉数)</label>
                        <input
                          type="number"
                          min="4"
                          max="100"
                          value={newBoardW}
                          onChange={e => setNewBoardW(parseInt(e.target.value) || 28)}
                          className="w-full text-xs font-mono font-bold px-2 py-1 bg-white border border-[#2D2A26]/10 rounded-xl text-[#1F1E1D]"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-[#85827C] block mb-0.5">单板高度 (钉数)</label>
                        <input
                          type="number"
                          min="4"
                          max="100"
                          value={newBoardH}
                          onChange={e => setNewBoardH(parseInt(e.target.value) || 28)}
                          className="w-full text-xs font-mono font-bold px-2 py-1 bg-white border border-[#2D2A26]/10 rounded-xl text-[#1F1E1D]"
                        />
                      </div>
                    </div>
                    <button
                      onClick={handleCreateCustomBoard}
                      className="w-full py-1.5 bg-[#D97757] hover:bg-[#C15F3F] text-white rounded-xl font-semibold transition cursor-pointer"
                    >
                      保存并应用此单板
                    </button>
                  </div>
                )}

                <div className="space-y-1.5 max-h-44 overflow-y-auto pr-0.5">
                  {pegboardList.map(board => {
                    const isSelected = activeBoardId === board.id;
                    return (
                      <div
                        key={board.id}
                        onClick={() => handleSelectPegboard(board)}
                        className={`flex items-center justify-between p-2.5 rounded-xl border text-xs cursor-pointer transition ${
                          isSelected
                            ? 'bg-[#D97757]/10 border-[#D97757] text-[#1F1E1D] shadow-xs'
                            : 'border-[#2D2A26]/10 text-[#54524E] hover:bg-[#FAF9F5]'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${isSelected ? 'border-[#D97757] bg-[#D97757]' : 'border-[#2D2A26]/20'}`}>
                            {isSelected && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                          </div>
                          <span className="font-semibold">{board.name}</span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[11px] bg-white/90 px-2 py-0.5 rounded-lg border border-[#2D2A26]/10 text-[#54524E]">
                            {board.width}×{board.height}
                          </span>
                          {board.isCustom && (
                            <button
                              onClick={e => handleDeleteCustomBoard(board.id, e)}
                              title="删除此自定义板"
                              className="p-1 text-[#85827C] hover:text-red-500 rounded transition"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-2 border-t border-[#2D2A26]/10 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#1F1E1D]">作品总尺寸与拼板排布</span>
                    <div className="flex items-center bg-[#FAF9F5] border border-[#2D2A26]/8 p-0.5 rounded-xl text-[10px]">
                      <button
                        onClick={() => {
                          setSizeInputMode('board_grid');
                          setWidth(currentBoard.width * boardCols);
                          setHeight(currentBoard.height * boardRows);
                        }}
                        className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                          sizeInputMode === 'board_grid' ? 'bg-white text-[#D97757] shadow-xs font-bold' : 'text-[#54524E]'
                        }`}
                      >
                        按板连拼
                      </button>
                      <button
                        onClick={() => setSizeInputMode('custom_pixels')}
                        className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                          sizeInputMode === 'custom_pixels' ? 'bg-white text-[#D97757] shadow-xs font-bold' : 'text-[#54524E]'
                        }`}
                      >
                        自由格数
                      </button>
                    </div>
                  </div>

                  {sizeInputMode === 'board_grid' ? (
                    <div className="space-y-2 bg-[#FAF9F5] p-2.5 rounded-2xl border border-[#2D2A26]/10">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[#54524E]">当前单板: <strong className="text-[#1F1E1D] font-mono">{currentBoard.width}×{currentBoard.height}</strong> 格</span>
                        <button
                          onClick={handleAdaptAspect}
                          className="text-[11px] text-[#D97757] hover:underline font-medium cursor-pointer"
                        >
                          自适应原图比例
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-[10px] text-[#85827C] block mb-1">
                            横向连拼: <strong className="text-[#1F1E1D]">{boardCols} 块板</strong>
                          </span>
                          <div className="flex gap-1">
                            {[1, 2, 3, 4].map(c => (
                              <button
                                key={c}
                                onClick={() => handleBoardGridChange(c, boardRows)}
                                className={`flex-1 py-1 rounded-xl text-xs font-mono font-bold border transition cursor-pointer ${
                                  boardCols === c
                                    ? 'bg-[#D97757] text-white border-[#D97757] shadow-xs'
                                    : 'bg-white text-[#54524E] border-[#2D2A26]/10 hover:bg-[#FAF9F5]'
                                }`}
                              >
                                {c}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <span className="text-[10px] text-[#85827C] block mb-1">
                            纵向连拼: <strong className="text-[#1F1E1D]">{boardRows} 块板</strong>
                          </span>
                          <div className="flex gap-1">
                            {[1, 2, 3, 4].map(r => (
                              <button
                                key={r}
                                onClick={() => handleBoardGridChange(boardCols, r)}
                                className={`flex-1 py-1 rounded-xl text-xs font-mono font-bold border transition cursor-pointer ${
                                  boardRows === r
                                    ? 'bg-[#D97757] text-white border-[#D97757] shadow-xs'
                                    : 'bg-white text-[#54524E] border-[#2D2A26]/10 hover:bg-[#FAF9F5]'
                                }`}
                              >
                                {r}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="text-[11px] text-[#54524E] bg-white p-2 rounded-xl border border-[#2D2A26]/10 flex items-center justify-between">
                        <span>总图规格:</span>
                        <strong className="text-[#D97757] font-mono text-xs">
                          {width} × {height} 格 ({boardCols * boardRows} 块拼板)
                        </strong>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2 bg-[#FAF9F5] p-2.5 rounded-2xl border border-[#2D2A26]/10">
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <label className="text-[11px] text-[#85827C] block mb-1">总宽度 (格)</label>
                          <input
                            type="number"
                            min="8"
                            max="240"
                            value={width}
                            onChange={e => handleWidthChange(parseInt(e.target.value) || 28)}
                            className="w-full text-xs font-mono font-bold px-2.5 py-1.5 bg-white border border-[#2D2A26]/10 rounded-xl focus:ring-1 focus:ring-[#D97757] text-[#1F1E1D]"
                          />
                        </div>

                        <button
                          onClick={() => setLockAspect(!lockAspect)}
                          title={lockAspect ? '锁定宽高比' : '自由拉伸宽高'}
                          className={`mt-4 p-2 rounded-xl border transition cursor-pointer ${
                            lockAspect ? 'bg-[#D97757]/15 border-[#D97757]/30 text-[#D97757]' : 'bg-white border-[#2D2A26]/10 text-[#85827C]'
                          }`}
                        >
                          {lockAspect ? <Lock size={14} /> : <Unlock size={14} />}
                        </button>

                        <div className="flex-1">
                          <label className="text-[11px] text-[#85827C] block mb-1">总高度 (格)</label>
                          <input
                            type="number"
                            min="8"
                            max="240"
                            value={height}
                            onChange={e => handleHeightChange(parseInt(e.target.value) || 28)}
                            className="w-full text-xs font-mono font-bold px-2.5 py-1.5 bg-white border border-[#2D2A26]/10 rounded-xl focus:ring-1 focus:ring-[#D97757] text-[#1F1E1D]"
                          />
                        </div>
                      </div>

                      <div className="text-[11px] text-[#54524E] bg-white p-2 rounded-xl border border-[#2D2A26]/10">
                        按当前 <strong>{currentBoard.width}×{currentBoard.height}</strong> 单板，需横向 {totalBoardsX} 块 × 纵向 {totalBoardsY} 块 (共 {totalBoardsCount} 块板)
                      </div>
                    </div>
                  )}

                  <div className="pt-1.5 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#54524E] font-medium">拼豆颗粒物理直径:</span>
                      <div className="flex gap-1">
                        {BEAD_DIAMETERS.map(b => (
                          <button
                            key={b.id}
                            onClick={() => setBeadDiameter(b.value)}
                            className={`px-2.5 py-0.5 text-[11px] rounded-xl border font-medium cursor-pointer transition ${
                              beadDiameter === b.value
                                ? 'bg-[#D97757] text-white border-[#D97757] font-bold shadow-xs'
                                : 'bg-white text-[#54524E] border-[#2D2A26]/10 hover:bg-[#FAF9F5]'
                            }`}
                          >
                            {b.value}mm
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="bg-[#FAF9F5] px-2.5 py-1.5 rounded-xl border border-[#2D2A26]/10 text-[11px] flex items-center justify-between text-[#54524E]">
                      <span>成品估算尺寸:</span>
                      <strong className="text-[#1F1E1D] font-mono">
                        约 {physicalWidthCm} cm × {physicalHeightCm} cm
                      </strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Brand & Palette */}
              <div className="p-3.5 sm:p-4 border-b border-[#2D2A26]/10 space-y-3">
                <span className="text-xs font-bold text-[#1F1E1D] uppercase tracking-wider flex items-center gap-1.5">
                  <Palette size={14} className="text-[#D97757]" />
                  拼豆品牌色卡
                </span>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setSelectedBrand('mard')}
                    className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                      selectedBrand === 'mard'
                        ? 'bg-[#D97757]/10 border-[#D97757] text-[#1F1E1D] shadow-xs'
                        : 'border-[#2D2A26]/10 hover:bg-[#FAF9F5] text-[#54524E]'
                    }`}
                  >
                    <div className="font-bold text-xs text-[#1F1E1D]">漫拼 (Mard)</div>
                    <div className="text-[10px] text-[#85827C]">主流高频 60 色</div>
                  </button>

                  <button
                    onClick={() => setSelectedBrand('perler')}
                    className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                      selectedBrand === 'perler'
                        ? 'bg-[#D97757]/10 border-[#D97757] text-[#1F1E1D] shadow-xs'
                        : 'border-[#2D2A26]/10 hover:bg-[#FAF9F5] text-[#54524E]'
                    }`}
                  >
                    <div className="font-bold text-xs text-[#1F1E1D]">Perler</div>
                    <div className="text-[10px] text-[#85827C]">欧美经典 37 色</div>
                  </button>

                  <button
                    onClick={() => setSelectedBrand('artkal')}
                    className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                      selectedBrand === 'artkal'
                        ? 'bg-[#D97757]/10 border-[#D97757] text-[#1F1E1D] shadow-xs'
                        : 'border-[#2D2A26]/10 hover:bg-[#FAF9F5] text-[#54524E]'
                    }`}
                  >
                    <div className="font-bold text-xs text-[#1F1E1D]">Artkal</div>
                    <div className="text-[10px] text-[#85827C]">常用 24 色</div>
                  </button>

                  <button
                    onClick={() => setSelectedBrand('all')}
                    className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                      selectedBrand === 'all'
                        ? 'bg-[#D97757]/10 border-[#D97757] text-[#1F1E1D] shadow-xs'
                        : 'border-[#2D2A26]/10 hover:bg-[#FAF9F5] text-[#54524E]'
                    }`}
                  >
                    <div className="font-bold text-xs text-[#1F1E1D]">多品牌混拼</div>
                    <div className="text-[10px] text-[#85827C]">120+ 色联合匹配</div>
                  </button>
                </div>

                <div className="pt-2">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-[#54524E] font-medium">限制最大颜色种类:</span>
                    <span className="text-[#D97757] font-mono font-bold">
                      {maxColors === 0 ? '不限制 (全色库)' : `${maxColors} 色`}
                    </span>
                  </div>
                  <div className="flex gap-1.5">
                    {[0, 12, 18, 24, 36].map(num => (
                      <button
                        key={num}
                        onClick={() => setMaxColors(num)}
                        className={`flex-1 py-1 text-[11px] rounded-xl border font-medium cursor-pointer transition ${
                          maxColors === num
                            ? 'bg-[#D97757] text-white border-[#D97757] font-bold shadow-xs'
                            : 'bg-white text-[#54524E] border-[#2D2A26]/10 hover:bg-[#FAF9F5]'
                        }`}
                      >
                        {num === 0 ? '全色' : `${num}色`}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Algorithm & Filters */}
              <div className="p-3.5 sm:p-4 border-b border-[#2D2A26]/10 space-y-3.5">
                <span className="text-xs font-bold text-[#1F1E1D] uppercase tracking-wider flex items-center gap-1.5">
                  <Sliders size={14} className="text-[#D97757]" />
                  色彩与算法参数
                </span>

                <div className="space-y-2 bg-[#FAF9F5] p-2.5 rounded-2xl border border-[#2D2A26]/10">
                  <label className="flex items-center justify-between cursor-pointer">
                    <div className="text-xs text-[#1F1E1D]">
                      <div className="font-semibold">Floyd-Steinberg 误差抖动</div>
                      <div className="text-[10px] text-[#85827C]">更平滑的渐变色过渡，更具艺术质感</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={dither}
                      onChange={e => setDither(e.target.checked)}
                      className="rounded border-[#2D2A26]/20 text-[#D97757] focus:ring-[#D97757] h-4 w-4 accent-[#D97757]"
                    />
                  </label>

                  <div className="border-t border-[#2D2A26]/10 pt-2">
                    <label className="flex items-center justify-between cursor-pointer">
                      <div className="text-xs text-[#1F1E1D]">
                        <div className="font-semibold">智能去除纯白/浅色背景</div>
                        <div className="text-[10px] text-[#85827C]">将白色底图镂空，省去背景豆子</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={removeBg}
                        onChange={e => setRemoveBg(e.target.checked)}
                        className="rounded border-[#2D2A26]/20 text-[#D97757] focus:ring-[#D97757] h-4 w-4 accent-[#D97757]"
                      />
                    </label>

                    {removeBg && (
                      <div className="mt-2 pt-2 border-t border-[#2D2A26]/10">
                        <div className="flex justify-between text-[11px] text-[#54524E] mb-1">
                          <span>去底容差阈值:</span>
                          <span className="font-mono text-[#D97757] font-bold">{bgTolerance}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="40"
                          value={bgTolerance}
                          onChange={e => setBgTolerance(Number(e.target.value))}
                          className="w-full accent-[#D97757] cursor-pointer"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2.5 text-xs">
                  <div>
                    <div className="flex justify-between text-[#54524E] mb-1">
                      <span>画面亮度:</span>
                      <span className="font-mono text-[#D97757] font-bold">{brightness > 0 ? `+${brightness}` : brightness}</span>
                    </div>
                    <input
                      type="range"
                      min="-60"
                      max="60"
                      value={brightness}
                      onChange={e => setBrightness(Number(e.target.value))}
                      className="w-full accent-[#D97757] cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-[#54524E] mb-1">
                      <span>对比度:</span>
                      <span className="font-mono text-[#D97757] font-bold">{contrast > 0 ? `+${contrast}` : contrast}</span>
                    </div>
                    <input
                      type="range"
                      min="-60"
                      max="60"
                      value={contrast}
                      onChange={e => setContrast(Number(e.target.value))}
                      className="w-full accent-[#D97757] cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-[#54524E] mb-1">
                      <span>色彩饱和度:</span>
                      <span className="font-mono text-[#D97757] font-bold">{saturation > 0 ? `+${saturation}` : saturation}</span>
                    </div>
                    <input
                      type="range"
                      min="-60"
                      max="60"
                      value={saturation}
                      onChange={e => setSaturation(Number(e.target.value))}
                      className="w-full accent-[#D97757] cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </aside>

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

              {isProcessing && (
                <div className="absolute top-12 sm:top-4 right-2.5 sm:right-4 z-10 bg-[#1F1E1D]/90 text-white backdrop-blur-md px-3.5 py-1.5 rounded-2xl border border-white/10 shadow-md flex items-center gap-2 text-[11px] sm:text-xs">
                  <Loader2 size={13} className="animate-spin text-[#D97757] shrink-0" />
                  <span>{processingTip || 'VPS 计算中...'}</span>
                </div>
              )}

              <div className="flex-1 w-full h-full pb-14 lg:pb-0">
                {quantizeResult ? (
                  <PatternCanvas
                    result={quantizeResult}
                    highlightColor={highlightColor}
                    onSelectColor={setHighlightColor}
                    renderMode={renderMode}
                    showLabels={showLabels}
                    showGrid={showGrid}
                    showRuler={showRuler}
                    showPegboardSeams={showPegboardSeams}
                    pegboardWidth={currentBoard.width}
                    pegboardHeight={currentBoard.height}
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-[#85827C] gap-2">
                    <Loader2 size={32} className="animate-spin text-[#D97757]" />
                    <span className="text-xs">正在渲染拼豆图纸，请稍候...</span>
                  </div>
                )}
              </div>
            </main>

            {/* Right Sidebar */}
            {quantizeResult && (
              <aside
                className={`
                  ${mobileTab === 'stats' ? 'fixed inset-0 z-40 bg-white flex flex-col pt-0 pb-16' : 'hidden'}
                  lg:flex lg:static lg:w-80 xl:w-88 flex-shrink-0 bg-white border-l border-[#2D2A26]/10 flex-col h-full overflow-hidden shadow-xs z-20
                `}
              >
                <StatsPanel
                  stats={quantizeResult.stats}
                  totalBeads={quantizeResult.totalBeads}
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
              {quantizeResult && (
                <span className="absolute top-1 right-1/4 w-2 h-2 bg-[#D97757] rounded-full" />
              )}
            </button>

            <button
              onClick={() => setIsExportOpen(true)}
              disabled={!quantizeResult}
              className="flex flex-col items-center justify-center flex-1 py-1 text-[#54524E] transition cursor-pointer disabled:opacity-40"
            >
              <Download size={18} className="text-[#D97757]" />
              <span className="text-[10px] mt-0.5 font-medium">导出图纸</span>
            </button>
          </nav>

          {/* Export Modal */}
          {quantizeResult && (
            <ExportModal
              isOpen={isExportOpen}
              onClose={() => setIsExportOpen(false)}
              result={quantizeResult}
              pegboardWidth={currentBoard.width}
              pegboardHeight={currentBoard.height}
              vpsAvailable={vpsOnline}
            />
          )}
        </div>
      )}
    </>
  );
};

export default App;
