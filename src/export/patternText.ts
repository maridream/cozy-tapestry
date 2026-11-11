import { YARN_WEIGHT_LABELS } from '../config/crochet';
import { MOTIFS } from '../engine/motifs';
import type { Pattern, Technique } from '../types';

/** Words shared by the Pattern page and the PDF, so both say exactly the same thing. */

export const TECHNIQUE_NAMES: Record<Technique, string> = {
  'blanket-sc': 'Thick blanket (single crochet)',
  'decor-dc': 'Decorative tapestry — Full color (double crochet)',
  'decor-filet': 'Decorative tapestry — Filet mesh',
};

const num = (v: number) => (Math.round(v * 10) / 10).toString();
const inches = (v: number) => Math.round(v);
const cm = (v: number) => Math.round(v * 2.54);

export function stitchWord(technique: Technique): string {
  return technique === 'blanket-sc' ? 'sc' : technique === 'decor-dc' ? 'dc' : 'squares';
}

export function gaugeText(p: Pattern): string {
  const across = p.gauge.cellsPerInch * 4;
  const up = p.gauge.rowsPerInch * 4;
  return `${num(across)} ${stitchWord(p.settings.technique)} × ${num(up)} rows = 4 in`;
}

/** [label, value] pairs for the summary card and the PDF cover. */
export function patternFacts(p: Pattern): [string, string][] {
  const { finished, cols, rows } = p.gridSpec;
  const filet = p.settings.technique === 'decor-filet';
  return [
    ['Type', TECHNIQUE_NAMES[p.settings.technique]],
    ['Finished size', `about ${inches(finished.width)} × ${inches(finished.height)} in (${cm(finished.width)} × ${cm(finished.height)} cm)`],
    ['Chart', `${cols} ${filet ? 'squares' : 'stitches'} × ${rows} rows`],
    ['Yarn', YARN_WEIGHT_LABELS[p.settings.yarnWeight]],
    ['Hook', `${p.gauge.hookMm} mm (${p.gauge.hookUs})`],
    ['Gauge', gaugeText(p)],
    ['Start', `Chain ${p.foundationChain}`],
    ...designFacts(p),
  ];
}

const DIRECTION_WORDS = { across: 'across', down: 'up and down', diagonal: 'diagonal', 'diagonal-reverse': 'diagonal' } as const;

function designFacts(p: Pattern): [string, string][] {
  const out: [string, string][] = [];
  const bg = p.settings.background;
  if (bg && bg.motif !== 'none') {
    const label = MOTIFS.find((m) => m.id === bg.motif)?.label ?? bg.motif;
    out.push(['Background', `${label}, ${DIRECTION_WORDS[bg.direction]}, ${bg.sizeIn} in repeat`]);
  }
  const texts = (p.settings.texts ?? []).filter((t) => t.text.trim());
  if (texts.length) out.push(['Text', texts.map((t) => `"${t.text.trim()}"`).join(', ')]);
  return out;
}

export const ESTIMATE_NOTE =
  "Sizes and yarn amounts are estimates. Make a small swatch first — if it's bigger or smaller than the gauge, change hook size.";

/** The "How to read this" paragraphs. */
export function howToRead(p: Pattern): string[] {
  const chain = p.foundationChain;
  const out: string[] = [];
  switch (p.settings.technique) {
    case 'blanket-sc':
      out.push(
        `Work from the bottom up. Chain ${chain}. Row 1: sc in the 2nd chain from the hook and in each chain across, changing colors as listed. Chain 1 and turn at the end of every row. Odd rows are the right side.`,
      );
      break;
    case 'decor-dc':
      out.push(
        `Work from the bottom up. Chain ${chain}. Row 1: dc in the 3rd chain from the hook and in each chain across, changing colors as listed. Chain 2 and turn at the end of every row (does not count as a stitch). Odd rows are the right side.`,
      );
      break;
    case 'decor-filet':
      out.push(
        `Work from the bottom up. Chain ${chain}. Each square is 2 stitches. Open = chain 1, skip 1, dc in the next stitch. Filled = dc in the next 2 stitches. Chain 3 at the start of each row (counts as the first dc).`,
      );
      break;
  }
  out.push('Odd rows (RS) are worked right to left; even rows (WS) left to right.');
  if (p.settings.technique !== 'decor-filet') out.push('Change color on the last pull-through of the stitch before the new color.');
  out.push('US crochet terms.');
  return out;
}

export const ABBREVIATIONS = 'ch = chain, sc = single crochet, dc = double crochet, RS = right side, WS = wrong side.';

export function yarnNotes(p: Pattern): string[] {
  const notes = [`Includes about ${Math.round(p.estimate.bufferFraction * 100)}% extra.`];
  if (p.settings.technique === 'blanket-sc') notes.push('Colors are carried inside the stitches, which is counted here.');
  return notes;
}

/** Letter symbol per palette index: A = background, B, C… */
export const symbolFor = (index: number) => String.fromCharCode(65 + index);

/** e.g. cozy-tapestry-rex-24x36in.pdf */
export function pdfFileName(p: Pattern, photoName: string | null): string {
  const slug =
    (photoName ?? 'pet')
      .replace(/\.[a-z0-9]+$/i, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'pet';
  const { width, height } = p.gridSpec.finished;
  return `cozy-tapestry-${slug}-${Math.round(width)}x${Math.round(height)}in.pdf`;
}

/** Whole yards / meters rounded up, for display. */
export const roundUp = (v: number) => Math.ceil(v - 1e-9);
