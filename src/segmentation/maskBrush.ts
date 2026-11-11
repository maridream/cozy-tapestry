/** Keep / Erase brush for subject masks. Pure functions, no DOM. */

export interface Point {
  x: number;
  y: number;
}

/** Inclusive pixel rectangle touched by a stroke. */
export interface DirtyRect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** Writes one hard-edged filled circle into `mask`, clipped to the image. Returns the touched rect, or null. */
function stamp(mask: Uint8ClampedArray, width: number, height: number, cx: number, cy: number, radius: number, value: number): DirtyRect | null {
  const x0 = Math.max(0, Math.ceil(cx - radius));
  const x1 = Math.min(width - 1, Math.floor(cx + radius));
  const y0 = Math.max(0, Math.ceil(cy - radius));
  const y1 = Math.min(height - 1, Math.floor(cy + radius));
  if (x0 > x1 || y0 > y1) return null;
  const r2 = radius * radius;
  for (let y = y0; y <= y1; y++) {
    const dy = y - cy;
    const row = y * width;
    for (let x = x0; x <= x1; x++) {
      const dx = x - cx;
      if (dx * dx + dy * dy <= r2) mask[row + x] = value;
    }
  }
  return { x0, y0, x1, y1 };
}

function union(a: DirtyRect | null, b: DirtyRect | null): DirtyRect | null {
  if (!a) return b;
  if (!b) return a;
  return { x0: Math.min(a.x0, b.x0), y0: Math.min(a.y0, b.y0), x1: Math.max(a.x1, b.x1), y1: Math.max(a.y1, b.y1) };
}

/**
 * Paints a stroke through `points` into `mask` (in place): circles of `radius`
 * photo pixels, set to `value` (255 = Keep, 0 = Erase). Consecutive points are
 * joined by stamping every half-radius so fast strokes leave no gaps.
 * Returns the rectangle that changed (for partial redraws), or null.
 */
export function paintStroke(
  mask: Uint8ClampedArray,
  width: number,
  height: number,
  points: readonly Point[],
  radius: number,
  value: 0 | 255,
): DirtyRect | null {
  if (points.length === 0 || radius <= 0) return null;
  let dirty = stamp(mask, width, height, points[0].x, points[0].y, radius, value);
  const step = Math.max(0.5, radius / 2);
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const dist = Math.hypot(b.x - a.x, b.y - a.y);
    const n = Math.max(1, Math.ceil(dist / step));
    for (let s = 1; s <= n; s++) {
      const t = s / n;
      dirty = union(dirty, stamp(mask, width, height, a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, radius, value));
    }
  }
  return dirty;
}

/** Brush radius in photo pixels from the slider's percentage of the photo's shorter side. */
export function brushRadius(percent: number, width: number, height: number): number {
  return Math.max(2, Math.round((percent / 100) * Math.min(width, height)));
}
