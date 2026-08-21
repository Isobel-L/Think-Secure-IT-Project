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
      ? 'ComfyUI local'
      : result?.provider === 'local-model'
        ? 'Local SD1.5'
        : defaultModelLabel;
  const progressOperation = editLoading ? 'edit' : 'generate';
  const progressRunning = loading || editLoading;
  const progressExpectedMs = estimateExpectedMs({ backend: genBackend, quality, operation: progressOperation, count: genCount });
  const activeCandidateId = generation?.id || null;

  const isBusy = loading;
  const buttonText = !canGenerate
    ? 'Write a description first'
    : loading
      ? 'Generating…'
      : 'Generate my avatar';

  return (
    <aside className="result-panel" aria-label="Avatar preview">
      <div className="result-heading">
        <div><span className="service-badge">AI customisation</span><h2>Your avatar preview</h2></div>
        <span className="model-badge"><i /> {modelLabel}</span>
      </div>

      <div className="preview-tabs" role="group" aria-label="Preview shape">
        <button type="button" className={roundPreview ? 'active' : ''} onClick={() => setRoundPreview(true)}>Circle</button>
        <button type="button" className={!roundPreview ? 'active' : ''} onClick={() => setRoundPreview(false)}>Square</button>
      </div>

      <div className={`canvas-stage${roundPreview ? ' round-mode' : ''}`}>
        <div className={`canvas-wrap${loading ? ' is-loading' : ''}`}>
          {result ? (
            <img src={result.image} alt="AI generated avatar" />
          ) : (
            <div className="empty-canvas">
              <div className="avatar-placeholder"><span /><i /><b /></div>
              <strong>{loading ? 'Generating your avatar' : 'Your avatar will appear here'}</strong>
              <p>{loading ? 'The AI is working through composition and detail. This takes a moment.' : 'Finish the setup on the left, then press the button below.'}</p>
            </div>
          )}
          {loading && <div className="scan-line" />}
        </div>
        {/* Outside canvas-wrap: in circle preview mode its circular clip would cut the progress bar off. */}
        <GenerationProgress
          running={progressRunning}
          failed={Boolean(error)}
          expectedMs={progressExpectedMs}
          operation={progressOperation}
        />
        {roundPreview && <span className="safe-ring" aria-hidden="true" />}
      </div>

      {candidates?.length > 1 && (
        <div className="candidate-strip" role="group" aria-label="Candidates, click to switch">
          {candidates.map((candidate, index) => (
            <button
              key={candidate.id}
              type="button"
              className={candidate.id === activeCandidateId ? 'active' : ''}
              onClick={() => onPickCandidate?.(candidate)}
              aria-pressed={candidate.id === activeCandidateId}
              title={`Candidate ${index + 1}`}
            >
              <img src={candidate.thumb || candidate.image} alt={`Candidate avatar ${index + 1}`} />
            </button>
          ))}
        </div>
      )}

      {parentGeneration && (
        <button className="lineage-note" type="button" onClick={() => onPickCandidate?.(parentGeneration)}>
          <Icon name="undo" size={13} /> Created by an edit &middot; view the original
        </button>
      )}
      <p className="preview-hint"><i />The circle shows the social-avatar safe area; the download is still a full square PNG.</p>
      <div className="billing-status">
        <span className="alipay-mark dev-mark">Guest</span>
        <div><strong>Guest mode: unlimited generating, editing and downloading</strong><small>No sign-in needed. Generations are stored in a folder on the server and survive a restart.</small></div>
      </div>
      {paymentNotice && <div className="payment-notice" role="status">{paymentNotice}</div>}
      {error && <div className="error-message" role="alert">{error}</div>}

      <div className="generation-specs">
        <div><span>Tags selected</span><strong>{selectedCount}</strong></div>
        <div><span>Format</span><strong>1:1 square</strong></div>
        <div><span>Quality</span><strong>{({ low: 'Fast', medium: 'High definition', high: 'Ultra detailed' })[quality]}</strong></div>
      </div>

      <button className="generate-button" type="button" onClick={onGenerate} disabled={isBusy} aria-disabled={!canGenerate || isBusy}>
        <Icon name="spark" size={21} />
        <span>{buttonText}</span>
        {!isBusy && canGenerate && <Icon name="arrow" size={20} />}
      </button>

      {(
        <div className="result-actions">
          {locked && <p className="locked-note">This avatar was locked after download and cannot be edited further.</p>}
          {result && (
            <>
              <button type="button" onClick={() => onDownload?.(result)} disabled={downloadLoading}>
                <Icon name="download" size={17} />
                {downloadLoading ? 'Saving…' : 'Download PNG'}
              </button>
              <button type="button" onClick={() => onEdit?.(result)} disabled={locked || editLoading}>
                <Icon name={locked ? 'lock' : 'wand'} size={17} />
                {locked ? 'Locked' : editLoading ? 'Editing…' : 'Quick semantic edit'}
              </button>
              <button className="flux2-edit-button" type="button" onClick={() => onFlux2Edit?.(result)} disabled={locked}>
                <Icon name={locked ? 'lock' : 'brush'} size={17} />
                {locked ? 'Locked, no retouching' : 'Retouch an area'}
              </button>
            </>
          )}
          <button className="upload-edit-button" type="button" onClick={onUploadEdit}>
            <Icon name="upload" size={17} />Upload an image to retouch
          </button>
        </div>
      )}

      <div className="service-notes">
        <span><Icon name="check" size={13} />Guest mode: unlimited generating and downloading</span>
        <span><Icon name="shield" size={13} />Images stay on your own server</span>
      </div>
    </aside>
  );
}
