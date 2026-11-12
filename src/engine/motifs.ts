import type { BackgroundPattern, GridSpec, MotifDirection, MotifId } from '../types';
import { artCell, coarse } from './patterns/core';
import { applyBorder, applyFrame } from './patterns/layout';
import { PATTERNS } from './patterns/library';

/**
 * Background patterns for the Design step (pure).
 *
 * - Simple geometric motifs (LEGACY) are defined on a unit tile (u, v in 0..1) that
 *   repeats every `sizeIn` inches, sampled 4 times per cell.
 * - Everything else lives in ./patterns: stitch-exact repeats, organic prints in
 *   inches (and centred designs, none in the picker for now), sized in whole steps (`scale`).
 */

type Sprite = readonly string[];

// Pixel-art silhouette for the one legacy sprite motif still in use ('#' = motif yarn).
const SPRITES = {
  seeds: ['.###.', '#####', '.###.'],
} satisfies Record<string, Sprite>;

type SpriteId = keyof typeof SPRITES;

export type MotifGroup =
  | 'Simple'
  | 'Classics'
  | 'Dogs'
  | 'Cats'
  | 'Birds'
  | 'Reptiles'
  | 'Fish'
  | 'Small pets'
  | 'Horses'
  | 'Animal prints'
  | 'Quilt blocks'
  | 'Folk and geometric';

export interface MotifInfo {
  id: MotifId;
  label: string;
  /** Group heading in the picker. */
  group: MotifGroup;
}

/** Picker order. */
export const MOTIFS: readonly MotifInfo[] = [
  { id: 'none', label: 'Plain', group: 'Simple' },
  { id: 'dots', label: 'Dots', group: 'Simple' },
  { id: 'stripes', label: 'Stripes', group: 'Simple' },
  { id: 'zigzag', label: 'Zigzag', group: 'Simple' },
  { id: 'checks', label: 'Checks', group: 'Simple' },
  { id: 'hearts', label: 'Hearts', group: 'Simple' },
  { id: 'stars', label: 'Stars', group: 'Simple' },
  { id: 'houndstooth', label: 'Houndstooth', group: 'Classics' },
  { id: 'gingham', label: 'Gingham', group: 'Classics' },
  { id: 'chevron', label: 'Chevron', group: 'Classics' },
  { id: 'herringbone', label: 'Herringbone', group: 'Classics' },
  { id: 'diamonds', label: 'Diamonds', group: 'Classics' },
  { id: 'windowpane', label: 'Windowpane', group: 'Classics' },
  { id: 'fair-isle', label: 'Fair Isle bands', group: 'Classics' },
  { id: 'snowflakes', label: 'Snowflakes', group: 'Classics' },
  { id: 'bones', label: 'Bones', group: 'Dogs' },
  { id: 'paws', label: 'Paws', group: 'Dogs' },
  { id: 'fish', label: 'Fish', group: 'Cats' },
  { id: 'yarn-balls', label: 'Yarn balls', group: 'Cats' },
  { id: 'feathers', label: 'Feathers', group: 'Birds' },
  { id: 'seeds', label: 'Seeds', group: 'Birds' },
  { id: 'scales', label: 'Scales', group: 'Reptiles' },
  { id: 'leaves', label: 'Vines', group: 'Reptiles' },
  { id: 'bubbles', label: 'Bubbles', group: 'Fish' },
  { id: 'waves', label: 'Waves', group: 'Fish' },
  { id: 'carrots', label: 'Carrots', group: 'Small pets' },
  { id: 'clover', label: 'Clover', group: 'Small pets' },
  { id: 'horseshoes', label: 'Horseshoes', group: 'Horses' },
  { id: 'leopard-spots', label: 'Leopard', group: 'Animal prints' },
  { id: 'jaguar', label: 'Jaguar', group: 'Animal prints' },
  { id: 'cheetah', label: 'Cheetah', group: 'Animal prints' },
  { id: 'giraffe', label: 'Giraffe', group: 'Animal prints' },
  { id: 'zebra', label: 'Zebra', group: 'Animal prints' },
  { id: 'tiger-stripes', label: 'Tiger', group: 'Animal prints' },
  { id: 'cow', label: 'Cow', group: 'Animal prints' },
  { id: 'speckles', label: 'Speckles', group: 'Animal prints' },
  { id: 'q-ohio-star', label: 'Ohio star', group: 'Quilt blocks' },
  { id: 'q-pinwheel', label: 'Pinwheel', group: 'Quilt blocks' },
  { id: 'q-flying-geese', label: 'Flying geese', group: 'Quilt blocks' },
  { id: 'fair-isle-gen', label: 'Fair Isle maker', group: 'Folk and geometric' },
  { id: 'greek-key', label: 'Greek key', group: 'Folk and geometric' },
  { id: 'seigaiha', label: 'Seigaiha waves', group: 'Folk and geometric' },
  { id: 'shippo', label: 'Shippo circles', group: 'Folk and geometric' },
  { id: 'ogee', label: 'Ogee', group: 'Folk and geometric' },
  { id: 'fans', label: 'Art deco fans', group: 'Folk and geometric' },
  { id: 'honeycomb', label: 'Honeycomb', group: 'Folk and geometric' },
  { id: 'truchet', label: 'Meander curves', group: 'Folk and geometric' },
  { id: 'basketweave', label: 'Basketweave', group: 'Folk and geometric' },
  { id: 'argyle', label: 'Argyle', group: 'Folk and geometric' },
  { id: 'tartan', label: 'Tartan', group: 'Folk and geometric' },
  { id: 'rings', label: 'Linked rings', group: 'Folk and geometric' },
];

/** Simple geometric motifs sized by a repeat in inches; everything else uses Small / Medium / Large. */
export const LEGACY = new Set<MotifId>(['dots', 'stripes', 'zigzag', 'checks', 'seeds', 'bubbles', 'waves']);

/** How a motif behaves in the Design step controls. */
export function motifTraits(id: MotifId): { sized: 'inches' | 'steps' | 'fills'; directional: boolean; seeded: boolean } {
  if (id === 'none') return { sized: 'steps', directional: false, seeded: false };
  if (LEGACY.has(id)) return { sized: 'inches', directional: true, seeded: false };
  const def = PATTERNS[id];
  return { sized: def.kind === 'radial' ? 'fills' : 'steps', directional: def.kind !== 'radial', seeded: !!def.seeded };
}

export const DIRECTION_ANGLE: Record<MotifDirection, number> = {
  across: 0,
  down: 90,
  diagonal: 45,
  'diagonal-reverse': -45,
};

const frac = (t: number) => t - Math.floor(t);
const tri = (t: number) => Math.abs(2 * frac(t) - 1); // 1 -> 0 -> 1 triangle wave
const ring = (u: number, v: number, cx: number, cy: number, r: number, w: number) => Math.abs(Math.hypot(u - cx, v - cy) - r) < w;

/** Motifs that look better with every other row shifted by half a tile. */
const STAGGERED = new Set<MotifId>(['dots', 'seeds', 'bubbles']);

function spriteInk(sprite: Sprite, u: number, v: number): boolean {
  const h = sprite.length;
  const w = sprite[0].length;
  const fill = 0.72; // share of the tile the motif's longer side takes up
  const s = fill / Math.max(w, h);
  const x = Math.floor((u - 0.5) / s + w / 2);
  const y = Math.floor((v - 0.5) / s + h / 2);
  return x >= 0 && y >= 0 && x < w && y < h && sprite[y][x] === '#';
}

/** Whether the unit-tile point (u, v) of a simple motif is motif yarn. */
export function motifInk(motif: MotifId, u: number, v: number): boolean {
  switch (motif) {
    case 'none':
      return false;
    case 'dots':
      return Math.hypot(u - 0.5, v - 0.5) < 0.22;
    case 'stripes':
      return v < 0.42;
    case 'zigzag':
      return frac(v + 0.3 * tri(u)) < 0.34;
    case 'checks':
      return (Math.floor(u * 2) + Math.floor(v * 2)) % 2 === 0;
    case 'bubbles':
      return ring(u, v, 0.32, 0.36, 0.2, 0.055) || ring(u, v, 0.74, 0.74, 0.11, 0.05) || Math.hypot(u - 0.78, v - 0.22) < 0.05;
    case 'waves':
      return frac(v + 0.13 * Math.sin(2 * Math.PI * u)) < 0.3;
    default:
      return spriteInk(SPRITES[motif as SpriteId], u, v);
  }
}

/**
 * A simple motif over the whole piece. Each cell takes the majority of 4 sample points, which keeps small motifs tidy.
 */
function legacyInk(pattern: BackgroundPattern, gridSpec: GridSpec): Uint8Array {
  const { cols, rows, cellWidthIn, cellHeightIn, finished } = gridSpec;
  const out = new Uint8Array(cols * rows);
  const size = Math.max(0.25, pattern.sizeIn);
  const angle = (DIRECTION_ANGLE[pattern.direction] * Math.PI) / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const cx = finished.width / 2;
  const cy = finished.height / 2;
  const stagger = STAGGERED.has(pattern.motif);
  const offsets = [0.25, 0.75];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      let hits = 0;
      for (const oy of offsets) {
        for (const ox of offsets) {
          const dx = (c + ox) * cellWidthIn - cx;
          const dy = (r + oy) * cellHeightIn - cy;
          // Rotate into motif space; offset by half a tile so a motif sits at the centre.
          const tu = (dx * cos + dy * sin) / size + 0.5;
          const tv = (-dx * sin + dy * cos) / size + 0.5;
          const tileRow = Math.floor(tv);
          const u = frac(tu + (stagger && tileRow % 2 !== 0 ? 0.5 : 0));
          if (motifInk(pattern.motif, u, frac(tv))) hits++;
        }
      }
      if (hits >= 2) out[r * cols + c] = 1;
    }
  }
  return out;
}

/**
 * The background pattern over the whole piece, one byte per cell (1 = pattern yarn).
 * Patterns are centred on the piece. Borders and pet frames are added by `decorationInk`.
 */
export function backgroundInk(pattern: BackgroundPattern, gridSpec: GridSpec): Uint8Array {
  const { cols, rows, cellWidthIn: cw, cellHeightIn: ch } = gridSpec;
  if (pattern.motif === 'none') return new Uint8Array(cols * rows);
  if (LEGACY.has(pattern.motif)) return legacyInk(pattern, gridSpec);
  const def = PATTERNS[pattern.motif];
  const out = new Uint8Array(cols * rows);
  const W = cols * cw, H = rows * ch;
  const seed = pattern.seed | 0;
  const scale = Math.max(1, Math.min(3, Math.round(pattern.scale ?? 1)));
  const angle = (DIRECTION_ANGLE[pattern.direction] * Math.PI) / 180;
  const cos = Math.cos(angle), sin = Math.sin(angle);
  const turn = (x: number, y: number): [number, number] => [x * cos + y * sin, -x * sin + y * cos];

  if (def.kind === 'art') {
    // Whole stitches per art pixel; across is exact, other directions sample the turned grid.
    const fn = def.make(seed);
    const { sx, sy } = artCell(cw, ch, scale);
    const c0 = Math.floor(cols / 2), r0 = Math.floor(rows / 2);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        let X = (c - c0) / sx, Y = (r - r0) / sy;
        if (pattern.direction !== 'across') [X, Y] = turn((c - c0 + 0.5) / sx, (r - r0 + 0.5) / sy);
        out[r * cols + c] = fn(Math.floor(X), Math.floor(Y)) ? 1 : 0;
      }
    }
    return out;
  }

  if (def.kind === 'inch') {
    // Organic prints in inches. Tall stitches sample 2 × 3 points and keep a stitch when two
    // land on the print, so thin curves across the rows don't break up.
    const f = def.make(seed), k = scale * coarse(cw, ch);
    const tall = ch > cw * 1.4, xs = tall ? [0.3, 0.7] : [0.5], ys = tall ? [0.2, 0.5, 0.8] : [0.5], need = tall ? 2 : 1;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        let hits = 0;
        for (const oy of ys) {
          for (const ox of xs) {
            const [x, y] = turn(((c + ox) * cw - W / 2) / k, ((r + oy) * ch - H / 2) / k);
            if (f(x, y)) hits++;
          }
        }
        out[r * cols + c] = hits >= need ? 1 : 0;
      }
    }
    return out;
  }

  // Radial: one centred design filling the piece.
  const { sx, sy } = artCell(cw, ch, 1), uw = sx * cw, uh = sy * ch;
  const f = def.make(seed, Math.min(W / uw, H / uh) / 2 - 0.5);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) out[r * cols + c] = f(((c + 0.5) * cw - W / 2) / uw, ((r + 0.5) * ch - H / 2) / uh) ? 1 : 0;
  }
  return out;
}

/** True when the background adds anything besides plain yarn (a pattern, border or pet frame). */
export const hasDecoration = (p: BackgroundPattern) => p.motif !== 'none' || (p.border ?? 'none') !== 'none' || (p.frame ?? 'none') !== 'none';

/**
 * Everything drawn in the pattern yarn: background pattern, then the frame round the pet
 * (which clears the pattern near the pet), then the border. `pet` marks pet cells (1).
 */
export function decorationInk(pattern: BackgroundPattern, gridSpec: GridSpec, pet: Uint8Array): Uint8Array {
  const ink = backgroundInk(pattern, gridSpec);
  applyFrame(ink, pattern.frame ?? 'none', gridSpec, pet, pattern.seed | 0);
  applyBorder(ink, pattern.border ?? 'none', gridSpec);
  return ink;
}
