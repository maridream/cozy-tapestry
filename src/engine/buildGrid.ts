import type { CutoutImage, GridSpec, PatternGrid, PatternSettings, YarnColor } from '../types';

/**
 * Photo + mask -> stitch chart. Pure functions, no DOM access (ImageData is
 * only used as a plain { width, height, data } record so tests can fake it).
 *
 * PHASE 3 — implement per docs/phase-3/README.md §"buildGrid.ts".
 */

/**
 * Full pipeline: fit/crop to the grid's aspect, area-average each cell,
 * split subject vs background by the mask, quantize subject cells to
 * (colorCount - 1) colors, smooth, and return the chart.
 *
 * `lockedPalette` carries colors the user edited by hand (userEdited: true).
 * Each is re-attached to the freshly picked color nearest its `autoHex`,
 * replacing that color's hex and name.
 */
export function buildPatternGrid(
  _cutout: CutoutImage,
  _gridSpec: GridSpec,
  _settings: PatternSettings,
  _lockedPalette?: YarnColor[],
): PatternGrid {
  throw new Error('buildPatternGrid: not implemented (Phase 3)');
}

/** Filet variant: 2-entry palette, 0 = open mesh, 1 = filled block. */
export function buildFiletGrid(
  _cutout: CutoutImage,
  _gridSpec: GridSpec,
  _settings: PatternSettings,
): PatternGrid {
  throw new Error('buildFiletGrid: not implemented (Phase 3)');
}

/** Remove isolated specks so the chart is pleasant to crochet. Returns a new grid. */
export function smoothGrid(_grid: PatternGrid, _level: 0 | 1 | 2): PatternGrid {
  throw new Error('smoothGrid: not implemented (Phase 3)');
}
