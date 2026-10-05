import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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

export function MetadataSelect({ value, field, editable, onChange }: { value: unknown; field: FieldDefinition; editable: boolean; onChange: (value: string) => void }) {
  const current = String(value ?? '');
  const options = field.options ?? [];
  const trigger = useRef<HTMLButtonElement>(null);
  const popup = useRef<HTMLDivElement>(null);
  const id = useId();
  const [position, setPosition] = useState<{ left: number; top: number; width: number; maxHeight: number } | null>(null);
  const [active, setActive] = useState(0);
  useEffect(() => {
    if (position) popup.current?.querySelector(`[id="${id}-${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active, id, position]);
  const open = () => {
    const rect = trigger.current!.getBoundingClientRect();
    const below = innerHeight - rect.bottom - 12;
    const height = Math.min(240, options.length * 32 + 12);
    const above = below < height && rect.top > below;
    setPosition({ left: Math.max(8, Math.min(rect.left, innerWidth - Math.max(rect.width, 160) - 8)), top: above ? Math.max(8, rect.top - height - 4) : rect.bottom + 4, width: Math.max(rect.width, 160), maxHeight: above ? Math.min(240, rect.top - 12) : Math.min(240, below) });
    setActive(Math.max(0, options.findIndex(option => option.value === current)));
  };
  useEffect(() => {
    if (!position) return;
    const dismiss = (event: PointerEvent) => {
      if (!trigger.current?.contains(event.target as Node) && !popup.current?.contains(event.target as Node)) setPosition(null);
    };
    const close = (event: Event) => { if (!popup.current?.contains(event.target as Node)) setPosition(null); };
    document.addEventListener('pointerdown', dismiss);
    window.addEventListener('resize', close);
    document.addEventListener('scroll', close, true);
    return () => { document.removeEventListener('pointerdown', dismiss); window.removeEventListener('resize', close); document.removeEventListener('scroll', close, true); };
  }, [position]);
  const choose = (index: number) => {
    if (editable && options[index]) onChange(options[index].value);
    setPosition(null);
    trigger.current?.focus();
  };
  return <>
    <button ref={trigger} type="button" className="basekit-grid-input basekit-grid-select" role="combobox" aria-label={field.label} disabled={!editable}
      aria-expanded={!!position} aria-controls={position ? id : undefined} aria-haspopup="listbox" aria-activedescendant={position ? `${id}-${active}` : undefined}
      onPointerDown={event => event.stopPropagation()} onMouseDown={event => event.stopPropagation()} onDoubleClick={event => event.stopPropagation()}
      onClick={event => { event.stopPropagation(); if (position) setPosition(null); else open(); }}
      onBlur={event => { if (!popup.current?.contains(event.relatedTarget)) setPosition(null); }}
      onKeyDown={event => {
        if (event.key === 'Tab') { setPosition(null); return; }
        event.stopPropagation();
        if (['ArrowDown', 'ArrowUp', 'Enter', ' ', 'Escape', 'Home', 'End'].includes(event.key)) event.preventDefault();
        if (event.key === 'Escape') setPosition(null);
        else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          if (!position) open(); else setActive(index => Math.max(0, Math.min(options.length - 1, index + (event.key === 'ArrowDown' ? 1 : -1))));
        } else if (event.key === 'Home') setActive(0);
        else if (event.key === 'End') setActive(options.length - 1);
        else if (event.key === 'Enter' || event.key === ' ') { if (position) choose(active); else open(); }
      }}><span>{options.find(option => option.value === current)?.label ?? (current || '-')}</span><span aria-hidden="true">▾</span></button>
    {position && editable && createPortal(<div ref={popup} id={id} role="listbox" aria-label={field.label} className="basekit-select-popup" style={position}
      onPointerDown={event => event.stopPropagation()} onMouseDown={event => event.preventDefault()} onClick={event => event.stopPropagation()}>
      {options.map((option, index) => <div key={option.value} id={`${id}-${index}`} role="option" aria-selected={option.value === current}
        className={`basekit-select-option${option.value === current ? ' selected' : ''}${index === active ? ' active' : ''}`}
        onClick={() => choose(index)}><span>{option.label}</span><span aria-hidden="true">{option.value === current ? '✓' : ''}</span></div>)}
    </div>, document.body)}
  </>;
}
export function StatusColorIndicator({ label, color }: { label: string; color: string }) {
  return <span className="basekit-status-indicator">
    <i className="basekit-status-indicator__dot" style={{ backgroundColor: color }} aria-hidden="true" />
    <span>{label}</span>
  </span>;
}
