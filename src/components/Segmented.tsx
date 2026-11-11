import type { ReactNode } from 'react';
import './Segmented.css';

export interface SegmentedOption<T extends string> {
  value: T;
  label: ReactNode;
}

export interface SegmentedProps<T extends string> {
  legend: ReactNode;
  /** Shared radio name; must be unique on the page. */
  name: string;
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  hint?: ReactNode;
}

/** A radio group drawn as joined buttons. Arrow keys move between options (native radio behaviour). */
export function Segmented<T extends string>({ legend, name, options, value, onChange, hint }: SegmentedProps<T>) {
  return (
    <fieldset className="segmented">
      <legend className="segmented__legend">{legend}</legend>
      <div className="segmented__options">
        {options.map((opt) => (
          <label key={opt.value} className="segmented__option">
            <input
              type="radio"
              name={name}
              value={opt.value}
              checked={opt.value === value}
              onChange={() => onChange(opt.value)}
            />
            <span>{opt.label}</span>
          </label>
        ))}
      </div>
      {hint && <p className="segmented__hint">{hint}</p>}
    </fieldset>
  );
}
