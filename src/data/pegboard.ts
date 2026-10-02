export interface PegboardConfig {
  id: string;
  name: string;
  width: number;
  height: number;
  isCustom?: boolean;
}

export const DEFAULT_PEGBOARDS: PegboardConfig[] = [
  { id: '28x28', name: '28×28 大方板 (主流标准)', width: 28, height: 28 },
  { id: '50x50', name: '50×50 大方板 (大拼板)', width: 50, height: 50 },
  { id: '14x14', name: '14×14 迷你小方板', width: 14, height: 14 },
  { id: '30x30', name: '30×30 规格方板', width: 30, height: 30 },
  { id: '20x20', name: '20×20 中号方板', width: 20, height: 20 },
];

export const BEAD_DIAMETERS = [
  { id: '2.6', name: '2.6mm (小豆/软豆/高精)', value: 2.6 },
  { id: '5.0', name: '5.0mm (标准大豆/入门)', value: 5.0 },
];
