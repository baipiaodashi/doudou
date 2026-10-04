import React, { useEffect, useRef } from 'react';

interface PaletteTheme {
  name: string;
  base: string;
  shadow: string;
  light: string;
  holeBg: string;
}

const PIXEL_PALETTES: PaletteTheme[] = [
  {
    name: 'Terracotta Wave',
    base: '#D97757',    // Claude 标志陶土橙
    shadow: '#B55A3C',
    light: '#ECA084',
    holeBg: '#FAF9F5'
  },
  {
    name: 'Ocean Sage',
    base: '#4A6B5D',    // 灰青海浪
    shadow: '#334D41',
    light: '#729987',
    holeBg: '#FAF9F5'
  },
  {
    name: 'Warm Ochre',
    base: '#D48C46',    // 暖赭琥珀
    shadow: '#AF6E2E',
    light: '#E8B27C',
    holeBg: '#FAF9F5'
  },
  {
    name: 'Dusty Rose',
    base: '#C86D6D',    // 干燥玫瑰
    shadow: '#A84F4F',
    light: '#E29797',
    holeBg: '#FAF9F5'
  },
  {
    name: 'Slate Sand',
    base: '#A69279',    // 沙褐亚麻
    shadow: '#86725B',
    light: '#C7B6A1',
    holeBg: '#FAF9F5'
  }
];

const CELL_SIZE = 24;
const BEAD_PIXEL_SIZE = 16;
const HOLE_PIXEL_SIZE = 6;

export const PixelWaveCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let cols = 0;
    let rows = 0;
    let width = 0;
    let height = 0;
    let animationFrameId: number;
    let waveTime = 0;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      width = window.innerWidth;
      height = window.innerHeight;

      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);

      ctx.imageSmoothingEnabled = false;

      cols = Math.ceil(width / CELL_SIZE) + 1;
      rows = Math.ceil(height / CELL_SIZE) + 1;
    };

    const drawPixelBead = (x: number, y: number, elevation: number, colorTheme: PaletteTheme) => {
      const offsetX = x + Math.floor((CELL_SIZE - BEAD_PIXEL_SIZE) / 2);
      const offsetY = y + Math.floor((CELL_SIZE - BEAD_PIXEL_SIZE) / 2);
      const holeOffset = Math.floor((BEAD_PIXEL_SIZE - HOLE_PIXEL_SIZE) / 2);

      // 1. 底板状态 (未涌起)
      if (elevation <= 0.08) {
        ctx.fillStyle = 'rgba(45, 42, 38, 0.06)';
        ctx.fillRect(offsetX + holeOffset - 1, offsetY + holeOffset - 1, HOLE_PIXEL_SIZE + 2, HOLE_PIXEL_SIZE + 2);

        ctx.fillStyle = '#EFECE6';
        ctx.fillRect(offsetX + holeOffset, offsetY + holeOffset, HOLE_PIXEL_SIZE, HOLE_PIXEL_SIZE);
        return;
      }

      // 2. 海浪抬起状态 (像素豆子显现)
      ctx.save();
      ctx.globalAlpha = Math.min(1, elevation * 1.25);

      // 像素投影
      ctx.fillStyle = 'rgba(45, 42, 38, 0.08)';
      ctx.fillRect(offsetX + 2, offsetY + 2, BEAD_PIXEL_SIZE, BEAD_PIXEL_SIZE);

      // 豆子本体
      ctx.fillStyle = colorTheme.base;
      ctx.fillRect(offsetX, offsetY, BEAD_PIXEL_SIZE, BEAD_PIXEL_SIZE);

      // 右下暗部
      ctx.fillStyle = colorTheme.shadow;
      ctx.fillRect(offsetX, offsetY + BEAD_PIXEL_SIZE - 2, BEAD_PIXEL_SIZE, 2);
      ctx.fillRect(offsetX + BEAD_PIXEL_SIZE - 2, offsetY, 2, BEAD_PIXEL_SIZE);

      // 左上亮部
      ctx.fillStyle = colorTheme.light;
      ctx.fillRect(offsetX, offsetY, BEAD_PIXEL_SIZE, 2);
      ctx.fillRect(offsetX, offsetY, 2, BEAD_PIXEL_SIZE);

      // 中心方孔
      ctx.fillStyle = colorTheme.holeBg;
      ctx.fillRect(offsetX + holeOffset, offsetY + holeOffset, HOLE_PIXEL_SIZE, HOLE_PIXEL_SIZE);

      // 孔内微暗线
      ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
      ctx.fillRect(offsetX + holeOffset, offsetY + holeOffset, HOLE_PIXEL_SIZE, 1);

      // 左上角 2x2 白色像素高光
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(offsetX + 2, offsetY + 2, 2, 2);

      ctx.restore();
    };

    const render = () => {
      // 舒缓海浪速度 (0.5x)
      waveTime += 0.008;

      ctx.clearRect(0, 0, width, height);

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = c * CELL_SIZE;
          const y = r * CELL_SIZE;

          const wave1 = Math.sin((c * 0.18 + r * 0.14) - waveTime * 1.5);
          const wave2 = Math.cos((c * 0.12 - r * 0.22) + waveTime * 0.8);
          const wave3 = Math.sin((c * 0.06 + r * 0.08) - waveTime * 0.5);

          const rawWave = wave1 * 0.55 + wave2 * 0.3 + wave3 * 0.15;
          let elevation = (rawWave + 1) * 0.5;
          elevation = Math.pow(elevation, 2.2);

          const paletteIndex = Math.abs(Math.floor(c * 0.35 + r * 0.25)) % PIXEL_PALETTES.length;
          const theme = PIXEL_PALETTES[paletteIndex];

          drawPixelBead(x, y, elevation, theme);
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    window.addEventListener('resize', resize);
    resize();
    render();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <>
      <canvas
        ref={canvasRef}
        className="fixed inset-0 w-screen h-screen z-0 pointer-events-none"
        style={{ imageRendering: 'pixelated' }}
      />
      <div
        className="fixed inset-0 w-screen h-screen z-1 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at 50% 36%, rgba(250, 249, 245, 0.35) 0%, rgba(250, 249, 245, 0.72) 60%, rgba(250, 249, 245, 0.94) 95%)'
        }}
      />
    </>
  );
};
