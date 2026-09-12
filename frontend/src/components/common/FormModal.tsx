import { useEffect, type ReactNode } from 'react';

interface FormModalProps {
  open: boolean;
  title: string;
  children: ReactNode;
  submitLabel?: string;
  submitting?: boolean;
  submitTone?: 'primary' | 'danger';
  onSubmit?: () => void;
  onClose: () => void;
}

export default function FormModal({
  open,
  title,
  children,
  submitLabel = '저장',
  submitting = false,
  submitTone = 'primary',
  onSubmit,
  onClose,
}: FormModalProps) {
  useEffect(() => {
    if (!open) return undefined;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !submitting) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose, submitting]);

  if (!open) return null;

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={() => !submitting && onClose()}>
      <section
        className="form-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="form-modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="form-modal-header">
          <h2 id="form-modal-title">{title}</h2>
          <button type="button" className="modal-close-button" aria-label="닫기" onClick={onClose} disabled={submitting}>×</button>
        </header>
        <div className="form-modal-body">{children}</div>
        <footer className="form-modal-footer">
          <button type="button" className="secondary-button" onClick={onClose} disabled={submitting}>취소</button>
          {onSubmit ? (
            <button type="button" className={submitTone === 'danger' ? 'danger-button' : 'primary-button'} onClick={onSubmit} disabled={submitting}>
              {submitting ? '처리 중...' : submitLabel}
            </button>
          ) : null}
        </footer>
      </section>
    </div>
  );
}
