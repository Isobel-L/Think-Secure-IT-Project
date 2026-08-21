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
    <div className="dialog-overlay" role="dialog" aria-modal="true" aria-label="AI 提示词预览">
      <div className="dialog-card prompt-preview-dialog">
        <button className="dialog-close" type="button" onClick={onClose} aria-label="关闭">
          <Icon name="close" size={15} />
        </button>
        <span className="dialog-eyebrow">生成透明度</span>
        <h3>AI 提示词预览</h3>
        {loading ? (
          <p className="dialog-message">正在根据当前描述与风格生成提示词…</p>
        ) : preview ? (
          <>
            <p className="dialog-message">这是当前描述与风格选择将发送给模型的完整提示词。</p>
            <div className="prompt-preview-block">
              <h4>正向提示词</h4>
              <pre>{preview.prompt}</pre>
            </div>
            {preview.negativePrompt && (
              <div className="prompt-preview-block">
                <h4>避免出现</h4>
                <pre>{preview.negativePrompt}</pre>
              </div>
            )}
            <div className="dialog-actions">
              <button className="dialog-secondary" type="button" onClick={onClose}>关闭</button>
              <button className="dialog-primary" type="button" onClick={copyPrompt}>
                {copied ? '已复制 ✓' : '复制提示词'}
              </button>
            </div>
          </>
        ) : (
          <p className="dialog-message">暂时无法生成提示词预览，请稍后重试。</p>
        )}
      </div>
    </div>
  );
}
