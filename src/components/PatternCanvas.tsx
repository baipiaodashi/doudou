import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { QuantizeResult } from '../utils/quantize';
import type { BeadColor } from '../data/palettes';
import { getContrastTextColor } from '../utils/exportPattern';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

interface PatternCanvasProps {
  result: QuantizeResult;
  highlightColor: BeadColor | null;
  onSelectColor?: (color: BeadColor | null) => void;
  renderMode: 'bead' | 'flat';
  showLabels: boolean;
  showGrid: boolean;
  showRuler: boolean;
  showPegboardSeams: boolean;
  pegboardWidth: number;
  pegboardHeight: number;
}

export const PatternCanvas: React.FC<PatternCanvasProps> = ({
  result,
  highlightColor,
  onSelectColor,
  renderMode,
  showLabels,
  showGrid,
  showRuler,
  showPegboardSeams,
  pegboardWidth,
  pegboardHeight
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Transform state: zoom and pan offset
  const [scale, setScale] = useState<number>(1);
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Touch handling state
  const touchStateRef = useRef<{
    startDistance: number;
    startScale: number;
    startCenter: { x: number; y: number };
    startOffset: { x: number; y: number };
    isPinching: boolean;
    touchStartTime: number;
    startPos: { x: number; y: number };
  }>({
    startDistance: 0,
    startScale: 1,
    startCenter: { x: 0, y: 0 },
    startOffset: { x: 0, y: 0 },
    isPinching: false,
    touchStartTime: 0,
    startPos: { x: 0, y: 0 }
  });

  // Hover state (mouse or single touch inspect)
  const [hoveredCell, setHoveredCell] = useState<{
    x: number;
    y: number;
    color: BeadColor | null;
    screenX: number;
    screenY: number;
    boardCol: number;
    boardRow: number;
  } | null>(null);

  const baseCellSize = 24; // Base cell dimension in virtual coordinates
  const rulerSize = showRuler ? 30 : 0;
  const { width, height, grid } = result;

  // Auto fit canvas on load or dimension change
  const resetView = useCallback(() => {
    if (!containerRef.current) return;
    const { clientWidth, clientHeight } = containerRef.current;
    if (clientWidth === 0 || clientHeight === 0) return;

    const contentW = width * baseCellSize + rulerSize + 40;
    const contentH = height * baseCellSize + rulerSize + 40;

    const initialScale = Math.min(
      Math.max(0.2, (clientWidth - 30) / contentW),
      Math.max(0.2, (clientHeight - 30) / contentH),
      1.5
    );

    setScale(initialScale);
    setOffset({
      x: Math.max(10, (clientWidth - contentW * initialScale) / 2),
      y: Math.max(10, (clientHeight - contentH * initialScale) / 2)
    });
  }, [width, height, rulerSize]);

  useEffect(() => {
    resetView();
  }, [resetView]);

  // Window resize observer to adapt DPR and viewport changes
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(() => {
      // Repaint on container resize
      draw();
    });
    observer.observe(container);

    return () => observer.disconnect();
  }, []);

  // Render loop
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Retina & High-PPI Screen adaptation
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const targetWidth = Math.round(rect.width * dpr);
    const targetHeight = Math.round(rect.height * dpr);

    if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
      canvas.width = targetWidth;
      canvas.height = targetHeight;
    }

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, rect.width, rect.height);

    // Apply Pan and Zoom
    ctx.translate(offset.x, offset.y);
    ctx.scale(scale, scale);

    const startX = rulerSize;
    const startY = rulerSize;
    const gridW = width * baseCellSize;
    const gridH = height * baseCellSize;

    // 1. Draw Ruler Background & Numbers
    if (showRuler) {
      ctx.fillStyle = '#F1F5F9';
      ctx.fillRect(startX, 0, gridW, rulerSize);
      ctx.fillRect(0, startY, rulerSize, gridH);

      ctx.fillStyle = '#64748B';
      ctx.font = '10px "Segoe UI", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Top Ruler (X)
      for (let x = 0; x < width; x++) {
        const num = x + 1;
        const isTen = num % 10 === 0;
        const isFive = num % 5 === 0;
        const isBoardBoundary = pegboardWidth > 0 && num % pegboardWidth === 0;
        const posX = startX + x * baseCellSize + baseCellSize / 2;

        if (isTen || isFive || isBoardBoundary || scale >= 0.8) {
          ctx.fillStyle = isBoardBoundary ? '#DC2626' : isTen ? '#0F172A' : '#64748B';
          ctx.font = (isTen || isBoardBoundary) ? 'bold 10px sans-serif' : '10px sans-serif';
          ctx.fillText(`${num}`, posX, rulerSize / 2);
        }
      }

      // Left Ruler (Y)
      for (let y = 0; y < height; y++) {
        const num = y + 1;
        const isTen = num % 10 === 0;
        const isFive = num % 5 === 0;
        const isBoardBoundary = pegboardHeight > 0 && num % pegboardHeight === 0;
        const posY = startY + y * baseCellSize + baseCellSize / 2;

        if (isTen || isFive || isBoardBoundary || scale >= 0.8) {
          ctx.fillStyle = isBoardBoundary ? '#DC2626' : isTen ? '#0F172A' : '#64748B';
          ctx.font = (isTen || isBoardBoundary) ? 'bold 10px sans-serif' : '10px sans-serif';
          ctx.fillText(`${num}`, rulerSize / 2, posY);
        }
      }
    }

    // 2. Draw Cells
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const bead = grid[y][x];
        const cellX = startX + x * baseCellSize;
        const cellY = startY + y * baseCellSize;

        // Check highlight filtering
        const isHighlighted = !highlightColor || (bead && bead.code === highlightColor.code);
        const isHovered = hoveredCell && hoveredCell.x === x && hoveredCell.y === y;

        if (!bead) {
          // Checkerboard for empty
          ctx.fillStyle = (x + y) % 2 === 0 ? '#F8FAFC' : '#EDF2F7';
          ctx.fillRect(cellX, cellY, baseCellSize, baseCellSize);
          continue;
        }

        ctx.save();
        if (!isHighlighted) {
          ctx.globalAlpha = 0.15; // Dim non-selected beads
        }

        if (renderMode === 'bead') {
          // Plate base
          ctx.fillStyle = '#F8FAFC';
          ctx.fillRect(cellX, cellY, baseCellSize, baseCellSize);

          // Bead Circle
          const radius = (baseCellSize / 2) * 0.92;
          const cx = cellX + baseCellSize / 2;
          const cy = cellY + baseCellSize / 2;

          ctx.beginPath();
          ctx.arc(cx, cy, radius, 0, Math.PI * 2);
          ctx.fillStyle = bead.hex;
          ctx.fill();

          // Hole
          const holeRadius = radius * 0.38;
          ctx.beginPath();
          ctx.arc(cx, cy, holeRadius, 0, Math.PI * 2);
          ctx.fillStyle = '#FFFFFF';
          ctx.fill();
          ctx.lineWidth = 1;
          ctx.strokeStyle = 'rgba(0,0,0,0.12)';
          ctx.stroke();

          // 3D Highlight & Shadow
          const grad = ctx.createLinearGradient(cx - radius, cy - radius, cx + radius, cy + radius);
          grad.addColorStop(0, 'rgba(255,255,255,0.4)');
          grad.addColorStop(0.5, 'transparent');
          grad.addColorStop(1, 'rgba(0,0,0,0.25)');
          ctx.beginPath();
          ctx.arc(cx, cy, radius, 0, Math.PI * 2);
          ctx.fillStyle = grad;
          ctx.fill();
        } else {
          // Flat mode
          ctx.fillStyle = bead.hex;
          ctx.fillRect(cellX, cellY, baseCellSize, baseCellSize);
        }

        // Show code label
        if (showLabels && baseCellSize * scale >= 16) {
          ctx.fillStyle = getContrastTextColor(bead.hex);
          ctx.font = `bold ${Math.max(8, Math.floor(baseCellSize * 0.38))}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(bead.code, cellX + baseCellSize / 2, cellY + baseCellSize / 2);
        }

        // Highlight border if active or hovered
        if (isHighlighted && highlightColor) {
          ctx.strokeStyle = '#F59E0B';
          ctx.lineWidth = 2;
          ctx.strokeRect(cellX + 1, cellY + 1, baseCellSize - 2, baseCellSize - 2);
        }

        if (isHovered) {
          ctx.strokeStyle = '#3B82F6';
          ctx.lineWidth = 2.5;
          ctx.strokeRect(cellX + 1, cellY + 1, baseCellSize - 2, baseCellSize - 2);
        }

        ctx.restore();
      }
    }

    // 3. Grid Lines
    if (showGrid) {
      // Light cell borders
      ctx.lineWidth = 0.5;
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
      ctx.beginPath();
      for (let x = 0; x <= width; x++) {
        const px = startX + x * baseCellSize;
        ctx.moveTo(px, startY);
        ctx.lineTo(px, startY + gridH);
      }
      for (let y = 0; y <= height; y++) {
        const py = startY + y * baseCellSize;
        ctx.moveTo(startX, py);
        ctx.lineTo(startX + gridW, py);
      }
      ctx.stroke();

      // 5-cell thick lines
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = 'rgba(71, 85, 105, 0.55)';
      ctx.beginPath();
      for (let x = 0; x <= width; x += 5) {
        const px = startX + x * baseCellSize;
        ctx.moveTo(px, startY);
        ctx.lineTo(px, startY + gridH);
      }
      for (let y = 0; y <= height; y += 5) {
        const py = startY + y * baseCellSize;
        ctx.moveTo(startX, py);
        ctx.lineTo(startX + gridW, py);
      }
      ctx.stroke();

      // 10-cell bold lines
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.beginPath();
      for (let x = 0; x <= width; x += 10) {
        const px = startX + x * baseCellSize;
        ctx.moveTo(px, startY);
        ctx.lineTo(px, startY + gridH);
      }
      for (let y = 0; y <= height; y += 10) {
        const py = startY + y * baseCellSize;
        ctx.moveTo(startX, py);
        ctx.lineTo(startX + gridW, py);
      }
      ctx.stroke();
    }

    // 4. Pegboard Seams (物理单板接缝分割线)
    if (showPegboardSeams && pegboardWidth > 0 && pegboardHeight > 0) {
      ctx.save();
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = '#DC2626'; // High contrast red
      ctx.setLineDash([8, 4]);

      // Vertical board boundaries
      for (let x = pegboardWidth; x < width; x += pegboardWidth) {
        const px = startX + x * baseCellSize;
        ctx.beginPath();
        ctx.moveTo(px, startY);
        ctx.lineTo(px, startY + gridH);
        ctx.stroke();
      }

      // Horizontal board boundaries
      for (let y = pegboardHeight; y < height; y += pegboardHeight) {
        const py = startY + y * baseCellSize;
        ctx.beginPath();
        ctx.moveTo(startX, py);
        ctx.lineTo(startX + gridW, py);
        ctx.stroke();
      }
      ctx.restore();

      // Board Index Badges
      const cols = Math.ceil(width / pegboardWidth);
      const rows = Math.ceil(height / pegboardHeight);
      if (cols > 1 || rows > 1) {
        ctx.save();
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';

        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const bx = startX + c * pegboardWidth * baseCellSize + 6;
            const by = startY + r * pegboardHeight * baseCellSize + 6;

            ctx.fillStyle = 'rgba(254, 242, 242, 0.9)';
            ctx.fillRect(bx - 2, by - 2, 64, 18);
            ctx.strokeStyle = '#DC2626';
            ctx.lineWidth = 1;
            ctx.strokeRect(bx - 2, by - 2, 64, 18);

            ctx.fillStyle = '#DC2626';
            ctx.fillText(`拼板 ${r + 1}-${c + 1}`, bx + 3, by + 2);
          }
        }
        ctx.restore();
      }
    }

    ctx.restore();
  }, [
    scale,
    offset,
    renderMode,
    showLabels,
    showGrid,
    showRuler,
    showPegboardSeams,
    pegboardWidth,
    pegboardHeight,
    highlightColor,
    hoveredCell,
    grid,
    height,
    rulerSize,
    width
  ]);

  useEffect(() => {
    const animId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animId);
  }, [draw]);

  // Mouse wheel zoom centered on mouse
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
    const newScale = Math.min(Math.max(0.15, scale * zoomFactor), 8);

    // Keep point under cursor invariant
    const newOffsetX = mouseX - (mouseX - offset.x) * (newScale / scale);
    const newOffsetY = mouseY - (mouseY - offset.y) * (newScale / scale);

    setScale(newScale);
    setOffset({ x: newOffsetX, y: newOffsetY });
  };

  // Drag pan (Mouse)
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (isDragging) {
      setOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
      setHoveredCell(null);
      return;
    }

    // Cell hit test
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const gridPixelX = (mouseX - offset.x) / scale - rulerSize;
    const gridPixelY = (mouseY - offset.y) / scale - rulerSize;

    const cellX = Math.floor(gridPixelX / baseCellSize);
    const cellY = Math.floor(gridPixelY / baseCellSize);

    if (cellX >= 0 && cellX < width && cellY >= 0 && cellY < height) {
      const color = grid[cellY][cellX];
      const bCol = pegboardWidth > 0 ? Math.floor(cellX / pegboardWidth) + 1 : 1;
      const bRow = pegboardHeight > 0 ? Math.floor(cellY / pegboardHeight) + 1 : 1;

      setHoveredCell({
        x: cellX,
        y: cellY,
        color,
        screenX: e.clientX,
        screenY: e.clientY,
        boardCol: bCol,
        boardRow: bRow
      });
    } else {
      setHoveredCell(null);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleClick = () => {
    if (hoveredCell && hoveredCell.color && onSelectColor) {
      if (highlightColor && highlightColor.code === hoveredCell.color.code) {
        onSelectColor(null);
      } else {
        onSelectColor(hoveredCell.color);
      }
    }
  };

  // -------------------------------------------------------------
  // 触摸手势事件处理 (移动端单指平移 + 双指捏合缩放 + 轻触拾色)
  // -------------------------------------------------------------
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (e.touches.length === 1) {
      // 单指开始拖拽或轻触
      const touch = e.touches[0];
      touchStateRef.current = {
        ...touchStateRef.current,
        isPinching: false,
        touchStartTime: Date.now(),
        startPos: { x: touch.clientX, y: touch.clientY }
      };
      setIsDragging(true);
      setDragStart({ x: touch.clientX - offset.x, y: touch.clientY - offset.y });
    } else if (e.touches.length === 2) {
      // 双指开始捏合缩放
      setIsDragging(false);
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const distance = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      const rect = canvas.getBoundingClientRect();
      const centerX = (t1.clientX + t2.clientX) / 2 - rect.left;
      const centerY = (t1.clientY + t2.clientY) / 2 - rect.top;

      touchStateRef.current = {
        ...touchStateRef.current,
        isPinching: true,
        startDistance: distance,
        startScale: scale,
        startCenter: { x: centerX, y: centerY },
        startOffset: { ...offset }
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (e.touches.length === 1 && !touchStateRef.current.isPinching) {
      // 单指拖动画布
      const touch = e.touches[0];
      setOffset({
        x: touch.clientX - dragStart.x,
        y: touch.clientY - dragStart.y
      });
      setHoveredCell(null);
    } else if (e.touches.length === 2) {
      // 双指捏合平滑缩放
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const distance = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      if (touchStateRef.current.startDistance <= 0) return;

      const factor = distance / touchStateRef.current.startDistance;
      const newScale = Math.min(Math.max(0.15, touchStateRef.current.startScale * factor), 8);

      const center = touchStateRef.current.startCenter;
      const startOff = touchStateRef.current.startOffset;

      const newOffsetX = center.x - (center.x - startOff.x) * (newScale / touchStateRef.current.startScale);
      const newOffsetY = center.y - (center.y - startOff.y) * (newScale / touchStateRef.current.startScale);

      setScale(newScale);
      setOffset({ x: newOffsetX, y: newOffsetY });
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // 检测轻触拾色 (Tap detection)
    if (!touchStateRef.current.isPinching && e.changedTouches.length > 0) {
      const touch = e.changedTouches[0];
      const duration = Date.now() - touchStateRef.current.touchStartTime;
      const moveDist = Math.hypot(
        touch.clientX - touchStateRef.current.startPos.x,
        touch.clientY - touchStateRef.current.startPos.y
      );

      if (duration < 300 && moveDist < 8) {
        // 判定为单指点击
        const rect = canvas.getBoundingClientRect();
        const touchX = touch.clientX - rect.left;
        const touchY = touch.clientY - rect.top;

        const gridPixelX = (touchX - offset.x) / scale - rulerSize;
        const gridPixelY = (touchY - offset.y) / scale - rulerSize;

        const cellX = Math.floor(gridPixelX / baseCellSize);
        const cellY = Math.floor(gridPixelY / baseCellSize);

        if (cellX >= 0 && cellX < width && cellY >= 0 && cellY < height) {
          const color = grid[cellY][cellX];
          if (color && onSelectColor) {
            if (highlightColor && highlightColor.code === color.code) {
              onSelectColor(null);
            } else {
              onSelectColor(color);
            }
          }
        }
      }
    }

    if (e.touches.length === 0) {
      setIsDragging(false);
      touchStateRef.current.isPinching = false;
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden bg-slate-100 select-none touch-none"
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-grab active:cursor-grabbing block touch-none"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          setIsDragging(false);
          setHoveredCell(null);
        }}
        onClick={handleClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={() => {
          setIsDragging(false);
          touchStateRef.current.isPinching = false;
        }}
      />

      {/* Floating Canvas Controls (适应手机屏幕底部) */}
      <div className="absolute bottom-20 md:bottom-5 left-4 bg-white/95 backdrop-blur-md shadow-lg rounded-xl border border-slate-200/80 p-1 flex items-center gap-1 z-10">
        <button
          onClick={() => setScale(s => Math.min(8, s * 1.25))}
          title="放大"
          className="p-1.5 hover:bg-slate-100 text-slate-700 rounded-lg transition cursor-pointer"
        >
          <ZoomIn size={16} />
        </button>
        <span className="text-[11px] font-semibold font-mono text-slate-600 px-1 min-w-[38px] text-center">
          {Math.round(scale * 100)}%
        </span>
        <button
          onClick={() => setScale(s => Math.max(0.15, s * 0.8))}
          title="缩小"
          className="p-1.5 hover:bg-slate-100 text-slate-700 rounded-lg transition cursor-pointer"
        >
          <ZoomOut size={16} />
        </button>
        <div className="w-[1px] h-3.5 bg-slate-200 mx-0.5" />
        <button
          onClick={resetView}
          title="居中重置视图"
          className="p-1.5 hover:bg-slate-100 text-slate-700 rounded-lg transition cursor-pointer"
        >
          <RotateCcw size={16} />
        </button>
      </div>

      {/* Active Highlight Banner */}
      {highlightColor && (
        <div className="absolute top-16 md:top-4 left-4 max-w-[85vw] bg-amber-500 text-white shadow-md rounded-lg px-2.5 py-1.5 text-xs font-medium flex items-center gap-2 z-10">
          <div
            className="w-3.5 h-3.5 rounded-full border border-white/60 shadow-sm shrink-0"
            style={{ backgroundColor: highlightColor.hex }}
          />
          <span className="truncate">
            高亮: <strong>{highlightColor.code} - {highlightColor.name}</strong>
          </span>
          <button
            onClick={() => onSelectColor?.(null)}
            className="ml-auto bg-amber-600 hover:bg-amber-700 px-1.5 py-0.5 rounded text-[10px] shrink-0 cursor-pointer"
          >
            清除
          </button>
        </div>
      )}
    </div>
  );
};
