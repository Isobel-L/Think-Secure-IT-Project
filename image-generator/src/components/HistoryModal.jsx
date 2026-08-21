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
    <div className="dialog-overlay history-overlay" role="dialog" aria-modal="true" aria-label="全部生成记录">
      <div className="dialog-card history-modal">
        <button className="dialog-close" type="button" onClick={onClose} aria-label="关闭">
          <Icon name="close" size={15} />
        </button>
        <span className="dialog-eyebrow">生成记录</span>
        <div className="history-modal-heading">
          <h3>全部头像（{items.length}）</h3>
          <button className="ghost-mini" type="button" onClick={onRefresh} disabled={loading}>{loading ? '刷新中' : '刷新'}</button>
        </div>
        <p className="dialog-message">点击图片可回到预览面板查看；确认下载后图片会锁定，不能继续修改。</p>
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
