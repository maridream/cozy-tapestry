import { GAUGE } from '../config/crochet';
import type { Gauge, GridSpec, SizeInches, Technique, YarnWeight } from '../types';

/** Look up the gauge for a technique + yarn weight. */
export function getGauge(technique: Technique, yarnWeight: YarnWeight): Gauge {
  return GAUGE[yarnWeight][technique];
}

/**
 * Convert a requested finished size into a whole-cell stitch grid.
 *
 * PHASE 3 — implement per docs/phase-3/README.md §"sizing.ts".
 */
export function computeGridSpec(_size: SizeInches, _gauge: Gauge): GridSpec {
  throw new Error('computeGridSpec: not implemented (Phase 3)');
}
