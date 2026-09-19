import type { ActionCode } from '../../constants/actionCodes';

export type ActionButtonDisplay = 'text' | 'icon';
export type ActionButtonTone = 'default' | 'primary' | 'danger';

interface ActionButtonProps {
  actionCode: ActionCode;
  label: string;
  display?: ActionButtonDisplay;
  tone?: ActionButtonTone;
  disabled?: boolean;
  onClick: () => void;
}

function ActionIcon({ actionCode }: { actionCode: ActionCode }) {
  if (actionCode === 'SAVE') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 3h12l2 2v16H5zM8 3v6h8V3M8 21v-7h8v7" /></svg>;
  if (actionCode === 'ADD_ROW' || actionCode === 'CREATE') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>;
  if (actionCode === 'REMOVE_ROW' || actionCode === 'DELETE') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M10 11v6m4-6v6M9 7l1-3h4l1 3M7 7l1 14h8l1-14" /></svg>;
  if (actionCode === 'SEARCH') return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="5.5" /><path d="m15 15 4 4" /></svg>;
  if (actionCode === 'RESET') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 9V5h4M5 5a8 8 0 1 1-1 9" /></svg>;
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14" /></svg>;
}

/** One semantic action, rendered as compact Icon + Text or Icon Only. */
export default function ActionButton({ actionCode, label, display = 'text', tone = 'default', disabled = false, onClick }: ActionButtonProps) {
  return <button type="button" className={`action-button ${display === 'icon' ? 'icon-only' : ''} ${tone}`} data-action-code={actionCode} aria-label={label} title={label} disabled={disabled} onClick={onClick}>
    <ActionIcon actionCode={actionCode} />
    {display === 'text' ? <span>{label}</span> : null}
  </button>;
}
