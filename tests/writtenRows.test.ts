import { describe, expect, it } from 'vitest';
import { buildWrittenRows, foundationChainLength, rowStitchCount } from '../src/engine/writtenRows';
import { color, gridOf } from './helpers';

describe('buildWrittenRows', () => {
  const grid = gridOf(
    [
      [0, 1, 1, 0],
      [1, 0, 0, 0],
    ],
    [color(0, 'cream', '#f3e9d8', 'background'), color(1, 'brown', '#8b5a2b')],
  );

  it('matches the sc fixture', () => {
    const rows = buildWrittenRows(grid, 'blanket-sc');
    expect(rows.map((r) => r.text)).toEqual(['Row 1 (RS): 3 sc cream, 1 sc brown', 'Row 2 (WS): 1 sc cream, 2 sc brown, 1 sc cream']);
    expect(rows[0].runs).toEqual([
      { count: 3, stitch: 'sc', colorIndex: 0 },
      { count: 1, stitch: 'sc', colorIndex: 1 },
    ]);
    expect(rows.map(rowStitchCount)).toEqual([4, 4]);
  });

  it('uses dc for full-color tapestry', () => {
    expect(buildWrittenRows(grid, 'decor-dc')[0].text).toBe('Row 1 (RS): 3 dc cream, 1 dc brown');
  });

  it('writes filet rows as open / filled', () => {
    const filet = { ...grid, palette: [color(0, 'open mesh', '#f3e9d8', 'background'), color(1, 'cream', '#eeeeee')] };
    const rows = buildWrittenRows(filet, 'decor-filet');
    expect(rows.map((r) => r.text)).toEqual(['Row 1 (RS): 3 open, 1 filled', 'Row 2 (WS): 1 open, 2 filled, 1 open']);
  });
});

describe('foundationChainLength', () => {
  it('follows the formulas', () => {
    expect(foundationChainLength(96, 'blanket-sc')).toBe(97);
    expect(foundationChainLength(84, 'decor-dc')).toBe(86);
    expect(foundationChainLength(42, 'decor-filet')).toBe(87);
  });
});
