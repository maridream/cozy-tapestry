import { describe, expect, it } from 'vitest';
import { smoothGrid } from '../src/engine/buildGrid';
import { color, gridOf } from './helpers';

const pal = [color(0, 'cream', '#f3e9d8', 'background'), color(1, 'brown', '#8b5a2b')];

describe('smoothGrid', () => {
  const speck = gridOf(
    [
      [0, 0, 0, 0, 0],
      [0, 0, 1, 0, 0],
      [0, 0, 0, 0, 0],
    ],
    pal,
  );
  it('removes a single speck at level 1, keeps it at level 0', () => {
    expect(Array.from(smoothGrid(speck, 1).cells).every((v) => v === 0)).toBe(true);
    expect(smoothGrid(speck, 0).cells[7]).toBe(1);
  });

  const blob = gridOf(
    [
      [0, 0, 0, 0, 0, 0],
      [0, 0, 1, 1, 0, 0],
      [0, 0, 1, 1, 0, 0],
      [0, 0, 0, 0, 0, 0],
    ],
    pal,
  );
  it('keeps a 4-cell blob at level 1 and removes it at level 2', () => {
    expect(Array.from(smoothGrid(blob, 1).cells).filter((v) => v === 1).length).toBe(4);
    expect(Array.from(smoothGrid(blob, 2).cells).every((v) => v === 0)).toBe(true);
  });

  it('does not mutate its input', () => {
    const before = Array.from(speck.cells);
    smoothGrid(speck, 2);
    expect(Array.from(speck.cells)).toEqual(before);
  });
});
