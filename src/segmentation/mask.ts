/** Pure helpers for subject masks: one byte per pixel, 0 = background, 255 = pet. */

/** A pixel counts as "pet" above this value. */
export const MASK_THRESHOLD = 127;
/** Share of pixels that must be pet for the cutout to count as done. */
export const MIN_SUBJECT_FRACTION = 0.01;

const coverageCache = new WeakMap<Uint8ClampedArray, number>();

/**
 * Fraction (0..1) of pixels marked as pet. Masks in app state are never mutated
 * after being stored, so the result is cached per array.
 */
export function maskCoverage(mask: Uint8ClampedArray): number {
  const cached = coverageCache.get(mask);
  if (cached !== undefined) return cached;
  let on = 0;
  for (let i = 0; i < mask.length; i++) if (mask[i] > MASK_THRESHOLD) on++;
  const fraction = mask.length ? on / mask.length : 0;
  coverageCache.set(mask, fraction);
  return fraction;
}

export function hasMeaningfulSubject(mask: Uint8ClampedArray | null): boolean {
  return mask !== null && maskCoverage(mask) >= MIN_SUBJECT_FRACTION;
}

/** Bilinear resize of a one-byte-per-pixel mask. */
export function resizeMaskBilinear(
  src: Uint8ClampedArray,
  srcW: number,
  srcH: number,
  dstW: number,
  dstH: number,
): Uint8ClampedArray {
  if (srcW === dstW && srcH === dstH) return src.slice();
  const out = new Uint8ClampedArray(dstW * dstH);
  const sx = srcW / dstW;
  const sy = srcH / dstH;
  for (let y = 0; y < dstH; y++) {
    const fy = Math.min(Math.max((y + 0.5) * sy - 0.5, 0), srcH - 1);
    const y0 = Math.floor(fy);
    const y1 = Math.min(y0 + 1, srcH - 1);
    const ty = fy - y0;
    for (let x = 0; x < dstW; x++) {
      const fx = Math.min(Math.max((x + 0.5) * sx - 0.5, 0), srcW - 1);
      const x0 = Math.floor(fx);
      const x1 = Math.min(x0 + 1, srcW - 1);
      const tx = fx - x0;
      const top = src[y0 * srcW + x0] * (1 - tx) + src[y0 * srcW + x1] * tx;
      const bottom = src[y1 * srcW + x0] * (1 - tx) + src[y1 * srcW + x1] * tx;
      out[y * dstW + x] = top * (1 - ty) + bottom * ty;
    }
  }
  return out;
}

/** Pulls the alpha channel out of RGBA pixels. */
export function alphaChannel(rgba: Uint8Array | Uint8ClampedArray): Uint8ClampedArray {
  const out = new Uint8ClampedArray(rgba.length / 4);
  for (let i = 0; i < out.length; i++) out[i] = rgba[i * 4 + 3];
  return out;
}

export function filledMask(length: number, value: 0 | 255): Uint8ClampedArray {
  return new Uint8ClampedArray(length).fill(value);
}
