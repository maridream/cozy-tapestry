import type { BackgroundPattern, GridSpec, MotifDirection, MotifId } from '../types';

/**
 * Background motifs as pure functions of position. Each motif is defined on a
 * unit tile (u, v in 0..1) that repeats every `sizeIn` inches; positions are
 * in inches so shapes keep their proportions even with tall dc cells.
 */

type Sprite = readonly string[];

// Pixel-art silhouettes ('#' = motif yarn). Drawn upright; the direction setting rotates them.
const SPRITES = {
  bones: ['##.....##', '#########', '#########', '##.....##'],
  paws: ['.##...##.', '.##...##.', '.........', '##.###.##', '##.###.##', '..#####..', '.#######.', '.#######.', '..##.##..'],
  fish: ['...####....', '.#######..#', '#########.#', '###########', '#########.#', '.#######..#', '...####....'],
  hearts: ['.##.##.', '#######', '#######', '.#####.', '..###..', '...#...'],
  stars: ['...#...', '...#...', '#######', '.#####.', '..###..', '.##.##.', '##...##'],
  'yarn-balls': ['..#####..', '.#..#..#.', '#..#..#.#', '#.#..#..#', '##..#..##', '#..#..#.#', '#.#..#..#', '.#..#..#.', '..#####..'],
  feathers: ['......#', '.....##', '....###', '...####', '..####.', '.####..', '.###...', '.##....', '##.....', '#......'],
  seeds: ['.###.', '#####', '.###.'],
  leaves: ['....###..', '..######.', '.#######.', '.######..', '.#####...', '.####....', '.##......', '#........'],
  clover: ['..##.##..', '.###.###.', '.#######.', '...###...', '.#######.', '.###.###.', '..##.##..', '....#....', '....#....'],
  carrots: ['.#.#.', '..#..', '.###.', '.###.', '.###.', '..##.', '..##.', '..#..', '..#..'],
  horseshoes: ['##.....##', '##.....##', '##.....##', '##.....##', '.##...##.', '..#####..'],
} satisfies Record<string, Sprite>;

type SpriteId = keyof typeof SPRITES;

export interface MotifInfo {
  id: MotifId;
  label: string;
  /** Group heading in the picker. */
  group: 'Simple' | 'Dogs' | 'Cats' | 'Birds' | 'Reptiles' | 'Fish' | 'Wild' | 'Small pets' | 'Horses';
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
  { id: 'bones', label: 'Bones', group: 'Dogs' },
  { id: 'paws', label: 'Paws', group: 'Dogs' },
  { id: 'fish', label: 'Fish', group: 'Cats' },
  { id: 'yarn-balls', label: 'Yarn balls', group: 'Cats' },
  { id: 'feathers', label: 'Feathers', group: 'Birds' },
  { id: 'seeds', label: 'Seeds', group: 'Birds' },
  { id: 'scales', label: 'Scales', group: 'Reptiles' },
  { id: 'leaves', label: 'Leaves', group: 'Reptiles' },
  { id: 'bubbles', label: 'Bubbles', group: 'Fish' },
  { id: 'waves', label: 'Waves', group: 'Fish' },
  { id: 'tiger-stripes', label: 'Tiger stripes', group: 'Wild' },
  { id: 'leopard-spots', label: 'Leopard spots', group: 'Wild' },
  { id: 'carrots', label: 'Carrots', group: 'Small pets' },
  { id: 'clover', label: 'Clover', group: 'Small pets' },
  { id: 'horseshoes', label: 'Horseshoes', group: 'Horses' },
];

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
const STAGGERED = new Set<MotifId>(['dots', 'hearts', 'stars', 'bones', 'paws', 'fish', 'yarn-balls', 'feathers', 'seeds', 'leaves', 'clover', 'carrots', 'horseshoes', 'bubbles', 'leopard-spots', 'scales', 'tiger-stripes']);

function spriteInk(sprite: Sprite, u: number, v: number): boolean {
  const h = sprite.length;
  const w = sprite[0].length;
  const fill = 0.72; // share of the tile the motif's longer side takes up
  const s = fill / Math.max(w, h);
  const x = Math.floor((u - 0.5) / s + w / 2);
  const y = Math.floor((v - 0.5) / s + h / 2);
  return x >= 0 && y >= 0 && x < w && y < h && sprite[y][x] === '#';
}

/** Whether the unit-tile point (u, v) is motif yarn. `row` = which tile row (for variation). */
export function motifInk(motif: MotifId, u: number, v: number, row = 0): boolean {
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
    case 'scales':
      // Fish-scale arcs: half rings opening downwards.
      return v < 0.55 && ring(u, v, 0.5, 0.05, 0.45, 0.07);
    case 'bubbles':
      return ring(u, v, 0.32, 0.36, 0.2, 0.055) || ring(u, v, 0.74, 0.74, 0.11, 0.05) || Math.hypot(u - 0.78, v - 0.22) < 0.05;
    case 'waves':
      return frac(v + 0.13 * Math.sin(2 * Math.PI * u)) < 0.3;
    case 'tiger-stripes': {
      // Tapered, wavy dashes that break up like real stripes.
      const w = 0.34 * Math.pow(Math.max(0, Math.sin(Math.PI * u)), 0.8);
      const wobble = 0.1 * Math.sin(2 * Math.PI * u + row * 1.7);
      return Math.abs(v - 0.5 + wobble) < w / 2;
    }
    case 'leopard-spots': {
      // Broken rosettes with a small spot between them.
      const a = Math.atan2(v - 0.45, u - 0.45);
      const gap = Math.sin(3 * a + row) > 0.55;
      return (!gap && ring(u, v, 0.45, 0.45, 0.2, 0.075)) || Math.hypot(u - 0.92, v - 0.9) < 0.07;
    }
    default:
      return spriteInk(SPRITES[motif as SpriteId], u, v);
  }
}

/**
 * The motif over the whole piece, one byte per cell (1 = motif yarn).
 * Each cell takes the majority of 4 sample points, which keeps small motifs tidy.
 */
export function backgroundInk(pattern: BackgroundPattern, gridSpec: GridSpec): Uint8Array {
  const { cols, rows, cellWidthIn, cellHeightIn, finished } = gridSpec;
  const out = new Uint8Array(cols * rows);
  if (pattern.motif === 'none') return out;
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
          if (motifInk(pattern.motif, u, frac(tv), tileRow)) hits++;
        }
      }
      if (hits >= 2) out[r * cols + c] = 1;
    }
  }
  return out;
}
