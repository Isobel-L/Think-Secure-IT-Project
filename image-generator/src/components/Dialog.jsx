import { useEffect, useRef, useState } from 'react';
import { Icon } from './Icons.jsx';

export function DialogShell({ title, eyebrow, onClose, children }) {
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div className="dialog-overlay" role="dialog" aria-modal="true" aria-label={title}>
      <div className="dialog-card">
        <button className="dialog-close" type="button" onClick={onClose} aria-label="Close">
          <Icon name="close" size={15} />
        </button>
        {eyebrow && <span className="dialog-eyebrow">{eyebrow}</span>}
        <h3>{title}</h3>
        {children}
      </div>
    </div>
  );
}

export function ConfirmDialog({ open, title, eyebrow, message, hint, confirmLabel = 'Confirm', cancelLabel = 'Go back', loading = false, onConfirm, onCancel }) {
  if (!open) return null;

  return (
    <DialogShell title={title} eyebrow={eyebrow} onClose={onCancel}>
      <p className="dialog-message">{message}</p>
      {hint && <p className="dialog-hint"><Icon name="lock" size={13} />{hint}</p>}
      <div className="dialog-actions">
        <button className="dialog-secondary" type="button" onClick={onCancel} disabled={loading}>{cancelLabel}</button>
        <button className="dialog-primary" type="button" onClick={onConfirm} disabled={loading}>
          {loading ? 'Working…' : confirmLabel}
        </button>
      </div>
    </DialogShell>
  );
}

export function PromptDialog({ open, title, eyebrow, message, placeholder, submitLabel = 'Submit', loading = false, onSubmit, onCancel }) {
  const [value, setValue] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setValue('');
      const frame = requestAnimationFrame(() => inputRef.current?.focus());
      return () => cancelAnimationFrame(frame);
    }
    return undefined;
  }, [open]);

  if (!open) return null;

  const submit = (event) => {
    event.preventDefault();
    const trimmed = value.trim();
    if (trimmed) onSubmit?.(trimmed);
  };

  return (
    <DialogShell title={title} eyebrow={eyebrow} onClose={onCancel}>
      <form onSubmit={submit}>
        <p className="dialog-message">{message}</p>
        <textarea
          ref={inputRef}
          className="dialog-textarea"
          value={value}
          onChange={(event) => setValue(event.target.value.slice(0, 400))}
          placeholder={placeholder}
          rows="3"
        />
        <div className="dialog-actions">
          <button className="dialog-secondary" type="button" onClick={onCancel} disabled={loading}>Cancel</button>
          <button className="dialog-primary" type="submit" disabled={loading || !value.trim()}>
            {loading ? 'Working…' : submitLabel}
          </button>
        </div>
      </form>
    </DialogShell>
  );
}
