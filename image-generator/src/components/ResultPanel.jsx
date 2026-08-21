import { useMemo, useState } from 'react';
import { estimateExpectedMs } from '../progressModel.js';
import GenerationProgress from './GenerationProgress.jsx';
import { Icon } from './Icons.jsx';

export default function ResultPanel({
  result,
  loading,
  error,
  selectedCount,
  quality,
  onGenerate,
  onEdit,
  onFlux2Edit,
  onUploadEdit,
  canGenerate,
  paymentNotice,
  onDownload,
  candidates,
  onPickCandidate,
  parentGeneration,
  genCount,
  downloadLoading,
  editLoading,
  genBackend,
  defaultModelLabel,
}) {
  const [roundPreview, setRoundPreview] = useState(true);
  const generation = useMemo(() => result?.generation || (result?.id ? result : null), [result]);
  const locked = Boolean(generation?.locked || generation?.downloadedAt || generation?.lockedAt);
  const modelLabel = result?.provider === 'openai'
    ? result?.model || 'GPT Image 2'
    : result?.provider === 'comfyui'
      ? 'ComfyUI 本地'
      : result?.provider === 'local-model'
        ? 'Local SD1.5'
        : defaultModelLabel;
  const progressOperation = editLoading ? 'edit' : 'generate';
  const progressRunning = loading || editLoading;
  const progressExpectedMs = estimateExpectedMs({ backend: genBackend, quality, operation: progressOperation, count: genCount });
  const activeCandidateId = generation?.id || null;

  const isBusy = loading;
  const buttonText = !canGenerate
    ? '先填写头像描述'
    : loading
      ? '头像生成中…'
      : '立即生成 AI 头像';

  return (
    <aside className="result-panel" aria-label="头像生成预览">
      <div className="result-heading">
        <div><span className="service-badge">AI 智能定制</span><h2>你的头像预览</h2></div>
        <span className="model-badge"><i /> {modelLabel}</span>
      </div>

      <div className="preview-tabs" role="group" aria-label="预览形状">
        <button type="button" className={roundPreview ? 'active' : ''} onClick={() => setRoundPreview(true)}>圆形头像</button>
        <button type="button" className={!roundPreview ? 'active' : ''} onClick={() => setRoundPreview(false)}>方形原图</button>
      </div>

      <div className={`canvas-stage${roundPreview ? ' round-mode' : ''}`}>
        <div className={`canvas-wrap${loading ? ' is-loading' : ''}`}>
          {result ? (
            <img src={result.image} alt="AI 生成的专属头像" />
          ) : (
            <div className="empty-canvas">
              <div className="avatar-placeholder"><span /><i /><b /></div>
              <strong>{loading ? '正在生成你的专属头像' : '你的头像将在这里出现'}</strong>
              <p>{loading ? 'AI 正在完成构图与细节，请耐心等待。' : '完成左侧定制后，点击下方按钮生成。'}</p>
            </div>
          )}
          {loading && <div className="scan-line" />}
        </div>
        {/* 放在 canvas-wrap 外层：圆形预览模式下 canvas-wrap 的圆形裁剪会切掉进度条。 */}
        <GenerationProgress
          running={progressRunning}
          failed={Boolean(error)}
          expectedMs={progressExpectedMs}
          operation={progressOperation}
        />
        {roundPreview && <span className="safe-ring" aria-hidden="true" />}
      </div>

      {candidates?.length > 1 && (
        <div className="candidate-strip" role="group" aria-label="候选头像，点击切换">
          {candidates.map((candidate, index) => (
            <button
              key={candidate.id}
              type="button"
              className={candidate.id === activeCandidateId ? 'active' : ''}
              onClick={() => onPickCandidate?.(candidate)}
              aria-pressed={candidate.id === activeCandidateId}
              title={`候选 ${index + 1}`}
            >
              <img src={candidate.thumb || candidate.image} alt={`候选头像 ${index + 1}`} />
            </button>
          ))}
        </div>
      )}

      {parentGeneration && (
        <button className="lineage-note" type="button" onClick={() => onPickCandidate?.(parentGeneration)}>
          <Icon name="undo" size={13} /> 这张图由修改生成 · 查看修改前的原版
        </button>
      )}
      <p className="preview-hint"><i />圆形区域为社交头像安全预览，下载文件仍是完整方形 PNG。</p>
      <div className="billing-status">
        <span className="alipay-mark dev-mark">访客</span>
        <div><strong>访客模式：不限生成、修改和下载次数</strong><small>无需登录；生成记录保存在服务端本地文件夹，重启服务后仍在</small></div>
      </div>
      {paymentNotice && <div className="payment-notice" role="status">{paymentNotice}</div>}
      {error && <div className="error-message" role="alert">{error}</div>}

      <div className="generation-specs">
        <div><span>已选标签</span><strong>{selectedCount} 项</strong></div>
        <div><span>头像规格</span><strong>1:1 方形</strong></div>
        <div><span>生成精度</span><strong>{({ low: '快速', medium: '高清', high: '超精细' })[quality]}</strong></div>
      </div>

      <button className="generate-button" type="button" onClick={onGenerate} disabled={isBusy} aria-disabled={!canGenerate || isBusy}>
        <Icon name="spark" size={21} />
        <span>{buttonText}</span>
        {!isBusy && canGenerate && <Icon name="arrow" size={20} />}
      </button>

      {(
        <div className="result-actions">
          {locked && <p className="locked-note">这张头像已确认下载并锁定，不能继续修改。</p>}
          {result && (
            <>
              <button type="button" onClick={() => onDownload?.(result)} disabled={downloadLoading}>
                <Icon name="download" size={17} />
                {downloadLoading ? '下载中…' : '下载 PNG'}
              </button>
              <button type="button" onClick={() => onEdit?.(result)} disabled={locked || editLoading}>
                <Icon name={locked ? 'lock' : 'wand'} size={17} />
                {locked ? '已锁定' : editLoading ? '修改中…' : '快速语义修改'}
              </button>
              <button className="flux2-edit-button" type="button" onClick={() => onFlux2Edit?.(result)} disabled={locked}>
                <Icon name={locked ? 'lock' : 'brush'} size={17} />
                {locked ? '已锁定，不能微调' : '局部微调（画选区域）'}
              </button>
            </>
          )}
          <button className="upload-edit-button" type="button" onClick={onUploadEdit}>
            <Icon name="upload" size={17} />上传图片微调
          </button>
        </div>
      )}

      <div className="service-notes">
        <span><Icon name="check" size={13} />访客模式：无限生成与下载</span>
        <span><Icon name="shield" size={13} />图片只存在本机服务端</span>
      </div>
    </aside>
  );
}
