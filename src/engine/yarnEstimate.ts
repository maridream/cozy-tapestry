import type { GridSpec, PatternGrid, Technique, YarnEstimate, YarnWeight } from '../types';

/**
 * Chart -> yards / meters / skeins per color.
 *
 * PHASE 3 — implement per docs/phase-3/README.md §"yarnEstimate.ts".
 */
export function estimateYarn(
  _grid: PatternGrid,
  _gridSpec: GridSpec,
  _technique: Technique,
  _yarnWeight: YarnWeight,
  _yardsPerSkein: number,
): YarnEstimate {
  throw new Error('estimateYarn: not implemented (Phase 3)');
}
