import type { Pattern } from '../types';

/**
 * Pattern -> multi-page PDF (cover + yarn list, grid chart pages, written rows).
 *
 * PHASE 4 — implement per docs/phase-4/README.md §"PDF".
 */
export async function exportPatternPdf(_pattern: Pattern, _previewPng: Blob): Promise<Blob> {
  throw new Error('exportPatternPdf: not implemented (Phase 4)');
}
