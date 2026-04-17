export type TileKind = 'empty' | 'start' | 'end' | 'chip' | 'danger';

export interface GridConfig {
  width: number;
  height: number;
  start: [number, number];
  end: [number, number];
  chips: ReadonlyArray<[number, number]>;
  dangers: ReadonlyArray<[number, number]>;
  startFacing: 'up' | 'down' | 'left' | 'right';
}

export const DRONE_GRID: GridConfig = {
  width: 5,
  height: 5,
  start: [0, 0],
  end: [4, 4],
  chips: [
    [1, 0],
    [1, 1],
    [1, 2],
  ],
  dangers: [[2, 2]],
  startFacing: 'down',
};

export function tileAt(config: GridConfig, col: number, row: number): TileKind {
  if (config.start[0] === col && config.start[1] === row) return 'start';
  if (config.end[0] === col && config.end[1] === row) return 'end';
  if (config.chips.some(([c, r]) => c === col && r === row)) return 'chip';
  if (config.dangers.some(([c, r]) => c === col && r === row)) return 'danger';
  return 'empty';
}
