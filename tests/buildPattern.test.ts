import { describe, expect, it } from 'vitest';
import { buildPattern } from '../src/engine/buildPattern';
import { makeCutout, settings } from './helpers';

// A 2048 × 1536 "pet": a big ellipse with a few patches of color.
const big = makeCutout(2048, 1536, (x, y) => {
  const dx = (x - 1024) / 800;
  const dy = (y - 768) / 600;
  const inPet = dx * dx + dy * dy < 1;
  const r = 120 + ((x >> 6) % 4) * 30;
  return [r, 90 + ((y >> 7) % 3) * 40, 60, inPet ? 255 : 0];
});

describe('buildPattern', () => {
  it('returns a complete, consistent pattern', () => {
    const p = buildPattern(big, settings({ size: { width: 24, height: 36 } }));
    expect(p.gridSpec.cols).toBe(96);
    expect(p.gridSpec.rows).toBe(162);
    expect(p.grid.cells.length).toBe(96 * 162);
    expect(p.rows).toHaveLength(162);
    expect(p.foundationChain).toBe(97);
    expect(p.estimate.totalYards).toBeGreaterThan(0);
    expect(p.grid.palette.length).toBeLessThanOrEqual(4);
  });

  it('builds a 5 × 8 ft DK blanket (300 × 528) quickly', () => {
    const t0 = performance.now();
    const p = buildPattern(big, settings({ yarnWeight: 'dk', size: { width: 60, height: 96 }, colorCount: 8, smoothing: 2 }));
    const ms = performance.now() - t0;
    expect([p.gridSpec.cols, p.gridSpec.rows]).toEqual([300, 528]);
    console.log(`300 × 528 build: ${ms.toFixed(0)} ms`);
    expect(ms).toBeLessThan(5000);
  });
});
