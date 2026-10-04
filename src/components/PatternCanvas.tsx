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
          const holeRadius = radius * (showLabels ? 0.28 : 0.38);
          ctx.beginPath();
          ctx.arc(cx, cy, holeRadius, 0, Math.PI * 2);
          ctx.fillStyle = showLabels ? 'rgba(255,255,255,0.45)' : '#FFFFFF';
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
        if (showLabels && baseCellSize * scale >= 11) {
          const textColor = getContrastTextColor(bead.hex);
          const fontSize = Math.max(8, Math.floor(baseCellSize * 0.36));
          ctx.font = `bold ${fontSize}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';

          // Anti-contrast outline for clear reading
          const strokeColor = textColor === '#FFFFFF' ? 'rgba(0, 0, 0, 0.75)' : 'rgba(255, 255, 255, 0.85)';
          ctx.strokeStyle = strokeColor;
          ctx.lineWidth = Math.max(1, fontSize * 0.22);
          ctx.strokeText(bead.code, cellX + baseCellSize / 2, cellY + baseCellSize / 2);

          ctx.fillStyle = textColor;
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
          ctx.lineWidth = 2;
          ctx.strokeRect(cellX, cellY, baseCellSize, baseCellSize);
        }

        ctx.restore();
      }
    }

    // 3. Draw Grid Lines
    if (showGrid) {
      // Thin line per cell
      ctx.lineWidth = 0.5;
      ctx.strokeStyle = 'rgba(150, 160, 180, 0.45)';
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

      // Bold line per 5 cells
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = 'rgba(71, 85, 105, 0.6)';
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

      // Extra bold per 10 cells
      ctx.lineWidth = 2.0;
      ctx.strokeStyle = '#1E293B';
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

    // 4. Pegboard Seam Lines (拼板分割线)
    if (showPegboardSeams && pegboardWidth > 0 && pegboardHeight > 0) {
      ctx.save();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#DC2626'; // High-visibility red boundary
      ctx.setLineDash([6, 4]);

      for (let x = pegboardWidth; x < width; x += pegboardWidth) {
        const px = startX + x * baseCellSize;
        ctx.beginPath();
        ctx.moveTo(px, startY);
        ctx.lineTo(px, startY + gridH);
        ctx.stroke();
      }

      for (let y = pegboardHeight; y < height; y += pegboardHeight) {
        const py = startY + y * baseCellSize;
        ctx.beginPath();
        ctx.moveTo(startX, py);
        ctx.lineTo(startX + gridW, py);
        ctx.stroke();
      }
      ctx.restore();

      // Draw Board Tag labels
      const cols = Math.ceil(width / pegboardWidth);
      const rows = Math.ceil(height / pegboardHeight);
      if (cols > 1 || rows > 1) {
        ctx.save();
        ctx.font = 'bold 11px sans-serif';
        ctx.fillStyle = '#DC2626';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';

        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const bx = startX + c * pegboardWidth * baseCellSize + 4;
            const by = startY + r * pegboardHeight * baseCellSize + 4;
            ctx.fillStyle = 'rgba(254, 242, 242, 0.85)';
            ctx.fillRect(bx - 2, by - 2, 60, 18);
            ctx.strokeStyle = '#DC2626';
            ctx.lineWidth = 1;
            ctx.strokeRect(bx - 2, by - 2, 60, 18);

            ctx.fillStyle = '#DC2626';
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
    hoveredCell,
    rulerSize
  ]);

  useEffect(() => {
    draw();
  }, [draw]);

  // Touch gesture handlers for mobile pinch zoom & pan
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
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
        touchStartTime: Date.now(),
        startPos: center
      };
    } else if (e.touches.length === 1) {
      const t = e.touches[0];
      touchStateRef.current = {
        ...touchStateRef.current,
        isPinching: false,
        touchStartTime: Date.now(),
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
    if (touchStateRef.current.isPinching && e.touches.length < 2) {
      touchStateRef.current.isPinching = false;
    }
    if (e.touches.length === 0) {
      const duration = Date.now() - touchStateRef.current.touchStartTime;
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

  const inspectCellAtClientPos = (clientX: number, clientY: number) => {
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
      className="relative w-full h-full overflow-hidden bg-slate-100/70 select-none flex items-center justify-center touch-none"
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
          className="absolute z-20 pointer-events-none bg-slate-900/90 text-white backdrop-blur-md px-3 py-2 rounded-xl text-xs shadow-xl border border-slate-700 flex items-center gap-3 transition-opacity"
          style={{
            left: Math.min(Math.max(10, hoveredCell.screenX + 15), (containerRef.current?.clientWidth || 300) - 220),
            top: Math.min(Math.max(10, hoveredCell.screenY + 15), (containerRef.current?.clientHeight || 300) - 80)
          }}
        >
          <div
            className="w-5 h-5 rounded-full border border-white/20 shrink-0 shadow-inner"
            style={{ backgroundColor: hoveredCell.color.hex }}
          />
          <div>
            <div className="font-bold flex items-center gap-1.5">
              <span>{hoveredCell.color.code}</span>
              <span className="text-[10px] text-slate-300 font-normal">{hoveredCell.color.name}</span>
            </div>
            <div className="text-[10px] text-slate-400">
              坐标: ({hoveredCell.x + 1}, {hoveredCell.y + 1}) | 拼板: {hoveredCell.boardRow}-{hoveredCell.boardCol}
            </div>
          </div>
        </div>
      )}

      {/* Floating Zoom & Reset view buttons */}
      <div className="absolute bottom-3 sm:bottom-4 right-3 sm:right-4 flex items-center gap-1 bg-white/90 backdrop-blur-md p-1 rounded-xl shadow-lg border border-slate-200 z-10">
        <button
          onClick={() => {
            const newScale = Math.min(scale * 1.25, 5);
            setScale(newScale);
          }}
          className="p-1.5 sm:p-2 hover:bg-slate-100 rounded-lg text-slate-700 transition cursor-pointer"
          title="放大"
        >
          <ZoomIn size={16} />
        </button>
        <button
          onClick={() => {
            const newScale = Math.max(scale * 0.8, 0.2);
            setScale(newScale);
          }}
          className="p-1.5 sm:p-2 hover:bg-slate-100 rounded-lg text-slate-700 transition cursor-pointer"
          title="缩小"
        >
          <ZoomOut size={16} />
        </button>
        <div className="w-[1px] h-4 bg-slate-200 mx-0.5" />
        <button
          onClick={resetView}
          className="p-1.5 sm:p-2 hover:bg-slate-100 rounded-lg text-slate-700 transition cursor-pointer"
          title="重置视图居中"
        >
          <RotateCcw size={16} />
        </button>
      </div>
    </div>
  );
};
