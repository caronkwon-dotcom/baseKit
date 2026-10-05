import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface FormSelectProps {
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  disabled?: boolean;
  'aria-required'?: boolean;
  'aria-invalid'?: boolean;
  'aria-describedby'?: string;
}

/** Shared form popup; business validation remains with the caller. */
export default function FormSelect({ value, options, onChange, disabled, ...aria }: FormSelectProps) {
  const id = useId();
  const control = useRef<HTMLButtonElement>(null);
  const popup = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [position, setPosition] = useState({ left: 0, top: 0, width: 0, maxHeight: 240 });
  const show = () => {
    const rect = control.current!.getBoundingClientRect();
    const below = window.innerHeight - rect.bottom - 12;
    const above = rect.top - 12;
    const height = Math.min(240, options.length * 34 + 10, Math.max(below, above));
    setPosition({ left: Math.max(8, Math.min(rect.left, window.innerWidth - Math.min(rect.width, window.innerWidth - 16) - 8)), top: below >= height ? rect.bottom + 6 : rect.top - height - 6, width: Math.min(rect.width, window.innerWidth - 16), maxHeight: height });
    setActive(Math.max(0, options.findIndex(option => option.value === value)));
    setOpen(true);
  };
  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => { if (!control.current?.contains(event.target as Node) && !popup.current?.contains(event.target as Node)) setOpen(false); };
    const close = (event: Event) => { if (!popup.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener('pointerdown', closeOutside);
    window.addEventListener('resize', close);
    window.addEventListener('scroll', close, true);
    return () => { document.removeEventListener('pointerdown', closeOutside); window.removeEventListener('resize', close); window.removeEventListener('scroll', close, true); };
  }, [open]);
  useEffect(() => { if (open) popup.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' }); }, [active, open]);
  return <>
    <button ref={control} type="button" className="standard-form-select" role="combobox" aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? id : undefined} aria-activedescendant={open && options.length ? `${id}-${active}` : undefined} disabled={disabled} {...aria}
      onPointerDown={event => event.stopPropagation()} onClick={event => { event.stopPropagation(); if (open) setOpen(false); else show(); }}
      onKeyDown={event => {
        if (event.key !== 'Tab') event.stopPropagation();
        if (event.key === 'Tab') { setOpen(false); return; }
        if (['ArrowDown', 'ArrowUp', 'Enter', ' ', 'Escape', 'Home', 'End'].includes(event.key)) event.preventDefault();
        if (event.key === 'Escape') setOpen(false);
        else if (!open && ['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) show();
        else if (open && ['Enter', ' '].includes(event.key)) { if (options[active]) onChange(options[active].value); setOpen(false); }
        else if (open && event.key === 'ArrowDown') setActive(index => Math.min(options.length - 1, index + 1));
        else if (open && event.key === 'ArrowUp') setActive(index => Math.max(0, index - 1));
        else if (open && event.key === 'Home') setActive(0);
        else if (open && event.key === 'End') setActive(Math.max(0, options.length - 1));
      }}><span>{options.find(option => option.value === value)?.label ?? value}</span><span aria-hidden="true">▾</span></button>
    {open && createPortal(<div ref={popup} id={id} role="listbox" className="standard-form-select-popup" style={position} onPointerDown={event => { event.preventDefault(); event.stopPropagation(); }}>
      {options.map((option, index) => <div key={option.value} id={`${id}-${index}`} role="option" aria-selected={value === option.value} data-index={index} className={`standard-form-select-option ${value === option.value ? 'is-selected' : ''} ${index === active ? 'is-active' : ''}`} onMouseEnter={() => setActive(index)} onClick={event => { event.stopPropagation(); onChange(option.value); setOpen(false); control.current?.focus(); }}><span>{option.label}</span><span aria-hidden="true">{value === option.value ? '✓' : ''}</span></div>)}
    </div>, document.body)}
  </>;
}
