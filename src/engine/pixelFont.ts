import type { GridSpec, TextBlock } from '../types';

/**
 * A 5 × 7 pixel font for the "Stitch" text style: every letter pixel becomes a
 * whole number of stitches, so text stays crisp even when it is small.
 * Lower-case letters are drawn as capitals.
 */
const GLYPHS: Record<string, string> = {
  A: '.###. #...# #...# ##### #...# #...# #...#',
  B: '####. #...# #...# ####. #...# #...# ####.',
  C: '.###. #...# #.... #.... #.... #...# .###.',
  D: '####. #...# #...# #...# #...# #...# ####.',
  E: '##### #.... #.... ####. #.... #.... #####',
  F: '##### #.... #.... ####. #.... #.... #....',
  G: '.###. #...# #.... #.### #...# #...# .####',
  H: '#...# #...# #...# ##### #...# #...# #...#',
  I: '.###. ..#.. ..#.. ..#.. ..#.. ..#.. .###.',
  J: '..### ...#. ...#. ...#. ...#. #..#. .##..',
  K: '#...# #..#. #.#.. ##... #.#.. #..#. #...#',
  L: '#.... #.... #.... #.... #.... #.... #####',
  M: '#...# ##.## #.#.# #.#.# #...# #...# #...#',
  N: '#...# #...# ##..# #.#.# #..## #...# #...#',
  O: '.###. #...# #...# #...# #...# #...# .###.',
  P: '####. #...# #...# ####. #.... #.... #....',
  Q: '.###. #...# #...# #...# #.#.# #..#. .##.#',
  R: '####. #...# #...# ####. #.#.. #..#. #...#',
  S: '.#### #.... #.... .###. ....# ....# ####.',
  T: '##### ..#.. ..#.. ..#.. ..#.. ..#.. ..#..',
  U: '#...# #...# #...# #...# #...# #...# .###.',
  V: '#...# #...# #...# #...# #...# .#.#. ..#..',
  W: '#...# #...# #...# #.#.# #.#.# #.#.# .#.#.',
  X: '#...# #...# .#.#. ..#.. .#.#. #...# #...#',
  Y: '#...# #...# .#.#. ..#.. ..#.. ..#.. ..#..',
  Z: '##### ....# ...#. ..#.. .#... #.... #####',
  '0': '.###. #...# #..## #.#.# ##..# #...# .###.',
  '1': '..#.. .##.. ..#.. ..#.. ..#.. ..#.. .###.',
  '2': '.###. #...# ....# ...#. ..#.. .#... #####',
  '3': '####. ....# ....# .###. ....# ....# ####.',
  '4': '...#. ..##. .#.#. #..#. ##### ...#. ...#.',
  '5': '##### #.... ####. ....# ....# #...# .###.',
  '6': '..##. .#... #.... ####. #...# #...# .###.',
  '7': '##### ....# ...#. ..#.. .#... .#... .#...',
  '8': '.###. #...# #...# .###. #...# #...# .###.',
  '9': '.###. #...# #...# .#### ....# ...#. .##..',
  '!': '..#.. ..#.. ..#.. ..#.. ..#.. ..... ..#..',
  '?': '.###. #...# ....# ...#. ..#.. ..... ..#..',
  '.': '..... ..... ..... ..... ..... .##.. .##..',
  ',': '..... ..... ..... ..... .##.. ..#.. .#...',
  "'": '..#.. ..#.. .#... ..... ..... ..... .....',
  '-': '..... ..... ..... ##### ..... ..... .....',
  '&': '.##.. #..#. #.#.. .#... #.#.# #..#. .##.#',
  ':': '..... .##.. .##.. ..... .##.. .##.. .....',
  '+': '..... ..#.. ..#.. ##### ..#.. ..#.. .....',
  '/': '....# ...#. ...#. ..#.. .#... .#... #....',
  '#': '.#.#. .#.#. ##### .#.#. ##### .#.#. .#.#.',
  '♥': '..... .#.#. ##### ##### .###. ..#.. .....',
  '<': '...#. ..#.. .#... #.... .#... ..#.. ...#.',
  '>': '.#... ..#.. ...#. ....# ...#. ..#.. .#...',
};

/** Glyph columns with empty side columns trimmed (space is 3 wide). */
function glyph(ch: string): string[] | null {
  if (ch === ' ') return Array(7).fill('...');
  const g = GLYPHS[ch] ?? GLYPHS[ch.toUpperCase()];
  if (!g) return null;
  const rows = g.split(' ');
  let left = 0;
  let right = 4;
  while (left < 4 && rows.every((r) => r[left] === '.')) left++;
  while (right > left && rows.every((r) => r[right] === '.')) right--;
  return rows.map((r) => r.slice(left, right + 1));
}

export function hasPixelGlyph(ch: string): boolean {
  return ch === ' ' || ch in GLYPHS || ch.toUpperCase() in GLYPHS;
}

/** Renders `text` in the pixel font, about `sizeIn` inches tall, as a block of cells. */
export function pixelTextBlock(text: string, sizeIn: number, gridSpec: GridSpec): TextBlock {
  const px = sizeIn / 7; // inches per font pixel
  const pc = Math.max(1, Math.round(px / gridSpec.cellWidthIn));
  const pr = Math.max(1, Math.round(px / gridSpec.cellHeightIn));
  const glyphs = [...text].map(glyph).filter((g): g is string[] => g !== null);
  if (glyphs.length === 0) return { cols: 0, rows: 0, cells: new Uint8Array(0) };
  const fontCols = glyphs.reduce((s, g) => s + g[0].length, 0) + (glyphs.length - 1); // 1 column between letters
  const cols = fontCols * pc;
  const rows = 7 * pr;
  const cells = new Uint8Array(cols * rows);
  let fx = 0;
  for (const g of glyphs) {
    for (let gy = 0; gy < 7; gy++) {
      for (let gx = 0; gx < g[gy].length; gx++) {
        if (g[gy][gx] !== '#') continue;
        for (let y = 0; y < pr; y++) for (let x = 0; x < pc; x++) cells[(gy * pr + y) * cols + (fx + gx) * pc + x] = 1;
      }
    }
    fx += g[0].length + 1;
  }
  return { cols, rows, cells };
}
