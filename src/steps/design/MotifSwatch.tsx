import { useEffect, useRef } from 'react';
import { backgroundInk } from '../../engine/motifs';
import type { GridSpec, MotifId } from '../../types';

const N = 32; // cells across the swatch
const SPEC: GridSpec = { cols: N, rows: N, cellWidthIn: 1, cellHeightIn: 1, finished: { width: N, height: N } };

/** A small picture of a motif (two repeats across). Decorative. */
export function MotifSwatch({ motif, ink, paper }: { motif: MotifId; ink: string; paper: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const ctx = ref.current?.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = paper;
    ctx.fillRect(0, 0, N, N);
    if (motif === 'none') return;
    const cells = backgroundInk({ motif, colorHex: ink, sizeIn: N / 2, direction: 'across' }, SPEC);
    ctx.fillStyle = ink;
    for (let i = 0; i < cells.length; i++) if (cells[i]) ctx.fillRect(i % N, Math.floor(i / N), 1, 1);
  }, [motif, ink, paper]);
  return <canvas ref={ref} className="motif__swatch" width={N} height={N} aria-hidden="true" />;
}
