import type { CutoutImage, Framing, GridSpec, PatternGrid, PatternSettings, Rgb, TextBlock, YarnColor } from '../types';
import { hexToRgb, labDistanceSq, nameColor, rgbToHex, rgbToLab, uniqueNames, type Lab } from './color';
import { backgroundInk } from './motifs';

/**
 * Photo + mask -> stitch chart. Pure functions, no DOM access (ImageData is
 * only used as a plain { width, height, data } record so tests can fake it).
 */

/** A pixel counts as pet above this mask value. */
const PET_THRESHOLD = 127;
/** A cell is pet when at least this share of it is pet. */
const CELL_PET_COVERAGE = 0.5;
/** Default fit leaves an 8% margin on every side. */
const FIT = 0.84;
const KMEANS_MAX_ITER = 25;
const KMEANS_SAMPLE = 20000;

// ------------------------------------------------------------- framing ---

export interface SubjectBounds {
  x0: number;
  y0: number;
  /** Exclusive. */
  x1: number;
  y1: number;
}

/** Bounding box of mask > 127, or the whole image when the mask is empty. */
export function subjectBounds(mask: Uint8ClampedArray, width: number, height: number): SubjectBounds {
  let x0 = width;
  let y0 = height;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < height; y++) {
    const row = y * width;
    for (let x = 0; x < width; x++) {
      if (mask[row + x] > PET_THRESHOLD) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        y1 = y;
      }
    }
  }
  if (x1 < 0) return { x0: 0, y0: 0, x1: width, y1: height };
  return { x0, y0, x1: x1 + 1, y1: y1 + 1 };
}

/**
 * Where the photo sits in the piece. A photo pixel (px, py) lands at piece inches
 * u = centreU + (px − pivotX) × scale, v = centreV + (py − pivotY) × scale.
 */
export interface FramingGeometry {
  /** Inches per photo pixel. */
  scale: number;
  pivotX: number;
  pivotY: number;
  centreU: number;
  centreV: number;
}

export function framingGeometry(bounds: SubjectBounds, piece: { width: number; height: number }, framing: Framing): FramingGeometry {
  const bw = Math.max(1, bounds.x1 - bounds.x0);
  const bh = Math.max(1, bounds.y1 - bounds.y0);
  const fit = Math.min((FIT * piece.width) / bw, (FIT * piece.height) / bh);
  return {
    scale: fit * framing.zoom,
    pivotX: (bounds.x0 + bounds.x1) / 2,
    pivotY: (bounds.y0 + bounds.y1) / 2,
    centreU: piece.width / 2 + framing.offsetX * piece.width,
    centreV: piece.height / 2 + framing.offsetY * piece.height,
  };
}

// ---------------------------------------------------------- resampling ---

export interface CellSamples {
  cols: number;
  rows: number;
  /** Average pet color per cell, RGB triplets (only meaningful where coverage > 0). */
  rgb: Float32Array;
  /** Pet share of each cell, 0..1. */
  coverage: Float32Array;
}

/** Per cell: the mask-weighted average color of pet pixels, and how much of the cell is pet. */
export function resampleToCells(cutout: CutoutImage, gridSpec: GridSpec, framing: Framing, bounds?: SubjectBounds): CellSamples {
  const { image, mask } = cutout;
  const { width: pw, height: ph, data } = image;
  const { cols, rows, cellWidthIn, cellHeightIn, finished } = gridSpec;
  const g = framingGeometry(bounds ?? subjectBounds(mask, pw, ph), finished, framing);
  const rgb = new Float32Array(cols * rows * 3);
  const coverage = new Float32Array(cols * rows);
  // piece inch -> photo pixel
  const toPx = (u: number) => g.pivotX + (u - g.centreU) / g.scale;
  const toPy = (v: number) => g.pivotY + (v - g.centreV) / g.scale;

  for (let r = 0; r < rows; r++) {
    const fy0 = toPy(r * cellHeightIn);
    const fy1 = toPy((r + 1) * cellHeightIn);
    for (let c = 0; c < cols; c++) {
      const i = r * cols + c;
      const fx0 = toPx(c * cellWidthIn);
      const fx1 = toPx((c + 1) * cellWidthIn);
      let x0 = Math.round(fx0);
      let x1 = Math.round(fx1);
      let y0 = Math.round(fy0);
      let y1 = Math.round(fy1);
      if (x1 <= x0 || y1 <= y0) {
        // Smaller than a pixel: nearest pixel.
        x0 = Math.floor((fx0 + fx1) / 2);
        y0 = Math.floor((fy0 + fy1) / 2);
        x1 = x0 + 1;
        y1 = y0 + 1;
      }
      const total = (x1 - x0) * (y1 - y0);
      const cx0 = Math.max(0, x0);
      const cx1 = Math.min(pw, x1);
      const cy0 = Math.max(0, y0);
      const cy1 = Math.min(ph, y1);
      let wsum = 0;
      let rs = 0;
      let gs = 0;
      let bs = 0;
      for (let y = cy0; y < cy1; y++) {
        const row = y * pw;
        for (let x = cx0; x < cx1; x++) {
          const w = mask[row + x];
          if (w === 0) continue;
          const o = (row + x) * 4;
          wsum += w;
          rs += data[o] * w;
          gs += data[o + 1] * w;
          bs += data[o + 2] * w;
        }
      }
      if (wsum > 0) {
        coverage[i] = wsum / (255 * total);
        rgb[i * 3] = rs / wsum;
        rgb[i * 3 + 1] = gs / wsum;
        rgb[i * 3 + 2] = bs / wsum;
      }
    }
  }
  return { cols, rows, rgb, coverage };
}

// ------------------------------------------------------------- k-means ---

/** Small deterministic PRNG. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function nearest(p: Lab, centres: Lab[]): number {
  let best = 0;
  let bestD = Infinity;
  for (let k = 0; k < centres.length; k++) {
    const d = labDistanceSq(p, centres[k]);
    if (d < bestD) {
      bestD = d;
      best = k;
    }
  }
  return best;
}

/** k-means++ in Lab with a fixed seed. Returns cluster centres (may be fewer than k). */
export function kmeansLab(points: Lab[], k: number, seed = 1): Lab[] {
  if (points.length === 0 || k <= 0) return [];
  // Fewer distinct colors than k -> fewer clusters.
  const distinct = new Map<string, Lab>();
  for (const p of points) {
    distinct.set(`${p.l.toFixed(2)},${p.a.toFixed(2)},${p.b.toFixed(2)}`, p);
    if (distinct.size > k) break;
  }
  if (distinct.size <= k) return [...distinct.values()];

  let sample = points;
  if (points.length > KMEANS_SAMPLE) {
    const step = points.length / KMEANS_SAMPLE;
    sample = Array.from({ length: KMEANS_SAMPLE }, (_, i) => points[Math.floor(i * step)]);
  }
  const rand = mulberry32(seed);
  const centres: Lab[] = [sample[Math.floor(rand() * sample.length)]];
  const d2 = new Float64Array(sample.length).fill(Infinity);
  while (centres.length < k) {
    const lastC = centres[centres.length - 1];
    let sum = 0;
    for (let i = 0; i < sample.length; i++) {
      d2[i] = Math.min(d2[i], labDistanceSq(sample[i], lastC));
      sum += d2[i];
    }
    if (sum === 0) break;
    let target = rand() * sum;
    let pick = sample.length - 1;
    for (let i = 0; i < sample.length; i++) {
      target -= d2[i];
      if (target <= 0) {
        pick = i;
        break;
      }
    }
    centres.push(sample[pick]);
  }

  const assign = new Int32Array(sample.length).fill(-1);
  for (let iter = 0; iter < KMEANS_MAX_ITER; iter++) {
    let changed = false;
    for (let i = 0; i < sample.length; i++) {
      const n = nearest(sample[i], centres);
      if (n !== assign[i]) {
        assign[i] = n;
        changed = true;
      }
    }
    if (!changed) break;
    const sums = centres.map(() => ({ l: 0, a: 0, b: 0, n: 0 }));
    for (let i = 0; i < sample.length; i++) {
      const s = sums[assign[i]];
      s.l += sample[i].l;
      s.a += sample[i].a;
      s.b += sample[i].b;
      s.n++;
    }
    sums.forEach((s, k2) => {
      if (s.n) centres[k2] = { l: s.l / s.n, a: s.a / s.n, b: s.b / s.n };
    });
  }
  return centres;
}

// ---------------------------------------------------------- sc / dc grid ---

function makeColor(id: number, rgb: Rgb, role: YarnColor['role']): YarnColor {
  const hex = rgbToHex(rgb);
  return { id: `c${id}`, name: nameColor(rgb), hex, role, userEdited: false, autoHex: hex };
}

/**
 * Full pipeline for sc and dc: place the pet, average each cell, split pet vs
 * background, reduce pet cells to (colorCount − 1) colors, re-attach hand-edited
 * colors, smooth, drop unused colors and make names unique.
 */
export function buildPatternGrid(
  cutout: CutoutImage,
  gridSpec: GridSpec,
  settings: PatternSettings,
  lockedPalette: YarnColor[] = [],
  textBlocks: (TextBlock | null)[] = [],
): PatternGrid {
  const s = resampleToCells(cutout, gridSpec, settings.framing);
  const { cols, rows } = gridSpec;
  const n = cols * rows;

  const petIdx: number[] = [];
  const labs: Lab[] = [];
  for (let i = 0; i < n; i++) {
    if (s.coverage[i] >= CELL_PET_COVERAGE) {
      petIdx.push(i);
      labs.push(rgbToLab({ r: s.rgb[i * 3], g: s.rgb[i * 3 + 1], b: s.rgb[i * 3 + 2] }));
    }
  }

  const centres = kmeansLab(labs, Math.max(1, settings.colorCount - 1));
  // Assign every pet cell and average its RGB per cluster (the "picked" color).
  const cluster = new Int32Array(petIdx.length);
  const acc = centres.map(() => ({ r: 0, g: 0, b: 0, n: 0 }));
  for (let j = 0; j < petIdx.length; j++) {
    const k = nearest(labs[j], centres);
    cluster[j] = k;
    const i = petIdx[j];
    acc[k].r += s.rgb[i * 3];
    acc[k].g += s.rgb[i * 3 + 1];
    acc[k].b += s.rgb[i * 3 + 2];
    acc[k].n++;
  }
  // Order pet colors by size, largest first; palette index = order + 1.
  const order = acc.map((a, k) => ({ k, n: a.n })).filter((o) => o.n > 0).sort((p, q) => q.n - p.n || p.k - q.k);
  const indexOf = new Int32Array(centres.length).fill(0);
  order.forEach((o, pos) => (indexOf[o.k] = pos + 1));

  const bgLocked = lockedPalette.find((c) => c.role === 'background' && c.userEdited);
  const bg = makeColor(0, hexToRgb(settings.backgroundHex), 'background');
  if (bgLocked) {
    bg.name = bgLocked.name;
    bg.userEdited = true;
  }
  const palette: YarnColor[] = [bg];
  order.forEach((o, pos) => {
    const a = acc[o.k];
    palette.push(makeColor(pos + 1, { r: a.r / a.n, g: a.g / a.n, b: a.b / a.n }, 'subject'));
  });

  // Re-attach hand edits to the nearest unclaimed new color.
  const claimed = new Set<number>();
  for (const locked of lockedPalette) {
    if (locked.role !== 'subject' || !locked.userEdited) continue;
    const target = rgbToLab(hexToRgb(locked.autoHex));
    let best = -1;
    let bestD = Infinity;
    for (let p = 1; p < palette.length; p++) {
      if (claimed.has(p)) continue;
      const d = labDistanceSq(target, rgbToLab(hexToRgb(palette[p].autoHex)));
      if (d < bestD) {
        bestD = d;
        best = p;
      }
    }
    if (best < 0) continue;
    claimed.add(best);
    palette[best] = { ...palette[best], hex: locked.hex, name: locked.name, userEdited: true };
  }

  const cells = new Uint8Array(n);
  for (let j = 0; j < petIdx.length; j++) cells[petIdx[j]] = indexOf[cluster[j]];

  // Smooth the pet only, so thin text strokes and small motifs survive.
  const smoothed = smoothGrid({ cols, rows, cells, palette }, settings.smoothing);
  return finishPalette(decorate(smoothed, gridSpec, settings, textBlocks));
}

// ---------------------------------------------------------- decoration ---

/** Which text layer covers each cell (-1 = none). Later layers win. */
export function placeTextBlocks(gridSpec: GridSpec, settings: PatternSettings, blocks: (TextBlock | null)[]): Int16Array {
  const { cols, rows } = gridSpec;
  const out = new Int16Array(cols * rows).fill(-1);
  settings.texts.forEach((layer, t) => {
    const b = blocks[t];
    if (!b || !b.cols) return;
    const c0 = Math.round(layer.x * cols - b.cols / 2);
    const r0 = Math.round(layer.y * rows - b.rows / 2);
    for (let y = 0; y < b.rows; y++) {
      const r = r0 + y;
      if (r < 0 || r >= rows) continue;
      for (let x = 0; x < b.cols; x++) {
        const c = c0 + x;
        if (c >= 0 && c < cols && b.cells[y * b.cols + x]) out[r * cols + c] = t;
      }
    }
  });
  return out;
}

/**
 * Adds the background motif (under the pet) and text (over everything) to a
 * smoothed pet grid where 0 = background. Each distinct decoration color becomes
 * a palette entry with role 'decoration', unless it matches an existing yarn exactly.
 */
function decorate(grid: PatternGrid, gridSpec: GridSpec, settings: PatternSettings, blocks: (TextBlock | null)[]): PatternGrid {
  const hasMotif = settings.background.motif !== 'none';
  if (!hasMotif && settings.texts.length === 0) return grid;
  const palette = [...grid.palette];
  const cells = grid.cells.slice();
  const indexFor = (hex: string) => {
    const h = hex.toLowerCase();
    const existing = palette.findIndex((c) => c.hex.toLowerCase() === h);
    if (existing >= 0) return existing;
    palette.push(makeColor(palette.length, hexToRgb(h), 'decoration'));
    return palette.length - 1;
  };
  if (hasMotif) {
    const ink = backgroundInk(settings.background, gridSpec);
    const k = indexFor(settings.background.colorHex);
    for (let i = 0; i < cells.length; i++) if (cells[i] === 0 && ink[i]) cells[i] = k;
  }
  const text = placeTextBlocks(gridSpec, settings, blocks);
  const textIndex = settings.texts.map((t) => indexFor(t.colorHex));
  for (let i = 0; i < cells.length; i++) if (text[i] >= 0) cells[i] = textIndex[text[i]];
  return { cols: grid.cols, rows: grid.rows, cells, palette };
}

/**
 * Filet is one yarn, so decorations are filled squares too. A one-square open gap is
 * kept around the pet and the text where they meet the motif, and text over the pet
 * is cut out as open squares, so everything still reads.
 */
function decorateFilet(grid: PatternGrid, gridSpec: GridSpec, settings: PatternSettings, blocks: (TextBlock | null)[]): PatternGrid {
  const hasMotif = settings.background.motif !== 'none';
  if (!hasMotif && settings.texts.length === 0) return grid;
  const { cols, rows } = gridSpec;
  const pet = grid.cells;
  const text = placeTextBlocks(gridSpec, settings, blocks);
  const ink = hasMotif ? backgroundInk(settings.background, gridSpec) : new Uint8Array(pet.length);
  const solid = (i: number) => pet[i] === 1 || text[i] >= 0;
  const cells = new Uint8Array(pet.length);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const i = r * cols + c;
      if (text[i] >= 0) {
        cells[i] = pet[i] === 1 ? 0 : 1;
      } else if (pet[i] === 1) {
        cells[i] = 1;
      } else if (ink[i]) {
        let nearSolid = false;
        for (let dy = -1; dy <= 1 && !nearSolid; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const y = r + dy;
            const x = c + dx;
            if (y >= 0 && y < rows && x >= 0 && x < cols && solid(y * cols + x)) {
              nearSolid = true;
              break;
            }
          }
        }
        cells[i] = nearSolid ? 0 : 1;
      }
    }
  }
  return { cols, rows, cells, palette: grid.palette };
}

/** Drops unused colors (never the background), re-indexes cells and makes names unique. */
function finishPalette(grid: PatternGrid): PatternGrid {
  const counts = new Int32Array(grid.palette.length);
  for (let i = 0; i < grid.cells.length; i++) counts[grid.cells[i]]++;
  const remap = new Int32Array(grid.palette.length).fill(-1);
  const palette: YarnColor[] = [];
  grid.palette.forEach((c, k) => {
    if (k === 0 || counts[k] > 0) {
      remap[k] = palette.length;
      palette.push({ ...c, id: `c${palette.length}` });
    }
  });
  const cells = new Uint8Array(grid.cells.length);
  for (let i = 0; i < cells.length; i++) cells[i] = remap[grid.cells[i]];

  // Unique names; hand-picked names are left alone where possible.
  const names = uniqueNames(
    palette.map((c) => c.name),
    palette.map((c) => rgbToLab(hexToRgb(c.hex)).l),
  );
  palette.forEach((c, k) => {
    if (!c.userEdited || palette.filter((o) => o.name === c.name).length > 1) c.name = names[k];
  });
  return { cols: grid.cols, rows: grid.rows, cells, palette };
}

// ---------------------------------------------------------- filet grid ---

/** Filet variant: 2-entry palette, 0 = open mesh, 1 = filled block. */
export function buildFiletGrid(
  cutout: CutoutImage,
  gridSpec: GridSpec,
  settings: PatternSettings,
  lockedPalette: YarnColor[] = [],
  textBlocks: (TextBlock | null)[] = [],
): PatternGrid {
  const s = resampleToCells(cutout, gridSpec, settings.framing);
  const { cols, rows } = gridSpec;
  const n = cols * rows;
  const cells = new Uint8Array(n);
  const filled: number[] = [];
  let r = 0;
  let g = 0;
  let b = 0;
  for (let i = 0; i < n; i++) {
    if (s.coverage[i] >= CELL_PET_COVERAGE) {
      cells[i] = 1;
      filled.push(i);
      r += s.rgb[i * 3];
      g += s.rgb[i * 3 + 1];
      b += s.rgb[i * 3 + 2];
    }
  }

  if (settings.filetShowDetails && filled.length > 0) {
    const L = filled.map((i) => rgbToLab({ r: s.rgb[i * 3], g: s.rgb[i * 3 + 1], b: s.rgb[i * 3 + 2] }).l);
    const sorted = [...L].sort((p, q) => p - q);
    const median = sorted[Math.floor(sorted.length / 2)];
    const mean = L.reduce((p, q) => p + q, 0) / L.length;
    const sigma = Math.sqrt(L.reduce((p, q) => p + (q - mean) ** 2, 0) / L.length);
    let t = Math.max(18, 1.5 * sigma);
    const limit = 0.25 * filled.length;
    const countOver = (th: number) => L.reduce((c, l) => c + (Math.abs(l - median) > th ? 1 : 0), 0);
    while (countOver(t) > limit) t *= 1.1;
    filled.forEach((i, j) => {
      if (Math.abs(L[j] - median) > t) cells[i] = 0;
    });
  }

  const avg: Rgb = filled.length ? { r: r / filled.length, g: g / filled.length, b: b / filled.length } : hexToRgb('#8a6a4a');
  const open: YarnColor = { ...makeColor(0, hexToRgb(settings.backgroundHex), 'background'), name: 'open mesh' };
  let yarn = makeColor(1, avg, 'subject');
  const locked = lockedPalette.find((c) => c.role === 'subject' && c.userEdited);
  if (locked) yarn = { ...yarn, hex: locked.hex, name: locked.name, userEdited: true };

  return decorateFilet(smoothGrid({ cols, rows, cells, palette: [open, yarn] }, settings.smoothing), gridSpec, settings, textBlocks);
}

// ---------------------------------------------------------- smoothing ---

/**
 * Removes small specks so the chart is pleasant to crochet. Returns a new grid.
 * Level 1: 4-connected regions of 1–2 cells take the most common bordering color.
 * Level 2: regions of 1–5 cells, then one 3×3 majority pass (a cell changes only if
 * at least 5 of its 8 neighbours share one other color).
 */
export function smoothGrid(grid: PatternGrid, level: 0 | 1 | 2): PatternGrid {
  const { cols, rows, palette } = grid;
  const cells = grid.cells.slice();
  if (level === 0) return { cols, rows, cells, palette };

  const maxRegion = level === 1 ? 2 : 5;
  const label = new Int32Array(cells.length).fill(-1);
  const stack: number[] = [];
  const region: number[] = [];
  const votes = new Int32Array(palette.length);
  let next = 0;

  for (let start = 0; start < cells.length; start++) {
    if (label[start] !== -1) continue;
    const color = cells[start];
    region.length = 0;
    stack.push(start);
    label[start] = next;
    while (stack.length) {
      const i = stack.pop()!;
      region.push(i);
      const r = (i / cols) | 0;
      const c = i - r * cols;
      const nb = [c > 0 ? i - 1 : -1, c < cols - 1 ? i + 1 : -1, r > 0 ? i - cols : -1, r < rows - 1 ? i + cols : -1];
      for (const j of nb) {
        if (j >= 0 && label[j] === -1 && cells[j] === color) {
          label[j] = next;
          stack.push(j);
        }
      }
    }
    next++;
    if (region.length > maxRegion) continue;

    votes.fill(0);
    for (const i of region) {
      const r = (i / cols) | 0;
      const c = i - r * cols;
      const nb = [c > 0 ? i - 1 : -1, c < cols - 1 ? i + 1 : -1, r > 0 ? i - cols : -1, r < rows - 1 ? i + cols : -1];
      for (const j of nb) if (j >= 0 && cells[j] !== color) votes[cells[j]]++;
    }
    let best = -1;
    let bestV = 0;
    for (let k = 0; k < votes.length; k++) {
      if (votes[k] > bestV) {
        bestV = votes[k];
        best = k;
      }
    }
    if (best >= 0) for (const i of region) cells[i] = best;
  }

  if (level === 2) {
    const before = cells.slice();
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        votes.fill(0);
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (!dx && !dy) continue;
            const y = r + dy;
            const x = c + dx;
            if (y >= 0 && y < rows && x >= 0 && x < cols) votes[before[y * cols + x]]++;
          }
        }
        const own = before[r * cols + c];
        for (let k = 0; k < votes.length; k++) {
          if (k !== own && votes[k] >= 5) {
            cells[r * cols + c] = k;
            break;
          }
        }
      }
    }
  }
  return { cols, rows, cells, palette };
}
