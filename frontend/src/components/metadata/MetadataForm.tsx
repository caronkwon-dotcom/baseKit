import type { FieldDefinition } from './fieldDefinition';

interface MetadataFormProps {
  fields: FieldDefinition[];
  values: Record<string, string>;
  onChange: (values: Record<string, string>) => void;
  legend?: string;
}

export default function MetadataForm({ fields, values, onChange, legend = '추가 속성' }: MetadataFormProps) {
  const update = (key: string, value: string) => onChange({ ...values, [key]: value });
  if (fields.length === 0) return null;
  return <fieldset className="metadata-form-section">
    <legend>{legend}</legend>
    <div className="standard-form-grid">
      {fields.map((field) => <label key={field.key}>
        <span>{field.label}{field.required ? <em> *</em> : null}</span>
        {field.controlType === 'SELECT' ? <select value={values[field.key] ?? field.defaultValue ?? ''} onChange={(event) => update(field.key, event.target.value)}>
          <option value="">선택</option>{field.options?.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select> : field.controlType === 'SWITCH' ? <span className="metadata-switch">
          <input type="checkbox" checked={(values[field.key] ?? field.defaultValue) === 'true'} onChange={(event) => update(field.key, String(event.target.checked))} />
          {(values[field.key] ?? field.defaultValue) === 'true' ? '사용' : '미사용'}
        </span> : <input
          type={field.controlType === 'NUMBER' ? 'number' : field.controlType === 'DATE_PICKER' ? 'date' : field.controlType === 'COLOR_PICKER' ? 'color' : 'text'}
          value={values[field.key] ?? field.defaultValue ?? ''}
          onChange={(event) => update(field.key, event.target.value)}
        />}
      </label>)}
    </div>
  </fieldset>;
}
