export interface BeadColor {
  code: string;       // e.g. "M01", "P01", "A01"
  brand: 'mard' | 'perler' | 'artkal';
  brandName: string;  // "漫拼(Mard)", "Perler", "Artkal"
  name: string;       // e.g. "白色 White"
  hex: string;        // e.g. "#ffffff"
  rgb: [number, number, number];
  lab: [number, number, number];
}

// RGB to LAB conversion for accurate color distance (Delta E)
export function rgbToLab(r: number, g: number, b: number): [number, number, number] {
  const [r1, g1, b1] = [r / 255, g / 255, b / 255].map(v => 
    v > 0.04045 ? Math.pow((v + 0.055) / 1.055, 2.4) : v / 12.92
  );

  const x = (r1 * 0.4124 + g1 * 0.3576 + b1 * 0.1805) / 0.95047;
  const y = (r1 * 0.2126 + g1 * 0.7152 + b1 * 0.0722) / 1.00000;
  const z = (r1 * 0.0193 + g1 * 0.1192 + b1 * 0.9505) / 1.08883;

  const [fx, fy, fz] = [x, y, z].map(v => 
    v > 0.008856 ? Math.cbrt(v) : (7.787 * v) + (16 / 116)
  );

  return [
    (116 * fy) - 16,
    500 * (fx - fy),
    200 * (fy - fz)
  ];
}

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return [r, g, b];
}

function createColor(
  code: string, 
  brand: 'mard' | 'perler' | 'artkal', 
  brandName: string, 
  name: string, 
  hex: string
): BeadColor {
  const rgb = hexToRgb(hex);
  const lab = rgbToLab(...rgb);
  return { code, brand, brandName, name, hex, rgb, lab };
}

// 1. Mard (漫拼) 常用高频全色卡 (M01 - M60)
export const MARD_PALETTE: BeadColor[] = [
  createColor('M01', 'mard', '漫拼(Mard)', '纯白', '#FFFFFF'),
  createColor('M02', 'mard', '漫拼(Mard)', '雪白', '#F5F5F0'),
  createColor('M03', 'mard', '漫拼(Mard)', '乳白', '#F8F6E6'),
  createColor('M04', 'mard', '漫拼(Mard)', '肉色', '#FFE0C8'),
  createColor('M05', 'mard', '漫拼(Mard)', '浅肤', '#FCD5B5'),
  createColor('M06', 'mard', '漫拼(Mard)', '肤色', '#F7BE98'),
  createColor('M07', 'mard', '漫拼(Mard)', '米黄', '#FFF7C2'),
  createColor('M08', 'mard', '漫拼(Mard)', '嫩黄', '#FEF572'),
  createColor('M09', 'mard', '漫拼(Mard)', '柠檬黄', '#FFF200'),
  createColor('M10', 'mard', '漫拼(Mard)', '中黄', '#FFD800'),
  createColor('M11', 'mard', '漫拼(Mard)', '金黄', '#FFBE00'),
  createColor('M12', 'mard', '漫拼(Mard)', '橙黄', '#FFA800'),
  createColor('M13', 'mard', '漫拼(Mard)', '橙色', '#FF7F00'),
  createColor('M14', 'mard', '漫拼(Mard)', '深橙', '#FF5500'),
  createColor('M15', 'mard', '漫拼(Mard)', '朱红', '#FF3B30'),
  createColor('M16', 'mard', '漫拼(Mard)', '大红', '#E60012'),
  createColor('M17', 'mard', '漫拼(Mard)', '暗红', '#B8000A'),
  createColor('M18', 'mard', '漫拼(Mard)', '酒红', '#780B1C'),
  createColor('M19', 'mard', '漫拼(Mard)', '樱花粉', '#FFD9E8'),
  createColor('M20', 'mard', '漫拼(Mard)', '浅粉', '#FFB7D2'),
  createColor('M21', 'mard', '漫拼(Mard)', '粉红', '#FF85AC'),
  createColor('M22', 'mard', '漫拼(Mard)', '亮粉', '#FF4081'),
  createColor('M23', 'mard', '漫拼(Mard)', '玫红', '#E91E63'),
  createColor('M24', 'mard', '漫拼(Mard)', '淡紫', '#E6D2F5'),
  createColor('M25', 'mard', '漫拼(Mard)', '香芋紫', '#C9A0DC'),
  createColor('M26', 'mard', '漫拼(Mard)', '浅紫', '#B388FF'),
  createColor('M27', 'mard', '漫拼(Mard)', '紫罗兰', '#8E24AA'),
  createColor('M28', 'mard', '漫拼(Mard)', '深紫', '#5E178A'),
  createColor('M29', 'mard', '漫拼(Mard)', '天蓝', '#B3E5FC'),
  createColor('M30', 'mard', '漫拼(Mard)', '浅海蓝', '#81D4FA'),
  createColor('M31', 'mard', '漫拼(Mard)', '湖蓝', '#29B6F6'),
  createColor('M32', 'mard', '漫拼(Mard)', '天青', '#0091EA'),
  createColor('M33', 'mard', '漫拼(Mard)', '宝蓝', '#1565C0'),
  createColor('M34', 'mard', '漫拼(Mard)', '深蓝', '#0D47A1'),
  createColor('M35', 'mard', '漫拼(Mard)', '藏青', '#092147'),
  createColor('M36', 'mard', '漫拼(Mard)', '薄荷绿', '#C8E6C9'),
  createColor('M37', 'mard', '漫拼(Mard)', '浅绿', '#A5D6A7'),
  createColor('M38', 'mard', '漫拼(Mard)', '嫩绿', '#76FF03'),
  createColor('M39', 'mard', '漫拼(Mard)', '草绿', '#4CAF50'),
  createColor('M40', 'mard', '漫拼(Mard)', '墨绿', '#1B5E20'),
  createColor('M41', 'mard', '漫拼(Mard)', '军绿', '#4B5320'),
  createColor('M42', 'mard', '漫拼(Mard)', '浅咖', '#D7CCC8'),
  createColor('M43', 'mard', '漫拼(Mard)', '奶咖', '#BCAAA4'),
  createColor('M44', 'mard', '漫拼(Mard)', '棕黄', '#A1887F'),
  createColor('M45', 'mard', '漫拼(Mard)', '红棕', '#8D6E63'),
  createColor('M46', 'mard', '漫拼(Mard)', '深棕', '#5D4037'),
  createColor('M47', 'mard', '漫拼(Mard)', '焦糖', '#3E2723'),
  createColor('M48', 'mard', '漫拼(Mard)', '浅灰', '#E0E0E0'),
  createColor('M49', 'mard', '漫拼(Mard)', '中灰', '#9E9E9E'),
  createColor('M50', 'mard', '漫拼(Mard)', '深灰', '#616161'),
  createColor('M51', 'mard', '漫拼(Mard)', '纯黑', '#1A1A1A'),
  createColor('M52', 'mard', '漫拼(Mard)', '夜光绿', '#B8FFB8'),
  createColor('M53', 'mard', '漫拼(Mard)', '闪光蓝', '#64B5F6'),
  createColor('M54', 'mard', '漫拼(Mard)', '马卡龙蓝', '#A2D2FF'),
  createColor('M55', 'mard', '漫拼(Mard)', '马卡龙粉', '#FFC8DD'),
  createColor('M56', 'mard', '漫拼(Mard)', '马卡龙黄', '#FEF9A7'),
  createColor('M57', 'mard', '漫拼(Mard)', '马卡龙绿', '#C1E1C1'),
  createColor('M58', 'mard', '漫拼(Mard)', '松石绿', '#26A69A'),
  createColor('M59', 'mard', '漫拼(Mard)', '蒂芙尼蓝', '#80DEEA'),
  createColor('M60', 'mard', '漫拼(Mard)', '海松色', '#004D40')
];

// 2. Perler 经典全色卡
export const PERLER_PALETTE: BeadColor[] = [
  createColor('P01', 'perler', 'Perler', 'White (白色)', '#FFFFFF'),
  createColor('P02', 'perler', 'Perler', 'Cream (米白)', '#FDF8E4'),
  createColor('P03', 'perler', 'Perler', 'Yellow (黄色)', '#FDE000'),
  createColor('P04', 'perler', 'Perler', 'Orange (橙色)', '#F68B1F'),
  createColor('P05', 'perler', 'Perler', 'Red (红色)', '#E52421'),
  createColor('P06', 'perler', 'Perler', 'Bubblegum (泡泡糖粉)', '#F17DB3'),
  createColor('P07', 'perler', 'Perler', 'Purple (紫色)', '#662483'),
  createColor('P08', 'perler', 'Perler', 'Dark Blue (深蓝)', '#1B3F95'),
  createColor('P09', 'perler', 'Perler', 'Light Blue (浅蓝)', '#45A5D7'),
  createColor('P10', 'perler', 'Perler', 'Dark Green (深绿)', '#007A3D'),
  createColor('P11', 'perler', 'Perler', 'Light Green (浅绿)', '#74BF44'),
  createColor('P12', 'perler', 'Perler', 'Brown (棕色)', '#603913'),
  createColor('P13', 'perler', 'Perler', 'Grey (灰色)', '#9B9B9B'),
  createColor('P14', 'perler', 'Perler', 'Black (黑色)', '#000000'),
  createColor('P17', 'perler', 'Perler', 'Pastel Yellow (粉黄)', '#FFF494'),
  createColor('P18', 'perler', 'Perler', 'Pastel Green (粉绿)', '#A8DCA2'),
  createColor('P19', 'perler', 'Perler', 'Pastel Blue (粉蓝)', '#91D2EE'),
  createColor('P20', 'perler', 'Perler', 'Pastel Lavender (薰衣草粉紫)', '#C5A4D0'),
  createColor('P21', 'perler', 'Perler', 'Pastel Pink (浅粉)', '#FBAEC7'),
  createColor('P33', 'perler', 'Perler', 'Peach (桃肤色)', '#FBC5A2'),
  createColor('P38', 'perler', 'Perler', 'Plum (梅紫)', '#93356E'),
  createColor('P57', 'perler', 'Perler', 'Cheddar (切达黄)', '#FFA700'),
  createColor('P58', 'perler', 'Perler', 'Kiwi Lime (奇特果绿)', '#86C82B'),
  createColor('P59', 'perler', 'Perler', 'Turquoise (青绿松石)', '#00A896'),
  createColor('P60', 'perler', 'Perler', 'Toothpaste (薄荷青蓝)', '#9EE4E8'),
  createColor('P61', 'perler', 'Perler', 'Periwinkle (长春花蓝)', '#7470B3'),
  createColor('P62', 'perler', 'Perler', 'Hot Coral (珊瑚红)', '#F15C52'),
  createColor('P79', 'perler', 'Perler', 'Midnight (午夜蓝)', '#101B3B'),
  createColor('P80', 'perler', 'Perler', 'Rust (铁锈红)', '#A03F29'),
  createColor('P82', 'perler', 'Perler', 'Sand (沙滩色)', '#E6C697'),
  createColor('P83', 'perler', 'Perler', 'Apricot (杏色)', '#FDC58F'),
  createColor('P85', 'perler', 'Perler', 'Evergreen (常青绿)', '#1E4B37'),
  createColor('P88', 'perler', 'Perler', 'Sherbet (雪酪橙)', '#FF9F7C'),
  createColor('P90', 'perler', 'Perler', 'Charcoal (炭灰)', '#4B4F54'),
  createColor('P91', 'perler', 'Perler', 'Cobalt (钴蓝)', '#2B4FA1'),
  createColor('P92', 'perler', 'Perler', 'Tan (浅褐)', '#C49E72'),
  createColor('P93', 'perler', 'Perler', 'Light Grey (浅灰)', '#D2D3D5')
];

// 3. Artkal 经典色卡
export const ARTKAL_PALETTE: BeadColor[] = [
  createColor('A01', 'artkal', 'Artkal', '纯白 Pure White', '#FFFFFF'),
  createColor('A02', 'artkal', 'Artkal', '纯黑 Black', '#111111'),
  createColor('A03', 'artkal', 'Artkal', '浅灰 Light Grey', '#D7D8D6'),
  createColor('A04', 'artkal', 'Artkal', '深灰 Dark Grey', '#7B7B7B'),
  createColor('A05', 'artkal', 'Artkal', '深红 Deep Red', '#B11016'),
  createColor('A06', 'artkal', 'Artkal', '大红 Crimson', '#E21A22'),
  createColor('A07', 'artkal', 'Artkal', '浅粉 Light Pink', '#FFB7CE'),
  createColor('A08', 'artkal', 'Artkal', '玫瑰红 Rose', '#F4588E'),
  createColor('A09', 'artkal', 'Artkal', '柠檬黄 Lemon Yellow', '#FFF44F'),
  createColor('A10', 'artkal', 'Artkal', '明黄 Vivid Yellow', '#FFDC00'),
  createColor('A11', 'artkal', 'Artkal', '橙色 Orange', '#FF7F00'),
  createColor('A12', 'artkal', 'Artkal', '肤色 Skin', '#FCD5B5'),
  createColor('A13', 'artkal', 'Artkal', '浅棕 Light Brown', '#B58150'),
  createColor('A14', 'artkal', 'Artkal', '深棕 Dark Brown', '#583622'),
  createColor('A15', 'artkal', 'Artkal', '天蓝 Sky Blue', '#8CD6F7'),
  createColor('A16', 'artkal', 'Artkal', '宝蓝 Royal Blue', '#195AA5'),
  createColor('A17', 'artkal', 'Artkal', '海军蓝 Navy Blue', '#0F2C59'),
  createColor('A18', 'artkal', 'Artkal', '草绿 Grass Green', '#5BB349'),
  createColor('A19', 'artkal', 'Artkal', '森林绿 Forest Green', '#1C6B37'),
  createColor('A20', 'artkal', 'Artkal', '浅紫 Light Purple', '#C29BDB'),
  createColor('A21', 'artkal', 'Artkal', '深紫 Deep Purple', '#6C2586'),
  createColor('A22', 'artkal', 'Artkal', '鸭翅绿 Teal', '#009688'),
  createColor('A23', 'artkal', 'Artkal', '水绿 Aqua', '#70E0D0'),
  createColor('A24', 'artkal', 'Artkal', '赭石 Ochre', '#CC7722')
];

export const PALETTES = {
  mard: MARD_PALETTE,
  perler: PERLER_PALETTE,
  artkal: ARTKAL_PALETTE
};

export type BrandKey = 'mard' | 'perler' | 'artkal';
