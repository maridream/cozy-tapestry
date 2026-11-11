/**
 * Background removal behind one small interface, so the model/library can be
 * swapped without touching the UI.
 *
 * PHASE 2 — implement per docs/phase-2/README.md.
 */
export interface SubjectSegmenter {
  /**
   * Returns a mask the same size as `image`: one byte per pixel,
   * 0 = background, 255 = subject. `onProgress` reports 0..1 while the
   * model downloads and runs.
   */
  segment(image: ImageData, onProgress?: (fraction: number) => void): Promise<Uint8ClampedArray>;
}

/** Lazily creates the default in-browser segmenter (dynamic import — keep the model out of the main bundle). */
export async function createSegmenter(): Promise<SubjectSegmenter> {
  throw new Error('createSegmenter: not implemented (Phase 2)');
}
