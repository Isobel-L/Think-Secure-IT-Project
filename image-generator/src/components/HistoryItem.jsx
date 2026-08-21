import { Icon } from './Icons.jsx';

export default function HistoryItem({ item, onPreview, onDownload, onEdit, onFluxEdit, onDelete, downloadBusy, editBusy }) {
  return (
    <div className="history-item">
      {onDelete && (
        <button className="history-delete" type="button" onClick={() => onDelete(item)} aria-label="Delete this avatar" title="Delete this avatar">
          <Icon name="trash" size={13} />
        </button>
      )}
      <button className="history-preview" type="button" onClick={() => onPreview(item)}>
        <img src={item.thumb || item.image} alt="Saved avatar" loading="lazy" />
        <span>
          {item.parentGenerationId && <i className="history-lineage" title="Created by an edit"><Icon name="wand" size={11} /></i>}
          {item.locked ? 'Locked · ' : ''}{new Date(item.createdAt).toLocaleString('en-US', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
        </span>
      </button>
      <div className="history-actions">
        <button className="history-download" type="button" onClick={() => onDownload(item)} disabled={downloadBusy}>
          <Icon name="download" size={13} />
          {downloadBusy ? 'Saving' : 'Download'}
        </button>
        <button className="history-edit" type="button" onClick={() => onEdit(item)} disabled={item.locked || editBusy}>
          {item.locked ? <Icon name="lock" size={12} /> : null}
          {item.locked ? 'Locked' : editBusy ? 'Editing' : 'Quick edit'}
        </button>
        <button className="history-flux-edit" type="button" onClick={() => onFluxEdit(item)} disabled={item.locked} aria-label="Retouch this avatar">
          <Icon name="brush" size={13} />
          Retouch
        </button>
      </div>
    </div>
  );
}
