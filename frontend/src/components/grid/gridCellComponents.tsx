import { useState } from 'react';
import type { ICellEditorParams } from 'ag-grid-community';
import type { FieldDefinition } from '../metadata/fieldDefinition';
import type { GridRowState } from './gridRowState';

export function RowStateIcon({ state }: { state: Exclude<GridRowState, 'NORMAL'> }) {
  const label = state === 'INSERTED' ? '신규 추가' : state === 'UPDATED' ? '수정됨' : '삭제 예정';
  return <span className={`basekit-row-state-icon ${state.toLowerCase()}`} role="img" aria-label={label} title={label}>
    {state === 'UPDATED'
      ? <svg viewBox="0 0 16 16" aria-hidden="true"><path d="m3 11.8-.5 2.2 2.2-.5 7.7-7.7-1.7-1.7zM9.9 4.9l1.7 1.7" /></svg>
      : <svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="5.5" /><path d={state === 'INSERTED' ? 'M8 5v6M5 8h6' : 'M5 8h6'} /></svg>}
  </span>;
}

type ReactiveCellEditorProps = ICellEditorParams & { onValueChange: (value: string) => void };

export function ColorCellEditor({ value, onValueChange }: ReactiveCellEditorProps) {
  const color = /^#[0-9a-f]{6}$/i.test(String(value ?? '')) ? String(value) : '#000000';
  return <input className="basekit-color-cell-editor" type="color" value={color} onChange={(event) => onValueChange(event.target.value.toUpperCase())} autoFocus />;
}

export function TextLengthCellEditor({ value, onValueChange, maxLength }: ReactiveCellEditorProps & { maxLength: number }) {
  const initialValue = String(value ?? '').slice(0, maxLength);
  const [current, setCurrent] = useState(initialValue);
  const atLimit = current.length === maxLength;
  return <div className={`basekit-text-length-editor${atLimit ? ' at-limit' : ''}`}>
    <input
      value={current}
      maxLength={maxLength}
      aria-label={`${current.length}/${maxLength}`}
      onChange={(event) => {
        const next = event.target.value.slice(0, maxLength);
        setCurrent(next);
        onValueChange(next);
      }}
      autoFocus
    />
    <span className="basekit-text-length-counter" aria-live="polite">{current.length}/{maxLength}</span>
  </div>;
}

export function MetadataSwitch({ value, field, editable, onChange }: { value: unknown; field: FieldDefinition; editable: boolean; onChange: (value: string) => void }) {
  const values = field.options?.map((option) => option.value) ?? ['true', 'false'];
  const onValue = values[0] ?? 'true';
  const offValue = values[1] ?? 'false';
  const checked = String(value ?? '') === onValue;
  const label = field.options?.find((option) => option.value === (checked ? onValue : offValue))?.label ?? (checked ? 'ON' : 'OFF');
  return <button
    type="button"
    className={`basekit-grid-switch${checked ? ' checked' : ''}`}
    role="switch"
    aria-checked={checked}
    aria-label={`${field.label}: ${label}`}
    title={label}
    disabled={!editable}
    onClick={(event) => { event.stopPropagation(); onChange(checked ? offValue : onValue); }}
  ><span /></button>;
}
