import type { QuantizeResult } from './quantize';

export const FONT_FAMILY = '"PingFang SC", "Microsoft YaHei", "WenQuanYi Micro Hei", -apple-system, sans-serif';

export function getContrastTextColor(hex: string): string {
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 128 ? '#000000' : '#FFFFFF';
}

export interface ExportOptions {
  cellSize: number; // Pixels per bead cell (e.g. 24 or 32 for print)
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

export function generatePatternCanvas(
  result: QuantizeResult,
  options: ExportOptions
): HTMLCanvasElement {
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
    title = '拼豆图纸工坊 - 制作图纸'
  } = options;

  const { width, height, grid, stats, totalBeads } = result;

  const rulerSize = showRuler ? 36 : 0;
  const padding = 24;
  const titleHeight = 50;

  // Legend dimensions
  const legendWidth = showLegend ? 280 : 0;

  const gridPixelWidth = width * cellSize;
  const gridPixelHeight = height * cellSize;

  const totalWidth = padding * 2 + rulerSize + gridPixelWidth + (showLegend ? legendWidth + 24 : 0);
  const totalHeight = padding * 2 + titleHeight + rulerSize + Math.max(gridPixelHeight, showLegend ? stats.length * 28 + 40 : 0);

  const canvas = document.createElement('canvas');
  canvas.width = totalWidth;
  canvas.height = totalHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  // Background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, totalWidth, totalHeight);

  // Title
  ctx.fillStyle = '#0F172A';
  ctx.font = `bold 20px ${FONT_FAMILY}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(title, padding, padding + 16);

  ctx.fillStyle = '#64748B';
  ctx.font = `14px ${FONT_FAMILY}`;
  ctx.fillText(
    `尺寸: ${width} × ${height} 格 | 共计用豆: ${totalBeads} 颗 | 包含色号: ${stats.length} 种 | 单板: ${pegboardWidth}×${pegboardHeight} 格`,
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

    // Top Ruler (X)
    for (let x = 0; x < width; x++) {
      const isTen = (x + 1) % 10 === 0;
      const isFive = (x + 1) % 5 === 0;
      const posX = gridStartX + x * cellSize + cellSize / 2;

      if (isTen || isFive || x === 0 || x === width - 1) {
        ctx.fillText(String(x + 1), posX, padding + titleHeight + rulerSize / 2);
      }
    }

    // Left Ruler (Y)
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
    for (let x = 0; x < width; x++) {
      const bead = grid[y][x];
      const cellX = gridStartX + x * cellSize;
      const cellY = gridStartY + y * cellSize;

      if (!bead) {
        // Empty / Transparent cell background
        ctx.fillStyle = (x + y) % 2 === 0 ? '#F1F5F9' : '#FFFFFF';
        ctx.fillRect(cellX, cellY, cellSize, cellSize);
        continue;
      }

      if (style === 'bead') {
        // Bead style: Outer plate base
        ctx.fillStyle = '#F8FAFC';
        ctx.fillRect(cellX, cellY, cellSize, cellSize);

        // Circular bead
        const radius = (cellSize / 2) * 0.92;
        const centerX = cellX + cellSize / 2;
        const centerY = cellY + cellSize / 2;

        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.fillStyle = bead.hex;
        ctx.fill();

        // Inner peg hole
        const innerRadius = radius * (showLabels ? 0.28 : 0.38);
        ctx.beginPath();
        ctx.arc(centerX, centerY, innerRadius, 0, Math.PI * 2);
        ctx.fillStyle = showLabels ? 'rgba(255,255,255,0.45)' : '#FFFFFF';
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(0,0,0,0.15)';
        ctx.stroke();

        // 3D subtle highlight
        const grad = ctx.createLinearGradient(centerX - radius, centerY - radius, centerX + radius, centerY + radius);
        grad.addColorStop(0, 'rgba(255,255,255,0.4)');
        grad.addColorStop(0.5, 'transparent');
        grad.addColorStop(1, 'rgba(0,0,0,0.25)');
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
      } else {
        // Flat square style
        ctx.fillStyle = bead.hex;
        ctx.fillRect(cellX, cellY, cellSize, cellSize);
      }

      // Draw code label
      if (showLabels && cellSize >= 10) {
        const textColor = getContrastTextColor(bead.hex);
        const fontSize = Math.max(8, Math.floor(cellSize * 0.35));
        ctx.font = `bold ${fontSize}px ${FONT_FAMILY}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // High-contrast stroke outline
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
    // 1. Thin lines for each cell
    ctx.lineWidth = 0.5;
    ctx.strokeStyle = 'rgba(150, 160, 180, 0.45)';
    ctx.beginPath();
    for (let x = 0; x <= width; x++) {
      const px = gridStartX + x * cellSize;
      ctx.moveTo(px, gridStartY);
      ctx.lineTo(px, gridStartY + gridPixelHeight);
    }
    for (let y = 0; y <= height; y++) {
      const py = gridStartY + y * cellSize;
      ctx.moveTo(gridStartX, py);
      ctx.lineTo(gridStartX + gridPixelWidth, py);
    }
    ctx.stroke();

    // 2. Thick lines every 5 cells
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = 'rgba(51, 65, 85, 0.65)';
    ctx.beginPath();
    for (let x = 0; x <= width; x += 5) {
      const px = gridStartX + x * cellSize;
      ctx.moveTo(px, gridStartY);
      ctx.lineTo(px, gridStartY + gridPixelHeight);
    }
    for (let y = 0; y <= height; y += 5) {
      const py = gridStartY + y * cellSize;
      ctx.moveTo(gridStartX, py);
      ctx.lineTo(gridStartX + gridPixelWidth, py);
    }
    ctx.stroke();

    // 3. Extra bold line every 10 cells
    ctx.lineWidth = 2.0;
    ctx.strokeStyle = '#0F172A';
    ctx.beginPath();
    for (let x = 0; x <= width; x += 10) {
      const px = gridStartX + x * cellSize;
      ctx.moveTo(px, gridStartY);
      ctx.lineTo(px, gridStartY + gridPixelHeight);
    }
    for (let y = 0; y <= height; y += 10) {
      const py = gridStartY + y * cellSize;
      ctx.moveTo(gridStartX, py);
      ctx.lineTo(gridStartX + gridPixelWidth, py);
    }
    ctx.stroke();
  }

  // Draw Pegboard Seam Lines (拼板分割线)
  if (showPegboardSeams && pegboardWidth > 0 && pegboardHeight > 0) {
    ctx.save();
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = '#DC2626'; // Red high-visibility board boundary
    ctx.setLineDash([8, 4]);

    for (let x = pegboardWidth; x < width; x += pegboardWidth) {
      const px = gridStartX + x * cellSize;
      ctx.beginPath();
      ctx.moveTo(px, gridStartY);
      ctx.lineTo(px, gridStartY + gridPixelHeight);
      ctx.stroke();
    }

    for (let y = pegboardHeight; y < height; y += pegboardHeight) {
      const py = gridStartY + y * cellSize;
      ctx.beginPath();
      ctx.moveTo(gridStartX, py);
      ctx.lineTo(gridStartX + gridPixelWidth, py);
      ctx.stroke();
    }
    ctx.restore();

    // Draw Board Tag labels
    const cols = Math.ceil(width / pegboardWidth);
    const rows = Math.ceil(height / pegboardHeight);
    if (cols > 1 || rows > 1) {
      ctx.save();
      ctx.font = `bold 12px ${FONT_FAMILY}`;
      ctx.fillStyle = '#DC2626';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const bx = gridStartX + c * pegboardWidth * cellSize + 6;
          const by = gridStartY + r * pegboardHeight * cellSize + 6;
          ctx.fillStyle = 'rgba(254, 242, 242, 0.85)';
          ctx.fillRect(bx - 2, by - 2, 70, 20);
          ctx.strokeStyle = '#DC2626';
          ctx.lineWidth = 1;
          ctx.strokeRect(bx - 2, by - 2, 70, 20);

          ctx.fillStyle = '#DC2626';
          ctx.fillText(`拼板 ${r + 1}-${c + 1}`, bx + 4, by + 2);
        }
      }
      ctx.restore();
    }
  }

  // Draw Legend Sidebar if requested
  if (showLegend) {
    const legStartX = gridStartX + gridPixelWidth + 30;
    let legY = gridStartY;

    ctx.fillStyle = '#0F172A';
    ctx.font = `bold 16px ${FONT_FAMILY}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('用料统计清单', legStartX, legY);

    legY += 28;

    ctx.font = `12px ${FONT_FAMILY}`;
    ctx.fillStyle = '#64748B';
    ctx.fillText('色号 | 颜色 | 名称 | 颗数', legStartX, legY);
    legY += 18;

    // Draw item rows
    const itemHeight = 24;
    for (const stat of stats) {
      // Color box
      ctx.fillStyle = stat.color.hex;
      ctx.fillRect(legStartX, legY + 2, 16, 16);
      ctx.strokeStyle = 'rgba(0,0,0,0.2)';
      ctx.strokeRect(legStartX, legY + 2, 16, 16);

      // Code & Name
      ctx.fillStyle = '#1E293B';
      ctx.font = `bold 12px ${FONT_FAMILY}`;
      ctx.fillText(stat.color.code, legStartX + 24, legY + 4);

      ctx.fillStyle = '#475569';
      ctx.font = `12px ${FONT_FAMILY}`;
      const label = stat.color.name.length > 7 ? stat.color.name.slice(0, 6) + '..' : stat.color.name;
      ctx.fillText(label, legStartX + 65, legY + 4);

      // Count
      ctx.fillStyle = '#0F172A';
      ctx.font = `bold 12px ${FONT_FAMILY}`;
      ctx.textAlign = 'right';
      ctx.fillText(`${stat.count} 颗`, legStartX + 220, legY + 4);
      ctx.textAlign = 'left';

      legY += itemHeight;
    }
  }

  return canvas;
}

export function exportCsvStats(stats: QuantizeResult['stats'], totalBeads: number): void {
  let csv = '\uFEFF'; // UTF-8 BOM
  csv += '色号,颜色名称,所属品牌,十六进制HEX,用量(颗),占比(%)\n';

  for (const item of stats) {
    csv += `"${item.color.code}","${item.color.name}","${item.color.brandName}","${item.color.hex}",${item.count},${item.percentage.toFixed(2)}%\n`;
  }

  csv += `\n"总计","","","",${totalBeads},"100.00%"\n`;

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `拼豆耗材清单_${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
