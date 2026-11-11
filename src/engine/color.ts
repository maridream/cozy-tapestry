import type { Rgb } from '../types';

/**
 * Color helpers: hex <-> RGB, sRGB -> CIELAB, perceptual distance, plain-language naming.
 *
 * PHASE 3 — implement per docs/phase-3/README.md §"color.ts".
 */

export interface Lab {
  l: number;
  a: number;
  b: number;
}

export function hexToRgb(_hex: string): Rgb {
  throw new Error('hexToRgb: not implemented (Phase 3)');
}

export function rgbToHex(_rgb: Rgb): string {
  throw new Error('rgbToHex: not implemented (Phase 3)');
}

export function rgbToLab(_rgb: Rgb): Lab {
  throw new Error('rgbToLab: not implemented (Phase 3)');
}

/** Squared Euclidean distance in Lab (CIE76). Good enough for 2–8 yarn colors. */
export function labDistanceSq(_a: Lab, _b: Lab): number {
  throw new Error('labDistanceSq: not implemented (Phase 3)');
}

/** Plain-language name such as "warm brown", "soft grey", "cream". */
export function nameColor(_rgb: Rgb): string {
  throw new Error('nameColor: not implemented (Phase 3)');
}
