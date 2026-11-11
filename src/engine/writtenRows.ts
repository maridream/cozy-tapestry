import type { PatternGrid, Technique, WrittenRow } from '../types';

/**
 * Chart -> row-by-row written instructions ("12 dc green, 5 dc white").
 *
 * PHASE 3 — implement per docs/phase-3/README.md §"writtenRows.ts".
 */
export function buildWrittenRows(_grid: PatternGrid, _technique: Technique): WrittenRow[] {
  throw new Error('buildWrittenRows: not implemented (Phase 3)');
}

/** Foundation chain length including turning chains. */
export function foundationChainLength(_cols: number, _technique: Technique): number {
  throw new Error('foundationChainLength: not implemented (Phase 3)');
}
