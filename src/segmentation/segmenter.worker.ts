/// <reference lib="webworker" />
/**
 * Runs the background-removal model off the main thread so the page stays responsive.
 * Messages: in  { id, rgba, width, height, publicPath }
 *           out { id, type: 'progress', fraction } | { id, type: 'done', rgba, width, height } | { id, type: 'error', message }
 */
import { segmentForeground, type Config } from '@imgly/background-removal';

export interface SegmentRequest {
  id: number;
  rgba: ArrayBuffer;
  width: number;
  height: number;
  publicPath: string;
}

export type SegmentResponse =
  | { id: number; type: 'progress'; fraction: number }
  | { id: number; type: 'done'; rgba: ArrayBuffer; width: number; height: number }
  | { id: number; type: 'error'; message: string };

const ctx = self as unknown as DedicatedWorkerGlobalScope;
const post = (msg: SegmentResponse, transfer: Transferable[] = []) => ctx.postMessage(msg, transfer);

/** Share of the progress bar given to downloading; the rest is the model run. */
const DOWNLOAD_SHARE = 0.85;

ctx.onmessage = async (event: MessageEvent<SegmentRequest>) => {
  const { id, rgba, width, height, publicPath } = event.data;
  const downloads = new Map<string, { current: number; total: number }>();

  const config: Config = {
    publicPath,
    device: 'cpu',
    model: 'isnet_quint8',
    output: { format: 'image/x-rgba8', quality: 1 },
    progress: (key, current, total) => {
      if (!key.startsWith('fetch:')) return;
      downloads.set(key, { current, total });
      let cur = 0;
      let tot = 0;
      for (const d of downloads.values()) {
        cur += d.current;
        tot += d.total;
      }
      if (tot > 0) post({ id, type: 'progress', fraction: (cur / tot) * DOWNLOAD_SHARE });
    },
  };

  try {
    const input = new Blob([rgba], { type: `image/x-rgba8;width=${width};height=${height}` });
    // Loading is memoised inside the library, so later photos skip the download.
    const result = await segmentForeground(input, config);
    post({ id, type: 'progress', fraction: 1 });
    const out = await result.arrayBuffer();
    post({ id, type: 'done', rgba: out, width, height }, [out]);
  } catch (err) {
    post({ id, type: 'error', message: err instanceof Error ? err.message : String(err) });
  }
};
