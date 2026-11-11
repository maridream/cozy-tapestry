import type { jsPDF as JsPdf } from 'jspdf';
import type { Pattern } from '../types';
import { CHART_GUTTER_IN, CHART_HEADER_IN, MARGIN_IN, PAPER_SIZE, planChartPages, type ChartPlan, type ChartTile, type Paper } from './chartLayout';
import { ABBREVIATIONS, ESTIMATE_NOTE, howToRead, patternFacts, roundUp, symbolFor, yarnNotes } from './patternText';

/**
 * Pattern -> multi-page PDF: cover + yarn list, overview map, chart pages, written rows.
 * jsPDF is loaded on demand so it stays out of the main bundle.
 */

export interface PdfOptions {
  paper: Paper;
  /** Usually the photo's file name. */
  title?: string;
  /** 0..1 while pages are drawn. */
  onProgress?: (fraction: number) => void;
}

const M = MARGIN_IN;
const INK = '#222222';
const MUTED = '#666666';
const FILET_FILLED = '#333333';

export async function exportPatternPdf(pattern: Pattern, previewPng: Blob, options: PdfOptions = { paper: 'letter' }): Promise<Blob> {
  const { jsPDF } = await import('jspdf');
  const paper = options.paper;
  const page = PAPER_SIZE[paper];
  const doc = new jsPDF({ orientation: 'portrait', unit: 'in', format: paper === 'a4' ? 'a4' : 'letter', compress: true });
  doc.setProperties({ title: 'Cozy Tapestry pattern', creator: 'Cozy Tapestry' });
  const png = new Uint8Array(await previewPng.arrayBuffer());
  const { gridSpec } = pattern;
  const plan = planChartPages(gridSpec.cols, gridSpec.rows, gridSpec.cellHeightIn / gridSpec.cellWidthIn, paper);
  const progress = options.onProgress ?? (() => {});
  const yieldToUi = () => new Promise((r) => setTimeout(r, 0));

  drawCover(doc, pattern, png, page, options.title);
  progress(0.05);

  if (plan.tiles.length > 1) {
    doc.addPage();
    drawOverview(doc, pattern, png, plan, page);
  }

  for (const tile of plan.tiles) {
    doc.addPage();
    drawChartPage(doc, pattern, plan, tile, page);
    progress(0.05 + (0.85 * tile.index) / plan.tiles.length);
    if (tile.index % 3 === 0) await yieldToUi();
  }

  drawWrittenRows(doc, pattern, page);
  progress(0.95);

  // Footer on every page.
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(MUTED);
    doc.text(safe(`Cozy Tapestry — page ${i} of ${total}`), page.width / 2, page.height - M / 2, { align: 'center' });
  }
  progress(1);
  return doc.output('blob');
}

// ----------------------------------------------------------------- text ---

/** Built-in PDF fonts only know Latin-1: swap typographic characters and drop anything else. */
export function safe(text: string): string {
  return text
    .replace(/[–—]/g, '-')
    .replace(/…/g, '...')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/•/g, '-')
    .replace(/[^\u0000-ÿ]/g, '');
}

function para(doc: JsPdf, text: string, x: number, y: number, width: number, size = 10, lineH = 0.17): number {
  doc.setFontSize(size);
  const lines = doc.splitTextToSize(safe(text), width) as string[];
  doc.text(lines, x, y);
  return y + lines.length * lineH;
}

/** Relative luminance of #rrggbb. */
function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const lin = (v: number) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
}

// ---------------------------------------------------------------- cover ---

function drawCover(doc: JsPdf, p: Pattern, png: Uint8Array, page: { width: number; height: number }, title?: string) {
  const width = page.width - 2 * M;
  let y = M + 0.35;
  doc.setTextColor(INK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('Cozy Tapestry pattern', M, y);
  if (title) {
    y += 0.28;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(MUTED);
    doc.text(safe(title), M, y);
    doc.setTextColor(INK);
  }
  y += 0.25;

  // Preview on the left, facts on the right.
  const aspect = p.gridSpec.finished.height / p.gridSpec.finished.width;
  let imgW = Math.min(3.4, width * 0.48);
  let imgH = imgW * aspect;
  if (imgH > 3.9) {
    imgH = 3.9;
    imgW = imgH / aspect;
  }
  doc.addImage(png, 'PNG', M, y, imgW, imgH);
  doc.setDrawColor('#999999');
  doc.setLineWidth(0.01);
  doc.rect(M, y, imgW, imgH);

  const fx = M + imgW + 0.3;
  const fw = page.width - M - fx;
  let fy = y + 0.12;
  for (const [k, v] of patternFacts(p)) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(MUTED);
    doc.text(safe(k).toUpperCase(), fx, fy);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(INK);
    fy = para(doc, v, fx, fy + 0.17, fw, 10.5, 0.17) + 0.08;
  }
  y = Math.max(y + imgH, fy) + 0.3;

  // Yarn table.
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('Yarn shopping list', M, y);
  y += 0.25;
  const filet = p.settings.technique === 'decor-filet';
  const cols = { sym: M, sw: M + 0.35, name: M + 0.75, yd: M + width - 2.0, m: M + width - 1.1, sk: M + width };
  doc.setFontSize(8.5);
  doc.setTextColor(MUTED);
  if (!filet) doc.text('SYMBOL', cols.sym, y);
  doc.text('COLOR', cols.name, y);
  doc.text('YARDS', cols.yd, y, { align: 'right' });
  doc.text('METERS', cols.m, y, { align: 'right' });
  doc.text('SKEINS', cols.sk, y, { align: 'right' });
  doc.setTextColor(INK);
  y += 0.08;
  doc.setLineWidth(0.01);
  doc.setDrawColor('#999999');
  doc.line(M, y, M + width, y);
  y += 0.22;
  doc.setFontSize(10.5);
  for (const l of p.estimate.lines) {
    const c = p.grid.palette[l.colorIndex];
    doc.setFont('helvetica', 'bold');
    if (!filet) doc.text(symbolFor(l.colorIndex), cols.sym + 0.08, y);
    doc.setFillColor(c.hex);
    doc.setDrawColor('#555555');
    doc.rect(cols.sw, y - 0.15, 0.28, 0.2, 'FD');
    doc.setFont('helvetica', 'normal');
    doc.text(safe(c.name), cols.name, y);
    doc.text(roundUp(l.yards).toLocaleString('en-US'), cols.yd, y, { align: 'right' });
    doc.text(roundUp(l.meters).toLocaleString('en-US'), cols.m, y, { align: 'right' });
    doc.text(String(l.skeins), cols.sk, y, { align: 'right' });
    y += 0.3;
  }
  doc.setDrawColor('#999999');
  doc.line(M, y - 0.17, M + width, y - 0.17);
  doc.setFont('helvetica', 'bold');
  doc.text('Total', cols.name, y);
  doc.text(roundUp(p.estimate.totalYards).toLocaleString('en-US'), cols.yd, y, { align: 'right' });
  doc.text(roundUp(p.estimate.totalMeters).toLocaleString('en-US'), cols.m, y, { align: 'right' });
  doc.text(String(p.estimate.lines.reduce((s, l) => s + l.skeins, 0)), cols.sk, y, { align: 'right' });
  y += 0.22;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(MUTED);
  y = para(doc, `${yarnNotes(p).join(' ')} Skeins of ${p.estimate.yardsPerSkein} yd.`, M, y, width, 9, 0.15) + 0.15;
  doc.setTextColor(INK);

  // Notes + how to read. Spill onto a new page if needed.
  const blocks: [string, string[]][] = [
    ['How to read this pattern', howToRead(p)],
    ['Good to know', [ESTIMATE_NOTE, `Abbreviations: ${ABBREVIATIONS}`, filet ? 'Chart: dark squares are filled, white squares are open.' : 'Chart: each square shows its color letter, so it reads in black and white.']],
  ];
  for (const [heading, lines] of blocks) {
    if (y > page.height - M - 1.2) {
      doc.addPage();
      y = M + 0.3;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(heading, M, y);
    y += 0.22;
    doc.setFont('helvetica', 'normal');
    for (const t of lines) {
      if (y > page.height - M - 0.5) {
        doc.addPage();
        y = M + 0.3;
      }
      y = para(doc, t, M, y, width, 9.5, 0.16) + 0.06;
    }
    y += 0.15;
  }
}

// ------------------------------------------------------------- overview ---

function drawOverview(doc: JsPdf, p: Pattern, png: Uint8Array, plan: ChartPlan, page: { width: number; height: number }) {
  const width = page.width - 2 * M;
  let y = M + 0.3;
  doc.setTextColor(INK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('Chart overview', M, y);
  y += 0.25;
  doc.setFont('helvetica', 'normal');
  y = para(doc, `The chart is split over ${plan.tiles.length} pages. Start at page 1 (bottom left, where row 1 is) and work up.`, M, y, width, 10) + 0.15;

  const aspect = p.gridSpec.finished.height / p.gridSpec.finished.width;
  const maxH = page.height - y - M - 0.5;
  let w = width;
  let h = w * aspect;
  if (h > maxH) {
    h = maxH;
    w = h / aspect;
  }
  const x = M + (width - w) / 2;
  doc.addImage(png, 'PNG', x, y, w, h);
  const { cols, rows } = p.gridSpec;
  doc.setDrawColor('#000000');
  doc.setLineWidth(0.02);
  for (const t of plan.tiles) {
    const tx = x + (t.col0 / cols) * w;
    const tw = ((t.col1 - t.col0) / cols) * w;
    const top = y + ((rows - t.rowTo) / rows) * h;
    const th = ((t.rowTo - t.rowFrom + 1) / rows) * h;
    doc.setFillColor('#ffffff');
    doc.rect(tx, top, tw, th);
    const label = String(t.index);
    const fs = Math.max(7, Math.min(16, tw * 30));
    doc.setFontSize(fs);
    doc.setFont('helvetica', 'bold');
    const lw = doc.getTextWidth(label) + 0.08;
    doc.rect(tx + tw / 2 - lw / 2, top + th / 2 - (fs / 72) * 0.6, lw, (fs / 72) * 1.05, 'F');
    doc.setTextColor('#000000');
    doc.text(label, tx + tw / 2, top + th / 2 + (fs / 72) * 0.3, { align: 'center' });
  }
}

// ---------------------------------------------------------------- chart ---

function drawChartPage(doc: JsPdf, p: Pattern, plan: ChartPlan, t: ChartTile, page: { width: number; height: number }) {
  const { cols, rows, cells, palette } = p.grid;
  const filet = p.settings.technique === 'decor-filet';
  const { cellW, cellH } = plan;
  const nCols = t.col1 - t.col0;
  const nRows = t.rowTo - t.rowFrom + 1;
  const x0 = M + CHART_GUTTER_IN;
  const y0 = M + CHART_HEADER_IN;

  // Heading.
  doc.setTextColor(INK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(safe(`Chart — columns ${t.col0 + 1}–${t.col1}, rows ${t.rowFrom}–${t.rowTo} (page ${t.index} of ${plan.tiles.length})`), M, M + 0.18);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(MUTED);
  doc.text(safe('Odd rows (RS) are worked right to left; even rows (WS) left to right. Row 1 is at the bottom.'), M, M + 0.34);
  if (!filet) {
    const legend = palette.map((c, i) => `${symbolFor(i)} = ${c.name}`).join('   ');
    doc.text(doc.splitTextToSize(safe(legend), page.width - 2 * M)[0] as string, M, M + 0.48);
  }
  doc.setTextColor(INK);

  // Cells, run-merged per row for fewer fill calls.
  const yOf = (n: number) => y0 + (t.rowTo - n) * cellH; // top edge of crochet row n
  for (let n = t.rowFrom; n <= t.rowTo; n++) {
    const r = rows - n;
    const y = yOf(n);
    let start = t.col0;
    for (let c = t.col0 + 1; c <= t.col1; c++) {
      const k = cells[r * cols + start];
      if (c === t.col1 || cells[r * cols + c] !== k) {
        const fill = filet ? (k === 1 ? FILET_FILLED : null) : palette[k].hex;
        if (fill) {
          doc.setFillColor(fill);
          doc.rect(x0 + (start - t.col0) * cellW, y, (c - start) * cellW, cellH, 'F');
        }
        start = c;
      }
    }
  }

  // Letters.
  if (!filet) {
    const fs = Math.min(cellW, cellH) * 72 * 0.62;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(fs);
    const dark = palette.map((c) => luminance(c.hex) > 0.3);
    const letters = palette.map((_, i) => symbolFor(i));
    const baseline = cellH / 2 + (fs / 72) * 0.35;
    let current = '';
    for (let n = t.rowFrom; n <= t.rowTo; n++) {
      const r = rows - n;
      const y = yOf(n) + baseline;
      for (let c = t.col0; c < t.col1; c++) {
        const k = cells[r * cols + c];
        const color = dark[k] ? '#1a1a1a' : '#ffffff';
        if (color !== current) {
          doc.setTextColor(color);
          current = color;
        }
        doc.text(letters[k], x0 + (c - t.col0 + 0.5) * cellW, y, { align: 'center' });
      }
    }
  }

  // Grid lines: thin per cell, heavy every 10 (columns from the left, rows from row 1).
  const right = x0 + nCols * cellW;
  const bottom = y0 + nRows * cellH;
  for (let c = t.col0; c <= t.col1; c++) {
    const heavy = c % 10 === 0 || c === t.col0 || c === t.col1;
    doc.setDrawColor(heavy ? '#000000' : '#9a9a9a');
    doc.setLineWidth(heavy ? 0.014 : 0.004);
    const x = x0 + (c - t.col0) * cellW;
    doc.line(x, y0, x, bottom);
  }
  for (let n = t.rowFrom - 1; n <= t.rowTo; n++) {
    // line under crochet row n+1 (i.e. between n and n+1)
    const heavy = n % 10 === 0 || n === t.rowFrom - 1 || n === t.rowTo;
    doc.setDrawColor(heavy ? '#000000' : '#9a9a9a');
    doc.setLineWidth(heavy ? 0.014 : 0.004);
    const y = yOf(n + 1) + cellH;
    doc.line(x0, y, right, y);
  }

  // Row numbers on both sides; every row when there is room, else every 5.
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(INK);
  const rfs = Math.min(7, cellH * 72 * 0.7);
  const every = rfs >= 4.5 ? 1 : 5;
  doc.setFontSize(Math.max(rfs, 5));
  for (let n = t.rowFrom; n <= t.rowTo; n++) {
    if (n % every !== 0 && n !== t.rowFrom && n % 10 !== 0) continue;
    const y = yOf(n) + cellH / 2 + (Math.max(rfs, 5) / 72) * 0.35;
    doc.setFont('helvetica', n % 10 === 0 ? 'bold' : 'normal');
    doc.text(String(n), x0 - 0.06, y, { align: 'right' });
    doc.text(String(n), right + 0.06, y);
  }
  // Column numbers along the bottom, every 10 (and the first column).
  doc.setFontSize(6.5);
  for (let c = t.col0; c < t.col1; c++) {
    const num = c + 1;
    if (num % 10 !== 0 && c !== t.col0) continue;
    doc.setFont('helvetica', num % 10 === 0 ? 'bold' : 'normal');
    doc.text(String(num), x0 + (c - t.col0 + 0.5) * cellW, bottom + 0.15, { align: 'center' });
  }
}

// --------------------------------------------------------- written rows ---

function drawWrittenRows(doc: JsPdf, p: Pattern, page: { width: number; height: number }) {
  const width = page.width - 2 * M;
  const box = 0.11;
  const textX = M + 0.22;
  const indent = 0.35;
  const lineH = 0.165;
  const top = M + 0.3;
  const limit = page.height - M - 0.35;
  doc.addPage();
  let y = top;
  doc.setTextColor(INK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('Row by row', M, y);
  y += 0.22;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(MUTED);
  y = para(doc, 'Tick each row off as you go. Counts are listed in the order you work them.', M, y, width, 9) + 0.12;
  doc.setTextColor(INK);
  doc.setFontSize(9.5);
  doc.setDrawColor('#444444');
  doc.setLineWidth(0.008);

  for (const row of p.rows) {
    const first = doc.splitTextToSize(safe(row.text), width - (textX - M)) as string[];
    // Wrap again with the hanging indent for continuation lines.
    const lines = first.length > 1 ? [first[0], ...(doc.splitTextToSize(first.slice(1).join(' '), width - (textX - M) - indent) as string[])] : first;
    if (y + lines.length * lineH > limit) {
      doc.addPage();
      y = top;
    }
    doc.rect(M, y - box + 0.01, box, box);
    lines.forEach((line, i) => doc.text(line, textX + (i ? indent : 0), y + i * lineH));
    y += lines.length * lineH + 0.03;
  }
}
