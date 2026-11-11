import type { Dispatch } from 'react';
import { setAutoMask, type AppAction } from '../../app/state';
import { filledMask } from '../../segmentation/mask';

/**
 * One automatic cutout per photo. Kept outside React so that leaving the step
 * and coming back re-attaches to the same run instead of starting another, and
 * so the result is stored even if the user has moved on (the reducer ignores
 * it if the photo has changed).
 */
interface Run {
  progress: number;
  listeners: Set<(fraction: number) => void>;
}

const runs = new WeakMap<ImageData, Run>();

export function startAutoCutout(photo: ImageData, dispatch: Dispatch<AppAction>): Run {
  const existing = runs.get(photo);
  if (existing) return existing;

  const run: Run = { progress: 0, listeners: new Set() };
  runs.set(photo, run);
  const report = (fraction: number) => {
    run.progress = Math.max(run.progress, fraction);
    run.listeners.forEach((l) => l(run.progress));
  };

  (async () => {
    try {
      const { createSegmenter } = await import('../../segmentation/segmenter');
      const segmenter = await createSegmenter();
      const mask = await segmenter.segment(photo, report);
      dispatch(setAutoMask(mask, photo));
    } catch (err) {
      console.warn('Automatic cutout failed; falling back to manual painting.', err);
      // An empty automatic mask shows the "couldn't find your pet" fallback.
      dispatch(setAutoMask(filledMask(photo.width * photo.height, 0), photo));
    }
  })();

  return run;
}

export function subscribe(run: Run, listener: (fraction: number) => void): () => void {
  run.listeners.add(listener);
  listener(run.progress);
  return () => run.listeners.delete(listener);
}
