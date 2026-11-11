import { describe, expect, it } from 'vitest';
import { computeGridSpec, getGauge, validateSize } from '../src/engine/sizing';
import type { Technique, YarnWeight } from '../src/types';

describe('computeGridSpec', () => {
  const cases: [number, number, YarnWeight, Technique, number, number][] = [
    [24, 36, 'worsted', 'blanket-sc', 96, 162],
    [24, 36, 'worsted', 'decor-dc', 84, 68],
    [24, 36, 'worsted', 'decor-filet', 42, 68],
    [12, 12, 'bulky', 'decor-filet', 15, 17],
    [60, 96, 'dk', 'blanket-sc', 300, 528],
  ];
  it.each(cases)('%d × %d in %s %s → %d × %d', (w, h, weight, technique, cols, rows) => {
    const spec = computeGridSpec({ width: w, height: h }, getGauge(technique, weight));
    expect([spec.cols, spec.rows]).toEqual([cols, rows]);
  });

  it('reports the finished size after rounding to whole cells', () => {
    const spec = computeGridSpec({ width: 24, height: 36 }, getGauge('decor-dc', 'worsted'));
    expect(spec.cellWidthIn).toBeCloseTo(1 / 3.5);
    expect(spec.cellHeightIn).toBeCloseTo(1 / 1.9);
    expect(spec.finished.width).toBeCloseTo(24);
    expect(spec.finished.height).toBeCloseTo(68 / 1.9);
  });
});

describe('validateSize', () => {
  it('accepts the limits', () => {
    expect(validateSize({ width: 12, height: 12 }).ok).toBe(true);
    expect(validateSize({ width: 60, height: 96 }).ok).toBe(true);
    expect(validateSize({ width: 96, height: 60 }).ok).toBe(true);
  });
  it('explains sizes outside them', () => {
    const tooSmall = validateSize({ width: 11, height: 24 });
    const tooWide = validateSize({ width: 61, height: 70 });
    const tooLong = validateSize({ width: 24, height: 97 });
    expect(tooSmall.ok).toBe(false);
    expect(tooWide.ok).toBe(false);
    expect(tooLong).toEqual({ ok: false, message: 'The longest side can be up to 8 ft.' });
    expect(validateSize({ width: NaN, height: 24 }).ok).toBe(false);
  });
});
