import { describe, expect, it } from 'vitest';
import { planChartPages, type Paper } from '../src/export/chartLayout';

function coverage(cols: number, rows: number, aspect: number, paper: Paper) {
  const plan = planChartPages(cols, rows, aspect, paper);
  const hits = new Uint8Array(cols * rows);
  for (const t of plan.tiles) {
    for (let r = t.rowFrom; r <= t.rowTo; r++) for (let c = t.col0; c < t.col1; c++) hits[(r - 1) * cols + c]++;
  }
  return { plan, hits };
}

describe('planChartPages', () => {
  const cases: [number, number, number, Paper][] = [
    [96, 162, 4 / 4.5, 'letter'],
    [84, 68, 3.5 / 1.9, 'a4'],
    [42, 68, 1.75 / 1.9, 'letter'],
    [300, 528, 5 / 5.5, 'letter'],
    [300, 528, 5 / 5.5, 'a4'],
    [15, 17, 1.25 / 1.4, 'a4'],
  ];

  it.each(cases)('%d × %d (aspect %f, %s): every cell exactly once', (cols, rows, aspect, paper) => {
    const { hits } = coverage(cols, rows, aspect, paper);
    expect(hits.every((h) => h === 1)).toBe(true);
  });

  it('tiles are contiguous and ordered bottom-left first, then left to right, then up', () => {
    const { plan } = coverage(300, 528, 5 / 5.5, 'letter');
    plan.tiles.forEach((t, i) => {
      expect(t.index).toBe(i + 1);
      if (i % plan.across === 0) expect(t.col0).toBe(0);
      else expect(t.col0).toBe(plan.tiles[i - 1].col1);
      if (i >= plan.across) expect(t.rowFrom).toBe(plan.tiles[i - plan.across].rowTo + 1);
      else expect(t.rowFrom).toBe(1);
    });
  });

  it('the largest blanket gives a sensible page count with ~50 columns per page', () => {
    const { plan } = coverage(300, 528, 5 / 5.5, 'letter');
    expect(plan.colsPerPage).toBeGreaterThanOrEqual(40);
    expect(plan.colsPerPage).toBeLessThanOrEqual(50);
    expect(plan.tiles.length).toBeGreaterThanOrEqual(30);
    expect(plan.tiles.length).toBeLessThanOrEqual(80);
    expect(plan.cellW).toBeGreaterThanOrEqual(0.13);
    expect(plan.cellW).toBeLessThanOrEqual(0.16);
  });

  it('a 15 × 17 chart is a single page', () => {
    const { plan } = coverage(15, 17, 1.25 / 1.4, 'letter');
    expect(plan.tiles).toHaveLength(1);
    expect(plan.cellW).toBeGreaterThan(0.15);
  });

  it('keeps tall dc cells tall', () => {
    const { plan } = coverage(84, 68, 3.5 / 1.9, 'letter');
    expect(plan.cellH / plan.cellW).toBeCloseTo(3.5 / 1.9, 6);
  });
});
