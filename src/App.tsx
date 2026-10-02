import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import {
  Upload,
  Image as ImageIcon,
  Palette,
  Sliders,
  Grid,
  Download,
  Layers,
  Sparkles,
  Hash,
  Ruler,
  Lock,
  Unlock,
  ChevronRight,
  ChevronLeft,
  Plus,
  Trash2,
  SplitSquareVertical
} from 'lucide-react';

export const App: React.FC = () => {
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
  const [showStats, setShowStats] = useState<boolean>(true);
  const [quantizeResult, setQuantizeResult] = useState<QuantizeResult | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Re-run quantize whenever image or settings change
  const runQuantize = useCallback(() => {
    if (!imageEl) return;

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

    try {
      const res = processImageToPattern(imageEl, options);
      setQuantizeResult(res);
      // Reset highlight if previous highlighted color is no longer used
      if (highlightColor && !res.stats.some(s => s.color.code === highlightColor.code)) {
        setHighlightColor(null);
      }
    } catch (err) {
      console.error('Quantization error', err);
    }
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
    highlightColor
  ]);

  useEffect(() => {
    runQuantize();
  }, [runQuantize]);

  return (
    <div
      className="flex flex-col h-screen w-screen overflow-hidden bg-slate-100"
      onDragOver={e => e.preventDefault()}
      onDrop={handleDrop}
    >
      {/* 1. Header Bar */}
      <header className="h-14 bg-white border-b border-slate-200 px-5 flex items-center justify-between shadow-xs z-20">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-tr from-indigo-600 to-purple-500 rounded-xl flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
            <Sparkles size={20} />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-800 leading-tight flex items-center gap-2">
              <span>拼豆图纸工坊</span>
              <span className="text-[11px] font-normal px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md">
                PixelBead Studio
              </span>
            </h1>
            <p className="text-[11px] text-slate-400">支持自定义拼豆板 · 拼板分割线与分板制作 · 真实色卡精确匹配</p>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-2">
          {quantizeResult && (
            <div className="hidden lg:flex items-center gap-3 text-xs bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 mr-2">
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
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-sm transition disabled:opacity-50 cursor-pointer"
          >
            <Download size={15} />
            <span>导出制作图纸</span>
          </button>
        </div>
      </header>

      {/* 2. Main Workspace Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: Controls & Options */}
        <aside className="w-84 flex-shrink-0 bg-white border-r border-slate-200 flex flex-col h-full overflow-y-auto">
          {/* Section: Upload & Samples */}
          <div className="p-4 border-b border-slate-100 space-y-3">
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
              <span className="text-[11px] text-slate-400">试试内置示例:</span>
              <div className="flex gap-1.5">
                <button
                  onClick={() => loadImageUrl(generateSampleMushroom())}
                  className="px-2 py-1 bg-slate-50 hover:bg-slate-100 rounded text-[11px] font-medium text-slate-600 border border-slate-200 transition cursor-pointer"
                >
                  🍄 蘑菇
                </button>
                <button
                  onClick={() => loadImageUrl(generateSamplePikachu())}
                  className="px-2 py-1 bg-slate-50 hover:bg-slate-100 rounded text-[11px] font-medium text-slate-600 border border-slate-200 transition cursor-pointer"
                >
                  ⚡ 皮卡丘
                </button>
                <button
                  onClick={() => loadImageUrl(generateSampleHeart())}
                  className="px-2 py-1 bg-slate-50 hover:bg-slate-100 rounded text-[11px] font-medium text-slate-600 border border-slate-200 transition cursor-pointer"
                >
                  ❤️ 爱心
                </button>
              </div>
            </div>
          </div>

          {/* Section: Pegboard & Total Size (单板规格与拼板尺寸) */}
          <div className="p-4 border-b border-slate-100 space-y-3.5">
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
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-0.5">
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
          <div className="p-4 border-b border-slate-100 space-y-3">
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
                <div className="font-bold text-xs">漫拼 Mard</div>
                <div className="text-[10px] text-slate-400 mt-0.5">国内主流全色卡(60色)</div>
              </button>

              <button
                onClick={() => setSelectedBrand('perler')}
                className={`p-2 rounded-xl border text-left transition cursor-pointer ${
                  selectedBrand === 'perler'
                    ? 'bg-indigo-50 border-indigo-400 text-indigo-800'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="font-bold text-xs">Perler</div>
                <div className="text-[10px] text-slate-400 mt-0.5">国际经典流行色(37色)</div>
              </button>

              <button
                onClick={() => setSelectedBrand('artkal')}
                className={`p-2 rounded-xl border text-left transition cursor-pointer ${
                  selectedBrand === 'artkal'
                    ? 'bg-indigo-50 border-indigo-400 text-indigo-800'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="font-bold text-xs">Artkal</div>
                <div className="text-[10px] text-slate-400 mt-0.5">高频纯正色卡(24色)</div>
              </button>

              <button
                onClick={() => setSelectedBrand('all')}
                className={`p-2 rounded-xl border text-left transition cursor-pointer ${
                  selectedBrand === 'all'
                    ? 'bg-indigo-50 border-indigo-400 text-indigo-800'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="font-bold text-xs">全部色系混拼</div>
                <div className="text-[10px] text-slate-400 mt-0.5">多品牌联合匹配(121色)</div>
              </button>
            </div>

            {/* Limit max colors */}
            <div className="pt-2">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-slate-600 font-medium">限制最大颜色数</span>
                <span className="font-mono text-indigo-600 font-bold">
                  {maxColors === 0 ? '不限制' : `${maxColors} 种`}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="48"
                step="4"
                value={maxColors}
                onChange={e => setMaxColors(Number(e.target.value))}
                className="w-full accent-indigo-600 cursor-pointer"
              />
              <span className="text-[10px] text-slate-400">限制色种可大幅减少所需色号，降低新手拼装难度</span>
            </div>
          </div>

          {/* Section: Adjustments & Quantize Engine */}
          <div className="p-4 border-b border-slate-100 space-y-3">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Sliders size={14} className="text-indigo-500" />
              图像与算法调节
            </span>

            {/* Dither & Background Removal */}
            <div className="space-y-2 pt-1">
              <label className="flex items-center justify-between text-xs text-slate-600 cursor-pointer">
                <span>Floyd-Steinberg 误差抖动</span>
                <input
                  type="checkbox"
                  checked={dither}
                  onChange={e => setDither(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
              </label>

              <label className="flex items-center justify-between text-xs text-slate-600 cursor-pointer">
                <span>扣除纯白底色 (透明背景)</span>
                <input
                  type="checkbox"
                  checked={removeBg}
                  onChange={e => setRemoveBg(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
              </label>

              {removeBg && (
                <div className="pl-2 pt-1">
                  <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                    <span>白色容差阈值</span>
                    <span>{bgTolerance}%</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="40"
                    value={bgTolerance}
                    onChange={e => setBgTolerance(Number(e.target.value))}
                    className="w-full accent-indigo-600"
                  />
                </div>
              )}
            </div>

            {/* Brightness, Contrast, Saturation */}
            <div className="space-y-2.5 pt-2 border-t border-slate-100">
              <div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                  <span>亮度调节</span>
                  <span className="font-mono">{brightness > 0 ? `+${brightness}` : brightness}</span>
                </div>
                <input
                  type="range"
                  min="-50"
                  max="50"
                  value={brightness}
                  onChange={e => setBrightness(Number(e.target.value))}
                  className="w-full accent-indigo-600"
                />
              </div>

              <div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                  <span>对比度调节</span>
                  <span className="font-mono">{contrast > 0 ? `+${contrast}` : contrast}</span>
                </div>
                <input
                  type="range"
                  min="-50"
                  max="50"
                  value={contrast}
                  onChange={e => setContrast(Number(e.target.value))}
                  className="w-full accent-indigo-600"
                />
              </div>

              <div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                  <span>色彩饱和度</span>
                  <span className="font-mono">{saturation > 0 ? `+${saturation}` : saturation}</span>
                </div>
                <input
                  type="range"
                  min="-50"
                  max="50"
                  value={saturation}
                  onChange={e => setSaturation(Number(e.target.value))}
                  className="w-full accent-indigo-600"
                />
              </div>

              {(brightness !== 0 || contrast !== 0 || saturation !== 0) && (
                <button
                  onClick={() => {
                    setBrightness(0);
                    setContrast(0);
                    setSaturation(0);
                  }}
                  className="text-[11px] text-indigo-600 hover:text-indigo-700 underline block cursor-pointer"
                >
                  重置色彩调节
                </button>
              )}
            </div>
          </div>
        </aside>

        {/* Center: Pattern Canvas Stage */}
        <main className="flex-1 flex flex-col h-full overflow-hidden relative">
          {/* Top Canvas View Toolbar */}
          <div className="h-11 bg-white border-b border-slate-200 px-4 flex items-center justify-between text-xs text-slate-600 z-10 shadow-xs">
            <div className="flex items-center gap-1.5">
              {/* Style switch */}
              <div className="bg-slate-100 p-0.5 rounded-lg flex items-center mr-2">
                <button
                  onClick={() => setRenderMode('bead')}
                  className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer ${
                    renderMode === 'bead' ? 'bg-white text-indigo-600 shadow-xs font-bold' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  拟真拼豆
                </button>
                <button
                  onClick={() => setRenderMode('flat')}
                  className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer ${
                    renderMode === 'flat' ? 'bg-white text-indigo-600 shadow-xs font-bold' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  平铺方格
                </button>
              </div>

              {/* Toggles */}
              <button
                onClick={() => setShowLabels(!showLabels)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border transition cursor-pointer ${
                  showLabels ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-medium' : 'border-slate-200 text-slate-600'
                }`}
                title="放大至适度时在格子上显示色号 (如 M01)"
              >
                <Hash size={13} />
                <span>色号标注</span>
              </button>

              <button
                onClick={() => setShowGrid(!showGrid)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border transition cursor-pointer ${
                  showGrid ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-medium' : 'border-slate-200 text-slate-600'
                }`}
                title="开启单元格与 5格/10格 参考线"
              >
                <Grid size={13} />
                <span>基础网格</span>
              </button>

              <button
                onClick={() => setShowPegboardSeams(!showPegboardSeams)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border transition cursor-pointer ${
                  showPegboardSeams ? 'bg-red-50 border-red-200 text-red-700 font-medium' : 'border-slate-200 text-slate-600'
                }`}
                title="开启物理拼板接缝红线与拼板编号 (如 板1-1, 板1-2)"
              >
                <SplitSquareVertical size={13} />
                <span>拼板接缝线</span>
              </button>

              <button
                onClick={() => setShowRuler(!showRuler)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border transition cursor-pointer ${
                  showRuler ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-medium' : 'border-slate-200 text-slate-600'
                }`}
                title="开启顶部与左侧数字标尺"
              >
                <Ruler size={13} />
                <span>坐标标尺</span>
              </button>
            </div>

            {/* Toggle Stats Panel Button */}
            <button
              onClick={() => setShowStats(!showStats)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border transition cursor-pointer ${
                showStats ? 'bg-slate-100 border-slate-300 text-slate-800 font-medium' : 'border-slate-200 text-slate-500'
              }`}
            >
              <Layers size={14} />
              <span>用料清单</span>
              {showStats ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>
          </div>

          {/* Interactive Canvas */}
          <div className="flex-1 w-full h-full relative">
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
              <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                加载图像中...
              </div>
            )}
          </div>
        </main>

        {/* Right Sidebar: Material Stats Panel */}
        {showStats && quantizeResult && (
          <aside className="w-80 flex-shrink-0 h-full">
            <StatsPanel
              stats={quantizeResult.stats}
              totalBeads={quantizeResult.totalBeads}
              highlightColor={highlightColor}
              onSelectColor={setHighlightColor}
            />
          </aside>
        )}
      </div>

      {/* Export Modal */}
      {quantizeResult && (
        <ExportModal
          isOpen={isExportOpen}
          onClose={() => setIsExportOpen(false)}
          result={quantizeResult}
          pegboardWidth={currentBoard.width}
          pegboardHeight={currentBoard.height}
        />
      )}
    </div>
  );
};

export default App;
