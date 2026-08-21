import { useEffect, useState } from 'react';
import { DialogShell } from './Dialog.jsx';
import { Icon } from './Icons.jsx';

const sizeOptions = [
  { value: 1024, label: '原图', hint: '1024×1024' },
  { value: 640, label: '社交头像', hint: '640×640' },
  { value: 256, label: '小尺寸', hint: '256×256' },
];
const shapeOptions = [
  { value: 'square', label: '方形' },
  { value: 'circle', label: '圆形（透明背景）' },
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
    <DialogShell title="下载头像" eyebrow="导出选项" onClose={onCancel}>
      <p className="dialog-message">选择导出规格，下载文件均为 PNG。</p>
      <div className="download-options">
        <fieldset>
          <legend>尺寸</legend>
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
          <legend>形状</legend>
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
          下载会消耗 1 次免费/付费下载额度，成功后这张头像将被锁定，不能继续修改。
        </p>
      )}
      <div className="dialog-actions">
        <button className="dialog-secondary" type="button" onClick={onCancel} disabled={loading}>取消</button>
        <button className="dialog-primary" type="button" onClick={() => onConfirm({ size, shape })} disabled={loading}>
          {loading ? '下载中…' : willCharge ? '确认下载并锁定' : '下载'}
        </button>
      </div>
    </DialogShell>
  );
}
