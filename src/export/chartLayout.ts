/** Page tiling for the PDF chart. Pure, so it can be tested. */

export type Paper = 'letter' | 'a4';

/** Page size in inches, portrait. */
export const PAPER_SIZE: Record<Paper, { width: number; height: number }> = {
  letter: { width: 8.5, height: 11 },
  a4: { width: 8.27, height: 11.69 },
};

export const MARGIN_IN = 0.5;
/** Space above the chart for the page heading. */
export const CHART_HEADER_IN = 0.6;
/** Space below for the footer line and column numbers. */
export const CHART_FOOTER_IN = 0.65;
/** Row numbers on both sides. */
export const CHART_GUTTER_IN = 0.35;

/** Normal chart cell width on paper; ~50 columns fit across a page. */
const CELL_W_IN = 0.15;
/** A chart that fits on one page may use bigger cells, up to this. */
const MAX_CELL_W_IN = 0.32;

export interface ChartTile {
  /** 1-based page number among chart pages, in printing order. */
  index: number;
  /** Chart columns, 0-based, inclusive start, exclusive end (left = 0). */
  col0: number;
  col1: number;
  /** Crochet rows, 1-based (1 = bottom), inclusive. */
  rowFrom: number;
  rowTo: number;
}

export interface ChartPlan {
  /** Cell size on paper, inches. */
  cellW: number;
  cellH: number;
  colsPerPage: number;
  rowsPerPage: number;
  tiles: ChartTile[];
  /** Tiles across and up. */
  across: number;
  up: number;
}

/**
 * Splits a cols × rows chart into pages. `cellAspect` = cellHeightIn / cellWidthIn
 * (≈1.84 for dc). Order: bottom-left first, left to right, then up.
 */
export function planChartPages(cols: number, rows: number, cellAspect: number, paper: Paper): ChartPlan {
  const page = PAPER_SIZE[paper];
  const usableW = page.width - 2 * MARGIN_IN - 2 * CHART_GUTTER_IN;
  const usableH = page.height - 2 * MARGIN_IN - CHART_HEADER_IN - CHART_FOOTER_IN;

  // Whole chart on one page, if it fits at a readable size.
  const fitW = Math.min(MAX_CELL_W_IN, usableW / cols, usableH / (rows * cellAspect));
  let cellW: number;
  if (fitW >= CELL_W_IN) {
    cellW = fitW;
  } else {
    cellW = Math.min(CELL_W_IN, usableW / Math.min(cols, 50));
  }
  const cellH = cellW * cellAspect;
  const colsPerPage = Math.max(1, Math.min(cols, Math.floor(usableW / cellW + 1e-9)));
  const rowsPerPage = Math.max(1, Math.min(rows, Math.floor(usableH / cellH + 1e-9)));
  const across = Math.ceil(cols / colsPerPage);
  const up = Math.ceil(rows / rowsPerPage);

  const tiles: ChartTile[] = [];
  for (let ty = 0; ty < up; ty++) {
    for (let tx = 0; tx < across; tx++) {
      tiles.push({
        index: tiles.length + 1,
        col0: tx * colsPerPage,
        col1: Math.min(cols, (tx + 1) * colsPerPage),
        rowFrom: ty * rowsPerPage + 1,
        rowTo: Math.min(rows, (ty + 1) * rowsPerPage),
      });
    }
  }
  return { cellW, cellH, colsPerPage, rowsPerPage, tiles, across, up };
}
