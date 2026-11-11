import { useEffect, useId, useRef, useState, type DragEvent, type KeyboardEvent } from 'react';
import { setPhoto, useApp } from '../../app/state';
import { Button } from '../../components/Button';
import { loadPhoto, PHOTO_ERROR_MESSAGES, PhotoError } from './loadPhoto';
import './UploadStep.css';

export function UploadStep() {
  const { state, dispatch } = useApp();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const dragDepth = useRef(0);
  const hintId = useId();
  const errorId = useId();

  const openPicker = () => inputRef.current?.click();

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setLoading(true);
    try {
      const image = await loadPhoto(file);
      dispatch(setPhoto(image, file.name));
    } catch (err) {
      setError(err instanceof PhotoError ? PHOTO_ERROR_MESSAGES[err.code] : PHOTO_ERROR_MESSAGES['decode-failed']);
    } finally {
      setLoading(false);
    }
  }

  const dropHandlers = {
    onDragEnter: (e: DragEvent) => {
      e.preventDefault();
      dragDepth.current += 1;
      setDragging(true);
    },
    onDragOver: (e: DragEvent) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    },
    onDragLeave: () => {
      dragDepth.current = Math.max(0, dragDepth.current - 1);
      if (dragDepth.current === 0) setDragging(false);
    },
    onDrop: (e: DragEvent) => {
      e.preventDefault();
      dragDepth.current = 0;
      setDragging(false);
      void handleFile(e.dataTransfer.files[0]);
    },
  };

  const input = (
    <input
      ref={inputRef}
      type="file"
      accept="image/*"
      className="visually-hidden"
      tabIndex={-1}
      aria-hidden="true"
      onChange={(e) => {
        void handleFile(e.target.files?.[0]);
        e.target.value = ''; // allow choosing the same file again
      }}
    />
  );

  const errorBox = error && (
    <p className="upload__error" id={errorId} role="alert">
      <WarningIcon /> {error}
    </p>
  );

  if (state.photo) {
    return (
      <div className={`upload__chosen ${dragging ? 'is-dragging' : ''}`} {...dropHandlers}>
        <PhotoPreview image={state.photo} name={state.photoName ?? 'Your photo'} />
        <div className="upload__chosen-meta">
          <p className="upload__filename">
            <span className="visually-hidden">Chosen photo: </span>
            {state.photoName}
          </p>
          <Button variant="quiet" className="upload__change" onClick={openPicker} disabled={loading}>
            {loading ? 'Opening…' : 'Choose a different photo'}
          </Button>
        </div>
        {errorBox}
        {input}
      </div>
    );
  }

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openPicker();
    }
  };

  return (
    <div>
      <div
        className={`upload__zone ${dragging ? 'is-dragging' : ''} ${error ? 'has-error' : ''}`}
        role="button"
        tabIndex={0}
        aria-label="Choose a photo of your pet"
        aria-describedby={[hintId, error ? errorId : ''].filter(Boolean).join(' ')}
        aria-busy={loading}
        onClick={openPicker}
        onKeyDown={onKeyDown}
        {...dropHandlers}
      >
        <PetIllustration />
        <p className="upload__title" id={hintId}>
          {loading ? 'Opening your photo…' : 'Drop a photo of your pet here'}
        </p>
        <span className="btn btn--primary upload__button" aria-hidden="true">
          Choose a photo
        </span>
        {errorBox}
        {input}
      </div>

      <ul className="upload__tips">
        <li>One pet, clearly visible</li>
        <li>Good light, plain background if you can</li>
        <li>Face and body in frame</li>
      </ul>
    </div>
  );
}

function PhotoPreview({ image, name }: { image: ImageData; name: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = image.width;
    canvas.height = image.height;
    canvas.getContext('2d')?.putImageData(image, 0, 0);
  }, [image]);
  return (
    <div className="upload__preview">
      <canvas ref={canvasRef} role="img" aria-label={`Your photo: ${name}`} width={image.width} height={image.height} />
    </div>
  );
}

function PetIllustration() {
  // A friendly cat-and-photo doodle. Decorative.
  return (
    <svg className="upload__art" viewBox="0 0 96 80" width="96" height="80" aria-hidden="true" focusable="false">
      <rect x="6" y="10" width="84" height="62" rx="10" fill="var(--color-surface)" stroke="var(--color-border)" strokeWidth="3" />
      <path d="M30 60c0-12 8-20 18-20s18 8 18 20" fill="var(--color-secondary)" />
      <path d="M36 40l-4-12 10 7M60 40l4-12-10 7" fill="var(--color-secondary)" />
      <circle cx="48" cy="44" r="12" fill="var(--color-secondary)" />
      <circle cx="43.5" cy="43" r="1.8" fill="var(--color-text)" />
      <circle cx="52.5" cy="43" r="1.8" fill="var(--color-text)" />
      <path d="M46 48.5l2 1.5 2-1.5" fill="none" stroke="var(--color-text)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="78" cy="14" r="12" fill="var(--color-accent)" />
      <path d="M78 8.5v11M72.5 14h11" stroke="var(--color-on-accent)" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true" focusable="false" className="upload__error-icon">
      <circle cx="10" cy="10" r="8.5" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M10 5.5v5.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="10" cy="14.2" r="1.3" fill="currentColor" />
    </svg>
  );
}
