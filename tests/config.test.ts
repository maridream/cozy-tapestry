import { describe, expect, it } from 'vitest';
import { GAUGE, SIZE_LIMITS, SIZE_PRESETS, YARN_INCHES_PER_STITCH } from '../src/config/crochet';
import { getGauge } from '../src/engine/sizing';

// Scaffold sanity tests. Phase 3 adds the real engine tests next to this file.
describe('crochet config', () => {
  it('has a gauge for every yarn weight and technique', () => {
    for (const weight of ['dk', 'worsted', 'bulky'] as const) {
      for (const technique of ['blanket-sc', 'decor-dc', 'decor-filet'] as const) {
        const gauge = getGauge(technique, weight);
        expect(gauge.cellsPerInch).toBeGreaterThan(0);
        expect(gauge.rowsPerInch).toBeGreaterThan(0);
      }
      expect(YARN_INCHES_PER_STITCH[weight].dc).toBeGreaterThan(YARN_INCHES_PER_STITCH[weight].sc);
    }
  });

  it('filet cells are two dc-stitches wide', () => {
    for (const weight of ['dk', 'worsted', 'bulky'] as const) {
      expect(GAUGE[weight]['decor-filet'].cellsPerInch * 2).toBeCloseTo(GAUGE[weight]['decor-dc'].cellsPerInch);
    }
  });

  it('size presets fit inside the custom size limits', () => {
    for (const preset of SIZE_PRESETS) {
      expect(preset.shortFt * 12).toBeGreaterThanOrEqual(SIZE_LIMITS.minIn);
      expect(preset.shortFt * 12).toBeLessThanOrEqual(SIZE_LIMITS.maxShortIn);
      expect(preset.longFt * 12).toBeLessThanOrEqual(SIZE_LIMITS.maxLongIn);
      expect(preset.shortFt).toBeLessThanOrEqual(preset.longFt);
    }
  });
});
