import { useEffect } from 'react';
import HistoryItem from './HistoryItem.jsx';
import { Icon } from './Icons.jsx';

export default function HistoryModal({
  open,
  items,
  loading,
  onRefresh,
  onClose,
  onPreview,
  onDownload,
  onEdit,
  onFluxEdit,
  onDelete,
  downloadLoadingId,
  editLoadingId,
}) {
  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="dialog-overlay history-overlay" role="dialog" aria-modal="true" aria-label="All generations">
      <div className="dialog-card history-modal">
        <button className="dialog-close" type="button" onClick={onClose} aria-label="Close">
          <Icon name="close" size={15} />
        </button>
        <span className="dialog-eyebrow">History</span>
        <div className="history-modal-heading">
          <h3>All avatars ({items.length})</h3>
          <button className="ghost-mini" type="button" onClick={onRefresh} disabled={loading}>{loading ? 'Refreshing' : 'Refresh'}</button>
        </div>
        <p className="dialog-message">Click an avatar to open it in the preview panel.</p>
        <div className="history-modal-grid">
          {items.map((item) => (
            <HistoryItem
              key={item.id}
              item={item}
              onPreview={onPreview}
              onDownload={onDownload}
              onEdit={onEdit}
              onFluxEdit={onFluxEdit}
              onDelete={onDelete}
              downloadBusy={downloadLoadingId === item.id}
              editBusy={editLoadingId === item.id}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
