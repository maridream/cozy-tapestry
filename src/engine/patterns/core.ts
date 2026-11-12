/**
 * Building blocks for background patterns (pure).
 *
 * "Art pixels": stitch-exact patterns are drawn on a grid where every art pixel is a
 * whole number of stitches and rows, chosen to stay close to square (1 st × 1 row in sc,
 * 2 sts × 1 row in dc). That keeps pixel-art shapes clean instead of resampling them.
 */

export type Sprite = readonly (readonly boolean[])[];
/** Art-pixel pattern: true = pattern yarn. */
export type ArtFn = (ax: number, ay: number) => boolean;
/** Pattern in inches from the piece centre (y down). */
export type InchFn = (x: number, y: number) => boolean;

export const TAU = Math.PI * 2;
export const mod = (a: number, n: number) => ((a % n) + n) % n;
export const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));

/** Deterministic 0..1 hash of two integers and a seed. */
export function hash(a: number, b: number, s: number): number {
  let x = (Math.imul(a, 374761393) + Math.imul(b, 668265263) + Math.imul(s, 982451653)) | 0;
  x = Math.imul(x ^ (x >>> 13), 1274126177);
  x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
}

/** Seeded random numbers (mulberry32). */
export function rng(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const pick = <T>(R: () => number, a: readonly T[]): T => a[Math.floor(R() * a.length)];

/** Smooth 2D value noise, 0..1. */
export function noise2(seed: number): (x: number, y: number) => number {
  return (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const s = (t: number) => t * t * (3 - 2 * t), u = s(xf), v = s(yf);
    const a = hash(xi, yi, seed), b = hash(xi + 1, yi, seed), c = hash(xi, yi + 1, seed), d = hash(xi + 1, yi + 1, seed);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
}
export function fbm(n: (x: number, y: number) => number, x: number, y: number, octaves = 3): number {
  let a = 0, amp = 0.5, f = 1;
  for (let i = 0; i < octaves; i++) {
    a += amp * n(x * f, y * f);
    amp *= 0.5;
    f *= 2;
  }
  return a / (1 - Math.pow(0.5, octaves));
}

/** Jittered point of grid cell (i, j). */
export const jp = (i: number, j: number, G: number, s: number): [number, number] => [(i + 0.15 + 0.7 * hash(i, j, s)) * G, (j + 0.15 + 0.7 * hash(i, j, s + 1)) * G];
/** Visits the 3 × 3 jittered points around (x, y); stops when `cb` returns true. */
export function near(x: number, y: number, G: number, s: number, cb: (i: number, j: number, px: number, py: number) => boolean): boolean {
  const ci = Math.floor(x / G), cj = Math.floor(y / G);
  for (let dj = -1; dj <= 1; dj++) {
    for (let di = -1; di <= 1; di++) {
      const i = ci + di, j = cj + dj;
      const [px, py] = jp(i, j, G, s);
      if (cb(i, j, px, py)) return true;
    }
  }
  return false;
}

/** Sprite from strings ('#' = yarn). */
export const S = (rows: readonly string[]): Sprite => rows.map((r) => [...r].map((c) => c === '#'));
/** Sprite from a function. */
export const gen = (w: number, h: number, f: (x: number, y: number) => boolean): Sprite =>
  Array.from({ length: h }, (_, y) => Array.from({ length: w }, (_, x) => f(x, y)));

/** Stitches (sx) and rows (sy) per art pixel: whole numbers, close to square. */
export function artCell(cw: number, ch: number, scale: number): { sx: number; sy: number } {
  if (ch >= cw) return { sx: Math.max(1, Math.round(ch / cw)) * scale, sy: scale };
  return { sx: scale, sy: Math.max(1, Math.round(cw / ch)) * scale };
}

/** Organic prints are drawn in inches; on big stitches (dc, filet) they grow so spots stay thicker than a row. */
export const coarse = (cw: number, ch: number) => Math.max(1, Math.max(cw, ch) / 0.3);

export interface SpriteRepeat {
  fn: ArtFn;
  /** Repeat in art pixels [across, down]. */
  period: [number, number];
}

/** Repeats sprites in a brick layout (every other row shifted half a repeat), a grid, or tossed at random. */
export function sprites(variants: readonly Sprite[], { gx, gy, layout = 'brick' }: { gx: number; gy: number; layout?: 'brick' | 'grid' | 'tossed' }): SpriteRepeat {
  const sw = Math.max(...variants.map((v) => v[0].length));
  const sh = Math.max(...variants.map((v) => v.length));
  const W = sw + gx, H = sh + gy;
  const fn: ArtFn = (ax, ay) => {
    const ty = Math.floor(ay / H);
    const shift = layout !== 'grid' && mod(ty, 2) ? Math.floor(W / 2) : 0;
    const tx = Math.floor((ax - shift) / W);
    let lx = ax - shift - tx * W - Math.floor(gx / 2);
    let ly = ay - ty * H - Math.floor(gy / 2);
    let spr = variants[0];
    if (layout === 'tossed') {
      lx -= Math.round((hash(tx, ty, 1) - 0.5) * gx * 0.8);
      ly -= Math.round((hash(tx, ty, 2) - 0.5) * gy * 0.8);
      spr = variants[Math.floor(hash(tx, ty, 3) * variants.length)];
      if (hash(tx, ty, 4) < 0.5) lx = spr[0].length - 1 - lx;
    }
    return ly >= 0 && ly < spr.length && lx >= 0 && lx < spr[0].length && spr[ly][lx];
  };
  return { fn, period: [W, layout === 'grid' ? H : 2 * H] };
}

/**
 * The front-most of overlapping disks laid in a brick (like fish scales); calls `f`
 * with the distance and angle from that disk's centre. Art-pixel units.
 */
export function brickDisk(ax: number, ay: number, W: number, H: number, R: number, f: (d: number, a: number) => boolean): boolean {
  const px = ax + 0.5, py = ay + 0.5, top = Math.floor(py / H);
  for (let ty = top; ty >= top - 3; ty--) {
    const cy = ty * H, sh = mod(ty, 2) ? W / 2 : 0, tx = Math.round((px - sh - W / 2) / W);
    let best = 1e9, bx = 0;
    for (const d of [-1, 0, 1]) {
      const cx = (tx + d) * W + sh + W / 2, dd = Math.hypot(px - cx, py - cy);
      if (dd < best) {
        best = dd;
        bx = cx;
      }
    }
    if (best < R) return f(best, Math.atan2(py - cy, px - bx));
  }
  return false;
}

// ------------------------------------------------------------- sprites ---
// Drawn for stitches: every '#' is one art pixel.

export const HEART = S(['.##.##.', '#######', '#######', '.#####.', '..###..', '...#...']);
export const HEART_L = S(['.###.###.', '#########', '#########', '#########', '.#######.', '..#####..', '...###...', '....#....']);
export const STAR = S(['.....#.....', '.....#.....', '....###....', '###########', '.#########.', '..#######..', '...#####...', '..###.###..', '..##...##..', '.##.....##.']);
export const PAW = S(['...###.###...', '..####.####..', '..####.####..', '...##...##...', '###.......###', '###.......###', '.##..###..##.', '....#####....', '...#######...', '..#########..', '..#########..', '...###.###...']);
export const BONE = S(['.##.........##.', '####.......####', '###############', '.#############.', '###############', '####.......####', '.##.........##.']);
export const FISH = S(['....#####.....', '..########...#', '.##########.##', '##.###########', '##############', '.##########.##', '..########...#', '....#####.....']);
export const CLOVER = S(['....###....', '...#####...', '...#####...', '.##.###.##.', '####.#.####', '#####.#####', '.###.#.###.', '.....#.....', '......#....', '......#....']);
export const CARROT = S(['.#.#.#.', '..###..', '...#...', '.#####.', '.##.##.', '..####.', '.####..', '..###..', '..#.#..', '...##..', '...#...']);
export const HORSESHOE = S(['###.....###', '#.#.....#.#', '###.....###', '#.#.....#.#', '###.....###', '###.....###', '.###...###.', '..#######..', '...#####...']);
export const CATFACE = S(['#.......#', '##.....##', '###...###', '#########', '#.##.##.#', '#.##.##.#', '#########', '###...###', '.##.#.##.', '..#####..']);
export const MOUSE = S(['.##....', '####...', '.######', '.######', '..####.', '...#..#', '......#']);
export const YARN = gen(14, 12, (x, y) => {
  const d = Math.hypot(x - 5, y - 5);
  if (d < 5.4) return !(d < 4.3 && mod(x - y, 3) === 0);
  return (x === 10 && y === 9) || (x === 11 && y === 10) || (x === 12 && y === 10) || (x === 13 && y === 11);
});
export const FEATHER = gen(15, 15, (x, y) => {
  const dx = x - 6, dy = y - 6, u = (dx + dy) / Math.SQRT2, v = (dx - dy) / Math.SQRT2;
  if ((u / 7.2) ** 2 + (v / 2.4) ** 2 <= 1) {
    if (Math.abs(v) < 0.45 && u > -6) return false;
    if (v > 0 && Math.abs(u - (1.6 + v * 0.8)) < 0.6) return false;
    if (v < 0 && Math.abs(u - (-2.4 - v * 0.8)) < 0.6) return false;
    return true;
  }
  return Math.abs(v) < 0.5 && u > 0 && u < 10.2;
});
export const SNOW = gen(13, 13, (x, y) => {
  const dx = Math.abs(x - 6), dy = Math.abs(y - 6), m = Math.max(dx, dy);
  if (dx + dy === 0) return false;
  if (dx === 0 || dy === 0) return m <= 6;
  if (dx === dy) return m <= 4;
  return (m === 5 && Math.min(dx, dy) === 1) || (dx + dy === 3 && m === 2);
});
const PINE_TOP = ['#.#.#.#.#', '.#.#.#.#.', '..#####..', '...###...'];
export const PINEAPPLE = gen(9, 15, (x, y) => {
  if (y < 4) return PINE_TOP[y][x] === '#';
  const dx = (x - 4) / 4.6, dy = (y - 9.2) / 5.4, d = dx * dx + dy * dy;
  if (d > 1) return false;
  return d > 0.62 || mod(x + y, 2) === 0;
});
export const GREEK_KEY = S(['#######.', '......#.', '#####.#.', '#...#.#.', '#.###.#.', '#.....#.', '########']);

// --------------------------------------------------------------- rings ---

type RingType = 'center' | 'gap' | 'line' | 'dots' | 'scallop' | 'zigzag' | 'rays' | 'mesh' | 'drops' | 'petal' | 'petal-outline' | 'sprite';
interface Ring {
  type: RingType;
  r0: number;
  r1: number;
  n: number;
  sh: number;
  style?: 'disk' | 'flower' | 'ring';
  spr?: Sprite;
}

function nFor(radius: number, minLen: number, base: number, square: boolean): number {
  const per = square ? 8 * radius : TAU * radius;
  const n = Math.max(base, Math.floor(per / minLen));
  const q = square ? 8 : 4;
  return Math.max(q, Math.floor(n / q) * q);
}

export interface RingOptions {
  /** Square doily: rings follow squares instead of circles. */
  square?: boolean;
  /** Motifs to arrange in rings, pointing outward (the medallion frame). */
  subjects?: readonly Sprite[];
  /** First ring starts here (art px); 0 = a centre flower. */
  start?: number;
  /** Base symmetry; 0 = random. */
  k?: number;
  /** End with a scalloped edge. */
  edge?: boolean;
}

/**
 * A generated mandala / doily: concentric rings of petals, picots, spokes, mesh and so on,
 * each repeated with radial symmetry. Units are art pixels from the centre. Same seed, same design.
 */
export function makeRings(seed: number, Rmax: number, { square = false, subjects, start = 0, k: kIn = 0, edge = true }: RingOptions = {}): (X: number, Y: number) => boolean {
  const R = rng(seed);
  const k = kIn || pick(R, [6, 8, 10, 12]);
  const rings: Ring[] = [];
  let r = start;
  if (start === 0) {
    const cr = 2 + Math.floor(R() * 3);
    rings.push({ type: 'center', r0: 0, r1: cr, n: k, sh: 1, style: pick(R, ['disk', 'flower', 'ring'] as const) });
    r = cr;
  }
  let si = 0, last: RingType = 'gap';
  while (r < Rmax - 1) {
    const gw = R() < 0.25 ? 2 : 1;
    rings.push({ type: 'gap', r0: r, r1: r + gw, n: 1, sh: 1 });
    r += gw;
    const types: RingType[] = subjects ? ['sprite', 'sprite', 'dots', 'line', 'petal', 'scallop'] : ['petal', 'petal', 'petal-outline', 'dots', 'line', 'scallop', 'zigzag', 'rays', 'mesh', 'drops'];
    let type = pick(R, types);
    if (type === last && type !== 'sprite') type = 'line';
    const spr = subjects ? subjects[si % subjects.length] : undefined;
    const widths: Record<RingType, number> = {
      center: 0, gap: 1, line: 1, dots: 3, scallop: 3 + Math.floor(R() * 2), zigzag: 3, rays: 4 + Math.floor(R() * 4), mesh: 4,
      petal: 4 + Math.floor(R() * 4), 'petal-outline': 5 + Math.floor(R() * 4), drops: 6, sprite: spr ? spr.length + 1 : 0,
    };
    const w = widths[type];
    if (r + w > Rmax - (edge ? 3 : 0)) {
      if (edge && r + 3 <= Rmax) rings.push({ type: 'scallop', r0: r, r1: r + 3, n: nFor(r + 1.5, 4, k, square), sh: 1 });
      break;
    }
    const mid = r + w / 2;
    const n = type === 'sprite' && spr ? nFor(mid, spr[0].length + 3, 4, square) : type === 'drops' ? nFor(mid, 7, k, square) : nFor(mid, type === 'petal' || type === 'petal-outline' ? 9 : 6, k, square);
    rings.push({ type, r0: r, r1: r + w, n, sh: pick(R, [0.6, 1, 1.8]), spr });
    if (type === 'sprite') si++;
    last = type;
    r += w;
  }
  return (X, Y) => {
    const rr = square ? Math.max(Math.abs(X), Math.abs(Y)) : Math.hypot(X, Y);
    let ring: Ring | null = null;
    for (const g of rings) {
      if (rr >= g.r0 && rr < g.r1) {
        ring = g;
        break;
      }
    }
    if (!ring || ring.type === 'gap') return false;
    // a = distance along the ring from the nearest sector centre; half = half the sector length.
    let a: number, half: number;
    if (square) {
      const m = Math.max(rr, 0.001), q = Math.abs(X) >= Math.abs(Y) ? Y : X, len = (8 * m) / ring.n;
      a = mod(q + m, len) - len / 2;
      half = len / 2;
    } else {
      const al = TAU / ring.n, th = mod(Math.atan2(Y, X) + Math.PI / 2, al) - al / 2;
      a = th * rr;
      half = (al / 2) * rr;
    }
    const s = a / Math.max(half, 0.001), t = (rr - ring.r0) / (ring.r1 - ring.r0), mid = (ring.r0 + ring.r1) / 2;
    switch (ring.type) {
      case 'center':
        return ring.style === 'disk' ? true : ring.style === 'ring' ? rr > ring.r1 - 1.3 || rr < 0.8 : rr < ring.r1 * (0.45 + 0.55 * (1 - Math.abs(s)));
      case 'line':
        return true;
      case 'dots':
        return Math.hypot(rr - mid, a) < 1.35;
      case 'scallop':
        return t < Math.sqrt(Math.max(0, 1 - s * s));
      case 'zigzag':
        return Math.abs(t - Math.abs(s)) < 0.36;
      case 'rays':
        return Math.abs(a) < 0.75;
      case 'mesh':
        return (Math.floor(rr) + Math.floor(a + 100)) % 2 === 0;
      case 'drops': {
        const d = Math.hypot(a, (rr - mid) * 0.8);
        return d < 2.4 - (rr - ring.r0) * 0.25 || (t > 0.85 && Math.abs(a) < 0.6);
      }
      case 'petal': {
        const w = Math.pow(Math.sin(Math.PI * clamp(t)), ring.sh) * 0.95;
        return Math.abs(s) < w;
      }
      case 'petal-outline': {
        const w = Math.pow(Math.sin(Math.PI * clamp(t)), ring.sh) * 0.95;
        return Math.abs(s) < w && (Math.abs(s) > w - 1.2 / half || t < 0.12 || Math.abs(a) < 0.55);
      }
      case 'sprite': {
        const sp = ring.spr!;
        const row = Math.floor(ring.r1 - 0.5 - rr), col = Math.floor(a + sp[0].length / 2);
        return row >= 0 && row < sp.length && col >= 0 && col < sp[0].length && sp[row][col];
      }
      default:
        return false;
    }
  };
}
