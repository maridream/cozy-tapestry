import { useEffect, useMemo, useRef, useState } from 'react';
import { isColorEdited, patternInputs, setPattern, updateSettings, useApp } from '../../app/state';
import { Segmented } from '../../components/Segmented';
import { Slider } from '../../components/Slider';
import { COLOR_COUNT } from '../../config/crochet';
import { buildPattern } from '../../engine/buildPattern';
import { renderPreview } from '../../engine/renderPreview';
import type { CutoutImage, Pattern } from '../../types';
import { ColorRow } from './ColorRow';
import './ColorsStep.css';

/** Rebuild this long after the last change. */
const DEBOUNCE_MS = 150;

export function ColorsStep() {
  const { state, dispatch } = useApp();
  const { settings, lockedPalette, photo, mask } = state;
  // Stable while the photo and mask are unchanged (getCutout would make a new object every render).
  const cutout = useMemo<CutoutImage | null>(() => (photo && mask ? { image: photo, mask } : null), [photo, mask]);
  const [shown, setShown] = useState<Pattern | null>(state.pattern);
  const [resetNote, setResetNote] = useState(false);
  const firstBuild = useRef(true);

  // Build on entry (straight away) and ~150 ms after each change.
  useEffect(() => {
    if (!cutout) return;
    if (state.pattern) {
      setShown(state.pattern);
      firstBuild.current = false;
      return;
    }
    const from = patternInputs(state);
    const delay = firstBuild.current ? 0 : DEBOUNCE_MS;
    firstBuild.current = false;
    const t = window.setTimeout(() => {
      const p = buildPattern(cutout, from.settings, from.lockedPalette);
      dispatch(setPattern(p, from));
    }, delay);
    return () => window.clearTimeout(t);
    // `state` is read only through these fields.
  }, [cutout, settings, lockedPalette, state.pattern, dispatch]);

  const filet = settings.technique === 'decor-filet';
  const updating = state.pattern === null;

  const shares = useMemo(() => {
    if (!shown) return [];
    const counts = new Array(shown.grid.palette.length).fill(0);
    for (const c of shown.grid.cells) counts[c]++;
    return counts.map((n) => n / shown.grid.cells.length);
  }, [shown]);

  const setColorCount = (n: number) => {
    if (n === settings.colorCount) return;
    if (lockedPalette.some((c) => c.role === 'subject')) setResetNote(true);
    dispatch(updateSettings({ colorCount: n }));
  };

  return (
    <div className="colors">
      <div className="colors__preview">
        <Preview pattern={shown} />
        <p className={`colors__status ${updating ? 'is-updating' : ''}`} aria-live="polite">
          {updating ? 'Updating…' : shown ? `${shown.gridSpec.cols} × ${shown.gridSpec.rows} ${filet ? 'squares' : 'stitches'}` : ''}
        </p>
      </div>

      <div className="colors__controls">
        {!filet ? (
          <>
            <Slider
              label="Colors (including background)"
              min={COLOR_COUNT.min}
              max={COLOR_COUNT.max}
              value={settings.colorCount}
              onChange={setColorCount}
              hint="Fewer colors are easier to crochet."
            />
            {resetNote && <p className="colors__note">Changing the number of colors resets your swaps.</p>}

            <div className="colors__list-wrap">
              <h2 className="colors__heading">Your colors</h2>
              <p className="colors__hint">Click a color to match yarn you already have.</p>
              <ul className="colors__list">
                {shown?.grid.palette.map((c, i) => (
                  <ColorRow key={`${c.role}-${c.autoHex}-${i}`} color={c} share={shares[i] ?? 0} edited={isColorEdited(state, c)} />
                ))}
              </ul>
            </div>
          </>
        ) : (
          <>
            <div className="colors__list-wrap">
              <h2 className="colors__heading">Yarn color</h2>
              <p className="colors__hint">Filet uses one yarn. Pick it to match yours.</p>
              <ul className="colors__list">
                {shown?.grid.palette[1] && <ColorRow color={shown.grid.palette[1]} edited={isColorEdited(state, shown.grid.palette[1])} />}
              </ul>
            </div>
            <label className="colors__toggle">
              <input
                type="checkbox"
                checked={settings.filetShowDetails}
                onChange={(e) => dispatch(updateSettings({ filetShowDetails: e.target.checked }))}
              />
              <span>Show eyes and nose as open squares</span>
            </label>
          </>
        )}

        <Segmented<'0' | '1' | '2'>
          legend="Detail"
          name="colors-detail"
          value={String(settings.smoothing) as '0' | '1' | '2'}
          onChange={(v) => dispatch(updateSettings({ smoothing: Number(v) as 0 | 1 | 2 }))}
          options={[
            { value: '0', label: 'Crisp' },
            { value: '1', label: 'Balanced' },
            { value: '2', label: 'Smooth' },
          ]}
          hint="Smooth removes stray single stitches."
        />

        {shown && (
          <p className="colors__yarn">
            About {Math.ceil(shown.estimate.totalYards).toLocaleString()} yd ({Math.ceil(shown.estimate.totalMeters).toLocaleString()} m) of yarn in
            total. <span className="colors__estimate">Estimate — make a gauge swatch first.</span>
          </p>
        )}
      </div>
    </div>
  );
}

function Preview({ pattern }: { pattern: Pattern | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap || !pattern) return;
    const draw = () =>
      renderPreview(canvas, pattern.grid, pattern.gridSpec, pattern.settings.technique, {
        cssWidth: wrap.clientWidth,
        maxCssHeight: Math.min(560, window.innerHeight * 0.65),
      });
    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [pattern]);

  const p = pattern;
  const label = p
    ? `Stitch preview: ${p.grid.palette.length - (p.settings.technique === 'decor-filet' ? 1 : 0)} colors, ${p.gridSpec.cols} by ${p.gridSpec.rows}.`
    : 'Stitch preview loading';
  return (
    <div className="colors__stage" ref={wrapRef}>
      <canvas ref={canvasRef} className="colors__canvas" role="img" aria-label={label} />
    </div>
  );
}
