import { GAUGE, SIZE_LIMITS } from '../config/crochet';
import type { Gauge, GridSpec, SizeInches, Technique, YarnWeight } from '../types';

/** Look up the gauge for a technique + yarn weight. */
export function getGauge(technique: Technique, yarnWeight: YarnWeight): Gauge {
  return GAUGE[yarnWeight][technique];
}

/** Convert a requested finished size into a whole-cell stitch grid. */
export function computeGridSpec(size: SizeInches, gauge: Gauge): GridSpec {
  const cols = Math.max(1, Math.round(size.width * gauge.cellsPerInch));
  const rows = Math.max(1, Math.round(size.height * gauge.rowsPerInch));
  const cellWidthIn = 1 / gauge.cellsPerInch;
  const cellHeightIn = 1 / gauge.rowsPerInch;
  return { cols, rows, cellWidthIn, cellHeightIn, finished: { width: cols * cellWidthIn, height: rows * cellHeightIn } };
}

export type SizeCheck = { ok: true } | { ok: false; message: string };

/** Checks a size against SIZE_LIMITS, with a plain-words reason when it is out of range. */
export function validateSize(size: SizeInches): SizeCheck {
  const { width, height } = size;
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return { ok: false, message: 'Enter a width and a height.' };
  }
  const short = Math.min(width, height);
  const long = Math.max(width, height);
  if (short < SIZE_LIMITS.minIn) return { ok: false, message: `Each side needs to be at least ${SIZE_LIMITS.minIn / 12} ft (${SIZE_LIMITS.minIn} in).` };
  if (short > SIZE_LIMITS.maxShortIn) return { ok: false, message: `The shorter side can be up to ${SIZE_LIMITS.maxShortIn / 12} ft.` };
  if (long > SIZE_LIMITS.maxLongIn) return { ok: false, message: `The longest side can be up to ${SIZE_LIMITS.maxLongIn / 12} ft.` };
  return { ok: true };
}
