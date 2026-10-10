import { createCanvas } from '@napi-rs/canvas';
import type { QuantizeResult } from './quantize.js';

// 确保在服务端具备通用字体回退
export const FONT_FAMILY = '"WenQuanYi Micro Hei", "DejaVu Sans", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';

export function getContrastTextColor(hex: string): string {
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 128 ? '#000000' : '#FFFFFF';
}

export interface ExportOptions {
  cellSize: number; // e.g. 24 or 28 for print
  showGrid: boolean;
  showLabels: boolean;
  showRuler: boolean;
  showLegend: boolean;
  showPegboardSeams?: boolean;
  pegboardWidth?: number;
  pegboardHeight?: number;
  style: 'bead' | 'flat';
  title?: string;
}

export async function renderPatternImageServer(
  result: QuantizeResult,
  options: ExportOptions
): Promise<Buffer> {
  const {
    cellSize = 28,
    showGrid = true,
    showLabels = true,
    showRuler = true,
    showLegend = true,
    showPegboardSeams = true,
    pegboardWidth = 28,
    pegboardHeight = 28,
    style = 'bead',
    title = '拼豆图纸工坊 (Pixel Bead Pattern)'
  } = options;
  // JSON clients may send boolean-like values; only an explicit false disables labels.
  const shouldShowLabels = showLabels !== false;

  const { width, height, grid, stats, totalBeads } = result;

  const rulerSize = showRuler ? 36 : 0;
  const padding = 24;
  const titleHeight = 50;

  // Legend width if shown
  const legendWidth = showLegend ? 280 : 0;

  const gridPixelWidth = width * cellSize;
  const gridPixelHeight = height * cellSize;

  const totalWidth = padding * 2 + rulerSize + gridPixelWidth + (showLegend ? legendWidth + 24 : 0);
  const totalHeight = padding * 2 + titleHeight + rulerSize + Math.max(gridPixelHeight, showLegend ? stats.length * 28 + 40 : 0);

  const canvas = createCanvas(totalWidth, totalHeight);
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, totalWidth, totalHeight);

  // Title
  ctx.fillStyle = '#1E293B';
  ctx.font = `bold 20px ${FONT_FAMILY}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(title, padding, padding + 16);

  ctx.fillStyle = '#64748B';
  ctx.font = `14px ${FONT_FAMILY}`;
  ctx.fillText(
    `尺寸: ${width} × ${height} 格 | 共计用豆: ${totalBeads} 颗 | 包含色号: ${stats.length} 种 | 单板尺寸: ${pegboardWidth}×${pegboardHeight} 格`,
    padding,
    padding + 40
  );

  // Grid start position
  const gridStartX = padding + rulerSize;
  const gridStartY = padding + titleHeight + rulerSize;

  // Draw Ruler
  if (showRuler) {
    ctx.fillStyle = '#F8FAFC';
    ctx.fillRect(gridStartX, padding + titleHeight, gridPixelWidth, rulerSize);
    ctx.fillRect(padding, gridStartY, rulerSize, gridPixelHeight);

    ctx.fillStyle = '#64748B';
    ctx.font = `11px ${FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Top Ruler
    for (let x = 0; x < width; x++) {
      const isTen = (x + 1) % 10 === 0;
      const isFive = (x + 1) % 5 === 0;
      const posX = gridStartX + x * cellSize + cellSize / 2;

      if (isTen || isFive || x === 0 || x === width - 1) {
        ctx.fillText(String(x + 1), posX, padding + titleHeight + rulerSize / 2);
      }
    }

    // Left Ruler
    for (let y = 0; y < height; y++) {
      const isTen = (y + 1) % 10 === 0;
      const isFive = (y + 1) % 5 === 0;
      const posY = gridStartY + y * cellSize + cellSize / 2;

      if (isTen || isFive || y === 0 || y === height - 1) {
        ctx.fillText(String(y + 1), padding + rulerSize / 2, posY);
      }
    }
  }

  // Draw Bead Grid
  for (let y = 0; y < height; y++) {
    // 弱性能 VPS 让渡
    if (y % 30 === 0 && height > 60) {
      await new Promise(r => setImmediate(r));
    }

    for (let x = 0; x < width; x++) {
      const bead = grid[y][x];
      const cellX = gridStartX + x * cellSize;
      const cellY = gridStartY + y * cellSize;

      if (!bead) {
        // Transparent empty background
        ctx.fillStyle = '#F8FAFC';
        ctx.fillRect(cellX, cellY, cellSize, cellSize);
        continue;
      }

      if (style === 'flat') {
        ctx.fillStyle = bead.hex;
        ctx.fillRect(cellX, cellY, cellSize, cellSize);
      } else {
        // Bead mode: circle with hole & soft shadow
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(cellX, cellY, cellSize, cellSize);

        const radius = (cellSize / 2) * 0.92;
        const centerX = cellX + cellSize / 2;
        const centerY = cellY + cellSize / 2;

        // Outer bead body
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.fillStyle = bead.hex;
        ctx.fill();

        // Bead border for contrast
        ctx.strokeStyle = 'rgba(0,0,0,0.12)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Inner hole
        // When labels are displayed, keep the inner hole subtle so it won't conflict with text
        const innerRadius = radius * (shouldShowLabels ? 0.28 : 0.38);
        ctx.beginPath();
        ctx.arc(centerX, centerY, innerRadius, 0, Math.PI * 2);
        ctx.fillStyle = shouldShowLabels ? 'rgba(255,255,255,0.45)' : '#FFFFFF';
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.15)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Draw Color Code Label
      if (shouldShowLabels && cellSize >= 10) {
        const textColor = getContrastTextColor(bead.hex);
        const fontSize = Math.max(8, Math.floor(cellSize * 0.35));
        ctx.font = `bold ${fontSize}px ${FONT_FAMILY}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // High-contrast stroke outline to ensure absolute readability on any bead color
        const strokeColor = textColor === '#FFFFFF' ? 'rgba(0, 0, 0, 0.75)' : 'rgba(255, 255, 255, 0.85)';
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = Math.max(1, fontSize * 0.22);
        ctx.strokeText(bead.code, cellX + cellSize / 2, cellY + cellSize / 2);

        ctx.fillStyle = textColor;
        ctx.fillText(bead.code, cellX + cellSize / 2, cellY + cellSize / 2);
      }
    }
  }

  // Draw Grid Lines
  if (showGrid) {
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
    ctx.lineWidth = 1;

    for (let x = 0; x <= width; x++) {
      const isPegboardBorder = showPegboardSeams && pegboardWidth > 0 && x > 0 && x < width && x % pegboardWidth === 0;
      if (isPegboardBorder) continue;

      const isMajor = x % 5 === 0;
      ctx.lineWidth = isMajor ? 1.5 : 0.75;
      ctx.strokeStyle = isMajor ? 'rgba(100, 116, 139, 0.65)' : 'rgba(203, 213, 225, 0.5)';
      ctx.beginPath();
      ctx.moveTo(gridStartX + x * cellSize, gridStartY);
      ctx.lineTo(gridStartX + x * cellSize, gridStartY + gridPixelHeight);
      ctx.stroke();
    }

    for (let y = 0; y <= height; y++) {
      const isPegboardBorder = showPegboardSeams && pegboardHeight > 0 && y > 0 && y < height && y % pegboardHeight === 0;
      if (isPegboardBorder) continue;

      const isMajor = y % 5 === 0;
      ctx.lineWidth = isMajor ? 1.5 : 0.75;
      ctx.strokeStyle = isMajor ? 'rgba(100, 116, 139, 0.65)' : 'rgba(203, 213, 225, 0.5)';
      ctx.beginPath();
      ctx.moveTo(gridStartX, gridStartY + y * cellSize);
      ctx.lineTo(gridStartX + gridPixelWidth, gridStartY + y * cellSize);
      ctx.stroke();
    }
  }

  // Draw Pegboard Seam Lines (醒目的拼板分割线)
  if (showPegboardSeams && pegboardWidth > 0 && pegboardHeight > 0) {
    ctx.strokeStyle = '#DC2626';
    ctx.lineWidth = 2.5;

    for (let x = pegboardWidth; x < width; x += pegboardWidth) {
      ctx.beginPath();
      ctx.moveTo(gridStartX + x * cellSize, gridStartY);
      ctx.lineTo(gridStartX + x * cellSize, gridStartY + gridPixelHeight);
      ctx.stroke();
    }

    for (let y = pegboardHeight; y < height; y += pegboardHeight) {
      ctx.beginPath();
      ctx.moveTo(gridStartX, gridStartY + y * cellSize);
      ctx.lineTo(gridStartX + gridPixelWidth, gridStartY + y * cellSize);
      ctx.stroke();
    }
  }

  // Draw Legend (耗材色卡清单)
  if (showLegend) {
    const legendX = gridStartX + gridPixelWidth + 24;
    const legendY = gridStartY;

    ctx.fillStyle = '#0F172A';
    ctx.font = `bold 15px ${FONT_FAMILY}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`色号用量清单 (${stats.length}色)`, legendX, legendY);

    const itemHeight = 28;
    stats.forEach((stat, index) => {
      const itemY = legendY + 30 + index * itemHeight;

      // Color swatch box
      ctx.fillStyle = stat.color.hex;
      ctx.fillRect(legendX, itemY, 20, 20);
      ctx.strokeStyle = 'rgba(0,0,0,0.15)';
      ctx.lineWidth = 1;
      ctx.strokeRect(legendX, itemY, 20, 20);

      // Color code & name
      ctx.fillStyle = '#1E293B';
      ctx.font = `bold 12px ${FONT_FAMILY}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(stat.color.code, legendX + 28, itemY + 10);

      ctx.fillStyle = '#64748B';
      ctx.font = `11px ${FONT_FAMILY}`;
      const maxName = stat.color.name.length > 7 ? stat.color.name.slice(0, 6) + '..' : stat.color.name;
      ctx.fillText(maxName, legendX + 70, itemY + 10);

      // Bead count & percentage
      ctx.fillStyle = '#4338CA';
      ctx.font = `bold 12px ${FONT_FAMILY}`;
      ctx.textAlign = 'right';
      ctx.fillText(`${stat.count}颗`, legendX + legendWidth - 50, itemY + 10);

      ctx.fillStyle = '#94A3B8';
      ctx.font = `10px ${FONT_FAMILY}`;
      ctx.fillText(`${stat.percentage.toFixed(1)}%`, legendX + legendWidth, itemY + 10);
    });
  }

  return canvas.toBuffer('image/png');
}
