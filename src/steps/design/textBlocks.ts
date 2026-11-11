import { pixelTextBlock } from '../../engine/pixelFont';
import type { GridSpec, TextBlock, TextFont, TextLayer } from '../../types';

/** Text styles offered on the Design step. "Stitch" is the built-in pixel font. */
export const TEXT_FONTS: Record<TextFont, { label: string; family: string | null; weight: number; hint: string }> = {
  stitch: { label: 'Stitch', family: null, weight: 400, hint: 'Blocky letters, crisp even when small' },
  bold: { label: 'Bold', family: 'Nunito Variable', weight: 900, hint: 'Rounded and friendly' },
  serif: { label: 'Serif', family: 'Fraunces Variable', weight: 800, hint: 'Classic, storybook feel' },
  script: { label: 'Script', family: 'Pacifico', weight: 400, hint: 'Joined-up handwriting; needs bigger sizes' },
  chunky: { label: 'Chunky', family: 'Bungee', weight: 400, hint: 'Tall, bold capitals' },
};

/** Supersamples per cell in each direction. */
const SS = 4;
/** Cap height as a share of the font size (close enough for these fonts). */
const CAP = 0.72;

const cache = new Map<string, Promise<TextBlock>>();

/** Draws one text layer as a block of cells (cached by text, font, size and gauge). */
export function textBlock(layer: TextLayer, gridSpec: GridSpec): Promise<TextBlock> {
  const key = `${layer.font}|${layer.sizeIn}|${gridSpec.cellWidthIn}|${gridSpec.cellHeightIn}|${layer.text}`;
  let p = cache.get(key);
  if (!p) {
    p = layer.font === 'stitch' ? Promise.resolve(pixelTextBlock(layer.text, layer.sizeIn, gridSpec)) : rasterize(layer, gridSpec);
    cache.set(key, p);
    if (cache.size > 200) cache.delete(cache.keys().next().value!);
  }
  return p;
}

async function rasterize(layer: TextLayer, gridSpec: GridSpec): Promise<TextBlock> {
  const text = layer.text.trim();
  if (!text) return { cols: 0, rows: 0, cells: new Uint8Array(0) };
  const font = TEXT_FONTS[layer.font];
  const pxPerInY = SS / gridSpec.cellHeightIn;
  const pxPerInX = SS / gridSpec.cellWidthIn;
  const fontPx = (layer.sizeIn * pxPerInY) / CAP;
  const css = `${font.weight} ${fontPx}px "${font.family}"`;
  try {
    await document.fonts.load(css, text);
  } catch {
    // Fall back to whatever font the browser has.
  }
  const measure = new OffscreenCanvas(1, 1).getContext('2d')!;
  measure.font = css;
  const m = measure.measureText(text);
  const stretch = pxPerInX / pxPerInY; // cells may be taller than wide
  const pad = SS;
  const w = Math.ceil(((m.actualBoundingBoxLeft + m.actualBoundingBoxRight) * stretch + 2 * pad) / SS) * SS;
  const h = Math.ceil((m.actualBoundingBoxAscent + m.actualBoundingBoxDescent + 2 * pad) / SS) * SS;
  const canvas = new OffscreenCanvas(Math.max(SS, w), Math.max(SS, h));
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.setTransform(stretch, 0, 0, 1, pad + m.actualBoundingBoxLeft * stretch, pad + m.actualBoundingBoxAscent);
  ctx.font = css;
  ctx.fillStyle = '#000';
  ctx.fillText(text, 0, 0);

  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  const cols = canvas.width / SS;
  const rows = canvas.height / SS;
  const cells = new Uint8Array(cols * rows);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      let sum = 0;
      for (let y = 0; y < SS; y++) for (let x = 0; x < SS; x++) sum += data[((r * SS + y) * canvas.width + c * SS + x) * 4 + 3];
      if (sum >= 0.45 * 255 * SS * SS) cells[r * cols + c] = 1;
    }
  }
  return trim({ cols, rows, cells });
}

/** Removes empty rows and columns around a block. */
function trim(b: TextBlock): TextBlock {
  let c0 = b.cols, c1 = -1, r0 = b.rows, r1 = -1;
  for (let r = 0; r < b.rows; r++)
    for (let c = 0; c < b.cols; c++)
      if (b.cells[r * b.cols + c]) {
        c0 = Math.min(c0, c);
        c1 = Math.max(c1, c);
        r0 = Math.min(r0, r);
        r1 = Math.max(r1, r);
      }
  if (c1 < 0) return { cols: 0, rows: 0, cells: new Uint8Array(0) };
  const cols = c1 - c0 + 1;
  const rows = r1 - r0 + 1;
  const cells = new Uint8Array(cols * rows);
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) cells[r * cols + c] = b.cells[(r + r0) * b.cols + c + c0];
  return { cols, rows, cells };
}
