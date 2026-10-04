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

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    if (canvas.width !== Math.round(rect.width * dpr) || canvas.height !== Math.round(rect.height * dpr)) {
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
    }

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, rect.width, rect.height);

    // Apply viewport transform
    ctx.translate(offset.x, offset.y);
    ctx.scale(scale, scale);

    const startX = rulerSize;
    const startY = rulerSize;

    // Draw Ruler Headers
    if (showRuler) {
      ctx.save();
      ctx.fillStyle = '#EDEAE3';
      ctx.fillRect(0, 0, startX + width * baseCellSize, rulerSize);
      ctx.fillRect(0, 0, rulerSize, startY + height * baseCellSize);

      ctx.fillStyle = '#FAF9F5';
      ctx.fillRect(0, 0, rulerSize, rulerSize);

      ctx.font = '10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#54524E';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Horizontal ruler labels
      for (let x = 0; x < width; x++) {
        const num = x + 1;
        const cx = startX + x * baseCellSize + baseCellSize / 2;
        const cy = rulerSize / 2;
        const isMajor = num % 5 === 0 || num === 1 || num === width;
        ctx.fillStyle = isMajor ? '#1F1E1D' : '#85827C';
        ctx.font = isMajor ? 'bold 10px sans-serif' : '9px sans-serif';
        ctx.fillText(num.toString(), cx, cy);
      }

      // Vertical ruler labels
      for (let y = 0; y < height; y++) {
        const num = y + 1;
        const cx = rulerSize / 2;
        const cy = startY + y * baseCellSize + baseCellSize / 2;
        const isMajor = num % 5 === 0 || num === 1 || num === height;
        ctx.fillStyle = isMajor ? '#1F1E1D' : '#85827C';
        ctx.font = isMajor ? 'bold 10px sans-serif' : '9px sans-serif';
        ctx.fillText(num.toString(), cx, cy);
      }
      ctx.restore();
    }

    // Draw Main Cells & Beads
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const bead = grid[y][x];
        const cellX = startX + x * baseCellSize;
        const cellY = startY + y * baseCellSize;

        // Is cell selected/highlighted?
        const isHighlighted = highlightColor && bead && bead.code === highlightColor.code;
        const isDimmed = highlightColor && (!bead || bead.code !== highlightColor.code);

        ctx.save();
        if (isDimmed) {
          ctx.globalAlpha = 0.22;
        }

        if (renderMode === 'flat') {
          // Flat solid square representation
          if (bead) {
            ctx.fillStyle = bead.hex;
            ctx.fillRect(cellX, cellY, baseCellSize, baseCellSize);
          } else {
            // Empty / Transparent background cell
            ctx.fillStyle = '#F4F1EA';
            ctx.fillRect(cellX, cellY, baseCellSize, baseCellSize);
            ctx.fillStyle = '#E8E4DA';
            const s = baseCellSize / 2;
            ctx.fillRect(cellX, cellY, s, s);
            ctx.fillRect(cellX + s, cellY + s, s, s);
          }
        } else {
          // Bead mode: pegboard peg base + realistic round bead with center hole
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(cellX, cellY, baseCellSize, baseCellSize);

          const centerX = cellX + baseCellSize / 2;
          const centerY = cellY + baseCellSize / 2;
          const outerRadius = baseCellSize * 0.44;
          const innerRadius = baseCellSize * 0.16;

          if (bead) {
            // Bead Body
            ctx.beginPath();
            ctx.arc(centerX, centerY, outerRadius, 0, Math.PI * 2);
            ctx.fillStyle = bead.hex;
            ctx.fill();

            // Subtle depth ring border
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.14)';
            ctx.lineWidth = 1;
            ctx.stroke();

            // Bead Center Hole
            ctx.beginPath();
            ctx.arc(centerX, centerY, innerRadius, 0, Math.PI * 2);
            ctx.fillStyle = '#F4F1EA';
            ctx.fill();
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.22)';
            ctx.lineWidth = 0.8;
            ctx.stroke();

            // Peg pin inside center hole
            ctx.beginPath();
            ctx.arc(centerX, centerY, innerRadius * 0.45, 0, Math.PI * 2);
            ctx.fillStyle = '#D6D1C4';
            ctx.fill();
          } else {
            // Empty Pegboard pin placeholder
            ctx.beginPath();
            ctx.arc(centerX, centerY, baseCellSize * 0.12, 0, Math.PI * 2);
            ctx.fillStyle = '#D6D1C4';
            ctx.fill();
          }
        }

        // Highlight halo for selected color
        if (isHighlighted) {
          ctx.strokeStyle = '#D97757';
          ctx.lineWidth = 2.5;
          ctx.strokeRect(cellX + 1, cellY + 1, baseCellSize - 2, baseCellSize - 2);
        }

        // Draw Color Code Label on Cell
        if (showLabels && bead && scale >= 0.45) {
          const fontSize = Math.max(7, Math.min(10, Math.floor(baseCellSize * 0.38)));
          ctx.font = `bold ${fontSize}px monospace`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';

          // Auto pick contrast text color
          const hex = bead.hex.replace('#', '');
          const r = parseInt(hex.substring(0, 2), 16) || 0;
          const g = parseInt(hex.substring(2, 4), 16) || 0;
          const b = parseInt(hex.substring(4, 6), 16) || 0;
          const brightness = (r * 299 + g * 587 + b * 114) / 1000;
          ctx.fillStyle = brightness > 140 ? '#1F1E1D' : '#FFFFFF';

          const textY = renderMode === 'bead' ? cellY + baseCellSize * 0.78 : cellY + baseCellSize / 2;
          ctx.fillText(bead.code, cellX + baseCellSize / 2, textY);
        }

        ctx.restore();
      }
    }

    // Draw Grid Lines
    if (showGrid) {
      ctx.save();
      ctx.strokeStyle = '#2D2A26';
      ctx.globalAlpha = 0.12;
      ctx.lineWidth = 1;

      // Vertical lines
      for (let x = 0; x <= width; x++) {
        ctx.beginPath();
        ctx.moveTo(startX + x * baseCellSize, startY);
        ctx.lineTo(startX + x * baseCellSize, startY + height * baseCellSize);
        ctx.stroke();
      }

      // Horizontal lines
      for (let y = 0; y <= height; y++) {
        ctx.beginPath();
        ctx.moveTo(startX, startY + y * baseCellSize);
        ctx.lineTo(startX + width * baseCellSize, startY + y * baseCellSize);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Draw Pegboard Seams (Thick red-orange dividing lines)
    if (showPegboardSeams && (pegboardWidth > 0 || pegboardHeight > 0)) {
      ctx.save();
      ctx.strokeStyle = '#D97757';
      ctx.lineWidth = 2.5;

      // Vertical seams
      if (pegboardWidth > 0) {
        for (let x = pegboardWidth; x < width; x += pegboardWidth) {
          ctx.beginPath();
          ctx.moveTo(startX + x * baseCellSize, startY);
          ctx.lineTo(startX + x * baseCellSize, startY + height * baseCellSize);
          ctx.stroke();
        }
      }

      // Horizontal seams
      if (pegboardHeight > 0) {
        for (let y = pegboardHeight; y < height; y += pegboardHeight) {
          ctx.beginPath();
          ctx.moveTo(startX, startY + y * baseCellSize);
          ctx.lineTo(startX + width * baseCellSize, startY + y * baseCellSize);
          ctx.stroke();
        }
      }
      ctx.restore();

      // Draw Board Tag labels
      const cols = Math.ceil(width / pegboardWidth);
      const rows = Math.ceil(height / pegboardHeight);
      if (cols > 1 || rows > 1) {
        ctx.save();
        ctx.font = 'bold 11px sans-serif';
        ctx.fillStyle = '#C15F3F';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';

        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const bx = startX + c * pegboardWidth * baseCellSize + 4;
            const by = startY + r * pegboardHeight * baseCellSize + 4;
            ctx.fillStyle = 'rgba(255, 248, 245, 0.92)';
            ctx.fillRect(bx - 2, by - 2, 60, 18);
            ctx.strokeStyle = '#D97757';
            ctx.lineWidth = 1;
            ctx.strokeRect(bx - 2, by - 2, 60, 18);

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
        <div className="w-[1px] h-4 bg-[#2D2A26]/10 mx-0.5" />
        <button
          onClick={resetView}
          className="p-1.5 sm:p-2 hover:bg-[#FAF9F5] hover:text-[#D97757] rounded-xl transition cursor-pointer"
          title="重置视图居中"
        >
          <RotateCcw size={16} />
        </button>
      </div>
    </div>
  );
};
