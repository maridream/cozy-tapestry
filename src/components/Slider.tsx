import { useId, type ReactNode } from 'react';
import './Slider.css';

export interface SliderProps {
  label: ReactNode;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  /** How the current value is shown beside the label, e.g. (v) => `${v} colors`. */
  format?: (value: number) => string;
  hint?: ReactNode;
  disabled?: boolean;
}

/** Labelled range input that shows its current value. */
export function Slider({ label, value, min, max, step = 1, onChange, format = String, hint, disabled }: SliderProps) {
  const id = useId();
  const shown = format(value);
  return (
    <div className="slider">
      <div className="slider__top">
        <label htmlFor={id} className="slider__label">
          {label}
        </label>
        <output htmlFor={id} className="slider__value">
          {shown}
        </output>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        aria-valuetext={shown}
        aria-describedby={hint ? `${id}-hint` : undefined}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      {hint && (
        <p className="slider__hint" id={`${id}-hint`}>
          {hint}
        </p>
      )}
    </div>
  );
}
