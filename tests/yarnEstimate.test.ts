import { describe, expect, it } from 'vitest';
import { computeGridSpec, getGauge } from '../src/engine/sizing';
import { estimateYarn } from '../src/engine/yarnEstimate';
import { color, gridOf, solidGrid } from './helpers';

const bg = color(0, 'cream', '#f3e9d8', 'background');
const brown = color(1, 'brown', '#8b5a2b');
const spec = (technique: 'blanket-sc' | 'decor-dc' | 'decor-filet') => computeGridSpec({ width: 24, height: 36 }, getGauge(technique, 'worsted'));

describe('estimateYarn', () => {
  it('solid 96 × 162 blanket: 717.5 yd, 4 skeins', () => {
    const e = estimateYarn(solidGrid(96, 162, 0, [bg]), spec('blanket-sc'), 'blanket-sc', 'worsted', 200);
    expect(e.lines).toHaveLength(1);
    expect(e.lines[0].yards).toBeCloseTo((23483.4 * 1.1) / 36, 6);
    expect(Math.abs(e.lines[0].yards - 717.5)).toBeLessThan(0.1);
    expect(e.lines[0].skeins).toBe(4);
    expect(e.totalMeters).toBeCloseTo(e.totalYards * 0.9144, 6);
  });

  it('solid 84 × 68 full-color tapestry: 649.8 yd', () => {
    const e = estimateYarn(solidGrid(84, 68, 0, [bg]), spec('decor-dc'), 'decor-dc', 'worsted', 200);
    expect(e.lines[0].yards).toBeCloseTo((21267.6 * 1.1) / 36, 6);
    expect(Math.abs(e.totalYards - 649.8)).toBeLessThan(0.1);
  });

  it('all-open 42 × 68 filet: 380.6 yd on the yarn color', () => {
    const e = estimateYarn(solidGrid(42, 68, 0, [color(0, 'open mesh', '#f3e9d8', 'background'), brown]), spec('decor-filet'), 'decor-filet', 'worsted', 200);
    expect(e.lines.map((l) => l.colorIndex)).toEqual([1]);
    expect(e.lines[0].yards).toBeCloseTo((12455.4 * 1.1) / 36, 6);
    expect(Math.abs(e.lines[0].yards - 380.6)).toBeLessThan(0.1);
  });

  it('charges carried yarn between first and last use in a row', () => {
    // A = 0, B = 1. Row [A,A,B,B,A,A,B,A,A,A]
    const grid = gridOf([[0, 0, 1, 1, 0, 0, 1, 0, 0, 0]], [bg, brown]);
    const gs = { ...spec('blanket-sc'), cols: 10, rows: 1 };
    const e = estimateYarn(grid, gs, 'blanket-sc', 'worsted', 200);
    const inchesOf = (k: number) => (e.lines.find((l) => l.colorIndex === k)!.yards * 36) / 1.1;
    const chains = (11 + 1) * 0.6; // foundation + one turning chain, charged to the background
    expect(inchesOf(0) - 7 * 1.5 - chains).toBeCloseTo(0.825, 6);
    expect(inchesOf(1) - 3 * 1.5).toBeCloseTo(0.55, 6);
  });

  it('omits colors with no yarn and rounds skeins up', () => {
    const grid = solidGrid(4, 4, 0, [bg, brown, color(2, 'unused', '#ffffff')]);
    const gs = { ...spec('blanket-sc'), cols: 4, rows: 4 };
    const e = estimateYarn(grid, gs, 'blanket-sc', 'worsted', 0.5);
    expect(e.lines.map((l) => l.colorIndex)).toEqual([0]);
    expect(e.lines[0].skeins).toBe(Math.ceil(e.lines[0].yards / 0.5));
    expect(e.lines[0].skeins * 0.5).toBeGreaterThanOrEqual(e.lines[0].yards);
  });
});
