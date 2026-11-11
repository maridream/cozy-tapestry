import { useEffect, useMemo, useRef, useState } from 'react';
import { buildPattern } from '../engine/buildPattern';
import { computeGridSpec, getGauge } from '../engine/sizing';
import { textBlock } from '../steps/design/textBlocks';
import type { CutoutImage, Pattern } from '../types';
import { patternInputs, setPattern, useApp } from './state';

/**
 * Keeps state.pattern built for the current inputs: straight away when a step opens,
 * then `debounceMs` after each change. Returns the last built pattern to show while
 * a rebuild is pending, so previews never go blank.
 */
export function usePatternBuild(debounceMs = 150): { shown: Pattern | null; updating: boolean } {
  const { state, dispatch } = useApp();
  const { photo, mask, settings, lockedPalette } = state;
  // Stable while the photo and mask are unchanged.
  const cutout = useMemo<CutoutImage | null>(() => (photo && mask ? { image: photo, mask } : null), [photo, mask]);
  const [shown, setShown] = useState<Pattern | null>(state.pattern);
  const first = useRef(true);

  useEffect(() => {
    if (!cutout) return;
    if (state.pattern) {
      setShown(state.pattern);
      first.current = false;
      return;
    }
    const from = patternInputs(state);
    const delay = first.current ? 0 : debounceMs;
    first.current = false;
    let cancelled = false;
    const t = window.setTimeout(async () => {
      const gridSpec = computeGridSpec(from.settings.size, getGauge(from.settings.technique, from.settings.yarnWeight));
      const blocks = await Promise.all(from.settings.texts.map((layer) => textBlock(layer, gridSpec).catch(() => null)));
      if (cancelled) return;
      dispatch(setPattern(buildPattern(cutout, from.settings, from.lockedPalette, blocks), from));
    }, delay);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
    // `state` is read only through these fields.
  }, [cutout, settings, lockedPalette, state.pattern, dispatch, debounceMs]); // eslint-disable-line react-hooks/exhaustive-deps

  return { shown, updating: state.pattern === null };
}
