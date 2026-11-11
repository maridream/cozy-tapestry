import { useEffect, useRef, useState } from 'react';
import { useApp } from '../../app/state';
import { startAutoCutout, subscribe } from './autoCutout';
import { CutoutEditor } from './CutoutEditor';
import './CutoutStep.css';

export function CutoutStep() {
  const { state, dispatch } = useApp();
  const { photo, autoMask, mask } = state;
  const [progress, setProgress] = useState(0);

  const needsAuto = photo !== null && autoMask === null;
  useEffect(() => {
    if (!needsAuto || !photo) return;
    return subscribe(startAutoCutout(photo, dispatch), setProgress);
  }, [needsAuto, photo, dispatch]);

  if (!photo) return null; // unreachable: the step needs a photo

  if (!autoMask || !mask) return <Working photo={photo} progress={progress} />;

  return <CutoutEditor photo={photo} mask={mask} autoMask={autoMask} />;
}

function Working({ photo, progress }: { photo: ImageData; progress: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    canvasRef.current?.getContext('2d')?.putImageData(photo, 0, 0);
  }, [photo]);
  const percent = Math.round(progress * 100);
  const computing = progress >= 0.85;

  return (
    <div className="cutout-working">
      <div className="cutout-working__frame">
        <canvas ref={canvasRef} width={photo.width} height={photo.height} className="cutout-working__photo" aria-hidden="true" />
      </div>
      <div className="cutout-working__status" role="status">
        <p className="cutout-working__title">Finding your pet…</p>
        <p className="cutout-working__hint">The first time takes a little longer while we fetch the helper.</p>
        <div
          className={`cutout-working__bar ${computing ? 'is-computing' : ''}`}
          role="progressbar"
          aria-label="Finding your pet"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
        >
          <div className="cutout-working__fill" style={{ width: `${Math.max(4, percent)}%` }} />
        </div>
      </div>
    </div>
  );
}
