import type { CutoutImage, Pattern, PatternSettings, YarnColor } from '../types';
import { buildFiletGrid, buildPatternGrid } from './buildGrid';
import { computeGridSpec, getGauge } from './sizing';
import { buildWrittenRows, foundationChainLength } from './writtenRows';
import { estimateYarn } from './yarnEstimate';

/**
 * One call that turns the cutout + settings into the complete Pattern
 * (gauge -> grid spec -> chart -> written rows -> yarn estimate).
 * This is the only engine function the UI steps need to call.
 */
export function buildPattern(cutout: CutoutImage, settings: PatternSettings, lockedPalette: YarnColor[] = []): Pattern {
  const { technique, yarnWeight } = settings;
  const gauge = getGauge(technique, yarnWeight);
  const gridSpec = computeGridSpec(settings.size, gauge);
  const grid =
    technique === 'decor-filet'
      ? buildFiletGrid(cutout, gridSpec, settings, lockedPalette)
      : buildPatternGrid(cutout, gridSpec, settings, lockedPalette);
  const rows = buildWrittenRows(grid, technique);
  const estimate = estimateYarn(grid, gridSpec, technique, yarnWeight, settings.yardsPerSkein);
  return { settings, gauge, gridSpec, grid, rows, foundationChain: foundationChainLength(gridSpec.cols, technique), estimate };
}
