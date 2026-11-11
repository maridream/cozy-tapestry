import type { CutoutImage, Pattern, PatternSettings, YarnColor } from '../types';

/**
 * One call that turns the cutout + settings into the complete Pattern
 * (gauge -> grid spec -> chart -> written rows -> yarn estimate).
 * This is the only engine function the UI steps need to call.
 *
 * PHASE 3 — implement per docs/phase-3/README.md §"buildPattern.ts".
 */
export function buildPattern(
  _cutout: CutoutImage,
  _settings: PatternSettings,
  _lockedPalette?: YarnColor[],
): Pattern {
  throw new Error('buildPattern: not implemented (Phase 3)');
}
