import { useId } from 'react';
import FormField from '../common/FormField';
import type { FieldDefinition, FormLabelPosition } from './fieldDefinition';

interface MetadataFormProps {
  fields: FieldDefinition[];
  values: Record<string, string>;
  onChange: (values: Record<string, string>) => void;
  legend?: string;
  readOnly?: boolean;
  labelPosition?: FormLabelPosition;
  errors?: Record<string, string>;
}

export default function MetadataForm({ fields, values, onChange, legend = '추가 속성', readOnly = false, labelPosition, errors = {} }: MetadataFormProps) {
  const id = useId();
  const update = (key: string, value: string) => onChange({ ...values, [key]: value });
  if (fields.length === 0) return null;
  return <fieldset className="metadata-form-section">
    <legend>{legend}</legend>
    <div className="standard-form-grid">
      {fields.map((field) => {
        const errorId = `${id}-${field.key}-error`;
        const accessibility = { 'aria-required': field.required || undefined, 'aria-invalid': errors[field.key] ? true : undefined, 'aria-describedby': errors[field.key] ? errorId : undefined };
        return <FormField key={field.key} label={field.label} required={field.required} labelPosition={field.labelPosition ?? labelPosition ?? (field.controlType === 'TEXTAREA' ? 'TOP' : 'LEFT')} error={errors[field.key]} errorId={errorId}>
          {field.controlType === 'SELECT' ? <select {...accessibility} disabled={readOnly} value={values[field.key] ?? field.defaultValue ?? ''} onChange={(event) => update(field.key, event.target.value)}>
            <option value="">선택</option>{field.options?.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select> : field.controlType === 'SWITCH' ? <span className="metadata-switch">
            <input {...accessibility} type="checkbox" disabled={readOnly} checked={(values[field.key] ?? field.defaultValue) === 'true'} onChange={(event) => update(field.key, String(event.target.checked))} />
            {(values[field.key] ?? field.defaultValue) === 'true' ? '사용' : '미사용'}
          </span> : field.controlType === 'TEXTAREA' ? <textarea {...accessibility} disabled={readOnly} value={values[field.key] ?? field.defaultValue ?? ''} onChange={(event) => update(field.key, event.target.value)} /> : <input
            {...accessibility}
            type={field.controlType === 'NUMBER' ? 'number' : field.controlType === 'DATE_PICKER' ? 'date' : field.controlType === 'COLOR_PICKER' ? 'color' : 'text'}
            value={values[field.key] ?? field.defaultValue ?? ''}
            onChange={(event) => update(field.key, event.target.value)}
            disabled={readOnly}
          />}
        </FormField>;
      })}
    </div>
  </fieldset>;
}
