import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { resetMask, setMask, useApp } from '../../app/state';
import { Button } from '../../components/Button';
import { Segmented } from '../../components/Segmented';
import { Slider } from '../../components/Slider';
import { filledMask, hasMeaningfulSubject } from '../../segmentation/mask';
import { brushRadius, paintStroke, type DirtyRect, type Point } from '../../segmentation/maskBrush';

const UNDO_LIMIT = 20;
/** How strongly the background is covered (0..1). */
const VEIL_OPACITY = 0.75;

type Mode = 'keep' | 'erase';
type Show = 'cutout' | 'original';

interface Props {
  photo: ImageData;
  mask: Uint8ClampedArray;
  autoMask: Uint8ClampedArray;
}

export function CutoutEditor({ photo, mask, autoMask }: Props) {
  const { dispatch } = useApp();
  const [mode, setMode] = useState<Mode>('keep');
  const [show, setShow] = useState<Show>('cutout');
  const [sizePct, setSizePct] = useState(4);
  const [undoStack, setUndoStack] = useState<Uint8ClampedArray[]>([]);
  const [redoStack, setRedoStack] = useState<Uint8ClampedArray[]>([]);

  const { width, height } = photo;
  const radius = brushRadius(sizePct, width, height);
  const autoFailed = !hasMeaningfulSubject(autoMask);

  const wrapRef = useRef<HTMLDivElement>(null);
  const photoRef = useRef<HTMLCanvasElement>(null);
  const veilRef = useRef<HTMLCanvasElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const veilData = useRef<ImageData | null>(null);
  const stroke = useRef<{ working: Uint8ClampedArray; last: Point; pointerId: number } | null>(null);

  // --- drawing -------------------------------------------------------------

  const drawVeil = useCallback(
    (m: Uint8ClampedArray, rect?: DirtyRect | null) => {
      const canvas = veilRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) return;
      if (!veilData.current || veilData.current.width !== width || veilData.current.height !== height) {
        veilData.current = new ImageData(width, height);
      }
      const data = veilData.current.data;
      const [r, g, b] = veilColor();
      const r0 = rect ?? { x0: 0, y0: 0, x1: width - 1, y1: height - 1 };
      for (let y = r0.y0; y <= r0.y1; y++) {
        for (let x = r0.x0; x <= r0.x1; x++) {
          const i = y * width + x;
          const o = i * 4;
          data[o] = r;
          data[o + 1] = g;
          data[o + 2] = b;
          data[o + 3] = (255 - m[i]) * VEIL_OPACITY;
        }
      }
      ctx.putImageData(veilData.current, 0, 0, r0.x0, r0.y0, r0.x1 - r0.x0 + 1, r0.y1 - r0.y0 + 1);
    },
    [width, height],
  );

  useEffect(() => {
    photoRef.current?.getContext('2d')?.putImageData(photo, 0, 0);
  }, [photo]);

  useEffect(() => {
    if (!stroke.current) drawVeil(mask);
  }, [mask, drawVeil]);

  // Redraw the veil when the theme changes (its color comes from the theme).
  useEffect(() => {
    const redraw = () => drawVeil(stroke.current?.working ?? mask);
    const observer = new MutationObserver(redraw);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    mq?.addEventListener('change', redraw);
    return () => {
      observer.disconnect();
      mq?.removeEventListener('change', redraw);
    };
  }, [mask, drawVeil]);

  // --- history -------------------------------------------------------------

  const commit = useCallback(
    (next: Uint8ClampedArray) => {
      setUndoStack((u) => [...u.slice(-(UNDO_LIMIT - 1)), mask]);
      setRedoStack([]);
      dispatch(setMask(next));
    },
    [dispatch, mask],
  );

  const undo = useCallback(() => {
    if (!undoStack.length) return;
    setRedoStack((r) => [...r, mask]);
    setUndoStack((u) => u.slice(0, -1));
    dispatch(setMask(undoStack[undoStack.length - 1]));
  }, [dispatch, mask, undoStack]);

  const redo = useCallback(() => {
    if (!redoStack.length) return;
    setUndoStack((u) => [...u.slice(-(UNDO_LIMIT - 1)), mask]);
    setRedoStack((r) => r.slice(0, -1));
    dispatch(setMask(redoStack[redoStack.length - 1]));
  }, [dispatch, mask, redoStack]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.altKey) return;
      const key = e.key.toLowerCase();
      if (key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((key === 'z' && e.shiftKey) || key === 'y') {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo]);

  const startAgain = () => {
    if (undoStack.length && !window.confirm('Start again from the automatic cutout? Your brush changes will be lost.')) return;
    setUndoStack([]);
    setRedoStack([]);
    dispatch(resetMask());
  };

  const wholePhoto = () => commit(filledMask(width * height, 255));

  // --- painting ------------------------------------------------------------

  const toPhoto = (e: { clientX: number; clientY: number }): Point => {
    const rect = veilRef.current!.getBoundingClientRect();
    return { x: ((e.clientX - rect.left) / rect.width) * width, y: ((e.clientY - rect.top) / rect.height) * height };
  };

  const moveCursor = (e: { clientX: number; clientY: number }) => {
    const cursor = cursorRef.current;
    const canvas = veilRef.current;
    const wrap = wrapRef.current;
    if (!cursor || !canvas || !wrap) return;
    const c = canvas.getBoundingClientRect();
    const w = wrap.getBoundingClientRect();
    const d = ((radius * 2) / width) * c.width;
    cursor.style.width = cursor.style.height = `${d}px`;
    cursor.style.transform = `translate(${e.clientX - w.left - d / 2}px, ${e.clientY - w.top - d / 2}px)`;
    cursor.hidden = false;
  };

  const value: 0 | 255 = mode === 'keep' ? 255 : 0;

  const onPointerDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (e.button !== 0 || stroke.current) return;
    e.preventDefault();
    try {
      e.currentTarget.setPointerCapture(e.pointerId); // keep the stroke going if the pointer leaves the canvas
    } catch {
      // Capture is a nicety; painting works without it.
    }
    const p = toPhoto(e);
    const working = mask.slice();
    stroke.current = { working, last: p, pointerId: e.pointerId };
    drawVeil(working, paintStroke(working, width, height, [p], radius, value));
    moveCursor(e);
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    moveCursor(e);
    const s = stroke.current;
    if (!s || s.pointerId !== e.pointerId) return;
    const events = e.nativeEvent.getCoalescedEvents?.() ?? [];
    const points = [s.last, ...(events.length ? events : [e.nativeEvent]).map(toPhoto)];
    drawVeil(s.working, paintStroke(s.working, width, height, points, radius, value));
    s.last = points[points.length - 1];
  };

  const endStroke = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const s = stroke.current;
    if (!s || s.pointerId !== e.pointerId) return;
    stroke.current = null;
    commit(s.working);
    if (e.pointerType !== 'mouse' && cursorRef.current) cursorRef.current.hidden = true;
  };

  return (
    <div className="cutout">
      {autoFailed && (
        <div className="cutout__fallback" role="status">
          <p>We couldn't find your pet automatically. Paint over your pet with the Keep brush, or use the whole photo.</p>
          <Button variant="secondary" onClick={wholePhoto}>
            Use whole photo
          </Button>
        </div>
      )}

      <div className="cutout__toolbar">
        <Segmented
          legend="Brush"
          name="cutout-brush"
          value={mode}
          onChange={setMode}
          options={[
            { value: 'keep', label: 'Keep' },
            { value: 'erase', label: 'Erase' },
          ]}
        />
        <div className="cutout__size">
          <Slider
            label="Brush size"
            min={1}
            max={10}
            step={0.5}
            value={sizePct}
            onChange={setSizePct}
            format={(v) => (v <= 3 ? 'Small' : v <= 6.5 ? 'Medium' : 'Large')}
          />
        </div>
        <Segmented
          legend="Show"
          name="cutout-show"
          value={show}
          onChange={setShow}
          options={[
            { value: 'cutout', label: 'Cutout' },
            { value: 'original', label: 'Original' },
          ]}
        />
      </div>

      <p className="cutout__help">Paint over anything we missed. It doesn't need to be perfect — the pattern simplifies small details.</p>

      <div className="cutout__stage">
        <div className="cutout__canvas-wrap" ref={wrapRef}>
          <canvas ref={photoRef} width={width} height={height} className="cutout__photo" />
          <canvas
            ref={veilRef}
            width={width}
            height={height}
            className={`cutout__veil ${show === 'original' ? 'is-hidden' : ''}`}
            role="img"
            aria-label={`Your photo with the background covered. Painting with the ${mode === 'keep' ? 'Keep' : 'Erase'} brush.`}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endStroke}
            onPointerCancel={endStroke}
            onPointerLeave={() => {
              if (!stroke.current && cursorRef.current) cursorRef.current.hidden = true;
            }}
          />
          <div ref={cursorRef} className={`cutout__cursor cutout__cursor--${mode}`} hidden aria-hidden="true" />
        </div>
      </div>

      <div className="cutout__history">
        <Button variant="secondary" onClick={undo} disabled={!undoStack.length} aria-keyshortcuts="Control+Z Meta+Z">
          Undo
        </Button>
        <Button variant="secondary" onClick={redo} disabled={!redoStack.length} aria-keyshortcuts="Control+Shift+Z Meta+Shift+Z">
          Redo
        </Button>
        <Button variant="quiet" onClick={startAgain}>
          Start again
        </Button>
      </div>
    </div>
  );
}

/** The theme's sunken surface color as [r, g, b]. */
function veilColor(): [number, number, number] {
  const raw = getComputedStyle(document.documentElement).getPropertyValue('--color-surface-sunken').trim();
  const hex = /^#([0-9a-f]{6})$/i.exec(raw);
  if (hex) {
    const n = parseInt(hex[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  return [239, 228, 210];
}
