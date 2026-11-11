import type { Gauge, SizePreset, Technique, YarnWeight } from '../types';

/**
 * Crochet reference numbers. Single source of truth for sizing and yarn maths.
 *
 * These are sensible AVERAGES for an average-tension crocheter, not measured
 * constants. The UI must always present results as estimates and tell people
 * to make a gauge swatch. If the project owner supplies swatch measurements,
 * change them here only. See docs/phase-3/README.md "Crochet reference".
 */

export const TECHNIQUE_LABELS: Record<Technique, { title: string; blurb: string }> = {
  'blanket-sc': {
    title: 'Thick blanket',
    blurb: 'Dense single crochet with colors carried inside. Warm, no holes, uses the most yarn.',
  },
  'decor-dc': {
    title: 'Decorative tapestry — full color',
    blurb: 'Taller, looser double crochet. Drapes like a wall hanging and uses less yarn.',
  },
  'decor-filet': {
    title: 'Decorative tapestry — filet mesh',
    blurb: 'One yarn color. Your pet appears as solid blocks on an open, lacy mesh. Lightest of all.',
  },
};

export const YARN_WEIGHT_LABELS: Record<YarnWeight, string> = {
  dk: 'DK / light (#3)',
  worsted: 'Worsted / medium (#4)',
  bulky: 'Bulky (#5)',
};

export const DEFAULT_YARN_WEIGHT: YarnWeight = 'worsted';

/** Cells and rows per inch. For filet, one cell = one mesh square = 2 stitches (dc + ch 1, or 2 dc). */
export const GAUGE: Record<YarnWeight, Record<Technique, Gauge>> = {
  dk: {
    'blanket-sc': { cellsPerInch: 5.0, rowsPerInch: 5.5, hookMm: 4.0, hookUs: 'G-6' },
    'decor-dc': { cellsPerInch: 4.25, rowsPerInch: 2.3, hookMm: 4.5, hookUs: '7' },
    'decor-filet': { cellsPerInch: 2.125, rowsPerInch: 2.3, hookMm: 4.5, hookUs: '7' },
  },
  worsted: {
    'blanket-sc': { cellsPerInch: 4.0, rowsPerInch: 4.5, hookMm: 5.0, hookUs: 'H-8' },
    'decor-dc': { cellsPerInch: 3.5, rowsPerInch: 1.9, hookMm: 5.5, hookUs: 'I-9' },
    'decor-filet': { cellsPerInch: 1.75, rowsPerInch: 1.9, hookMm: 5.5, hookUs: 'I-9' },
  },
  bulky: {
    'blanket-sc': { cellsPerInch: 3.0, rowsPerInch: 3.25, hookMm: 6.5, hookUs: 'K-10.5' },
    'decor-dc': { cellsPerInch: 2.5, rowsPerInch: 1.4, hookMm: 8.0, hookUs: 'L-11' },
    'decor-filet': { cellsPerInch: 1.25, rowsPerInch: 1.4, hookMm: 8.0, hookUs: 'L-11' },
  },
};

/** Inches of yarn consumed by one stitch. */
export const YARN_INCHES_PER_STITCH: Record<YarnWeight, { sc: number; dc: number; ch: number }> = {
  dk: { sc: 1.2, dc: 3.0, ch: 0.5 },
  worsted: { sc: 1.5, dc: 3.7, ch: 0.6 },
  bulky: { sc: 2.0, dc: 5.0, ch: 0.8 },
};

/** Default skein length; the user can overwrite it in the Pattern step. */
export const DEFAULT_YARDS_PER_SKEIN: Record<YarnWeight, number> = {
  dk: 250,
  worsted: 200,
  bulky: 120,
};

/** Extra yarn added to every color for tails, tension differences and mistakes. */
export const YARN_BUFFER_FRACTION = 0.1;

/**
 * Turning chains at the start of each row.
 * - sc: ch 1, does not count as a stitch.
 * - dc colorwork: ch 2, does not count as a stitch (keeps every chart cell a real dc).
 * - filet: ch 3, counts as the edge dc.
 */
export const TURNING_CHAINS: Record<Technique, number> = {
  'blanket-sc': 1,
  'decor-dc': 2,
  'decor-filet': 3,
};

// ------------------------------------------------------------------ sizes ---

export const SIZE_PRESETS: readonly SizePreset[] = [
  { id: '1x1', label: '1 × 1 ft', shortFt: 1, longFt: 1 },
  { id: '2x2', label: '2 × 2 ft', shortFt: 2, longFt: 2 },
  { id: '2x3', label: '2 × 3 ft', shortFt: 2, longFt: 3 },
  { id: '3x4', label: '3 × 4 ft', shortFt: 3, longFt: 4 },
  { id: '4x5', label: '4 × 5 ft', shortFt: 4, longFt: 5 },
  { id: '5x8', label: '5 × 8 ft', shortFt: 5, longFt: 8 },
];

export const DEFAULT_SIZE_PRESET_ID = '2x3';

/** Custom size limits, in inches. Short side 1–5 ft, long side 1–8 ft. */
export const SIZE_LIMITS = {
  minIn: 12,
  maxShortIn: 60,
  maxLongIn: 96,
} as const;

// ----------------------------------------------------------------- colors ---

export const COLOR_COUNT = { min: 2, max: 8, default: 4 } as const;

/** Default solid background behind the pet. */
export const DEFAULT_BACKGROUND_HEX = '#f3e9d8';
