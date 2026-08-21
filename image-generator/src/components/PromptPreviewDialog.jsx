import { useEffect, useState } from 'react';
import { Icon } from './Icons.jsx';

export default function PromptPreviewDialog({ open, loading, preview, onClose }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    setCopied(false);
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const copyPrompt = async () => {
    if (!preview?.prompt) return;
    try {
      await navigator.clipboard.writeText(preview.prompt);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="dialog-overlay" role="dialog" aria-modal="true" aria-label="AI prompt preview">
      <div className="dialog-card prompt-preview-dialog">
        <button className="dialog-close" type="button" onClick={onClose} aria-label="Close">
          <Icon name="close" size={15} />
        </button>
        <span className="dialog-eyebrow">Transparency</span>
        <h3>AI prompt preview</h3>
        {loading ? (
          <p className="dialog-message">Building the prompt from your description and styles…</p>
        ) : preview ? (
          <>
            <p className="dialog-message">This is the full prompt your description and style choices send to the model.</p>
            <div className="prompt-preview-block">
              <h4>Positive prompt</h4>
              <pre>{preview.prompt}</pre>
            </div>
            {preview.negativePrompt && (
              <div className="prompt-preview-block">
                <h4>Negative prompt</h4>
                <pre>{preview.negativePrompt}</pre>
              </div>
            )}
            <div className="dialog-actions">
              <button className="dialog-secondary" type="button" onClick={onClose}>Close</button>
              <button className="dialog-primary" type="button" onClick={copyPrompt}>
                {copied ? 'Copied ✓' : 'Copy prompt'}
              </button>
            </div>
          </>
        ) : (
          <p className="dialog-message">The prompt preview is unavailable right now. Please try again.</p>
        )}
      </div>
    </div>
  );
}
