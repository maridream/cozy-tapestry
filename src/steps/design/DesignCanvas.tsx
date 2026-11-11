import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react';
import { setFraming, updateText, useApp } from '../../app/state';
import { framingGeometry, subjectBounds } from '../../engine/buildGrid';
import { renderPreview } from '../../engine/renderPreview';
import type { GridSpec, Pattern } from '../../types';
import { textBlock } from './textBlocks';

/** 'pet' or a text layer id. */
export type Selection = string;

interface Box {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/**
 * The live stitch preview. Drag the pet or a text to move it; arrow keys move the
 * selected one (Shift for bigger steps). Boxes are fractions of the piece (0..1).
 */
export function DesignCanvas({ pattern, gridSpec, selected, onSelect }: { pattern: Pattern | null; gridSpec: GridSpec; selected: Selection; onSelect: (s: Selection) => void }) {
  const { state, dispatch } = useApp();
  const { photo, mask, settings } = state;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [frame, setFrame] = useState<{ w: number; h: number } | null>(null);
  const drag = useRef<{ target: Selection; x: number; y: number; ox: number; oy: number; pointerId: number } | null>(null);

  // Draw the latest built pattern.
  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap || !pattern) return;
    const draw = () => {
      renderPreview(canvas, pattern.grid, pattern.gridSpec, pattern.settings.technique, {
        cssWidth: wrap.clientWidth,
        maxCssHeight: Math.min(600, window.innerHeight * 0.68),
      });
      setFrame({ w: parseFloat(canvas.style.width), h: parseFloat(canvas.style.height) });
    };
    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [pattern]);

  // Where things are, for dragging and the selection outline.
  const bounds = useMemo(() => (photo && mask ? subjectBounds(mask, photo.width, photo.height) : null), [photo, mask]);
  const petBox: Box | null = useMemo(() => {
    if (!bounds) return null;
    const { width: W, height: H } = gridSpec.finished;
    const g = framingGeometry(bounds, gridSpec.finished, settings.framing);
    return {
      x0: (g.centreU + (bounds.x0 - g.pivotX) * g.scale) / W,
      x1: (g.centreU + (bounds.x1 - g.pivotX) * g.scale) / W,
      y0: (g.centreV + (bounds.y0 - g.pivotY) * g.scale) / H,
      y1: (g.centreV + (bounds.y1 - g.pivotY) * g.scale) / H,
    };
  }, [bounds, gridSpec, settings.framing]);

  const [textSizes, setTextSizes] = useState<Record<string, { w: number; h: number }>>({});
  useEffect(() => {
    let live = true;
    Promise.all(settings.texts.map((t) => textBlock(t, gridSpec).then((b) => [t.id, { w: b.cols / gridSpec.cols, h: b.rows / gridSpec.rows }] as const))).then(
      (entries) => live && setTextSizes(Object.fromEntries(entries)),
    );
    return () => {
      live = false;
    };
  }, [settings.texts, gridSpec]);
  const textBox = (id: string): Box | null => {
    const t = settings.texts.find((x) => x.id === id);
    const s = textSizes[id];
    if (!t || !s) return null;
    const pad = 0.01;
    return { x0: t.x - s.w / 2 - pad, x1: t.x + s.w / 2 + pad, y0: t.y - s.h / 2 - pad, y1: t.y + s.h / 2 + pad };
  };

  const hit = (fx: number, fy: number): Selection | null => {
    const inside = (b: Box | null) => !!b && fx >= b.x0 && fx <= b.x1 && fy >= b.y0 && fy <= b.y1;
    for (let i = settings.texts.length - 1; i >= 0; i--) if (inside(textBox(settings.texts[i].id))) return settings.texts[i].id;
    return inside(petBox) ? 'pet' : null;
  };

  const positionOf = (target: Selection) => {
    if (target === 'pet') return { x: settings.framing.offsetX, y: settings.framing.offsetY };
    const t = settings.texts.find((x) => x.id === target);
    return { x: t?.x ?? 0.5, y: t?.y ?? 0.5 };
  };

  const moveTo = (target: Selection, x: number, y: number) => {
    if (target === 'pet') dispatch(setFraming({ ...settings.framing, offsetX: clamp(x, -0.75, 0.75), offsetY: clamp(y, -0.75, 0.75) }));
    else dispatch(updateText(target, { x: clamp(x, 0, 1), y: clamp(y, 0, 1) }));
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return;
    const r = e.currentTarget.getBoundingClientRect();
    const target = hit((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height);
    if (!target) return;
    onSelect(target);
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // not essential
    }
    const p = positionOf(target);
    drag.current = { target, x: e.clientX, y: e.clientY, ox: p.x, oy: p.y, pointerId: e.pointerId };
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const d = drag.current;
    const r = e.currentTarget.getBoundingClientRect();
    if (!d) {
      e.currentTarget.style.cursor = hit((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height) ? 'grab' : 'default';
      return;
    }
    if (d.pointerId !== e.pointerId) return;
    moveTo(d.target, d.ox + (e.clientX - d.x) / r.width, d.oy + (e.clientY - d.y) / r.height);
  };
  const endDrag = () => (drag.current = null);

  const onKeyDown = (e: KeyboardEvent) => {
    const step = e.shiftKey ? 0.1 : 0.02;
    const moves: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    const m = moves[e.key];
    if (!m) return;
    e.preventDefault();
    const p = positionOf(selected);
    moveTo(selected, p.x + m[0], p.y + m[1]);
  };

  const box = selected === 'pet' ? petBox : textBox(selected);
  const selectedName = selected === 'pet' ? 'your pet' : `text "${settings.texts.find((t) => t.id === selected)?.text ?? ''}"`;

  return (
    <div className="design-canvas" ref={wrapRef}>
      {!pattern && <div className="design-canvas__loading">Making your preview…</div>}
      <div className="design-canvas__frame" style={frame ? { width: frame.w, height: frame.h } : undefined}>
        <canvas
          ref={canvasRef}
          tabIndex={0}
          role="img"
          aria-label={`Stitch preview. Selected: ${selectedName}. Drag to move it, or use the arrow keys.`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onKeyDown={onKeyDown}
        />
        {box && pattern && (
          <div
            className="design-canvas__select"
            aria-hidden="true"
            style={{
              left: `${clamp(box.x0, 0, 1) * 100}%`,
              top: `${clamp(box.y0, 0, 1) * 100}%`,
              width: `${(clamp(box.x1, 0, 1) - clamp(box.x0, 0, 1)) * 100}%`,
              height: `${(clamp(box.y1, 0, 1) - clamp(box.y0, 0, 1)) * 100}%`,
            }}
          />
        )}
      </div>
    </div>
  );
}
