import { Icon } from './Icons.jsx';

export default function HistoryItem({ item, onPreview, onDownload, onEdit, onFluxEdit, onDelete, downloadBusy, editBusy }) {
  return (
    <div className="history-item">
      {onDelete && (
        <button className="history-delete" type="button" onClick={() => onDelete(item)} aria-label="删除这张头像" title="删除这张头像">
          <Icon name="trash" size={13} />
        </button>
      )}
      <button className="history-preview" type="button" onClick={() => onPreview(item)}>
        <img src={item.thumb || item.image} alt="历史头像" loading="lazy" />
        <span>
          {item.parentGenerationId && <i className="history-lineage" title="由修改生成"><Icon name="wand" size={11} /></i>}
          {item.locked ? '已锁定 · ' : ''}{new Date(item.createdAt).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
        </span>
      </button>
      <div className="history-actions">
        <button className="history-download" type="button" onClick={() => onDownload(item)} disabled={downloadBusy}>
          <Icon name="download" size={13} />
          {downloadBusy ? '下载中' : '下载'}
        </button>
        <button className="history-edit" type="button" onClick={() => onEdit(item)} disabled={item.locked || editBusy}>
          {item.locked ? <Icon name="lock" size={12} /> : null}
          {item.locked ? '锁定' : editBusy ? '修改中' : '快改'}
        </button>
        <button className="history-flux-edit" type="button" onClick={() => onFluxEdit(item)} disabled={item.locked} aria-label="微调这张历史头像">
          <Icon name="brush" size={13} />
          微调
        </button>
      </div>
    </div>
  );
}
