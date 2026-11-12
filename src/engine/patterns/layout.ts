/**
 * Borders round the edge of the piece and frames round the pet (pure).
 * Both are drawn in the pattern yarn on top of the background pattern; the pet and
 * text are still drawn over them by buildGrid.
 */
import type { BorderStyle, GridSpec, PetFrame } from '../../types';
import { artCell, GREEK_KEY, HEART_L, makeRings, mod, TAU } from './core';
import { FAIR_ROWS } from './library';

/** Border bands: rows from the outer edge inward ('#' = yarn), repeated along the edge. */
const BANDS: Record<Exclude<BorderStyle, 'none'>, { rows: string[]; corner: 'turn' | 'block' }> = {
  lines: { rows: ['#', '.', '.', '#', '.'], corner: 'turn' },
  'fair-isle': { rows: ['#', '.', ...FAIR_ROWS.slice(2, 7), '.', '#', '.'], corner: 'block' },
  scallops: {
    rows: Array.from({ length: 5 }, (_, a) => Array.from({ length: 6 }, (_, t) => {
      const d = Math.hypot(t - 2.5, a - 0.5);
      return a === 0 || (a > 0 && d < 4 && d > 2.6) ? '#' : '.';
    }).join('')),
    corner: 'turn',
  },
  'greek-key': { rows: ['#', '.', ...[...GREEK_KEY].reverse().map((r) => r.map((v) => (v ? '#' : '.')).join('')), '.'], corner: 'block' },
};

/** Border width in art pixels (rows of the band). */
export const borderDepth = (style: BorderStyle) => (style === 'none' ? 0 : BANDS[style].rows.length);

/** Draws the border into `ink` (1 = yarn). */
export function applyBorder(ink: Uint8Array, style: BorderStyle, gridSpec: GridSpec): void {
  if (style === 'none') return;
  const { cols, rows, cellWidthIn: cw, cellHeightIn: ch } = gridSpec;
  const { sx, sy } = artCell(cw, ch, 1);
  const { rows: band, corner } = BANDS[style];
  const B = band.length;
  const lastCol = Math.floor((cols - 1) / sx), lastRow = Math.floor((rows - 1) / sy);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const ax = Math.floor(c / sx), ay = Math.floor(r / sy);
      const dl = ax, dr = lastCol - ax, dt = ay, db = lastRow - ay;
      const dh = Math.min(dl, dr), dv = Math.min(dt, db);
      if (Math.min(dh, dv) >= B) continue;
      const i = r * cols + c;
      if (dh < B && dv < B) {
        // Corner: either the band turns the corner, or a solid cornerstone with the band's outer line.
        const a = Math.min(dh, dv);
        const stone = a === 0 || (dh >= 2 && dv >= 2 && dh <= B - 3 && dv <= B - 3);
        ink[i] = (corner === 'turn' ? band[a][0] === '#' : stone) ? 1 : 0;
        continue;
      }
      const across = dv < B ? dv : dh, along = dv < B ? ax : ay;
      const row = band[across];
      ink[i] = row[mod(along, row.length)] === '#' ? 1 : 0;
    }
  }
}

/**
 * Clears the background round the pet and draws a frame. `pet` marks pet cells (1).
 * The frame centres on the pet and sizes itself to it.
 */
export function applyFrame(ink: Uint8Array, frame: PetFrame, gridSpec: GridSpec, pet: Uint8Array, seed: number): void {
  if (frame === 'none') return;
  const { cols, rows, cellWidthIn: cw, cellHeightIn: ch } = gridSpec;
  let minC = cols, maxC = -1, minR = rows, maxR = -1;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!pet[r * cols + c]) continue;
      if (c < minC) minC = c;
      if (c > maxC) maxC = c;
      if (r < minR) minR = r;
      if (r > maxR) maxR = r;
    }
  }
  if (maxC < 0) {
    // No pet yet: frame the middle third.
    minC = Math.round(cols / 3); maxC = Math.round((2 * cols) / 3);
    minR = Math.round(rows / 3); maxR = Math.round((2 * rows) / 3);
  }
  const cx = ((minC + maxC + 1) / 2) * cw, cy = ((minR + maxR + 1) / 2) * ch;
  const halfW = ((maxC - minC + 1) * cw) / 2, halfH = ((maxR - minR + 1) * ch) / 2;
  const { sx, sy } = artCell(cw, ch, 1), uw = sx * cw, uh = sy * ch, u = (uw + uh) / 2;
  const at = (c: number, r: number): [number, number] => [((c + 0.5) * cw - cx) / uw, ((r + 0.5) * ch - cy) / uh];

  if (frame === 'oval') {
    const rx = (halfW * 1.08 + 1.2) / u, ry = (halfH * 1.08 + 1.2) / u, m = Math.min(rx, ry);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const [X, Y] = at(c, r), e = Math.hypot(X / rx, Y / ry), i = r * cols + c;
        if (e < 1) ink[i] = 0;
        else if (e < 1 + 1.2 / m) ink[i] = 1;
        else if (e < 1 + 2.4 / m) ink[i] = 0;
      }
    }
    return;
  }

  const R0 = (Math.max(halfW, halfH) * 1.05 + 0.8) / u; // clear radius in art px
  if (frame === 'medallion') {
    const Rmax = R0 + 16;
    const ring = makeRings(seed, Rmax, { start: R0, subjects: [HEART_L], k: 8, edge: false });
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const [X, Y] = at(c, r), d = Math.hypot(X, Y), i = r * cols + c;
        if (d < Rmax) ink[i] = ring(X, Y) ? 1 : 0;
        else if (d < Rmax + 2) ink[i] = 0;
      }
    }
    return;
  }

  // Sunburst: a ring round the pet, then rays out to the edges (replacing the background).
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const [X, Y] = at(c, r), d = Math.hypot(X, Y), i = r * cols + c;
      if (d < R0) ink[i] = 0;
      else if (d < R0 + 1.5) ink[i] = 1;
      else if (d < R0 + 3) ink[i] = 0;
      else ink[i] = mod((Math.atan2(Y, X) * 32) / TAU, 1) < 0.5 ? 1 : 0;
    }
  }
}
