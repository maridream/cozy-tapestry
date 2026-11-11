import { TURNING_CHAINS, YARN_BUFFER_FRACTION, YARN_INCHES_PER_STITCH } from '../config/crochet';
import type { GridSpec, PatternGrid, Technique, YarnEstimate, YarnEstimateLine, YarnWeight } from '../types';
import { foundationChainLength } from './writtenRows';

/** Chart -> yards / meters / skeins per color. Full precision; round only for display. */
export function estimateYarn(
  grid: PatternGrid,
  gridSpec: GridSpec,
  technique: Technique,
  yarnWeight: YarnWeight,
  yardsPerSkein: number,
): YarnEstimate {
  const { cols, rows, cells, palette } = grid;
  const y = YARN_INCHES_PER_STITCH[yarnWeight];
  const inches = new Float64Array(palette.length);

  if (technique === 'decor-filet') {
    let open = 0;
    for (let i = 0; i < cells.length; i++) if (cells[i] === 0) open++;
    const filled = cells.length - open;
    inches[1] =
      foundationChainLength(cols, technique) * y.ch +
      rows * TURNING_CHAINS[technique] * y.ch +
      open * (y.ch + y.dc) +
      filled * 2 * y.dc;
  } else {
    const s = technique === 'blanket-sc' ? y.sc : y.dc;
    const carry = gridSpec.cellWidthIn * 1.1;
    const first = new Int32Array(palette.length);
    const last = new Int32Array(palette.length);
    const count = new Int32Array(palette.length);
    for (let r = 0; r < rows; r++) {
      first.fill(-1);
      count.fill(0);
      for (let c = 0; c < cols; c++) {
        const k = cells[r * cols + c];
        if (first[k] === -1) first[k] = c;
        last[k] = c;
        count[k]++;
      }
      for (let k = 0; k < palette.length; k++) {
        if (first[k] === -1) continue;
        inches[k] += count[k] * s + (last[k] - first[k] + 1 - count[k]) * carry;
      }
    }
    inches[0] += foundationChainLength(cols, technique) * y.ch + rows * TURNING_CHAINS[technique] * y.ch;
  }

  const lines: YarnEstimateLine[] = [];
  inches.forEach((inch, colorIndex) => {
    if (inch <= 0) return;
    const yards = (inch * (1 + YARN_BUFFER_FRACTION)) / 36;
    lines.push({ colorIndex, yards, meters: yards * 0.9144, skeins: Math.ceil(yards / yardsPerSkein - 1e-9) });
  });
  return {
    lines,
    totalYards: lines.reduce((s, l) => s + l.yards, 0),
    totalMeters: lines.reduce((s, l) => s + l.meters, 0),
    bufferFraction: YARN_BUFFER_FRACTION,
    yardsPerSkein,
  };
}
