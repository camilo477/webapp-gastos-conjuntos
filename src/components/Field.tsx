import { useId } from 'react';
import type { InputHTMLAttributes } from 'react';

type Props = InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string; error?: string };

export function Field({ label, hint, error, id, ...props }: Props) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  return <div className="field">
    <label htmlFor={inputId}>{label}</label>
    <input {...props} id={inputId} aria-invalid={error ? true : undefined} aria-describedby={hint || error ? `${inputId}-help` : undefined} />
    {(hint || error) && <p id={`${inputId}-help`} className={error ? 'field-error' : 'field-hint'}>{error ?? hint}</p>}
  </div>;
}
