import { describe, expect, it } from 'vitest';
import { alphaChannel, maskCoverage, resizeMaskBilinear } from '../src/segmentation/mask';
import { brushRadius, paintStroke } from '../src/segmentation/maskBrush';

const W = 40;
const H = 30;
const at = (m: Uint8ClampedArray, x: number, y: number) => m[y * W + x];

describe('paintStroke', () => {
  it('sets pixels within the radius and leaves the rest', () => {
    const m = new Uint8ClampedArray(W * H);
    const dirty = paintStroke(m, W, H, [{ x: 20, y: 15 }], 5, 255);
    expect(at(m, 20, 15)).toBe(255);
    expect(at(m, 24, 15)).toBe(255); // distance 4
    expect(at(m, 23, 19)).toBe(255); // distance 5 (on the edge)
    expect(at(m, 26, 15)).toBe(0); // distance 6
    expect(at(m, 24, 19)).toBe(0); // distance ~5.7
    expect(at(m, 0, 0)).toBe(0);
    expect(dirty).toEqual({ x0: 15, y0: 10, x1: 25, y1: 20 });
  });

  it('erase clears pixels', () => {
    const m = new Uint8ClampedArray(W * H).fill(255);
    paintStroke(m, W, H, [{ x: 10, y: 10 }], 3, 0);
    expect(at(m, 10, 10)).toBe(0);
    expect(at(m, 12, 10)).toBe(0);
    expect(at(m, 20, 10)).toBe(255);
  });

  it('clips strokes at the edges without throwing', () => {
    const m = new Uint8ClampedArray(W * H);
    expect(() => paintStroke(m, W, H, [{ x: -3, y: -3 }, { x: W + 5, y: H + 5 }], 6, 255)).not.toThrow();
    expect(m.length).toBe(W * H);
    expect(at(m, 0, 0)).toBe(255);
    expect(at(m, W - 1, H - 1)).toBe(255);
    // fully outside: nothing changes
    const n = new Uint8ClampedArray(W * H);
    expect(paintStroke(n, W, H, [{ x: -50, y: -50 }], 4, 255)).toBeNull();
    expect(maskCoverage(n)).toBe(0);
  });

  it('leaves no gaps between two distant points', () => {
    const m = new Uint8ClampedArray(W * H);
    paintStroke(m, W, H, [{ x: 2, y: 15 }, { x: 37, y: 15 }], 2, 255);
    for (let x = 2; x <= 37; x++) {
      expect(at(m, x, 14)).toBe(255);
      expect(at(m, x, 15)).toBe(255);
      expect(at(m, x, 16)).toBe(255);
    }
    expect(at(m, 20, 12)).toBe(0);
  });

  it('brush radius scales with the shorter side', () => {
    expect(brushRadius(10, 2000, 1000)).toBe(100);
    expect(brushRadius(1, 100, 100)).toBe(2); // never below 2 px
  });
});

describe('mask helpers', () => {
  it('coverage counts pixels above the threshold', () => {
    const m = new Uint8ClampedArray(100);
    m.fill(255, 0, 25);
    m[30] = 127; // not counted
    m[31] = 128; // counted
    expect(maskCoverage(m)).toBeCloseTo(0.26);
  });

  it('bilinear resize keeps solid areas solid and blends edges', () => {
    const src = new Uint8ClampedArray([0, 255, 0, 255]); // 2×2, right column on
    const out = resizeMaskBilinear(src, 2, 2, 8, 8);
    expect(out.length).toBe(64);
    expect(out[0]).toBe(0);
    expect(out[7]).toBe(255);
    expect(out[3]).toBeGreaterThan(0);
    expect(out[3]).toBeLessThan(255);
  });

  it('alphaChannel takes every fourth byte', () => {
    expect(Array.from(alphaChannel(new Uint8Array([1, 2, 3, 40, 5, 6, 7, 80])))).toEqual([40, 80]);
  });
});
