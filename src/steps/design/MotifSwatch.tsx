import { useEffect, useRef } from 'react';
import { backgroundInk } from '../../engine/motifs';
import type { GridSpec, MotifId } from '../../types';

const N = 48; // cells across the swatch
const CELL = 0.25; // inches: blanket-sc-like stitches, so stitch-drawn shapes show at their real size
const SPEC: GridSpec = { cols: N, rows: N, cellWidthIn: CELL, cellHeightIn: CELL, finished: { width: N * CELL, height: N * CELL } };

/** A small picture of a background pattern. Decorative. */
export function MotifSwatch({ motif, ink, paper, seed = 1 }: { motif: MotifId; ink: string; paper: string; seed?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const ctx = ref.current?.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = paper;
    ctx.fillRect(0, 0, N, N);
    if (motif === 'none') return;
    const cells = backgroundInk({ motif, colorHex: ink, sizeIn: 6, scale: 1, direction: 'across', seed, border: 'none', frame: 'none' }, SPEC);
    ctx.fillStyle = ink;
    for (let i = 0; i < cells.length; i++) if (cells[i]) ctx.fillRect(i % N, Math.floor(i / N), 1, 1);
  }, [motif, ink, paper, seed]);
  return <canvas ref={ref} className="motif__swatch" width={N} height={N} aria-hidden="true" />;
}
