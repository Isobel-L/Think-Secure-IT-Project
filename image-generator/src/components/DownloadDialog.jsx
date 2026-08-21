import { useEffect, useState } from 'react';
import { DialogShell } from './Dialog.jsx';
import { Icon } from './Icons.jsx';

const sizeOptions = [
  { value: 1024, label: 'Original', hint: '1024x1024' },
  { value: 640, label: 'Social avatar', hint: '640x640' },
  { value: 256, label: 'Small', hint: '256x256' },
];
const shapeOptions = [
  { value: 'square', label: 'Square' },
  { value: 'circle', label: 'Circle (transparent)' },
];

export default function DownloadDialog({ open, willCharge, loading, onConfirm, onCancel }) {
  const [size, setSize] = useState(1024);
  const [shape, setShape] = useState('square');

  useEffect(() => {
    if (open) {
      setSize(1024);
      setShape('square');
    }
  }, [open]);

  if (!open) return null;

  return (
    <DialogShell title="Download avatar" eyebrow="Export options" onClose={onCancel}>
      <p className="dialog-message">Choose an export format. Every download is a PNG.</p>
      <div className="download-options">
        <fieldset>
          <legend>Size</legend>
          <div className="download-choice-row">
            {sizeOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={size === option.value ? 'active' : ''}
                onClick={() => setSize(option.value)}
                aria-pressed={size === option.value}
              >
                <strong>{option.label}</strong>
                <small>{option.hint}</small>
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend>Shape</legend>
          <div className="download-choice-row">
            {shapeOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={shape === option.value ? 'active' : ''}
                onClick={() => setShape(option.value)}
                aria-pressed={shape === option.value}
              >
                <strong>{option.label}</strong>
              </button>
            ))}
          </div>
        </fieldset>
      </div>
      {willCharge && (
        <p className="dialog-hint">
          <Icon name="lock" size={13} />
          Downloading uses one free or paid credit, and locks this avatar against further edits.
        </p>
      )}
      <div className="dialog-actions">
        <button className="dialog-secondary" type="button" onClick={onCancel} disabled={loading}>Cancel</button>
        <button className="dialog-primary" type="button" onClick={() => onConfirm({ size, shape })} disabled={loading}>
          {loading ? 'Saving…' : willCharge ? 'Confirm and lock' : 'Download'}
        </button>
      </div>
    </DialogShell>
  );
}
