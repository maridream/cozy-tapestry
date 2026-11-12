/**
 * The background pattern library (pure). Three kinds:
 * - art: stitch-exact repeats on the art-pixel grid (see core.ts);
 * - inch: organic prints measured in inches (animal coats, vines);
 * - radial: centred designs that fill the piece (none in the picker for now).
 * `seeded` patterns change with the Shuffle seed.
 */
import {
  BONE, brickDisk, CARROT, clamp, CLOVER, fbm, FEATHER, FISH, GREEK_KEY, hash, HEART_L, HORSESHOE, mod, near, noise2,
  PAW, pick, rng, SNOW, sprites, STAR, TAU, YARN, type ArtFn, type InchFn,
} from './core';

export type PatternDef =
  | { kind: 'art'; make: (seed: number) => ArtFn; period?: [number, number]; seeded?: boolean }
  | { kind: 'inch'; make: (seed: number) => InchFn; seeded?: boolean }
  | { kind: 'radial'; make: (seed: number, Rmax: number) => (X: number, Y: number) => boolean; seeded?: boolean };

const art = (fn: ArtFn, period?: [number, number]): PatternDef => ({ kind: 'art', make: () => fn, period });
const rep = ({ fn, period }: { fn: ArtFn; period: [number, number] }): PatternDef => ({ kind: 'art', make: () => fn, period });
const inch = (make: (seed: number) => InchFn): PatternDef => ({ kind: 'inch', make, seeded: true });

// -------------------------------------------------------------- shared ---

function scallops(ax: number, ay: number): boolean {
  const px = ax + 0.5, py = ay + 0.5, W = 10, H = 5, R = 5, top = Math.floor(py / H);
  for (let ty = top; ty >= top - 2; ty--) {
    const cy = ty * H, shift = mod(ty, 2) ? W / 2 : 0, tx = Math.round((px - shift - W / 2) / W);
    let best = Infinity;
    for (const d of [-1, 0, 1]) best = Math.min(best, Math.hypot(px - ((tx + d) * W + shift + W / 2), py - cy));
    if (best < R) return best > R - 1.4;
  }
  return false;
}

/** Hexagons with shared one-stitch walls (Voronoi walls of a staggered lattice). */
function honeycomb(x: number, y: number): boolean {
  const px = x + 0.5, py = y + 0.5, j0 = Math.floor(py / 10);
  let f1 = 1e9, f2 = 1e9;
  for (let j = j0 - 1; j <= j0 + 2; j++) {
    const off = mod(j, 2) ? 6 : 0, i0 = Math.floor((px - off) / 12);
    for (let i = i0 - 1; i <= i0 + 2; i++) {
      const d = Math.hypot(px - (i * 12 + off), py - j * 10);
      if (d < f1) {
        f2 = f1;
        f1 = d;
      } else if (d < f2) f2 = d;
    }
  }
  return f2 - f1 < 1.25;
}

/** Peerie Fair Isle band, also used for borders. */
export const FAIR_ROWS = ['#', '.', '..#...', '.#.#..', '#...#.', '.#.#..', '..#...', '.', '#', '.', '#.', '.'];

/**
 * Leopard and jaguar: rosettes on a loose brick grid (real coats are evenly packed), each a broken
 * ring of 3–5 (leopard) or 5–7 (jaguar) chunky spots around an open centre; small solid spots between.
 */
function leopard(seed: number, big = false): InchFn {
  const G = big ? 4.6 : 4.1, n = noise2(seed + 50);
  const centre = (i: number, j: number) => [(i + 0.5 + (mod(j, 2) ? 0.5 : 0) + 0.4 * (hash(i, j, seed) - 0.5)) * G, (j + 0.5 + 0.35 * (hash(i, j, seed + 1) - 0.5)) * G * 0.86];
  return (x, y) => {
    const cj = Math.floor(y / (G * 0.86)), ci = Math.floor(x / G);
    let near0 = 1e9;
    for (let j = cj - 1; j <= cj + 1; j++) {
      for (let i = ci - 1; i <= ci + 1; i++) {
        const [px, py] = centre(i, j);
        const h1 = hash(i, j, seed + 2), h2 = hash(i, j, seed + 3), h3 = hash(i, j, seed + 4);
        const dx = x - px, dy = y - py, d = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
        const R0 = big ? 1.45 + 0.35 * h1 : 1.1 + 0.3 * h1;
        const Rr = R0 * (1 + 0.15 * Math.sin(2 * a + h2 * TAU) + 0.08 * Math.sin(3 * a + h3 * TAU));
        near0 = Math.min(near0, d - Rr);
        const cnt = big ? 5 + Math.floor(h1 * 3) : 3 + Math.floor(h2 * 3);
        const pos = (a / TAU) * cnt + h3 * 7, k = Math.round(pos);
        const along = (pos - k) * ((TAU * Rr) / cnt);
        const id = i * 31 + j;
        const spotLen = ((TAU * Rr) / cnt) * (big ? 0.36 + 0.12 * hash(k, id, seed + 5) : 0.42 + 0.14 * hash(k, id, seed + 5));
        const spotW = (big ? 0.26 : 0.4) * (0.85 + 0.35 * hash(k, id, seed + 6));
        const rad = d - Rr - 0.12 * (hash(k, id, seed + 7) - 0.5);
        if ((along / spotLen) ** 2 + (rad / spotW) ** 2 < 1 + 0.25 * (n(x * 1.8, y * 1.8) - 0.5)) return true;
        if (big && Math.hypot(dx - 0.4 * (h3 - 0.5), dy - 0.3 * (h2 - 0.5)) < 0.36) return true;
      }
    }
    if (near0 < 0.55) return false;
    return near(x, y, 1.7, seed + 9, (i, j, qx, qy) => hash(i, j, seed + 11) < 0.5 && Math.hypot(x - qx, (y - qy) * 1.25) < (0.2 + 0.16 * hash(i, j, seed + 12)) * (0.8 + 0.4 * n(x * 2, y * 2)));
  };
}

/** Wandering vines with leaves on alternate sides of the stem. */
function vines(seed: number): InchFn {
  const V = 5.2;
  return (x, y) => {
    const col = Math.floor(x / V + 0.5), sx = col * V + 0.7 * Math.sin(((y + col * 2.3) * TAU) / 7);
    if (Math.abs(x - sx) < 0.17) return true;
    const L = 1.9, k0 = Math.floor(y / L);
    for (let k = k0 - 2; k <= k0 + 1; k++) {
      const by = k * L + col * 0.9, bx = col * V + 0.7 * Math.sin(((by + col * 2.3) * TAU) / 7);
      const side = mod(k + col, 2) ? 1 : -1, ang = -Math.PI / 2 + side * 0.95;
      const ux = Math.cos(ang), uy = Math.sin(ang), dx = x - bx, dy = y - by;
      const u = dx * ux + dy * uy, v = -dx * uy + dy * ux, len = 1.9 + 0.3 * hash(k, col, seed);
      if (u > 0.15 && u < len && Math.abs(v) < 0.62 * Math.pow(Math.sin((Math.PI * u) / len), 0.75)) return true;
    }
    return false;
  };
}

function fairIsleMaker(seed: number): ArtFn {
  const R = rng(seed);
  const bands: Record<string, string[]> = {
    line: ['#'], lice: ['#.', '.#'], dots: ['#...'],
    peerie: ['..#...', '.#.#..', '#...#.', '.#.#..', '..#...'],
    cross: ['.#...', '###..', '.#...'],
    zig: ['#...#...', '.#.#.#.#', '..#...#.'],
    oxo: ['.##..#...#..', '#..#..#.#...', '#..#...#....', '#..#..#.#...', '.##..#...#..'],
    tree: ['...#...', '..###..', '.#####.', '#######', '...#...'],
    star: SNOW.map((r) => r.map((v) => (v ? '#' : '.')).join('') + '...'),
    wave: ['##......', '..##..##', '....##..'],
    heart: ['.#.#....', '#####...', '.###....', '..#.....'],
  };
  const mains = ['peerie', 'cross', 'zig', 'oxo', 'tree', 'star', 'wave', 'heart'];
  const rows: string[] = [];
  for (let i = 0; i < 4; i++) {
    const main = bands[pick(R, mains)];
    const edge = pick(R, ['line', 'lice', 'dots']);
    const e = edge === 'line' ? [] : bands[edge];
    rows.push('#', '.', ...e, '.', ...main, '.', ...e, '.');
  }
  return (x, y) => {
    const r = rows[mod(y, rows.length)];
    return r[mod(x, r.length)] === '#';
  };
}

// Quilt blocks: 12 × 12 art px, set with 2 px sashing and cornerstones.
const rot = (x: number, y: number, k: number, n: number): [number, number] => ([[x, y], [n - 1 - y, x], [n - 1 - x, n - 1 - y], [y, n - 1 - x]] as [number, number][])[k];
const BLOCKS: Record<string, ArtFn> = {
  'ohio-star': (x, y) => {
    const ux = Math.floor(x / 4), uy = Math.floor(y / 4), lx = x % 4, ly = y % 4;
    if (ux === 1 && uy === 1) return true;
    if (ux !== 1 && uy !== 1) return false;
    if (uy === 0) return ly >= lx && ly >= 3 - lx;
    if (uy === 2) return ly <= lx && ly <= 3 - lx;
    if (ux === 0) return lx >= ly && lx >= 3 - ly;
    return lx <= ly && lx <= 3 - ly;
  },
  pinwheel: (x, y) => {
    const q = (x < 6 ? 0 : 1) + (y < 6 ? 0 : 2), k = [0, 1, 3, 2][q];
    const [a, b] = rot(x % 6, y % 6, k, 6);
    return a > b;
  },
  'flying-geese': (x, y) => Math.abs(x - 5.5) <= ((y % 4) + 0.5) * 1.5,
};
const quilt = (block: ArtFn): ArtFn => (ax, ay) => {
  const T = 14, lx = mod(ax, T), ly = mod(ay, T);
  if (lx >= 12 || ly >= 12) return lx >= 12 && ly >= 12;
  return block(lx, ly);
};

// ------------------------------------------------------------- library ---

export const PATTERNS: Record<string, PatternDef> = {
  // Redrawn favourites
  hearts: rep(sprites([HEART_L], { gx: 6, gy: 5 })),
  stars: rep(sprites([STAR], { gx: 6, gy: 5 })),
  paws: rep(sprites([PAW], { gx: 7, gy: 5 })),
  bones: rep(sprites([BONE], { gx: 6, gy: 6 })),
  fish: rep(sprites([FISH], { gx: 6, gy: 5 })),
  'yarn-balls': rep(sprites([YARN], { gx: 5, gy: 4 })),
  feathers: rep(sprites([FEATHER], { gx: 4, gy: 3, layout: 'tossed' })),
  leaves: inch(vines),
  clover: rep(sprites([CLOVER], { gx: 6, gy: 5 })),
  carrots: rep(sprites([CARROT], { gx: 6, gy: 5 })),
  horseshoes: rep(sprites([HORSESHOE], { gx: 6, gy: 5 })),
  scales: art(scallops, [10, 10]),

  // Classics
  houndstooth: art((x, y) => {
    const a = mod(x, 8) < 4, b = mod(y, 8) < 4;
    return a === b ? a : mod(x + y, 4) < 2 ? a : b;
  }, [8, 8]),
  gingham: art((x, y) => {
    const a = mod(x, 8) < 4, b = mod(y, 8) < 4;
    return a && b ? true : a || b ? mod(x + y, 2) === 0 : false;
  }, [8, 8]),
  chevron: art((x, y) => mod(y + Math.abs(mod(x, 16) - 8), 6) < 3, [16, 6]),
  herringbone: art((x, y) => mod(y + (mod(Math.floor(x / 4), 2) ? x : -x), 4) < 2, [8, 4]),
  diamonds: art((x, y) => {
    const d = Math.abs(mod(x, 12) - 6) + Math.abs(mod(y, 12) - 6);
    return d === 6 || d === 5 || d <= 1 || d >= 11;
  }, [12, 12]),
  windowpane: art((x, y) => mod(x, 10) === 0 || mod(y, 10) === 0, [10, 10]),
  'fair-isle': art((x, y) => {
    const r = FAIR_ROWS[mod(y, FAIR_ROWS.length)];
    return r[mod(x, r.length)] === '#';
  }, [6, FAIR_ROWS.length]),
  snowflakes: rep(sprites([SNOW], { gx: 6, gy: 5 })),

  // Animal prints
  'leopard-spots': inch((s) => leopard(s)),
  jaguar: inch((s) => leopard(s, true)),
  cheetah: inch((s) => {
    const n = noise2(s + 3);
    return (x, y) => near(x, y, 1.3, s, (i, j, px, py) => hash(i, j, s + 5) < 0.92 && Math.hypot(x - px, y - py) < (0.24 + 0.14 * hash(i, j, s + 6)) * (0.75 + 0.5 * n(x * 2.5, y * 2.5)));
  }),
  giraffe: inch((s) => {
    const n = noise2(s + 7);
    return (x, y) => {
      const wx = x + 0.5 * (n(x * 0.5, y * 0.5) - 0.5), wy = y + 0.5 * (n(x * 0.5 + 9, y * 0.5) - 0.5);
      let f1 = 1e9, f2 = 1e9;
      near(wx, wy, 3.3, s, (_i, _j, px, py) => {
        const d = Math.hypot(wx - px, wy - py);
        if (d < f1) {
          f2 = f1;
          f1 = d;
        } else if (d < f2) f2 = d;
        return false;
      });
      return f2 - f1 > 0.55;
    };
  }),
  zebra: inch((s) => {
    const n = noise2(s);
    return (x, y) => mod(x / 1.8 + 1.2 * fbm(n, x * 0.11, y * 0.11) + 0.15 * Math.sin(y * 0.4), 1) < 0.44 + 0.1 * (n(x * 0.3 + 4, y * 0.3) - 0.5);
  }),
  'tiger-stripes': inch((s) => {
    const n = noise2(s + 1), m = noise2(s + 2);
    return (x, y) => {
      const ph = y / 2.6 + 0.7 * fbm(n, x * 0.09, y * 0.09);
      return Math.abs(mod(ph, 1) - 0.5) * 2.6 < 0.62 * clamp(m(x * 0.22, y * 0.5 + ph * 3) * 2 - 0.55);
    };
  }),
  cow: inch((s) => {
    const n = noise2(s + 4);
    return (x, y) => fbm(n, x * 0.2, y * 0.2, 4) > 0.62;
  }),
  speckles: inch((s) => {
    const n = noise2(s + 8);
    return (x, y) => near(x, y, 2.1, s, (i, j, px, py) => hash(i, j, s + 5) < 0.8 && Math.hypot(x - px, y - py) < (0.18 + 0.38 * Math.pow(hash(i, j, s + 6), 2)) * (0.8 + 0.4 * n(x * 2, y * 2)));
  }),

  // Quilt blocks
  'q-ohio-star': art(quilt(BLOCKS['ohio-star']), [14, 14]),
  'q-pinwheel': art(quilt(BLOCKS.pinwheel), [14, 14]),
  'q-flying-geese': art(quilt(BLOCKS['flying-geese']), [14, 14]),

  // Folk and geometric
  'fair-isle-gen': { kind: 'art', make: fairIsleMaker, seeded: true },
  'greek-key': art((x, y) => {
    const r = mod(y, 11);
    return r < 7 && GREEK_KEY[r][mod(x, 8)];
  }, [8, 11]),
  seigaiha: art((x, y) => brickDisk(x, y, 14, 4, 7, (d) => mod(7 - d, 2) < 1), [14, 8]),
  shippo: art((x, y) => {
    const P = 10, R = P / Math.SQRT2;
    for (const [ox, oy] of [[0, 0], [P, 0], [0, P], [P, P]]) {
      if (Math.abs(Math.hypot(mod(x, P) + 0.5 - ox, mod(y, P) + 0.5 - oy) - R) < 0.6) return true;
    }
    return false;
  }, [10, 10]),
  ogee: art((x, y) => mod(x - 3.5 * Math.sin((TAU * y) / 16), 16) < 1.4 || mod(x + 3.5 * Math.sin((TAU * y) / 16) + 8, 16) < 1.4, [16, 16]),
  fans: art((x, y) => brickDisk(x, y, 14, 7, 7, (d, a) => d > 5.8 || d < 1.6 || (d > 2.5 && mod((a * 180) / Math.PI, 22.5) < 7)), [14, 14]),
  honeycomb: art(honeycomb, [12, 20]),
  truchet: {
    kind: 'art',
    seeded: true,
    make: (s) => (x, y) => {
      const tx = Math.floor(x / 8), ty = Math.floor(y / 8), ly = mod(y, 8) + 0.5;
      let lx = mod(x, 8) + 0.5;
      if (hash(tx, ty, s) < 0.5) lx = 8 - lx;
      return Math.abs(Math.hypot(lx, ly) - 4) < 0.85 || Math.abs(Math.hypot(lx - 8, ly - 8) - 4) < 0.85;
    },
  },
  basketweave: art((x, y) => (mod(Math.floor(x / 4) + Math.floor(y / 4), 2) ? mod(y, 2) === 0 : mod(x, 2) === 0), [8, 8]),
  argyle: art((x, y) => {
    const u = x + y, v = x - y;
    const fill = mod(Math.floor(u / 10) + Math.floor(v / 10), 2) === 0, line = mod(u, 10) === 0 || mod(v, 10) === 0;
    return fill !== line;
  }, [20, 20]),
  tartan: art((x, y) => {
    const band = (t: number) => [1, 1, 1, 1, 1, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0][mod(t, 16)] === 1;
    const a = band(x), b = band(y);
    return a && b ? true : a || b ? mod(x + y, 4) < 2 : false;
  }, [16, 16]),
  rings: art((x, y) => brickDisk(x, y, 9, 9, 6, (d) => d > 4.6) || brickDisk(x + 4.5, y + 4.5, 9, 9, 6, (d) => d > 4.6), [9, 18]),
};
