import type { ReactNode } from 'react';
import type { FormLabelPosition } from '../metadata/fieldDefinition';

interface FormFieldProps {
  label: string;
  labelPosition?: FormLabelPosition;
  required?: boolean;
  className?: string;
  children: ReactNode;
  error?: string;
  errorId?: string;
}

/** Callers retain control attributes and validation policy. */
export default function FormField({ label, labelPosition = 'LEFT', required = false, className = '', children, error, errorId }: FormFieldProps) {
  return <label className={`standard-form-field standard-form-field--${labelPosition.toLowerCase()} ${error ? 'has-error' : ''} ${className}`}>
    <span className={`standard-form-label ${required ? 'is-required' : ''}`}>{label}</span>
    <div className="standard-form-control">{children}{error && <span className="standard-form-error" id={errorId}>{error}</span>}</div>
  </label>;
}
