import type { ReactNode } from 'react';
import './Field.css';

export interface FieldProps {
  /** id of the control inside; the label points at it. */
  htmlFor: string;
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  children: ReactNode;
}

/**
 * Label + control + optional hint and error. Give the control
 * aria-describedby={fieldDescribedBy(id, hint, error)} so screen readers read them.
 */
export function Field({ htmlFor, label, hint, error, children }: FieldProps) {
  return (
    <div className={['field', error ? 'field--error' : ''].filter(Boolean).join(' ')}>
      <label className="field__label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {hint && (
        <p className="field__hint" id={`${htmlFor}-hint`}>
          {hint}
        </p>
      )}
      {error && (
        <p className="field__error" id={`${htmlFor}-error`} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export function fieldDescribedBy(id: string, hint?: unknown, error?: unknown): string | undefined {
  const ids = [hint ? `${id}-hint` : '', error ? `${id}-error` : ''].filter(Boolean);
  return ids.length ? ids.join(' ') : undefined;
}
