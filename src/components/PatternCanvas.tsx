import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { QuantizeResult } from '../utils/quantize';
import type { BeadColor } from '../data/palettes';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

interface PatternCanvasProps {
  result: QuantizeResult;
  highlightColor?: BeadColor | null;
  onSelectColor?: (color: BeadColor) => void;
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

  // Container dimension state to avoid reading ref during render
  const [containerSize, setContainerSize] = useState<{ width: number; height: number }>({
    width: 800,
    height: 600
  });

  // Pan and Zoom viewport state
  const [scale, setScale] = useState<number>(1);
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Touch gesture pinch-zoom state
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

    setContainerSize({ width: clientWidth, height: clientHeight });

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

  // Render loop
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    if (canvas.width !== Math.round(rect.width * dpr) || canvas.height !== Math.round(rect.height * dpr)) {
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
    }

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, rect.width, rect.height);

    ctx.save();
    ctx.translate(offset.x, offset.y);
    ctx.scale(scale, scale);

    const startX = rulerSize;
    const startY = rulerSize;

    // 1. Draw Beads
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const bead = grid[y][x];
        const cellX = startX + x * baseCellSize;
        const cellY = startY + y * baseCellSize;

        let isDimmed = false;
        if (highlightColor) {
          isDimmed = !bead || bead.code !== highlightColor.code;
        }

        ctx.save();
        if (isDimmed) {
          ctx.globalAlpha = 0.15;
        }

        if (!bead) {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(cellX, cellY, baseCellSize, baseCellSize);

          ctx.strokeStyle = '#E2E8F0';
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(cellX + 4, cellY + 4);
          ctx.lineTo(cellX + baseCellSize - 4, cellY + baseCellSize - 4);
          ctx.moveTo(cellX + baseCellSize - 4, cellY + 4);
          ctx.lineTo(cellX + 4, cellY + baseCellSize - 4);
          ctx.stroke();
        } else if (renderMode === 'flat') {
          ctx.fillStyle = bead.hex;
          ctx.fillRect(cellX, cellY, baseCellSize, baseCellSize);
        } else {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(cellX, cellY, baseCellSize, baseCellSize);

          const radius = (baseCellSize / 2) - 1.5;
          const centerX = cellX + baseCellSize / 2;
          const centerY = cellY + baseCellSize / 2;

          ctx.beginPath();
          ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
          ctx.fillStyle = bead.hex;
          ctx.fill();

          ctx.lineWidth = 1;
          ctx.strokeStyle = 'rgba(0, 0, 0, 0.12)';
          ctx.stroke();

          const grad = ctx.createRadialGradient(
            centerX - radius * 0.35,
            centerY - radius * 0.35,
            radius * 0.1,
            centerX,
            centerY,
            radius
          );
          grad.addColorStop(0, 'rgba(255, 255, 255, 0.38)');
          grad.addColorStop(0.7, 'rgba(255, 255, 255, 0)');
          grad.addColorStop(1, 'rgba(0, 0, 0, 0.18)');

          ctx.beginPath();
          ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
          ctx.fillStyle = grad;
          ctx.fill();

          ctx.beginPath();
          ctx.arc(centerX, centerY, radius * 0.38, 0, Math.PI * 2);
          ctx.fillStyle = '#E5E7EB';
          ctx.fill();

          ctx.lineWidth = 0.8;
          ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
          ctx.stroke();
        }

        // Draw Labels
        if (showLabels && bead && scale >= 0.75) {
          const fontSize = Math.min(10, Math.max(7, Math.floor(baseCellSize * 0.36)));
          ctx.font = `600 ${fontSize}px "JetBrains Mono", Menlo, Consolas, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';

          const rgb = bead.rgb;
          const brightness = (rgb[0] * 299 + rgb[1] * 587 + rgb[2] * 114) / 1000;
          ctx.fillStyle = brightness > 155 ? '#000000' : '#FFFFFF';

          const shortCode = bead.code;
          ctx.fillText(shortCode, cellX + baseCellSize / 2, cellY + baseCellSize / 2);
        }

        ctx.restore();
      }
    }

    // 2. Draw Grid Lines
    if (showGrid) {
      ctx.save();
      ctx.lineWidth = 0.5;
      ctx.strokeStyle = '#CBD5E1';

      ctx.beginPath();
      for (let x = 0; x <= width; x++) {
        const px = startX + x * baseCellSize;
        ctx.moveTo(px, startY);
        ctx.lineTo(px, startY + height * baseCellSize);
      }
      for (let y = 0; y <= height; y++) {
        const py = startY + y * baseCellSize;
        ctx.moveTo(startX, py);
        ctx.lineTo(startX + width * baseCellSize, py);
      }
      ctx.stroke();

      // Bold 5/10 step major grid lines
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = '#94A3B8';
      ctx.beginPath();
      for (let x = 0; x <= width; x += 5) {
        const px = startX + x * baseCellSize;
        ctx.moveTo(px, startY);
        ctx.lineTo(px, startY + height * baseCellSize);
      }
      for (let y = 0; y <= height; y += 5) {
        const py = startY + y * baseCellSize;
        ctx.moveTo(startX, py);
        ctx.lineTo(startX + width * baseCellSize, py);
      }
      ctx.stroke();
      ctx.restore();
    }

    // 3. Draw Pegboard Seam Guides
    if (showPegboardSeams && pegboardWidth > 0 && pegboardHeight > 0) {
      ctx.save();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#D97757';
      ctx.setLineDash([6, 4]);

      ctx.beginPath();
      for (let x = pegboardWidth; x < width; x += pegboardWidth) {
        const px = startX + x * baseCellSize;
        ctx.moveTo(px, startY);
        ctx.lineTo(px, startY + height * baseCellSize);
      }
      for (let y = pegboardHeight; y < height; y += pegboardHeight) {
        const py = startY + y * baseCellSize;
        ctx.moveTo(startX, py);
        ctx.lineTo(startX + width * baseCellSize, py);
      }
      ctx.stroke();
      ctx.restore();
    }

    // 4. Draw Outer Frame
    ctx.save();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#475569';
    ctx.strokeRect(startX, startY, width * baseCellSize, height * baseCellSize);
    ctx.restore();

    // 5. Draw Rulers
    if (showRuler) {
      ctx.save();
      ctx.fillStyle = '#FAF9F5';
      ctx.fillRect(startX, 0, width * baseCellSize, rulerSize);
      ctx.fillRect(0, startY, rulerSize, height * baseCellSize);

      ctx.fillStyle = '#64748B';
      ctx.font = '10px "JetBrains Mono", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      for (let x = 0; x < width; x++) {
        const val = x + 1;
        if (val === 1 || val % 5 === 0 || val === width) {
          const px = startX + x * baseCellSize + baseCellSize / 2;
          ctx.fillText(String(val), px, rulerSize / 2);
        }
      }

      for (let y = 0; y < height; y++) {
        const val = y + 1;
        if (val === 1 || val % 5 === 0 || val === height) {
          const py = startY + y * baseCellSize + baseCellSize / 2;
          ctx.fillText(String(val), rulerSize / 2, py);
        }
      }

      ctx.strokeStyle = '#CBD5E1';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(startX, rulerSize);
      ctx.lineTo(startX + width * baseCellSize, rulerSize);
      ctx.moveTo(rulerSize, startY);
      ctx.lineTo(rulerSize, startY + height * baseCellSize);
      ctx.stroke();

      ctx.restore();
    }

    // 6. Draw Pegboard Sub-board Badges
    if (showPegboardSeams && pegboardWidth > 0 && pegboardHeight > 0) {
      const cols = Math.ceil(width / pegboardWidth);
      const rows = Math.ceil(height / pegboardHeight);

      if (cols > 1 || rows > 1) {
        ctx.save();
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';

        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const bx = startX + c * pegboardWidth * baseCellSize + 4;
            const by = startY + r * pegboardHeight * baseCellSize + 4;

            ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
            ctx.fillRect(bx - 2, by - 2, 48, 14);

            ctx.fillStyle = '#C15F3F';
            ctx.fillText(`拼板 ${r + 1}-${c + 1}`, bx + 2, by + 2);
          }
        }
        ctx.restore();
      }
    }

    ctx.restore();
  }, [
    grid,
    width,
    height,
    offset,
    scale,
    renderMode,
    showLabels,
    showGrid,
    showRuler,
    showPegboardSeams,
    pegboardWidth,
    pegboardHeight,
    highlightColor,
    rulerSize
  ]);

  // Window resize observer to adapt DPR and viewport changes
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(() => {
      setContainerSize({ width: container.clientWidth, height: container.clientHeight });
      draw();
    });
    observer.observe(container);

    return () => observer.disconnect();
  }, [draw]);

  useEffect(() => {
    draw();
  }, [draw]);

  const inspectCellAtClientPos = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = clientX - rect.left;
    const mouseY = clientY - rect.top;

    const canvasX = (mouseX - offset.x) / scale;
    const canvasY = (mouseY - offset.y) / scale;

    const gridX = Math.floor((canvasX - rulerSize) / baseCellSize);
    const gridY = Math.floor((canvasY - rulerSize) / baseCellSize);

    if (gridX >= 0 && gridX < width && gridY >= 0 && gridY < height) {
      const bead = grid[gridY][gridX];
      const boardCol = pegboardWidth > 0 ? Math.floor(gridX / pegboardWidth) + 1 : 1;
      const boardRow = pegboardHeight > 0 ? Math.floor(gridY / pegboardHeight) + 1 : 1;

      setHoveredCell({
        x: gridX,
        y: gridY,
        color: bead,
        screenX: mouseX,
        screenY: mouseY,
        boardCol,
        boardRow
      });

      if (onSelectColor && bead) {
        onSelectColor(bead);
      }
    } else {
      setHoveredCell(null);
    }
  }, [offset.x, offset.y, scale, rulerSize, width, height, grid, pegboardWidth, pegboardHeight, onSelectColor]);

  // Touch gesture handlers for mobile pinch zoom & pan
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const now = Date.now();
    if (e.touches.length === 2) {
      e.preventDefault();
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      const center = {
        x: (t1.clientX + t2.clientX) / 2,
        y: (t1.clientY + t2.clientY) / 2
      };
      touchStateRef.current = {
        startDistance: dist,
        startScale: scale,
        startCenter: center,
        startOffset: { ...offset },
        isPinching: true,
        touchStartTime: now,
        startPos: center
      };
    } else if (e.touches.length === 1) {
      const t = e.touches[0];
      touchStateRef.current = {
        ...touchStateRef.current,
        isPinching: false,
        touchStartTime: now,
        startPos: { x: t.clientX, y: t.clientY },
        startOffset: { ...offset }
      };
      setIsDragging(true);
      setDragStart({ x: t.clientX - offset.x, y: t.clientY - offset.y });
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 2 && touchStateRef.current.isPinching) {
      e.preventDefault();
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      const ratio = dist / touchStateRef.current.startDistance;
      const newScale = Math.min(Math.max(0.2, touchStateRef.current.startScale * ratio), 5);

      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const cx = touchStateRef.current.startCenter.x - rect.left;
      const cy = touchStateRef.current.startCenter.y - rect.top;

      const scaleRatio = newScale / touchStateRef.current.startScale;
      setOffset({
        x: cx - (cx - touchStateRef.current.startOffset.x) * scaleRatio,
        y: cy - (cy - touchStateRef.current.startOffset.y) * scaleRatio
      });
      setScale(newScale);
    } else if (e.touches.length === 1 && isDragging) {
      const t = e.touches[0];
      setOffset({
        x: t.clientX - dragStart.x,
        y: t.clientY - dragStart.y
      });
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const now = Date.now();
    if (touchStateRef.current.isPinching && e.touches.length < 2) {
      touchStateRef.current.isPinching = false;
    }
    if (e.touches.length === 0) {
      const duration = now - touchStateRef.current.touchStartTime;
      const moved = Math.hypot(
        (e.changedTouches[0]?.clientX || 0) - touchStateRef.current.startPos.x,
        (e.changedTouches[0]?.clientY || 0) - touchStateRef.current.startPos.y
      );

      // Single tap under 250ms and small displacement -> inspect cell
      if (duration < 250 && moved < 8 && e.changedTouches[0]) {
        inspectCellAtClientPos(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
      }

      setIsDragging(false);
    }
  };

  // Mouse pan and zoom handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 0) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDragging) {
      setOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    } else {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const canvasX = (mouseX - offset.x) / scale;
      const canvasY = (mouseY - offset.y) / scale;

      const gridX = Math.floor((canvasX - rulerSize) / baseCellSize);
      const gridY = Math.floor((canvasY - rulerSize) / baseCellSize);

      if (gridX >= 0 && gridX < width && gridY >= 0 && gridY < height) {
        const bead = grid[gridY][gridX];
        const boardCol = pegboardWidth > 0 ? Math.floor(gridX / pegboardWidth) + 1 : 1;
        const boardRow = pegboardHeight > 0 ? Math.floor(gridY / pegboardHeight) + 1 : 1;

        setHoveredCell({
          x: gridX,
          y: gridY,
          color: bead,
          screenX: mouseX,
          screenY: mouseY,
          boardCol,
          boardRow
        });
      } else {
        setHoveredCell(null);
      }
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.88;
    const newScale = Math.min(Math.max(0.2, scale * zoomFactor), 5);

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    setOffset({
      x: mouseX - (mouseX - offset.x) * (newScale / scale),
      y: mouseY - (mouseY - offset.y) * (newScale / scale)
    });
    setScale(newScale);
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden bg-[#F4F1EA] select-none flex items-center justify-center touch-none"
    >
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={`w-full h-full block ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      />

      {/* Floating Hover / Touch bead detail popup */}
      {hoveredCell && hoveredCell.color && (
        <div
          className="absolute z-20 pointer-events-none bg-[#1F1E1D]/95 text-white backdrop-blur-md px-3.5 py-2.5 rounded-2xl text-xs shadow-xl border border-white/10 flex items-center gap-3 transition-opacity"
          style={{
            left: Math.min(Math.max(10, hoveredCell.screenX + 15), containerSize.width - 220),
            top: Math.min(Math.max(10, hoveredCell.screenY + 15), containerSize.height - 80)
          }}
        >
          <div
            className="w-5 h-5 rounded-full border border-white/20 shrink-0 shadow-inner"
            style={{ backgroundColor: hoveredCell.color.hex }}
          />
          <div>
            <div className="font-bold flex items-center gap-1.5">
              <span className="text-[#D97757] font-mono">{hoveredCell.color.code}</span>
              <span className="text-[10px] text-stone-300 font-normal">{hoveredCell.color.name}</span>
            </div>
            <div className="text-[10px] text-stone-400">
              坐标: ({hoveredCell.x + 1}, {hoveredCell.y + 1}) | 拼板: {hoveredCell.boardRow}-{hoveredCell.boardCol}
            </div>
          </div>
        </div>
      )}

      {/* Floating Zoom & Reset view buttons */}
      <div className="absolute bottom-3 sm:bottom-4 right-3 sm:right-4 flex items-center gap-1 bg-white/90 backdrop-blur-md p-1 rounded-2xl shadow-sm border border-[#2D2A26]/10 z-10 text-[#54524E]">
        <button
          onClick={() => {
            const newScale = Math.min(scale * 1.25, 5);
            setScale(newScale);
          }}
          className="p-1.5 sm:p-2 hover:bg-[#FAF9F5] hover:text-[#D97757] rounded-xl transition cursor-pointer"
          title="放大"
        >
          <ZoomIn size={16} />
        </button>
        <button
          onClick={() => {
            const newScale = Math.max(scale * 0.8, 0.2);
            setScale(newScale);
          }}
          className="p-1.5 sm:p-2 hover:bg-[#FAF9F5] hover:text-[#D97757] rounded-xl transition cursor-pointer"
          title="缩小"
        >
          <ZoomOut size={16} />
        </button>
        <button
          onClick={resetView}
          className="p-1.5 sm:p-2 hover:bg-[#FAF9F5] hover:text-[#D97757] rounded-xl transition cursor-pointer"
          title="复位视口"
        >
          <RotateCcw size={16} />
        </button>
      </div>
    </div>
  );
};
