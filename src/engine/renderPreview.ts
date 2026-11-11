import type { GridSpec, PatternGrid, Technique } from '../types';

/**
 * Draws the chart as it will look when made. The one engine file that touches
 * the DOM (canvas).
 */

export interface PreviewOptions {
  /** Light grid every 10 cells (for the printed chart). */
  gridLines?: boolean;
  /** Color behind open filet squares; defaults to the open-mesh palette color, or a contrasting neutral if the yarn is too close to it. */
  surface?: string;
  /** CSS width to fill; defaults to the canvas's laid-out width. */
  cssWidth?: number;
  /** Largest CSS height allowed; the width shrinks to keep proportions. */
  maxCssHeight?: number;
}

type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

/**
 * Fits the piece into `canvas` at its true finished proportions (cells are not
 * square for dc), sized for the device pixel ratio. Sets the canvas CSS size.
 */
export function renderPreview(canvas: HTMLCanvasElement, grid: PatternGrid, gridSpec: GridSpec, technique: Technique, options: PreviewOptions = {}) {
  const aspect = gridSpec.finished.height / gridSpec.finished.width;
  let cssW = options.cssWidth ?? (canvas.parentElement?.clientWidth || canvas.clientWidth || 400);
  if (options.maxCssHeight && cssW * aspect > options.maxCssHeight) cssW = options.maxCssHeight / aspect;
  const cssH = cssW * aspect;
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  canvas.width = Math.max(1, Math.round(cssW * dpr));
  canvas.height = Math.max(1, Math.round(cssH * dpr));
  canvas.style.width = `${cssW}px`;
  canvas.style.height = `${cssH}px`;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  draw(ctx, canvas.width, canvas.height, grid, technique, options);
}

/** PNG of the preview, `widthPx` wide, for the PDF cover. */
export async function renderPreviewToBlob(grid: PatternGrid, gridSpec: GridSpec, technique: Technique, widthPx: number): Promise<Blob> {
  const h = Math.max(1, Math.round((widthPx * gridSpec.finished.height) / gridSpec.finished.width));
  const canvas = new OffscreenCanvas(widthPx, h);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas unavailable');
  draw(ctx, widthPx, h, grid, technique, {});
  return canvas.convertToBlob({ type: 'image/png' });
}

function draw(ctx: Ctx, w: number, h: number, grid: PatternGrid, technique: Technique, options: PreviewOptions) {
  const { cols, rows, cells, palette } = grid;
  const cw = w / cols;
  const ch = h / rows;
  // Snap cell edges to whole pixels so there are no hairline gaps.
  const xs = Array.from({ length: cols + 1 }, (_, c) => Math.round(c * cw));
  const ys = Array.from({ length: rows + 1 }, (_, r) => Math.round(r * ch));
  ctx.clearRect(0, 0, w, h);

  if (technique === 'decor-filet') {
    const yarn = palette[1]?.hex ?? '#8a6a4a';
    ctx.fillStyle = options.surface ?? filetBacking(yarn, palette[0]?.hex ?? '#ffffff');
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = yarn;
    const bar = Math.max(1, Math.min(cw, ch) * 0.18);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x0 = xs[c];
        const y0 = ys[r];
        const x1 = xs[c + 1];
        const y1 = ys[r + 1];
        if (cells[r * cols + c] === 1) {
          ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
        } else {
          // Open square: a yarn-colored frame so the mesh reads as holes.
          ctx.fillRect(x0, y0, x1 - x0, bar);
          ctx.fillRect(x0, y1 - bar, x1 - x0, bar);
          ctx.fillRect(x0, y0, bar, y1 - y0);
          ctx.fillRect(x1 - bar, y0, bar, y1 - y0);
        }
      }
    }
  } else {
    for (let r = 0; r < rows; r++) {
      // Merge runs of equal color into one rectangle — far fewer draw calls.
      let start = 0;
      for (let c = 1; c <= cols; c++) {
        if (c === cols || cells[r * cols + c] !== cells[r * cols + start]) {
          ctx.fillStyle = palette[cells[r * cols + start]]?.hex ?? '#000000';
          ctx.fillRect(xs[start], ys[r], xs[c] - xs[start], ys[r + 1] - ys[r]);
          start = c;
        }
      }
    }
    // Faint line under each row to suggest stitches when cells are big enough.
    if (Math.min(cw, ch) >= 6) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
      const lh = Math.max(1, Math.round(ch * 0.08));
      for (let r = 1; r <= rows; r++) ctx.fillRect(0, ys[r] - lh, w, lh);
      if (technique === 'decor-dc') {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.06)';
        for (let c = 1; c < cols; c++) ctx.fillRect(xs[c], 0, 1, h);
      }
    }
  }

  if (options.gridLines) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    for (let c = 10; c < cols; c += 10) ctx.fillRect(xs[c], 0, 1, h);
    for (let r = rows - 10; r > 0; r -= 10) ctx.fillRect(0, ys[r], w, 1); // counted from the bottom (row 1)
  }
}

const luminance = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  const lin = (v: number) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
};

/** What shows through open filet squares: the chosen background, unless the yarn would barely show against it. */
export function filetBacking(yarnHex: string, backgroundHex: string): string {
  const ratio = (a: string, b: string) => {
    const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
    return (x + 0.05) / (y + 0.05);
  };
  if (ratio(yarnHex, backgroundHex) >= 2.5) return backgroundHex;
  return luminance(yarnHex) > 0.3 ? '#3b2f25' : '#f7efe2';
}
