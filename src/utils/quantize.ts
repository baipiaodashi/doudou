import { rgbToLab } from '../data/palettes';
import type { BeadColor } from '../data/palettes';

export interface ProcessOptions {
  width: number;
  height: number;
  palette: BeadColor[];
  dither: boolean;
  removeBackground: boolean;
  bgTolerance: number; // 0 - 100
  brightness: number; // -100 to 100, default 0
  contrast: number; // -100 to 100, default 0
  saturation: number; // -100 to 100, default 0
  maxColors?: number; // 0 for unlimited
}

export interface GridCell {
  x: number;
  y: number;
  color: BeadColor | null; // null represents empty/transparent
}

export interface BeadCount {
  color: BeadColor;
  count: number;
  percentage: number;
}

export interface QuantizeResult {
  width: number;
  height: number;
  grid: (BeadColor | null)[][];
  stats: BeadCount[];
  totalBeads: number;
}

// Calculate Delta E (CIE76) between two Lab colors
function deltaE(lab1: [number, number, number], lab2: [number, number, number]): number {
  const dL = lab1[0] - lab2[0];
  const da = lab1[1] - lab2[1];
  const db = lab1[2] - lab2[2];
  return Math.sqrt(dL * dL + da * da + db * db);
}

// Find closest bead color in palette
export function findClosestColor(r: number, g: number, b: number, palette: BeadColor[]): BeadColor {
  const lab = rgbToLab(r, g, b);
  let bestDist = Infinity;
  let bestColor = palette[0];

  for (let i = 0; i < palette.length; i++) {
    const candidate = palette[i];
    const dist = deltaE(lab, candidate.lab);
    if (dist < bestDist) {
      bestDist = dist;
      bestColor = candidate;
    }
  }

  return bestColor;
}

// Check if pixel is background (transparent or near white/clear)
function isBgPixel(r: number, g: number, b: number, a: number, tolerance: number): boolean {
  if (a < 128) return true;
  if (tolerance > 0) {
    const threshold = 255 - (tolerance * 2.55);
    // If RGB are all above threshold (white-ish)
    if (r >= threshold && g >= threshold && b >= threshold) {
      return true;
    }
  }
  return false;
}

// Adjust brightness, contrast, saturation
function adjustPixel(
  r: number, 
  g: number, 
  b: number, 
  brightness: number, 
  contrast: number, 
  saturation: number
): [number, number, number] {
  // 1. Brightness (-100 to 100)
  r += brightness * 2.55;
  g += brightness * 2.55;
  b += brightness * 2.55;

  // 2. Contrast (-100 to 100)
  const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
  r = factor * (r - 128) + 128;
  g = factor * (g - 128) + 128;
  b = factor * (b - 128) + 128;

  // 3. Saturation (-100 to 100)
  if (saturation !== 0) {
    const gray = 0.2989 * r + 0.5870 * g + 0.1140 * b;
    const satFactor = 1 + (saturation / 100);
    r = gray + satFactor * (r - gray);
    g = gray + satFactor * (g - gray);
    b = gray + satFactor * (b - gray);
  }

  return [
    Math.min(255, Math.max(0, Math.round(r))),
    Math.min(255, Math.max(0, Math.round(g))),
    Math.min(255, Math.max(0, Math.round(b)))
  ];
}

// Pure CPU calculation of quantization on raw RGBA byte buffer
export function quantizePixelData(
  data: Uint8ClampedArray | Uint8Array,
  options: ProcessOptions
): QuantizeResult {
  const {
    width,
    height,
    palette,
    dither,
    removeBackground,
    bgTolerance,
    brightness,
    contrast,
    saturation,
    maxColors
  } = options;

  // 1. Filter palette if maxColors is set
  let activePalette = palette;
  if (maxColors && maxColors > 0 && maxColors < palette.length) {
    const colorUsageMap = new Map<string, number>();
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 128) continue;
      const matched = findClosestColor(data[i], data[i + 1], data[i + 2], palette);
      colorUsageMap.set(matched.code, (colorUsageMap.get(matched.code) || 0) + 1);
    }
    const sortedCodes = Array.from(colorUsageMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, maxColors)
      .map(entry => entry[0]);

    activePalette = palette.filter(c => sortedCodes.includes(c.code));
    if (activePalette.length === 0) activePalette = palette.slice(0, maxColors);
  }

  // 2. Prepare Grid & Floyd-Steinberg error buffers
  const grid: (BeadColor | null)[][] = Array.from({ length: height }, () => 
    Array.from({ length: width }, () => null)
  );

  // 3D array for RGB floating point values for dithering
  const pixels: number[][][] = Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x) => {
      const idx = (y * width + x) * 4;
      const a = data[idx + 3];
      if (removeBackground && isBgPixel(data[idx], data[idx + 1], data[idx + 2], a, bgTolerance)) {
        return [-1, -1, -1]; // background flag
      }
      if (a < 128) {
        return [-1, -1, -1]; // transparent
      }
      const [adjR, adjG, adjB] = adjustPixel(
        data[idx], data[idx + 1], data[idx + 2],
        brightness, contrast, saturation
      );
      return [adjR, adjG, adjB];
    })
  );

  // 3. Quantize each pixel
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const p = pixels[y][x];
      if (p[0] === -1) {
        grid[y][x] = null;
        continue;
      }

      const curR = Math.min(255, Math.max(0, p[0]));
      const curG = Math.min(255, Math.max(0, p[1]));
      const curB = Math.min(255, Math.max(0, p[2]));

      const closest = findClosestColor(curR, curG, curB, activePalette);
      grid[y][x] = closest;

      if (dither) {
        const errR = curR - closest.rgb[0];
        const errG = curG - closest.rgb[1];
        const errB = curB - closest.rgb[2];

        // Floyd-Steinberg error diffusion
        const spreadError = (nx: number, ny: number, factor: number) => {
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            if (pixels[ny][nx][0] !== -1) {
              pixels[ny][nx][0] += errR * factor;
              pixels[ny][nx][1] += errG * factor;
              pixels[ny][nx][2] += errB * factor;
            }
          }
        };

        spreadError(x + 1, y, 7 / 16);
        spreadError(x - 1, y + 1, 3 / 16);
        spreadError(x, y + 1, 5 / 16);
        spreadError(x + 1, y + 1, 1 / 16);
      }
    }
  }

  // 4. Calculate statistics
  const countMap = new Map<string, { color: BeadColor; count: number }>();
  let totalBeads = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const bead = grid[y][x];
      if (bead) {
        totalBeads++;
        const item = countMap.get(bead.code);
        if (item) {
          item.count++;
        } else {
          countMap.set(bead.code, { color: bead, count: 1 });
        }
      }
    }
  }

  const stats: BeadCount[] = Array.from(countMap.values())
    .map(entry => ({
      color: entry.color,
      count: entry.count,
      percentage: totalBeads > 0 ? (entry.count / totalBeads) * 100 : 0
    }))
    .sort((a, b) => b.count - a.count);

  return {
    width,
    height,
    grid,
    stats,
    totalBeads
  };
}

export function processImageToPattern(
  img: HTMLImageElement,
  options: ProcessOptions
): QuantizeResult {
  const { width, height } = options;

  // Draw source image to temp canvas with target size
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = width;
  tempCanvas.height = height;
  const ctx = tempCanvas.getContext('2d');
  if (!ctx) throw new Error('Cannot get 2D context');

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, width, height);

  const imgData = ctx.getImageData(0, 0, width, height);
  return quantizePixelData(imgData.data, options);
}
