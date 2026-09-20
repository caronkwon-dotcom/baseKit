import type { ReactNode } from 'react';

export type BaseKitMessageType = 'info' | 'warn' | 'error' | 'success';

interface BaseKitMessageProps {
  type: BaseKitMessageType;
  message: ReactNode;
  detail?: ReactNode;
  dismissible?: boolean;
  onDismiss?: () => void;
}

function MessageIcon({ type }: { type: BaseKitMessageType }) {
  if (type === 'warn') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 8v5m0 3h.01M10.3 3.9 2.7 17a2 2 0 0 0 1.7 3h15.2a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" /></svg>;
  if (type === 'error') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 9 6 6m0-6-6 6M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>;
  if (type === 'success') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4.2 4.2L19 6.5" /></svg>;
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 17v-5m0-4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>;
}

export default function BaseKitMessage({ type, message, detail, dismissible = false, onDismiss }: BaseKitMessageProps) {
  return (
    <div className={`basekit-message ${type}`} role={type === 'error' ? 'alert' : 'status'}>
      <MessageIcon type={type} />
      <span>{message}</span>
      {detail ? <small>{detail}</small> : null}
      {dismissible ? <button type="button" className="basekit-message__dismiss" aria-label="메시지 닫기" onClick={onDismiss}>×</button> : null}
    </div>
  );
}
