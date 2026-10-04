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

  const handleLandingImageSelected = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        setImageEl(img);
        setAspectRatio(img.width / img.height);
        navigateTo('studio');
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
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

  // 尺寸模式: 'board_grid' (按拼板连拼倍数) | 'custom_pixels' (自定义任意长宽格数)
  const [sizeInputMode, setSizeInputMode] = useState<'board_grid' | 'custom_pixels'>('board_grid');

  // 新建自定义单板模态状态
  const [showAddBoard, setShowAddBoard] = useState<boolean>(false);
  const [newBoardName, setNewBoardName] = useState<string>('');
  const [newBoardW, setNewBoardW] = useState<number>(29);
  const [newBoardH, setNewBoardH] = useState<number>(29);

  // 物理豆子直径 (用于计算成品物理尺寸)
  const [beadDiameter, setBeadDiameter] = useState<number>(2.6); // 2.6mm 或 5.0mm

  // Color adjustment
  const [brightness, setBrightness] = useState<number>(0);
  const [contrast, setContrast] = useState<number>(0);
  const [saturation, setSaturation] = useState<number>(0);

  // Canvas Display Preferences
  const [renderMode, setRenderMode] = useState<'bead' | 'flat'>('bead');
  const [showLabels, setShowLabels] = useState<boolean>(true);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [showRuler, setShowRuler] = useState<boolean>(true);
  const [showPegboardSeams, setShowPegboardSeams] = useState<boolean>(true);

  // UI state
  const [highlightColor, setHighlightColor] = useState<BeadColor | null>(null);
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);
  const [quantizeResult, setQuantizeResult] = useState<QuantizeResult | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // 初始化检查 VPS 健康状态
  useEffect(() => {
    checkVpsHealth().then(info => {
      if (info && info.status === 'ok') {
        setVpsOnline(true);
        setRenderBackend('vps');
      } else {
        setVpsOnline(false);
        setRenderBackend('local');
      }
    });
  }, []);

  // Save custom pegboards to localStorage
  const savePegboardList = (list: PegboardConfig[]) => {
    setPegboardList(list);
    try {
      localStorage.setItem('pixel_pegboard_list', JSON.stringify(list));
    } catch {
      // ignore
    }
  };

  const loadImageUrl = (url: string) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setImageEl(img);
      const ratio = img.width / img.height;
      setAspectRatio(ratio);
    };
    img.src = url;
  };

  // Load default sample image on mount
  useEffect(() => {
    const defaultSample = generateSampleMushroom();
    loadImageUrl(defaultSample);
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      if (ev.target?.result) {
        loadImageUrl(ev.target.result as string);
        setMobileTab('canvas'); // 上传后在手机端切回画板查看
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = ev => {
        if (ev.target?.result) {
          loadImageUrl(ev.target.result as string);
          setMobileTab('canvas');
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

  // 切换连拼板数
  const handleBoardGridChange = (cols: number, rows: number) => {
    setBoardCols(cols);
    setBoardRows(rows);
    setWidth(currentBoard.width * cols);
    setHeight(currentBoard.height * rows);
  };

  // 保存新建的自定义单板
  const handleCreateCustomBoard = () => {
    if (newBoardW < 4 || newBoardH < 4) {
      alert('拼豆板尺寸最小为 4×4 格');
      return;
    }
    const name = newBoardName.trim() || `${newBoardW}×${newBoardH} 自定义板`;
    const newBoard: PegboardConfig = {
      id: `custom_${Date.now()}`,
      name,
      width: newBoardW,
      height: newBoardH,
      isCustom: true
    };
    const updated = [...pegboardList, newBoard];
    savePegboardList(updated);
    setActiveBoardId(newBoard.id);
    setWidth(newBoard.width * boardCols);
    setHeight(newBoard.height * boardRows);
    setShowAddBoard(false);
    setNewBoardName('');
  };

  // 删除自定义单板
  const handleDeleteCustomBoard = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = pegboardList.filter(b => b.id !== id);
    savePegboardList(updated);
    if (activeBoardId === id) {
      const fallback = updated[0] || DEFAULT_PEGBOARDS[0];
      setActiveBoardId(fallback.id);
      setWidth(fallback.width * boardCols);
      setHeight(fallback.height * boardRows);
    }
  };

  // 自由格数输入
  const handleWidthChange = (val: number) => {
    const newW = Math.max(8, Math.min(240, val));
    setWidth(newW);
    if (lockAspect && aspectRatio > 0) {
      setHeight(Math.max(8, Math.min(240, Math.round(newW / aspectRatio))));
    }
  };

  const handleHeightChange = (val: number) => {
    const newH = Math.max(8, Math.min(240, val));
    setHeight(newH);
    if (lockAspect && aspectRatio > 0) {
      setWidth(Math.max(8, Math.min(240, Math.round(newH * aspectRatio))));
    }
  };

  // 适应原图比例快速设置
  const handleAdaptAspect = () => {
    if (aspectRatio >= 1) {
      const w = currentBoard.width * boardCols;
      setWidth(w);
      setHeight(Math.max(8, Math.round(w / aspectRatio)));
    } else {
      const h = currentBoard.height * boardRows;
      setHeight(h);
      setWidth(Math.max(8, Math.round(h * aspectRatio)));
    }
    setSizeInputMode('custom_pixels');
  };

  // 计算成品物理尺寸 (厘米)
  const physicalWidthCm = ((width * beadDiameter) / 10).toFixed(1);
  const physicalHeightCm = ((height * beadDiameter) / 10).toFixed(1);

  // 计算当前图纸对应多少块单板
  const totalBoardsX = Math.ceil(width / currentBoard.width);
  const totalBoardsY = Math.ceil(height / currentBoard.height);
  const totalBoardsCount = totalBoardsX * totalBoardsY;

  // 核心生图调度逻辑（带弱性能 VPS 防抖缓冲保护与自动无缝 Fallback）
  useEffect(() => {
    if (!imageEl) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

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
      maxColors: maxColors > 0 ? maxColors : undefined
    };

    const timer = setTimeout(async () => {
      setIsProcessing(true);

      if (renderBackend === 'vps') {
        setProcessingTip('VPS 缓冲处理中...');
        try {
          const res = await requestVpsQuantize(imageEl, options, controller.signal);
          setQuantizeResult(res);
          setVpsOnline(true);
        } catch (err: any) {
          if (err.name === 'AbortError') return;
          console.warn('[VPS Warning]: VPS 响应异常，自动回退到本地渲染', err);
          setProcessingTip('VPS 队列拥堵，已临时降级为本地渲染...');
          try {
            const localRes = processImageToPattern(imageEl, options);
            setQuantizeResult(localRes);
          } catch (localErr) {
            console.error('Local fallback failed', localErr);
          }
        } finally {
          setIsProcessing(false);
          setProcessingTip('');
        }
      } else {
        setProcessingTip('本地渲染中...');
        try {
          const res = processImageToPattern(imageEl, options);
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
    renderBackend
  ]);

  // 若不在工作台，则渲染首页或指南页面
  if (pageView !== 'studio') {
    return (
      <div className="min-h-screen bg-[#FAF9F5] text-[#1F1E1D] flex flex-col relative selection:bg-[#D97757]/20 font-sans">
        <PixelWaveCanvas />

        {/* 全局统一顶栏 */}
        <header className="sticky top-0 z-50 px-4 sm:px-8 py-3.5 backdrop-blur-md bg-[#FAF9F5]/90 border-b border-[#2D2A26]/8 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigateTo('home')}>
            <div className="w-8 h-8 rounded-lg bg-[#D97757] flex items-center justify-center text-white shadow-sm font-bold text-base">
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
              onClick={() => navigateTo('guide')}
              className={`hover:text-[#D97757] transition-colors cursor-pointer relative py-1 ${pageView === 'guide' ? 'text-[#D97757] font-semibold' : ''}`}
            >
              使用指南
              {pageView === 'guide' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#D97757] rounded-full" />}
            </button>
          </nav>

          <button
            onClick={() => navigateTo('studio')}
            className="px-4 py-2 rounded-full text-xs sm:text-sm font-semibold text-white bg-[#1F1E1D] hover:bg-[#D97757] transition-all shadow-sm hover:shadow-md cursor-pointer"
          >
            进入设计工作台 →
          </button>
        </header>

        {/* 核心内容区 */}
        <main className="relative z-10 flex-1 flex flex-col">
          {pageView === 'home' ? (
            <LandingHero
              onImageSelected={handleLandingImageSelected}
              onEnterStudio={() => navigateTo('studio')}
              onOpenGuide={() => navigateTo('guide')}
            />
          ) : (
            <UserGuide onStartCreating={() => navigateTo('studio')} />
          )}
        </main>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col h-screen w-screen overflow-hidden bg-slate-100 touch-manipulation"
      onDragOver={e => e.preventDefault()}
      onDrop={handleDrop}
    >
      {/* 1. Header Bar (多分辨率与移动端自适应) */}
      <header className="h-13 sm:h-14 bg-white border-b border-slate-200 px-3 sm:px-5 flex items-center justify-between shadow-xs z-20 shrink-0">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {/* 返回首页与指南入口 */}
          <button
            onClick={() => navigateTo('home')}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-[#D97757] hover:border-[#D97757]/30 bg-slate-50 hover:bg-white text-xs font-medium transition cursor-pointer shrink-0"
            title="返回工坊首页"
          >
            <ArrowLeft size={14} />
            <span className="hidden sm:inline">首页</span>
          </button>
          <button
            onClick={() => navigateTo('guide')}
            className="hidden sm:flex items-center gap-1 px-2 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-[#D97757] hover:border-[#D97757]/30 bg-slate-50 hover:bg-white text-xs font-medium transition cursor-pointer shrink-0"
            title="查看使用指南"
          >
            <BookOpen size={14} />
            <span>指南</span>
          </button>

          <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-tr from-indigo-600 to-purple-500 rounded-lg sm:rounded-xl flex items-center justify-center text-white shadow-md shadow-indigo-500/20 shrink-0">
            <Sparkles size={16} className="sm:w-[18px] sm:h-[18px]" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xs sm:text-base font-bold text-slate-800 leading-tight flex items-center gap-1 sm:gap-2">
              <span className="truncate">拼豆图纸工坊</span>
              <span className="hidden sm:inline text-[10px] font-normal px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded-md">
                PixelBead Studio
              </span>
            </h1>
            <p className="hidden md:block text-[11px] text-slate-400 truncate">
              支持自定义拼豆板 · VPS 云端生图 · 真实色卡匹配
            </p>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* 渲染节点状态指示与切换 */}
          <button
            onClick={() => setRenderBackend(renderBackend === 'vps' ? 'local' : 'vps')}
            title="点击切换渲染引擎节点"
            className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg border text-[11px] sm:text-xs font-medium transition cursor-pointer ${
              renderBackend === 'vps'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                : 'bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100'
            }`}
          >
            {renderBackend === 'vps' ? <Server size={13} /> : <Laptop size={13} />}
            <span className="hidden xs:inline">
              {renderBackend === 'vps' ? (vpsOnline ? 'VPS云端' : 'VPS连接中') : '本地渲染'}
            </span>
            <span className="xs:hidden">
              {renderBackend === 'vps' ? '云端' : '本地'}
            </span>
            {isProcessing && <Loader2 size={12} className="animate-spin ml-0.5" />}
          </button>

          {/* 桌面端总规格信息条 */}
          {quantizeResult && (
            <div className="hidden xl:flex items-center gap-3 text-xs bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
              <span className="text-slate-500">
                总规格: <strong>{quantizeResult.width}×{quantizeResult.height}</strong> 格
              </span>
              <span className="text-slate-300">|</span>
              <span className="text-slate-500">
                拼板数: <strong className="text-indigo-600">{totalBoardsCount}</strong> 块 ({currentBoard.width}×{currentBoard.height}板)
              </span>
              <span className="text-slate-300">|</span>
              <span className="text-slate-500">
                成品尺寸: <strong className="text-slate-700">{physicalWidthCm}×{physicalHeightCm} cm</strong> ({beadDiameter}mm豆)
              </span>
              <span className="text-slate-300">|</span>
              <span className="text-slate-500">
                总用量: <strong className="text-indigo-600">{quantizeResult.totalBeads}</strong> 颗
              </span>
            </div>
          )}

          <button
            onClick={() => setIsExportOpen(true)}
            disabled={!quantizeResult}
            className="flex items-center gap-1 sm:gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] sm:text-xs font-semibold px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg shadow-sm transition disabled:opacity-50 cursor-pointer"
          >
            <Download size={14} />
            <span>导出图纸</span>
          </button>
        </div>
      </header>

      {/* 2. Main Workspace Layout */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Sidebar: Controls & Options (大屏固定侧边栏 / 移动端弹窗抽屉) */}
        <aside
          className={`
            ${mobileTab === 'controls' ? 'fixed inset-0 z-40 bg-white flex flex-col pt-0 pb-16' : 'hidden'}
            lg:flex lg:static lg:w-80 xl:w-88 flex-shrink-0 bg-white border-r border-slate-200 flex-col h-full overflow-y-auto z-20
          `}
        >
          {/* Mobile Drawer Header */}
          <div className="lg:hidden px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between sticky top-0 z-10 shrink-0">
            <span className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
              <Sliders size={16} className="text-indigo-600" />
              <span>图纸与色彩参数</span>
            </span>
            <button
              onClick={() => setMobileTab('canvas')}
              className="px-3 py-1 bg-indigo-600 text-white text-xs font-semibold rounded-lg shadow-xs cursor-pointer flex items-center gap-1"
            >
              <Check size={14} />
              <span>完成并查看</span>
            </button>
          </div>

          {/* Section: Upload & Samples */}
          <div className="p-3.5 sm:p-4 border-b border-slate-100 space-y-3">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <ImageIcon size={14} className="text-indigo-500" />
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
              className="w-full border-2 border-dashed border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/30 rounded-xl p-3 text-center transition flex flex-col items-center justify-center gap-1.5 group cursor-pointer"
            >
              <Upload size={20} className="text-slate-400 group-hover:text-indigo-500 transition" />
              <span className="text-xs font-semibold text-slate-600 group-hover:text-indigo-600">
                点击上传图片 或 直接拖拽到此处
              </span>
              <span className="text-[10px] text-slate-400">支持 PNG / JPG / WebP 等</span>
            </button>

            {/* Quick Sample Selector */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-slate-400">内置示例:</span>
              <div className="flex gap-1.5">
                <button
                  onClick={() => {
                    loadImageUrl(generateSampleMushroom());
                    if (window.innerWidth < 1024) setMobileTab('canvas');
                  }}
                  className="px-2 py-1 bg-slate-50 hover:bg-slate-100 rounded text-[11px] font-medium text-slate-600 border border-slate-200 transition cursor-pointer"
                >
                  🍄 蘑菇
                </button>
                <button
                  onClick={() => {
                    loadImageUrl(generateSamplePikachu());
                    if (window.innerWidth < 1024) setMobileTab('canvas');
                  }}
                  className="px-2 py-1 bg-slate-50 hover:bg-slate-100 rounded text-[11px] font-medium text-slate-600 border border-slate-200 transition cursor-pointer"
                >
                  ⚡ 皮卡丘
                </button>
                <button
                  onClick={() => {
                    loadImageUrl(generateSampleHeart());
                    if (window.innerWidth < 1024) setMobileTab('canvas');
                  }}
                  className="px-2 py-1 bg-slate-50 hover:bg-slate-100 rounded text-[11px] font-medium text-slate-600 border border-slate-200 transition cursor-pointer"
                >
                  ❤️ 爱心
                </button>
              </div>
            </div>
          </div>

          {/* Section: Pegboard & Total Size (单板规格与拼板尺寸) */}
          <div className="p-3.5 sm:p-4 border-b border-slate-100 space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Grid size={14} className="text-indigo-500" />
                拼豆板（单板）规格
              </span>
              <button
                onClick={() => setShowAddBoard(!showAddBoard)}
                className="text-[11px] text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-0.5 cursor-pointer"
              >
                <Plus size={13} />
                <span>自定义单板</span>
              </button>
            </div>

            {/* Add Custom Pegboard Panel */}
            {showAddBoard && (
              <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-2 text-xs">
                <div className="font-bold text-indigo-900 flex items-center justify-between">
                  <span>添加自定义拼豆板</span>
                  <button
                    onClick={() => setShowAddBoard(false)}
                    className="text-slate-400 hover:text-slate-600 text-[11px]"
                  >
                    取消
                  </button>
                </div>
                <div>
                  <label className="text-[11px] text-slate-500 block mb-0.5">板名称/描述</label>
                  <input
                    type="text"
                    placeholder="如：我的特大方板 / 29格方板"
                    value={newBoardName}
                    onChange={e => setNewBoardName(e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] text-slate-500 block mb-0.5">单板宽度 (钉数)</label>
                    <input
                      type="number"
                      min="4"
                      max="100"
                      value={newBoardW}
                      onChange={e => setNewBoardW(parseInt(e.target.value) || 28)}
                      className="w-full text-xs font-mono font-bold px-2 py-1 bg-white border border-slate-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500 block mb-0.5">单板高度 (钉数)</label>
                    <input
                      type="number"
                      min="4"
                      max="100"
                      value={newBoardH}
                      onChange={e => setNewBoardH(parseInt(e.target.value) || 28)}
                      className="w-full text-xs font-mono font-bold px-2 py-1 bg-white border border-slate-200 rounded-lg"
                    />
                  </div>
                </div>
                <button
                  onClick={handleCreateCustomBoard}
                  className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold transition cursor-pointer"
                >
                  保存并应用此单板
                </button>
              </div>
            )}

            {/* Pegboard List Selector */}
            <div className="space-y-1.5 max-h-44 overflow-y-auto pr-0.5">
              {pegboardList.map(board => {
                const isSelected = activeBoardId === board.id;
                return (
                  <div
                    key={board.id}
                    onClick={() => handleSelectPegboard(board)}
                    className={`flex items-center justify-between p-2 rounded-xl border text-xs cursor-pointer transition ${
                      isSelected
                        ? 'bg-indigo-50 border-indigo-400 text-indigo-900 shadow-xs'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${isSelected ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300'}`}>
                        {isSelected && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                      </div>
                      <span className="font-semibold">{board.name}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[11px] bg-white/80 px-1.5 py-0.5 rounded border border-slate-200 text-slate-500">
                        {board.width}×{board.height}
                      </span>
                      {board.isCustom && (
                        <button
                          onClick={e => handleDeleteCustomBoard(board.id, e)}
                          title="删除此自定义板"
                          className="p-1 text-slate-400 hover:text-red-500 rounded transition"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Board Layout and Total Dimensions Mode */}
            <div className="pt-2 border-t border-slate-100 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">作品总尺寸与拼板排布</span>
                <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-[10px]">
                  <button
                    onClick={() => {
                      setSizeInputMode('board_grid');
                      setWidth(currentBoard.width * boardCols);
                      setHeight(currentBoard.height * boardRows);
                    }}
                    className={`px-2 py-0.5 rounded-md font-medium transition cursor-pointer ${
                      sizeInputMode === 'board_grid' ? 'bg-white text-indigo-600 shadow-xs font-bold' : 'text-slate-500'
                    }`}
                  >
                    按板连拼
                  </button>
                  <button
                    onClick={() => setSizeInputMode('custom_pixels')}
                    className={`px-2 py-0.5 rounded-md font-medium transition cursor-pointer ${
                      sizeInputMode === 'custom_pixels' ? 'bg-white text-indigo-600 shadow-xs font-bold' : 'text-slate-500'
                    }`}
                  >
                    自由格数
                  </button>
                </div>
              </div>

              {sizeInputMode === 'board_grid' ? (
                /* Board Multiplier (横向N块 × 纵向M块) */
                <div className="space-y-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600">当前单板: <strong>{currentBoard.width}×{currentBoard.height}</strong> 格</span>
                    <button
                      onClick={handleAdaptAspect}
                      className="text-[11px] text-indigo-600 hover:underline cursor-pointer"
                    >
                      自适应原图比例
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] text-slate-500 block mb-1">
                        横向连拼: <strong>{boardCols} 块板</strong>
                      </span>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4].map(c => (
                          <button
                            key={c}
                            onClick={() => handleBoardGridChange(c, boardRows)}
                            className={`flex-1 py-1 rounded-lg text-xs font-mono font-bold border transition cursor-pointer ${
                              boardCols === c
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {c}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-500 block mb-1">
                        纵向连拼: <strong>{boardRows} 块板</strong>
                      </span>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4].map(r => (
                          <button
                            key={r}
                            onClick={() => handleBoardGridChange(boardCols, r)}
                            className={`flex-1 py-1 rounded-lg text-xs font-mono font-bold border transition cursor-pointer ${
                              boardRows === r
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {r}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-600 bg-white p-2 rounded-lg border border-slate-200 flex items-center justify-between">
                    <span>总图规格:</span>
                    <strong className="text-indigo-600 font-mono text-xs">
                      {width} × {height} 格 ({boardCols * boardRows} 块拼板)
                    </strong>
                  </div>
                </div>
              ) : (
                /* Custom Pixels (自由输入宽度和高度) */
                <div className="space-y-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <label className="text-[11px] text-slate-500 block mb-1">总宽度 (格)</label>
                      <input
                        type="number"
                        min="8"
                        max="240"
                        value={width}
                        onChange={e => handleWidthChange(parseInt(e.target.value) || 28)}
                        className="w-full text-xs font-mono font-bold px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>

                    <button
                      onClick={() => setLockAspect(!lockAspect)}
                      title={lockAspect ? '锁定宽高比' : '自由拉伸宽高'}
                      className={`mt-4 p-2 rounded-lg border transition cursor-pointer ${
                        lockAspect ? 'bg-indigo-100 border-indigo-300 text-indigo-700' : 'bg-white border-slate-200 text-slate-400'
                      }`}
                    >
                      {lockAspect ? <Lock size={14} /> : <Unlock size={14} />}
                    </button>

                    <div className="flex-1">
                      <label className="text-[11px] text-slate-500 block mb-1">总高度 (格)</label>
                      <input
                        type="number"
                        min="8"
                        max="240"
                        value={height}
                        onChange={e => handleHeightChange(parseInt(e.target.value) || 28)}
                        className="w-full text-xs font-mono font-bold px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-500 bg-white p-2 rounded-lg border border-slate-200">
                    按当前 <strong>{currentBoard.width}×{currentBoard.height}</strong> 单板，需横向 {totalBoardsX} 块 × 纵向 {totalBoardsY} 块 (共 {totalBoardsCount} 块板)
                  </div>
                </div>
              )}

              {/* Physical Size & Bead Diameter Option */}
              <div className="pt-1.5 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 font-medium">拼豆颗粒物理直径:</span>
                  <div className="flex gap-1">
                    {BEAD_DIAMETERS.map(b => (
                      <button
                        key={b.id}
                        onClick={() => setBeadDiameter(b.value)}
                        className={`px-2 py-0.5 text-[11px] rounded border font-medium cursor-pointer transition ${
                          beadDiameter === b.value
                            ? 'bg-indigo-600 text-white border-indigo-600 font-bold'
                            : 'bg-white text-slate-600 border-slate-200'
                        }`}
                      >
                        {b.value}mm
                      </button>
                    ))}
                  </div>
                </div>
                <div className="bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200/80 text-[11px] flex items-center justify-between text-slate-600">
                  <span>成品估算尺寸:</span>
                  <strong className="text-slate-800 font-mono">
                    约 {physicalWidthCm} cm × {physicalHeightCm} cm
                  </strong>
                </div>
              </div>
            </div>
          </div>

          {/* Section: Brand & Palette */}
          <div className="p-3.5 sm:p-4 border-b border-slate-100 space-y-3">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Palette size={14} className="text-indigo-500" />
              拼豆品牌色卡
            </span>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setSelectedBrand('mard')}
                className={`p-2 rounded-xl border text-left transition cursor-pointer ${
                  selectedBrand === 'mard'
                    ? 'bg-indigo-50 border-indigo-400 text-indigo-800'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="font-semibold text-xs">漫拼 (Mard)</div>
                <div className="text-[10px] text-slate-400">主流高频 60 色</div>
              </button>

              <button
                onClick={() => setSelectedBrand('perler')}
                className={`p-2 rounded-xl border text-left transition cursor-pointer ${
                  selectedBrand === 'perler'
                    ? 'bg-indigo-50 border-indigo-400 text-indigo-800'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="font-semibold text-xs">Perler</div>
                <div className="text-[10px] text-slate-400">欧美经典 37 色</div>
              </button>

              <button
                onClick={() => setSelectedBrand('artkal')}
                className={`p-2 rounded-xl border text-left transition cursor-pointer ${
                  selectedBrand === 'artkal'
                    ? 'bg-indigo-50 border-indigo-400 text-indigo-800'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="font-semibold text-xs">Artkal</div>
                <div className="text-[10px] text-slate-400">常用 24 色</div>
              </button>

              <button
                onClick={() => setSelectedBrand('all')}
                className={`p-2 rounded-xl border text-left transition cursor-pointer ${
                  selectedBrand === 'all'
                    ? 'bg-indigo-50 border-indigo-400 text-indigo-800'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="font-semibold text-xs">多品牌混拼</div>
                <div className="text-[10px] text-slate-400">120+ 色联合匹配</div>
              </button>
            </div>

            {/* Max Colors Restriction */}
            <div className="pt-2">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-slate-600 font-medium">限制最大颜色种类:</span>
                <span className="text-indigo-600 font-mono font-bold">
                  {maxColors === 0 ? '不限制 (全色库)' : `${maxColors} 色`}
                </span>
              </div>
              <div className="flex gap-1.5">
                {[0, 12, 18, 24, 36].map(num => (
                  <button
                    key={num}
                    onClick={() => setMaxColors(num)}
                    className={`flex-1 py-1 text-[11px] rounded border font-medium cursor-pointer transition ${
                      maxColors === num
                        ? 'bg-indigo-600 text-white border-indigo-600 font-bold'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {num === 0 ? '全色' : `${num}色`}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Section: Algorithm & Image Filters */}
          <div className="p-3.5 sm:p-4 border-b border-slate-100 space-y-3.5">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Sliders size={14} className="text-indigo-500" />
              色彩与算法参数
            </span>

            {/* Dither & Background Removal */}
            <div className="space-y-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
              <label className="flex items-center justify-between cursor-pointer">
                <div className="text-xs text-slate-700">
                  <div className="font-semibold">Floyd-Steinberg 误差抖动</div>
                  <div className="text-[10px] text-slate-400">更平滑的渐变色过渡，更具艺术质感</div>
                </div>
                <input
                  type="checkbox"
                  checked={dither}
                  onChange={e => setDither(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                />
              </label>

              <div className="border-t border-slate-200/60 pt-2">
                <label className="flex items-center justify-between cursor-pointer">
                  <div className="text-xs text-slate-700">
                    <div className="font-semibold">智能去除纯白/浅色背景</div>
                    <div className="text-[10px] text-slate-400">将白色底图镂空，省去背景豆子</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={removeBg}
                    onChange={e => setRemoveBg(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                  />
                </label>

                {removeBg && (
                  <div className="mt-2 pt-2 border-t border-slate-100">
                    <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                      <span>去底容差阈值:</span>
                      <span className="font-mono">{bgTolerance}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="40"
                      value={bgTolerance}
                      onChange={e => setBgTolerance(Number(e.target.value))}
                      className="w-full accent-indigo-600 cursor-pointer"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Brightness, Contrast, Saturation */}
            <div className="space-y-2.5 text-xs">
              <div>
                <div className="flex justify-between text-slate-600 mb-1">
                  <span>画面亮度:</span>
                  <span className="font-mono text-indigo-600">{brightness > 0 ? `+${brightness}` : brightness}</span>
                </div>
                <input
                  type="range"
                  min="-60"
                  max="60"
                  value={brightness}
                  onChange={e => setBrightness(Number(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-slate-600 mb-1">
                  <span>对比度:</span>
                  <span className="font-mono text-indigo-600">{contrast > 0 ? `+${contrast}` : contrast}</span>
                </div>
                <input
                  type="range"
                  min="-60"
                  max="60"
                  value={contrast}
                  onChange={e => setContrast(Number(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-slate-600 mb-1">
                  <span>色彩饱和度:</span>
                  <span className="font-mono text-indigo-600">{saturation > 0 ? `+${saturation}` : saturation}</span>
                </div>
                <input
                  type="range"
                  min="-60"
                  max="60"
                  value={saturation}
                  onChange={e => setSaturation(Number(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
              </div>
            </div>
          </div>
        </aside>

        {/* Center Canvas Area (在手机与桌面端均为主舞台) */}
        <main className="flex-1 flex flex-col min-w-0 bg-slate-200/60 overflow-hidden relative">
          {/* Canvas Floating Top Tool Bar (移动端横向滑动，防止破框溢出) */}
          <div className="absolute top-2.5 sm:top-4 left-2.5 sm:left-4 right-2.5 sm:right-auto z-10 overflow-x-auto no-scrollbar py-0.5">
            <div className="inline-flex items-center gap-2 sm:gap-3 bg-white/95 backdrop-blur-md px-2.5 sm:px-3 py-1.5 rounded-xl border border-slate-200/80 shadow-sm text-xs whitespace-nowrap">
              {/* View Mode Toggle */}
              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-slate-600 font-medium shrink-0">
                <button
                  onClick={() => setRenderMode('bead')}
                  className={`px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md transition cursor-pointer text-[11px] sm:text-xs ${
                    renderMode === 'bead' ? 'bg-white text-indigo-600 shadow-xs font-bold' : ''
                  }`}
                >
                  圆孔拼豆
                </button>
                <button
                  onClick={() => setRenderMode('flat')}
                  className={`px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md transition cursor-pointer text-[11px] sm:text-xs ${
                    renderMode === 'flat' ? 'bg-white text-indigo-600 shadow-xs font-bold' : ''
                  }`}
                >
                  平铺格
                </button>
              </div>

              <div className="h-3.5 w-px bg-slate-200 shrink-0" />

              {/* Display Switches */}
              <label className="flex items-center gap-1 cursor-pointer text-slate-600 select-none text-[11px] sm:text-xs shrink-0">
                <input
                  type="checkbox"
                  checked={showLabels}
                  onChange={e => setShowLabels(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
                />
                <span>色号</span>
              </label>

              <label className="flex items-center gap-1 cursor-pointer text-slate-600 select-none text-[11px] sm:text-xs shrink-0">
                <input
                  type="checkbox"
                  checked={showGrid}
                  onChange={e => setShowGrid(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
                />
                <span>网格</span>
              </label>

              <label className="flex items-center gap-1 cursor-pointer text-slate-600 select-none text-[11px] sm:text-xs shrink-0">
                <input
                  type="checkbox"
                  checked={showPegboardSeams}
                  onChange={e => setShowPegboardSeams(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
                />
                <span className="text-red-600 font-medium">拼板线</span>
              </label>

              <label className="flex items-center gap-1 cursor-pointer text-slate-600 select-none text-[11px] sm:text-xs shrink-0">
                <input
                  type="checkbox"
                  checked={showRuler}
                  onChange={e => setShowRuler(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
                />
                <span>标尺</span>
              </label>
            </div>
          </div>

          {/* VPS 缓冲与加载提示浮条 */}
          {isProcessing && (
            <div className="absolute top-12 sm:top-4 right-2.5 sm:right-4 z-10 bg-indigo-900/90 text-white backdrop-blur-md px-3 py-1 sm:py-1.5 rounded-xl border border-indigo-700/60 shadow-md flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs">
              <Loader2 size={13} className="animate-spin text-indigo-300 shrink-0" />
              <span>{processingTip || 'VPS 计算中...'}</span>
            </div>
          )}

          {/* Interactive Pattern Canvas */}
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
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 gap-2">
                <Loader2 size={32} className="animate-spin text-indigo-500" />
                <span className="text-xs">正在渲染拼豆图纸，请稍候...</span>
              </div>
            )}
          </div>
        </main>

        {/* Right Sidebar: Color Stats & Materials (大屏固定侧边栏 / 移动端弹窗抽屉) */}
        {quantizeResult && (
          <aside
            className={`
              ${mobileTab === 'stats' ? 'fixed inset-0 z-40 bg-white flex flex-col pt-0 pb-16' : 'hidden'}
              lg:flex lg:static lg:w-80 xl:w-88 flex-shrink-0 bg-white border-l border-slate-200 flex-col h-full overflow-hidden shadow-xs z-20
            `}
          >
            <StatsPanel
              stats={quantizeResult.stats}
              totalBeads={quantizeResult.totalBeads}
              highlightColor={highlightColor}
              onSelectColor={color => {
                setHighlightColor(color);
                // 手机端选中高亮色号后自动切回画板查看高亮区域
                if (window.innerWidth < 1024) {
                  setMobileTab('canvas');
                }
              }}
              onClose={() => setMobileTab('canvas')}
            />
          </aside>
        )}
      </div>

      {/* 3. Mobile Bottom Navigation Bar (仅在移动端小屏显示) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-14 bg-white/95 backdrop-blur-md border-t border-slate-200 flex items-center justify-around z-30 px-2 pb-[env(safe-area-inset-bottom)]">
        <button
          onClick={() => setMobileTab('canvas')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition cursor-pointer ${
            mobileTab === 'canvas' ? 'text-indigo-600 font-bold' : 'text-slate-500'
          }`}
        >
          <Grid size={18} />
          <span className="text-[10px] mt-0.5">图纸画板</span>
        </button>

        <button
          onClick={() => setMobileTab('controls')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition cursor-pointer ${
            mobileTab === 'controls' ? 'text-indigo-600 font-bold' : 'text-slate-500'
          }`}
        >
          <Sliders size={18} />
          <span className="text-[10px] mt-0.5">参数调节</span>
        </button>

        <button
          onClick={() => setMobileTab('stats')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition cursor-pointer relative ${
            mobileTab === 'stats' ? 'text-indigo-600 font-bold' : 'text-slate-500'
          }`}
        >
          <ListFilter size={18} />
          <span className="text-[10px] mt-0.5">用料清单</span>
          {quantizeResult && (
            <span className="absolute top-1 right-1/4 w-2 h-2 bg-indigo-600 rounded-full" />
          )}
        </button>

        <button
          onClick={() => setIsExportOpen(true)}
          disabled={!quantizeResult}
          className="flex flex-col items-center justify-center flex-1 py-1 text-slate-700 transition cursor-pointer disabled:opacity-40"
        >
          <Download size={18} className="text-indigo-600" />
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
  );
};

export default App;
