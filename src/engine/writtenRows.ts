import type { PatternGrid, RowRun, StitchKind, Technique, WrittenRow } from '../types';

/** Chart -> row-by-row written instructions, crochet row 1 (the bottom of the picture) first. */
export function buildWrittenRows(grid: PatternGrid, technique: Technique): WrittenRow[] {
  const { cols, rows, cells, palette } = grid;
  const out: WrittenRow[] = [];
  for (let n = 1; n <= rows; n++) {
    const r = rows - n;
    const side: 'RS' | 'WS' = n % 2 === 1 ? 'RS' : 'WS';
    const runs: RowRun[] = [];
    for (let k = 0; k < cols; k++) {
      const c = side === 'RS' ? cols - 1 - k : k; // RS rows are worked right to left
      const colorIndex = cells[r * cols + c];
      const last = runs[runs.length - 1];
      if (last && last.colorIndex === colorIndex) last.count++;
      else runs.push({ count: 1, stitch: stitchFor(technique, colorIndex), colorIndex });
    }
    const parts = runs.map((run) =>
      technique === 'decor-filet' ? `${run.count} ${run.stitch}` : `${run.count} ${run.stitch} ${palette[run.colorIndex]?.name ?? `color ${run.colorIndex}`}`,
    );
    out.push({ rowNumber: n, side, runs, text: `Row ${n} (${side}): ${parts.join(', ')}` });
  }
  return out;
}

function stitchFor(technique: Technique, colorIndex: number): StitchKind {
  if (technique === 'blanket-sc') return 'sc';
  if (technique === 'decor-dc') return 'dc';
  return colorIndex === 0 ? 'open' : 'filled';
}

/** Total cells (chart squares) in a written row. */
export function rowStitchCount(row: WrittenRow): number {
  return row.runs.reduce((sum, r) => sum + r.count, 0);
}

/** Foundation chain length including turning chains. */
export function foundationChainLength(cols: number, technique: Technique): number {
  if (technique === 'blanket-sc') return cols + 1;
  if (technique === 'decor-dc') return cols + 2;
  return 2 * cols + 3;
}
