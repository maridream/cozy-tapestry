import { describe, expect, it } from 'vitest';
import { buildFiletGrid, buildPatternGrid, placeTextBlocks } from '../src/engine/buildGrid';
import { backgroundInk, MOTIFS } from '../src/engine/motifs';
import { pixelTextBlock } from '../src/engine/pixelFont';
import { computeGridSpec, getGauge } from '../src/engine/sizing';
import type { BackgroundPattern, TextLayer } from '../src/types';
import { makeCutout, settings } from './helpers';

const sc = computeGridSpec({ width: 24, height: 24 }, getGauge('blanket-sc', 'worsted')); // 96 × 108
const dc = computeGridSpec({ width: 24, height: 36 }, getGauge('decor-dc', 'worsted')); // 84 × 68
const pattern = (over: Partial<BackgroundPattern> = {}): BackgroundPattern => ({ motif: 'dots', colorHex: '#3366aa', sizeIn: 4, direction: 'across', ...over });
const share = (cells: Uint8Array) => cells.reduce((s, v) => s + v, 0) / cells.length;

describe('background motifs', () => {
  it('every motif draws something, and Plain draws nothing', () => {
    for (const m of MOTIFS) {
      const ink = share(backgroundInk(pattern({ motif: m.id }), sc));
      if (m.id === 'none') expect(ink).toBe(0);
      else {
        expect(ink, m.id).toBeGreaterThan(0.02);
        expect(ink, m.id).toBeLessThan(0.8);
      }
    }
  });

  it('direction turns stripes: across = rows, up and down = columns', () => {
    const across = backgroundInk(pattern({ motif: 'stripes', direction: 'across' }), sc);
    const down = backgroundInk(pattern({ motif: 'stripes', direction: 'down' }), sc);
    const rowSame = (cells: Uint8Array) => {
      let same = 0;
      for (let r = 0; r < sc.rows; r++) {
        const row = cells.slice(r * sc.cols, (r + 1) * sc.cols);
        if (row.every((v) => v === row[0])) same++;
      }
      return same / sc.rows;
    };
    expect(rowSame(across)).toBe(1);
    expect(rowSame(down)).toBeLessThan(0.2);
    const diag = backgroundInk(pattern({ motif: 'stripes', direction: 'diagonal' }), sc);
    const rev = backgroundInk(pattern({ motif: 'stripes', direction: 'diagonal-reverse' }), sc);
    expect(Array.from(diag)).not.toEqual(Array.from(rev));
  });

  it('size changes the repeat', () => {
    const small = backgroundInk(pattern({ sizeIn: 2 }), sc);
    const big = backgroundInk(pattern({ sizeIn: 8 }), sc);
    const edges = (c: Uint8Array) => c.reduce((n, v, i) => n + (i % sc.cols && v !== c[i - 1] ? 1 : 0), 0);
    expect(edges(small)).toBeGreaterThan(edges(big) * 2);
  });

  it('keeps shapes in inches on tall dc cells (dots stay round-ish)', () => {
    const cells = backgroundInk(pattern({ motif: 'dots', sizeIn: 8 }), dc);
    // the centre dot: count its width in inches vs height in inches
    const r0 = Math.floor(dc.rows / 2);
    const c0 = Math.floor(dc.cols / 2);
    let w = 0;
    for (let c = 0; c < dc.cols; c++) if (cells[r0 * dc.cols + c] && Math.abs(c - c0) < 20) w++;
    let h = 0;
    for (let r = 0; r < dc.rows; r++) if (cells[r * dc.cols + c0] && Math.abs(r - r0) < 12) h++;
    expect((w * dc.cellWidthIn) / (h * dc.cellHeightIn)).toBeGreaterThan(0.6);
    expect((w * dc.cellWidthIn) / (h * dc.cellHeightIn)).toBeLessThan(1.6);
  });
});

describe('pixel font', () => {
  it('draws 7 font pixels tall, scaled to whole stitches', () => {
    const b = pixelTextBlock('HI', 7 / 4.5, sc); // one font pixel ≈ one sc row
    expect(b.rows).toBe(7);
    expect(b.cols).toBe(5 + 1 + 3); // H is 5 wide, gap, I trimmed to 3
    const big = pixelTextBlock('HI', (7 * 2) / 4.5, sc);
    expect(big.rows).toBe(14);
  });
  it('treats lower case as capitals and skips unknown characters', () => {
    expect(Array.from(pixelTextBlock('max', 2, sc).cells)).toEqual(Array.from(pixelTextBlock('MAX', 2, sc).cells));
    expect(pixelTextBlock('A😀B', 2, sc).cols).toBe(pixelTextBlock('AB', 2, sc).cols);
    expect(pixelTextBlock('', 2, sc).cols).toBe(0);
  });
});

// Pet: a red square in the middle of the photo.
const cutout = makeCutout(200, 200, (x, y) => (x >= 70 && x < 130 && y >= 70 && y < 130 ? [200, 30, 30, 255] : [0, 0, 0, 0]));
const text = (over: Partial<TextLayer> = {}): TextLayer => ({ id: 't1', text: 'HI', font: 'stitch', sizeIn: 3, colorHex: '#ffffff', x: 0.5, y: 0.5, ...over });

describe('composing background, pet and text', () => {
  it('puts the motif only on the background, as its own yarn', () => {
    const g = buildPatternGrid(cutout, sc, settings({ colorCount: 2, background: pattern({ motif: 'stripes' }) }));
    expect(g.palette.map((c) => c.role)).toEqual(['background', 'subject', 'decoration']);
    const centre = Math.floor(sc.rows / 2) * sc.cols + Math.floor(sc.cols / 2);
    expect(g.cells[centre]).toBe(1); // pet stays pet
    expect(g.cells.some((v) => v === 2)).toBe(true);
    expect(g.palette[2].hex).toBe('#3366aa');
  });

  it('draws text on top of everything and survives smoothing', () => {
    const s = settings({ colorCount: 2, smoothing: 2, texts: [text()] });
    const block = pixelTextBlock('HI', 3, sc);
    const g = buildPatternGrid(cutout, sc, s, [], [block]);
    const k = g.palette.findIndex((c) => c.hex === '#ffffff');
    expect(k).toBeGreaterThan(0);
    const textCells = g.cells.filter((v) => v === k).length;
    expect(textCells).toBe(block.cells.reduce((a, v) => a + v, 0)); // every text stitch kept
  });

  it('reuses an existing yarn when a decoration color matches it', () => {
    const s = settings({ colorCount: 2, background: pattern({ motif: 'dots', colorHex: s0().backgroundHex }) });
    const g = buildPatternGrid(cutout, sc, s);
    expect(g.palette.filter((c) => c.role === 'decoration')).toHaveLength(0);
  });

  it('places a text block centred on its x / y', () => {
    const block = pixelTextBlock('I', 7 / 4.5, sc); // 3 × 7
    const placed = placeTextBlocks(sc, settings({ texts: [text({ x: 0.25, y: 0.75, text: 'I' })] }), [block]);
    let minC = Infinity, maxC = -1, minR = Infinity, maxR = -1;
    placed.forEach((t, i) => {
      if (t < 0) return;
      const r = Math.floor(i / sc.cols), c = i % sc.cols;
      minC = Math.min(minC, c); maxC = Math.max(maxC, c); minR = Math.min(minR, r); maxR = Math.max(maxR, r);
    });
    expect((minC + maxC + 1) / 2 / sc.cols).toBeCloseTo(0.25, 1);
    expect((minR + maxR + 1) / 2 / sc.rows).toBeCloseTo(0.75, 1);
  });

  it('filet: motif becomes filled squares with an open gap around the pet; text over the pet is cut out', () => {
    const fs = computeGridSpec({ width: 24, height: 24 }, getGauge('decor-filet', 'worsted'));
    const s = settings({ technique: 'decor-filet', filetShowDetails: false, background: pattern({ motif: 'checks', sizeIn: 2 }), texts: [text()] });
    const block = pixelTextBlock('HI', 3, fs);
    const g = buildFiletGrid(cutout, fs, s, [], [block]);
    expect(g.palette).toHaveLength(2);
    const plain = buildFiletGrid(cutout, fs, settings({ technique: 'decor-filet', filetShowDetails: false }));
    // Ring of open squares right around the pet.
    const petCells = [...plain.cells.keys()].filter((i) => plain.cells[i] === 1);
    const ring = new Set<number>();
    for (const i of petCells) for (const d of [-1, 1, -fs.cols, fs.cols]) if (plain.cells[i + d] === 0) ring.add(i + d);
    const textAt = placeTextBlocks(fs, s, [block]);
    for (const i of ring) if (textAt[i] < 0) expect(g.cells[i]).toBe(0);
    // The text sits over the pet, so it is open there.
    textAt.forEach((t, i) => {
      if (t >= 0 && plain.cells[i] === 1) expect(g.cells[i]).toBe(0);
    });
  });
});

function s0() {
  return settings();
}
