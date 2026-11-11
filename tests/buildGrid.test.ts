import { describe, expect, it } from 'vitest';
import { buildFiletGrid, buildPatternGrid, resampleToCells } from '../src/engine/buildGrid';
import { computeGridSpec, getGauge } from '../src/engine/sizing';
import { makeCutout, settings } from './helpers';

// 200 × 200 photo; the pet is the left half. Top half red, bottom half blue.
const twoTone = makeCutout(200, 200, (x, y) => (x < 100 ? (y < 100 ? [220, 30, 30, 255] : [30, 60, 200, 255]) : [0, 200, 0, 0]));
const spec = computeGridSpec({ width: 24, height: 24 }, getGauge('blanket-sc', 'worsted')); // 96 × 108

describe('resampleToCells', () => {
  it('places the pet centred with a margin, and the framing offset moves it', () => {
    const centred = resampleToCells(twoTone, spec, { zoom: 1, offsetX: 0, offsetY: 0 });
    const shifted = resampleToCells(twoTone, spec, { zoom: 1, offsetX: 0.2, offsetY: 0 });
    const midRow = Math.floor(spec.rows / 2);
    const at = (s: typeof centred, c: number) => s.coverage[midRow * spec.cols + c];
    const centre = Math.floor(spec.cols / 2);
    expect(at(centred, centre)).toBeGreaterThan(0.9);
    expect(at(centred, 1)).toBe(0); // inside the 8% margin
    expect(at(shifted, Math.floor(spec.cols * 0.2))).toBe(0);
    expect(at(shifted, centre + Math.floor(spec.cols * 0.2))).toBeGreaterThan(0.9);
  });

  it('averages pet pixels only (no background bleed)', () => {
    const s = resampleToCells(twoTone, spec, { zoom: 1, offsetX: 0, offsetY: 0 });
    for (let i = 0; i < s.coverage.length; i++) {
      if (s.coverage[i] > 0) expect(s.rgb[i * 3 + 1]).toBeLessThan(61); // no green from the masked-out half
    }
  });
});

describe('buildPatternGrid', () => {
  it('uses index 0 for background and finds a two-tone pet', () => {
    const g = buildPatternGrid(twoTone, spec, settings({ colorCount: 3 }));
    expect(g.palette).toHaveLength(3);
    expect(g.palette[0].role).toBe('background');
    expect(g.cells[0]).toBe(0);
    const names = g.palette.slice(1).map((c) => c.name);
    expect(names.some((n) => n.includes('red'))).toBe(true);
    expect(names.some((n) => n.includes('blue'))).toBe(true);
    expect(new Set(g.palette.map((c) => c.name)).size).toBe(3);
  });

  it('returns fewer colors than asked when the pet has fewer', () => {
    const g = buildPatternGrid(twoTone, spec, settings({ colorCount: 8 }));
    expect(g.palette).toHaveLength(3);
  });

  it('is deterministic', () => {
    const noisy = makeCutout(120, 120, (x, y) => [(x * 7 + y * 13) % 256, (x * 3) % 256, (y * 5) % 256, x > 20 && x < 100 ? 255 : 0]);
    const a = buildPatternGrid(noisy, spec, settings({ colorCount: 5 }));
    const b = buildPatternGrid(noisy, spec, settings({ colorCount: 5 }));
    expect(Array.from(a.cells)).toEqual(Array.from(b.cells));
    expect(a.palette).toEqual(b.palette);
  });

  it('re-attaches a hand-edited color to the nearest new color', () => {
    const first = buildPatternGrid(twoTone, spec, settings({ colorCount: 3 }));
    const red = first.palette.find((c) => c.name.includes('red'))!;
    const edited = { ...red, hex: '#ff00aa', name: 'my pink yarn', userEdited: true };
    const again = buildPatternGrid(twoTone, spec, settings({ colorCount: 3, smoothing: 2 }), [edited]);
    const match = again.palette.find((c) => c.userEdited)!;
    expect(match.hex).toBe('#ff00aa');
    expect(match.name).toBe('my pink yarn');
    expect(match.autoHex).toBe(red.autoHex);
  });
});

describe('buildFiletGrid', () => {
  it('fills cells that follow the mask', () => {
    const g = buildFiletGrid(twoTone, spec, settings({ technique: 'decor-filet', filetShowDetails: false }));
    expect(g.palette).toHaveLength(2);
    expect(g.palette[0].name).toBe('open mesh');
    const midRow = Math.floor(spec.rows / 2);
    expect(g.cells[midRow * spec.cols + Math.floor(spec.cols / 2)]).toBe(1);
    expect(g.cells[0]).toBe(0);
  });

  it('opens a dark patch when showing details', () => {
    // Light pet with a dark "eye" in the middle.
    const eye = makeCutout(200, 200, (x, y) => {
      const inPet = x >= 40 && x < 160 && y >= 40 && y < 160;
      const inEye = x >= 90 && x < 110 && y >= 90 && y < 110;
      return inEye ? [20, 20, 20, 255] : inPet ? [230, 220, 200, 255] : [0, 0, 0, 0];
    });
    const s = settings({ technique: 'decor-filet', smoothing: 0 });
    const withDetails = buildFiletGrid(eye, spec, { ...s, filetShowDetails: true });
    const without = buildFiletGrid(eye, spec, { ...s, filetShowDetails: false });
    const centre = Math.floor(spec.rows / 2) * spec.cols + Math.floor(spec.cols / 2);
    expect(without.cells[centre]).toBe(1);
    expect(withDetails.cells[centre]).toBe(0);
  });
});
