import { useEffect, useMemo, useRef, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react';
import { setFraming, useApp } from '../../app/state';
import { Button } from '../../components/Button';
import { Slider } from '../../components/Slider';
import { framingGeometry, subjectBounds } from '../../engine/buildGrid';
import type { Framing, GridSpec } from '../../types';

const STEP = 0.02;
const MAX_OFFSET = 0.75;
const clampOffset = (v: number) => Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, v));

/**
 * The piece in its true proportions with the cut-out pet placed exactly as the
 * pattern engine will place it. Drag (or arrow keys) to move, slider to zoom.
 */
export function FramingPreview({ gridSpec }: { gridSpec: GridSpec }) {
  const { state, dispatch } = useApp();
  const { photo, mask, settings } = state;
  const { framing, backgroundHex } = settings;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; start: Framing; pointerId: number } | null>(null);

  // The pet alone (photo with the mask as transparency), made once per cutout.
  const pet = useMemo(() => {
    if (!photo || !mask) return null;
    const c = document.createElement('canvas');
    c.width = photo.width;
    c.height = photo.height;
    const img = new ImageData(new Uint8ClampedArray(photo.data), photo.width, photo.height);
    for (let i = 0; i < mask.length; i++) img.data[i * 4 + 3] = mask[i];
    c.getContext('2d')!.putImageData(img, 0, 0);
    return { canvas: c, bounds: subjectBounds(mask, photo.width, photo.height) };
  }, [photo, mask]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap || !pet) return;
    const draw = () => {
      const { width: W, height: H } = gridSpec.finished;
      let cssW = wrap.clientWidth;
      const maxH = Math.min(440, window.innerHeight * 0.6);
      if ((cssW * H) / W > maxH) cssW = (maxH * W) / H;
      const cssH = (cssW * H) / W;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);
      canvas.style.width = `${cssW}px`;
      canvas.style.height = `${cssH}px`;
      const ctx = canvas.getContext('2d')!;
      const k = canvas.width / W; // canvas px per inch
      const g = framingGeometry(pet.bounds, gridSpec.finished, framing);
      ctx.fillStyle = backgroundHex;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(
        pet.canvas,
        (g.centreU - g.pivotX * g.scale) * k,
        (g.centreV - g.pivotY * g.scale) * k,
        pet.canvas.width * g.scale * k,
        pet.canvas.height * g.scale * k,
      );
    };
    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [pet, gridSpec, framing, backgroundHex]);

  const update = (f: Framing) => dispatch(setFraming({ ...f, offsetX: clampOffset(f.offsetX), offsetY: clampOffset(f.offsetY) }));

  const onPointerDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // not essential
    }
    drag.current = { x: e.clientX, y: e.clientY, start: framing, pointerId: e.pointerId };
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const d = drag.current;
    if (!d || d.pointerId !== e.pointerId) return;
    const rect = e.currentTarget.getBoundingClientRect();
    update({ ...d.start, offsetX: d.start.offsetX + (e.clientX - d.x) / rect.width, offsetY: d.start.offsetY + (e.clientY - d.y) / rect.height });
  };
  const endDrag = () => (drag.current = null);

  const onKeyDown = (e: KeyboardEvent) => {
    const moves: Record<string, [number, number]> = { ArrowLeft: [-STEP, 0], ArrowRight: [STEP, 0], ArrowUp: [0, -STEP], ArrowDown: [0, STEP] };
    const m = moves[e.key];
    if (!m) return;
    e.preventDefault();
    update({ ...framing, offsetX: framing.offsetX + m[0], offsetY: framing.offsetY + m[1] });
  };

  return (
    <div className="framing">
      <div className="framing__stage" ref={wrapRef}>
        <canvas
          ref={canvasRef}
          className="framing__canvas"
          tabIndex={0}
          role="img"
          aria-label="Where your pet sits in the piece. Drag to move, or use the arrow keys."
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onKeyDown={onKeyDown}
        />
      </div>
      <p className="framing__hint">Drag your pet to move it, or click the picture and use the arrow keys.</p>
      <div className="framing__controls">
        <div className="framing__zoom">
          <Slider label="Zoom" min={0.5} max={2} step={0.05} value={framing.zoom} onChange={(zoom) => update({ ...framing, zoom })} format={(v) => `${v.toFixed(2)}×`} />
        </div>
        <Button variant="secondary" onClick={() => update({ ...framing, offsetX: 0, offsetY: 0 })} disabled={framing.offsetX === 0 && framing.offsetY === 0}>
          Re-centre
        </Button>
      </div>
    </div>
  );
}
