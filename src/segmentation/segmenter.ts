/**
 * Background removal behind one small interface, so the model/library can be
 * swapped without touching the UI.
 *
 * Implementation: @imgly/background-removal (ISNet, quantized) running in a
 * Web Worker. Model files are self-hosted in public/models/imgly/.
 */
import { alphaChannel, resizeMaskBilinear } from './mask';
import type { SegmentRequest, SegmentResponse } from './segmenter.worker';

export interface SubjectSegmenter {
  /**
   * Returns a mask the same size as `image`: one byte per pixel,
   * 0 = background, 255 = subject. `onProgress` reports 0..1 while the
   * model downloads and runs.
   */
  segment(image: ImageData, onProgress?: (fraction: number) => void): Promise<Uint8ClampedArray>;
}

/** The model works at 1024 × 1024; sending more pixels only costs time. */
const MODEL_INPUT_SIDE = 1024;

let cached: Promise<SubjectSegmenter> | null = null;

/** Lazily creates the default in-browser segmenter (the worker + library load only when first needed). */
export function createSegmenter(): Promise<SubjectSegmenter> {
  cached ??= Promise.resolve(new WorkerSegmenter());
  return cached;
}

class WorkerSegmenter implements SubjectSegmenter {
  private worker: Worker | null = null;
  private nextId = 1;

  private getWorker(): Worker {
    this.worker ??= new Worker(new URL('./segmenter.worker.ts', import.meta.url), { type: 'module' });
    return this.worker;
  }

  /** After a failure the library keeps its failed load cached, so start a fresh worker next time. */
  private resetWorker() {
    this.worker?.terminate();
    this.worker = null;
  }

  async segment(image: ImageData, onProgress?: (fraction: number) => void): Promise<Uint8ClampedArray> {
    const small = downscale(image, MODEL_INPUT_SIDE);
    const worker = this.getWorker();
    const id = this.nextId++;
    const publicPath = new URL('models/imgly/', document.baseURI).href;
    const buffer = small.data.slice().buffer; // copy: the transfer must not detach the caller's pixels

    const result = await new Promise<{ rgba: ArrayBuffer; width: number; height: number }>((resolve, reject) => {
      const onMessage = (e: MessageEvent<SegmentResponse>) => {
        const msg = e.data;
        if (msg.id !== id) return;
        if (msg.type === 'progress') onProgress?.(msg.fraction);
        else {
          worker.removeEventListener('message', onMessage);
          worker.removeEventListener('error', onError);
          if (msg.type === 'done') resolve(msg);
          else reject(new Error(msg.message));
        }
      };
      const onError = (e: ErrorEvent) => {
        worker.removeEventListener('message', onMessage);
        worker.removeEventListener('error', onError);
        reject(new Error(e.message || 'segmenter worker failed'));
      };
      worker.addEventListener('message', onMessage);
      worker.addEventListener('error', onError);
      const req: SegmentRequest = { id, rgba: buffer, width: small.width, height: small.height, publicPath };
      worker.postMessage(req, [buffer]);
    }).catch((err) => {
      this.resetWorker();
      throw err;
    });

    const alpha = alphaChannel(new Uint8Array(result.rgba));
    return resizeMaskBilinear(alpha, result.width, result.height, image.width, image.height);
  }
}

/** Copy of `image` with its longest side at most `maxSide` (never upscaled). */
function downscale(image: ImageData, maxSide: number): ImageData {
  const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
  if (scale === 1) return image;
  const w = Math.max(1, Math.round(image.width * scale));
  const h = Math.max(1, Math.round(image.height * scale));
  const src = new OffscreenCanvas(image.width, image.height);
  src.getContext('2d')!.putImageData(image, 0, 0);
  const dst = new OffscreenCanvas(w, h);
  const ctx = dst.getContext('2d', { willReadFrequently: true })!;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(src, 0, 0, w, h);
  return ctx.getImageData(0, 0, w, h);
}
