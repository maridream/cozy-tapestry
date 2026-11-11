import { DEFAULT_SETTINGS } from '../src/app/state';
import type { CutoutImage, PatternGrid, PatternSettings, YarnColor } from '../src/types';

/** Builds a fake ImageData + mask. `paint(x, y)` returns [r, g, b, maskValue]. */
export function makeCutout(width: number, height: number, paint: (x: number, y: number) => [number, number, number, number]): CutoutImage {
  const data = new Uint8ClampedArray(width * height * 4);
  const mask = new Uint8ClampedArray(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const [r, g, b, m] = paint(x, y);
      const i = y * width + x;
      data.set([r, g, b, 255], i * 4);
      mask[i] = m;
    }
  }
  return { image: { width, height, data, colorSpace: 'srgb' } as unknown as ImageData, mask };
}

export const settings = (over: Partial<PatternSettings> = {}): PatternSettings => ({ ...DEFAULT_SETTINGS, ...over });

export const color = (id: number, name: string, hex: string, role: YarnColor['role'] = 'subject'): YarnColor => ({
  id: `c${id}`,
  name,
  hex,
  role,
  userEdited: false,
  autoHex: hex,
});

export function gridOf(rows: number[][], palette: YarnColor[]): PatternGrid {
  return { cols: rows[0].length, rows: rows.length, cells: Uint8Array.from(rows.flat()), palette };
}

export function solidGrid(cols: number, rows: number, value: number, palette: YarnColor[]): PatternGrid {
  return { cols, rows, cells: new Uint8Array(cols * rows).fill(value), palette };
}
