import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { catalog, examples } from '../shared/catalog.js';
import { randomSelections, resolveSelectionToggle, selectionLabels } from '../shared/selectionRules.js';
import { api, apiOrThrow } from './api.js';
import { normalizePromptModes } from './modelOptions.js';
import { ConfirmDialog, PromptDialog } from './components/Dialog.jsx';
import DownloadDialog from './components/DownloadDialog.jsx';
import HistoryItem from './components/HistoryItem.jsx';
import HistoryModal from './components/HistoryModal.jsx';
import HeroShowcase from './components/HeroShowcase.jsx';
import { Icon } from './components/Icons.jsx';
import ImageEditor from './components/ImageEditor.jsx';
import ParameterSection from './components/ParameterSection.jsx';
import PromptPreviewDialog from './components/PromptPreviewDialog.jsx';
import ResultPanel from './components/ResultPanel.jsx';
import {
  buildEditFormData,
  findParentGeneration,
  getEditorSource,
  mergeEditedGeneration,
  readJsonResponse,
  resolveHistoryRefresh,
  shouldUseFlux2Editor,
} from './editIntegration.js';

const avatarSize = '1024x1024';
const historyPreviewCount = 6;
const historyLimit = 60;
const flux2HealthResponseError = 'The image editing service returned an invalid status response.';

const isGenerationLocked = (generation) =>
  Boolean(generation?.locked || generation?.downloadedAt || generation?.lockedAt);

function App() {
  const [brief, setBrief] = useState('');
  const [avoid, setAvoid] = useState('');
  const [selections, setSelections] = useState({});
  const [selectionNotice, setSelectionNotice] = useState('');
  const [inspirationLoading, setInspirationLoading] = useState(false);
  const [quality, setQuality] = useState('medium');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [paymentNotice, setPaymentNotice] = useState('');
  const [downloadLoadingId, setDownloadLoadingId] = useState('');
  const [editLoadingId, setEditLoadingId] = useState('');
  const [confirmDownloadTarget, setConfirmDownloadTarget] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [promptPreviewOpen, setPromptPreviewOpen] = useState(false);
  const [promptPreview, setPromptPreview] = useState(null);
  const [promptPreviewLoading, setPromptPreviewLoading] = useState(false);
  const [checkpoints, setCheckpoints] = useState([]);
  const [checkpoint, setCheckpoint] = useState('');
  const [promptModes, setPromptModes] = useState([]);
  const [promptMode, setPromptMode] = useState('flux1-raw');
  const [translatorReady, setTranslatorReady] = useState(false);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [modelsError, setModelsError] = useState('');
  const [genBackend, setGenBackend] = useState('');
  const [genCount, setGenCount] = useState(1);
  const [candidates, setCandidates] = useState(null);
  const [openaiAvailable, setOpenaiAvailable] = useState(false);
  const [openaiModelName, setOpenaiModelName] = useState('GPT Image 2');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorSource, setEditorSource] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editError, setEditError] = useState('');
  const [flux2Ready, setFlux2Ready] = useState(false);
  const [flux2Checking, setFlux2Checking] = useState(false);
  const flux2HealthRequestRef = useRef(0);
  const historyRequestRef = useRef(0);
  const pendingEditedGenerationRef = useRef(null);
  const editSubmissionRef = useRef(false);
  const editorSuccessCloseTimerRef = useRef(null);

  const selectedCount = useMemo(
    () => Object.values(selections).reduce((total, values) => total + values.length, 0),
    [selections],
  );
  const hasBrief = Boolean(brief.trim());
  const parentGeneration = useMemo(() => findParentGeneration(history, result), [history, result]);

  const completion = Math.min(100, Math.round(((brief.trim() ? 3 : 0) + selectedCount) / 12 * 100));
  const activeStep = result?.image ? 3 : selectedCount > 0 ? 2 : 1;
  const steps = [
    { id: 1, label: 'Describe' },
    { id: 2, label: 'Pick a style' },
    { id: 3, label: 'Generate & save' },
  ];

  const loadHistory = async () => {
    const requestId = ++historyRequestRef.current;
    setHistoryLoading(true);
    try {
      const response = await fetch(`/api/generations?limit=${historyLimit}`, { credentials: 'include' });
      if (!response.ok) {
        if (requestId === historyRequestRef.current) {
          setHistory((current) => mergeEditedGeneration(current, pendingEditedGenerationRef.current, historyLimit));
        }
        return;
      }
      const data = await readJsonResponse(response, 'The history response was not valid JSON.');
      const pendingGeneration = pendingEditedGenerationRef.current;
      const acceptedRefresh = resolveHistoryRefresh({
        requestId,
        currentRequestId: historyRequestRef.current,
        items: data.items,
        pendingGeneration,
      });
      if (acceptedRefresh) {
        setHistory(acceptedRefresh.history);
        if (acceptedRefresh.pendingAcknowledged
          && pendingEditedGenerationRef.current?.id === pendingGeneration?.id) {
          pendingEditedGenerationRef.current = null;
        }
      }
    } catch {
      if (requestId === historyRequestRef.current) {
        setHistory((current) => mergeEditedGeneration(current, pendingEditedGenerationRef.current, historyLimit));
      }
    } finally {
      if (requestId === historyRequestRef.current) setHistoryLoading(false);
    }
  };

  const loadServerInfo = async () => {
    const { ok, data } = await api('/api/health');
    if (!ok) return;
    setOpenaiAvailable(Boolean(data.openaiConfigured));
    if (data.openaiModel) setOpenaiModelName(data.openaiModel);
    setGenBackend((current) => current || (data.backend === 'comfyui' ? 'comfyui' : data.openaiConfigured ? 'openai' : ''));
  };

  const loadComfyModels = async () => {
    setModelsLoading(true);
    setModelsError('');
    try {
      const response = await fetch('/api/comfyui/models');
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || 'Could not read the local model list.');

      const available = Array.isArray(data.checkpoints) ? data.checkpoints : [];
      const normalizedPromptModes = normalizePromptModes(data);
      setCheckpoints(available);
      setCheckpoint((current) => (
        available.includes(current)
          ? current
          : data.selectedCheckpoint || available[0] || ''
      ));
      setPromptModes(normalizedPromptModes.modes);
      setPromptMode((current) => (
        normalizedPromptModes.modes.some((mode) => mode.id === current && mode.available)
          ? current
          : normalizedPromptModes.selected
      ));
      setTranslatorReady(Boolean(data.translatorReady));
    } catch {
      const normalizedPromptModes = normalizePromptModes({ translatorReady: false });
      setCheckpoints([]);
      setCheckpoint('');
      setPromptModes(normalizedPromptModes.modes);
      setPromptMode(normalizedPromptModes.selected);
      setTranslatorReady(false);
      setModelsError('Local ComfyUI is not connected, so only the cloud model is available.');
      setGenBackend((current) => (current === 'comfyui' ? '' : current));
    } finally {
      setModelsLoading(false);
    }
  };

  const loadFlux2Health = async () => {
    const requestId = ++flux2HealthRequestRef.current;
    setFlux2Checking(true);
    setFlux2Ready(false);
    try {
      const response = await fetch('/api/comfyui/flux2/health');
      const health = await readJsonResponse(response, flux2HealthResponseError);
      if (requestId !== flux2HealthRequestRef.current) return;
      const ready = response.ok && health.ok;
      setFlux2Ready(ready);
      if (!ready) setEditError(health.error || 'The image editing service is not ready.');
    } catch (healthError) {
      if (requestId !== flux2HealthRequestRef.current) return;
      setFlux2Ready(false);
      setEditError(healthError.message === flux2HealthResponseError
        ? flux2HealthResponseError
        : 'Could not reach the image editing service.');
    } finally {
      if (requestId === flux2HealthRequestRef.current) setFlux2Checking(false);
    }
  };

  const openEditor = (item = result) => {
    const generation = item?.generation || item;
    if (generation?.locked || generation?.downloadedAt || generation?.lockedAt) {
      setError('This avatar was locked after download and cannot be edited further.');
      return;
    }
    window.clearTimeout(editorSuccessCloseTimerRef.current);
    editorSuccessCloseTimerRef.current = null;
    setEditorSource(getEditorSource(item));
    setEditError('');
    setEditorOpen(true);
    loadFlux2Health();
  };

  const closeEditor = () => {
    if (editing) return;
    window.clearTimeout(editorSuccessCloseTimerRef.current);
    editorSuccessCloseTimerRef.current = null;
    flux2HealthRequestRef.current += 1;
    setFlux2Ready(false);
    setFlux2Checking(false);
    setEditorOpen(false);
  };

  const submitEdit = async (submission) => {
    if (editSubmissionRef.current) return;
    editSubmissionRef.current = true;
    // A queued close from the previous success must be cancelled, or it would shut the editor mid-request.
    window.clearTimeout(editorSuccessCloseTimerRef.current);
    editorSuccessCloseTimerRef.current = null;
    setEditing(true);
    setEditError('');
    try {
      const response = await fetch('/api/edits', {
        method: 'POST',
        credentials: 'include',
        body: buildEditFormData(submission),
      });
      const payload = await readJsonResponse(response, 'The edit response was not valid JSON. Please try again.');
      if (!response.ok) throw new Error(payload.error || 'The edit failed. Please try again.');

      setResult(payload);
      if (payload.generation) {
        pendingEditedGenerationRef.current = payload.generation;
        setHistory((current) => mergeEditedGeneration(current, payload.generation, historyLimit));
      }
      flux2HealthRequestRef.current += 1;
      setFlux2Ready(false);
      setFlux2Checking(false);
      setEditing(false);
      window.clearTimeout(editorSuccessCloseTimerRef.current);
      editorSuccessCloseTimerRef.current = window.setTimeout(() => {
        editorSuccessCloseTimerRef.current = null;
        setEditorOpen(false);
      }, 750);
      void loadHistory();
    } catch (editFailure) {
      setEditError(editFailure.message || 'The edit failed. Please try again.');
    } finally {
      editSubmissionRef.current = false;
      setEditing(false);
    }
  };

  useEffect(() => {
    loadHistory().catch(() => {});
    loadServerInfo().catch(() => {});
    loadComfyModels().catch(() => {});
  }, []);

  useEffect(() => () => window.clearTimeout(editorSuccessCloseTimerRef.current), []);

  const toggleOption = (group, option) => {
    if (!hasBrief) {
      setError('Describe your avatar first, then pick a style.');
      document.querySelector('.brief-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setError('');
    const result = resolveSelectionToggle(selections, group.id, option.id);
    setSelections(result.selections);
    setSelectionNotice(result.notice);
  };

  const applyRandomInspiration = async () => {
    setInspirationLoading(true);
    setError('');
    try {
      const random = randomSelections();
      const { ok, data } = await api('/api/inspiration', {
        method: 'POST',
        body: { labels: selectionLabels(random.selections) },
      });
      if (!ok || !data.brief) throw new Error(data.error || 'Could not come up with an idea. Please try again.');
      setBrief(data.brief);
      setSelections(random.selections);
      setSelectionNotice('');
    } catch (inspirationError) {
      setError(inspirationError.message || 'Could not come up with an idea. Please try again.');
    } finally {
      setInspirationLoading(false);
    }
  };

  const applyExample = (example) => {
    setBrief(example.prompt);
    setSelections(example.selection);
    setSelectionNotice('');
    setError('');
    document.querySelector('.customizer-layout')?.scrollIntoView({ behavior: 'smooth' });
  };

  const reset = () => {
    setBrief('');
    setAvoid('');
    setSelections({});
    setSelectionNotice('');
    setResult(null);
    setCandidates(null);
    setError('');
    setPaymentNotice('');
  };

  const generate = async () => {
    if (!hasBrief) {
      setError('Describe your avatar first, then generate.');
      document.querySelector('.brief-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setLoading(true);
    setError('');
    setCandidates(null);
    try {
      const data = await apiOrThrow(
        '/api/generate',
        {
          method: 'POST',
          body: {
            brief,
            avoid,
            selections,
            size: avatarSize,
            quality,
            checkpoint,
            promptMode,
            count: genBackend === 'openai' ? genCount : 1,
            ...(genBackend ? { backend: genBackend } : {}),
          },
        },
        'Generation failed. Please try again.',
      );
      if (data.candidates?.length) {
        setCandidates(data.candidates);
        setResult(data.candidates[0]);
        setHistory((current) => [
          ...data.candidates,
          ...current.filter((item) => !data.candidates.some((candidate) => candidate.id === item.id)),
        ].slice(0, historyLimit));
      } else {
        setResult(data);
        if (data.generation) setHistory((current) => [data.generation, ...current.filter((item) => item.id !== data.generation.id)].slice(0, historyLimit));
      }
      setPaymentNotice('');
    } catch (requestError) {
      setError(requestError.message || 'Could not reach the avatar service right now.');
    } finally {
      setLoading(false);
    }
  };

  const performDownload = async (generationLike, options = {}) => {
    const generation = generationLike?.generation || generationLike;
    const downloadUrl = generation?.downloadUrl || generationLike?.downloadUrl;
    const size = [1024, 640, 256].includes(options.size) ? options.size : 1024;
    const shape = options.shape === 'circle' ? 'circle' : 'square';
    const variant = `${size}${shape === 'circle' ? '-round' : ''}`;
    setDownloadLoadingId(generation?.id || 'current');
    setError('');
    try {
      const response = await fetch(`${downloadUrl}?size=${size}&shape=${shape}`, { credentials: 'include' });
      if (!response.ok) {
        let message = 'Download failed. Please try again.';
        try {
          const data = await response.json();
          message = data.error || message;
        } catch {
          // binary endpoint may not always return JSON.
        }
        throw new Error(message);
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = `tmall-ai-avatar-${generation?.id || Date.now()}-${variant}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);

      setPaymentNotice('Avatar downloaded. You can keep editing this image.');
    } catch (downloadError) {
      setError(downloadError.message || 'Download failed. Please try again.');
    } finally {
      setDownloadLoadingId('');
    }
  };

  const downloadGeneration = (generationLike) => {
    const generation = generationLike?.generation || generationLike;
    if (!generation?.id && !generationLike?.downloadUrl) {
      setError('Generate or pick an avatar first.');
      return;
    }
    // Every download opens the export dialog so the user can pick a size and a shape.
    setConfirmDownloadTarget(generationLike);
  };

  const performEdit = async (generation, instruction) => {
    setEditLoadingId(generation.id);
    setError('');
    try {
      const data = await apiOrThrow(
        `/api/generations/${generation.id}/edit`,
        { method: 'POST', body: { instruction, quality } },
        'The edit failed. Please try again.',
      );
      setResult(data);
      if (data.generation) setHistory((current) => [data.generation, ...current.filter((item) => item.id !== data.generation.id)].slice(0, historyLimit));
      setPaymentNotice('Created a new version from the original that you can keep editing.');
    } catch (editError) {
      setError(editError.message || 'The edit failed. Please try again.');
    } finally {
      setEditLoadingId('');
    }
  };

  const editGeneration = (generationLike) => {
    const generation = generationLike?.generation || generationLike;
    if (!generation?.id) {
      setError('Pick an avatar you have already generated.');
      return;
    }
    if (isGenerationLocked(generation)) {
      setError('This avatar was locked after download and cannot be edited further.');
      return;
    }
    // The local ComfyUI / SD backends cannot do semantic edits, so fall back to the retouch editor.
    if (shouldUseFlux2Editor(generationLike)) {
      openEditor(generationLike);
      return;
    }

    setEditTarget(generation);
  };

  const openPromptPreview = async () => {
    setPromptPreviewOpen(true);
    setPromptPreviewLoading(true);
    try {
      const data = await apiOrThrow(
        '/api/prompt-preview',
        { method: 'POST', body: { brief, selections, avoid } },
        'Could not build the prompt preview.',
      );
      setPromptPreview(data);
    } catch {
      setPromptPreview(null);
    } finally {
      setPromptPreviewLoading(false);
    }
  };

  const performDelete = async (generation) => {
    setDeleteLoading(true);
    setError('');
    try {
      await apiOrThrow(`/api/generations/${generation.id}`, { method: 'DELETE' }, 'Delete failed. Please try again.');
      setHistory((current) => current.filter((item) => item.id !== generation.id));
      setResult((current) => {
        if (!current) return current;
        if (current.id === generation.id || current.generation?.id === generation.id) return null;
        return current;
      });
      setPaymentNotice('Avatar record deleted.');
    } catch (deleteError) {
      setError(deleteError.message || 'Delete failed. Please try again.');
    } finally {
      setDeleteLoading(false);
      setDeleteTarget(null);
    }
  };

  return (
    <div className="app-shell">
      <div className="utility-bar">
        <div>
          <span>Tmall AI Avatar Studio</span>
          <span>Consumer service platform</span>
          <a href="https://www.tmall.com/?page_offline=true" target="_blank" rel="noreferrer">
            Visit Tmall <span aria-hidden="true">↗</span>
          </a>
        </div>
      </div>

      <header className="topbar" id="top">
        <a
          className="brand"
          href="https://www.tmall.com/?page_offline=true"
          target="_blank"
          rel="noreferrer"
          aria-label="Visit the Tmall site (opens in a new window)"
          title="Visit the Tmall site"
        >
          <img className="brand-logo" src="/tmall-logo.png" alt="Tmall" />
          <span className="brand-copy"><strong>Tmall</strong><small>AI Avatar Studio</small></span>
          <span className="brand-external" aria-hidden="true">↗</span>
        </a>
        <nav className="step-nav" aria-label="Customisation steps">
          {steps.map((step, index) => (
            <Fragment key={step.id}>
              {index > 0 && <i className={activeStep > step.id - 1 ? 'completed' : ''} />}
              <span
                className={[
                  activeStep === step.id ? 'active' : '',
                  activeStep > step.id ? 'completed' : '',
                ].filter(Boolean).join(' ')}
                aria-current={activeStep === step.id ? 'step' : undefined}
              >
                <b>{activeStep > step.id ? <Icon name="check" size={12} /> : step.id}</b>
                {step.label}
              </span>
            </Fragment>
          ))}
        </nav>
        <div className="account-actions">
          <span className="guest-pill" title="No sign-in needed; generations are saved to a folder on the server">Guest mode</span>
          <button className="reset-button" type="button" onClick={reset}><Icon name="reset" size={17} />Start over</button>
        </div>
      </header>

      <section className="tmall-hero">
        <div className="hero-content">
          <span className="hero-tag"><Icon name="spark" size={13} /> Tmall AI customisation service</span>
          <h1>One sentence, one<br /><em>AI avatar of your own</em></h1>
          <p>Pick a style, a character and a mood. No prompt engineering needed &mdash; just a high-resolution avatar ready for social media.</p>
          <div className="hero-benefits">
            <span><b>1:1</b> square</span>
            <span><b>HD</b> PNG download</span>
            <span><b>Ready</b> for circle crops</span>
          </div>
          <div className="hero-actions">
            <a className="hero-primary" href="#customizer">Start designing</a>
            <a className="hero-secondary" href="https://www.tmall.com/?page_offline=true" target="_blank" rel="noreferrer">
              Browse Tmall <span aria-hidden="true">↗</span>
            </a>
          </div>
        </div>
        <HeroShowcase items={history} />
      </section>

      <div className="trust-strip">
        <div><strong>01</strong><span>Describe it<br /><small>Say what you want to see</small></span></div>
        <div><strong>02</strong><span>Mix and match<br /><small>Characters and art styles, your call</small></span></div>
        <div><strong>03</strong><span>Smart framing<br /><small>Fits the avatar safe area automatically</small></span></div>
        <div><strong>04</strong><span>HD delivery<br /><small>Download the moment it is ready</small></span></div>
      </div>

      <main className="customizer-layout" id="customizer">
        <section className="creator-panel">
          <div className="section-card brief-card">
            <div className="card-heading">
              <div className="number-title"><b>1</b><div><h2>Describe your ideal avatar</h2><p>Write the character, the story or the feeling and the AI fills in the rest</p></div></div>
              <span className="required-pill">Required</span>
            </div>
            <label className="brief-input">
              <span className="sr-only">Avatar description</span>
              <textarea
                value={brief}
                onChange={(event) => {
                  setBrief(event.target.value.slice(0, 1200));
                  if (error.includes('Describe your avatar first')) setError('');
                }}
                placeholder="For example: a silver-haired girl wearing headphones, cool but gentle, against soft pink bokeh&hellip;"
                rows="5"
              />
              <small>{brief.length} / 1200</small>
            </label>
            <div className="inspiration-row">
              <span>Starter ideas</span>
              {examples.map((example) => (
                <button type="button" onClick={() => applyExample(example)} key={example.label}>
                  <Icon name="wand" size={15} /><strong>{example.label}</strong><small>{example.description}</small>
                </button>
              ))}
              <button type="button" className="inspiration-random" onClick={applyRandomInspiration} disabled={inspirationLoading}>
                <Icon name="spark" size={15} />
                <strong>{inspirationLoading ? 'Writing…' : 'Surprise me'}</strong>
                <small>The AI writes a description and picks styles for you</small>
              </button>
            </div>
          </div>

          <div className="section-card recipe-card">
            <div className="card-heading recipe-heading">
              <div className="number-title"><b>2</b><div><h2>Choose a style</h2><p>{selectedCount} selected; single-choice options replace each other</p></div></div>
              <div className="completion"><span>{completion}% complete</span><i><b style={{ width: `${completion}%` }} /></i></div>
            </div>
            {selectionNotice && <p className="selection-notice" role="status">{selectionNotice}</p>}
            <div className="parameter-list">
              {catalog.map((section, index) => (
                <ParameterSection
                  key={section.id}
                  section={{ ...section, index }}
                  selections={selections}
                  onToggle={toggleOption}
                  open={index < 2}
                  locked={!hasBrief}
                />
              ))}
            </div>
          </div>

          <div className="section-card output-settings">
            <div className="number-title"><b>3</b><div><h2>Confirm the output</h2><p>Locked to a social-avatar safe composition</p></div></div>
            <div className="settings-grid">
              <div className="locked-setting"><span>Output</span><strong>1024 &times; 1024</strong><small>1:1 square PNG</small></div>
              <label>Quality
                <select value={quality} onChange={(event) => setQuality(event.target.value)}>
                  <option value="low">Fast preview</option>
                  <option value="medium">High definition (recommended)</option>
                  <option value="high">Ultra detailed</option>
                </select>
              </label>
              <label>How many
                <select
                  value={genBackend === 'openai' ? genCount : 1}
                  onChange={(event) => setGenCount(Number(event.target.value) === 4 ? 4 : 1)}
                  disabled={genBackend !== 'openai'}
                >
                  <option value="1">1 image</option>
                  <option value="4">4 candidates (cloud only)</option>
                </select>
              </label>
              <label className="model-setting">Model
                <span className="model-control">
                  <select
                    value={genBackend === 'openai' ? 'openai' : genBackend === 'comfyui' && checkpoint ? `comfy:${checkpoint}` : ''}
                    onChange={(event) => {
                      const value = event.target.value;
                      if (value === 'openai') {
                        setGenBackend('openai');
                      } else if (value.startsWith('comfy:')) {
                        setGenBackend('comfyui');
                        setCheckpoint(value.slice('comfy:'.length));
                      }
                    }}
                    disabled={modelsLoading || (!openaiAvailable && checkpoints.length === 0)}
                  >
                    {!openaiAvailable && checkpoints.length === 0 && <option value="">No models available</option>}
                    {(genBackend === '' && (openaiAvailable || checkpoints.length > 0)) && <option value="" disabled>Choose a model</option>}
                    {openaiAvailable && <option value="openai">OpenAI &middot; {openaiModelName} (cloud)</option>}
                    {checkpoints.map((name) => <option key={name} value={`comfy:${name}`}>ComfyUI local &middot; {name}</option>)}
                  </select>
                  <button type="button" onClick={loadComfyModels} disabled={modelsLoading}>
                    {modelsLoading ? 'Loading' : 'Refresh'}
                  </button>
                </span>
                {modelsError && genBackend !== 'openai' && <small className="model-error">{modelsError}</small>}
              </label>
              {genBackend === 'comfyui' && (
                <label className="model-setting">Prompt handling
                  <select
                    value={promptMode}
                    onChange={(event) => setPromptMode(event.target.value)}
                    disabled={modelsLoading || promptModes.length === 0}
                  >
                    {promptModes.map((mode) => (
                      <option key={mode.id} value={mode.id} disabled={!mode.available}>
                        {mode.label}{mode.available ? '' : ' (unavailable)'}
                      </option>
                    ))}
                  </select>
                  <small>{translatorReady
                    ? 'Qwen3 rewrites the prompt into English before FLUX.1 generates the image.'
                    : 'Qwen3 is unavailable, so FLUX.1 uses the raw prompt.'}</small>
                </label>
              )}
            </div>
            <label className="avoid-input">Things to avoid (optional)
              <input value={avoid} onChange={(event) => setAvoid(event.target.value.slice(0, 400))} placeholder="For example: no text, no busy background, no exaggerated expressions" />
            </label>
            <div className="avatar-standard">
              <Icon name="check" size={15} />
              <span>The head stays complete and the face centred, with a safe margin left for circular avatars on WeChat, QQ and Weibo.</span>
            </div>
            <button className="prompt-preview-button" type="button" onClick={openPromptPreview} disabled={!hasBrief} title={hasBrief ? 'See the full prompt sent to the model' : 'Write a description first'}>
              <Icon name="copy" size={14} />
              View the AI prompt
            </button>
          </div>

          <section className="section-card history-card">
            <div className="card-heading">
              <div className="number-title"><b>4</b><div><h2>My generations</h2><p>Every generation and edit is saved to a folder on the server; edit and download as often as you like</p></div></div>
              <button className="ghost-mini" type="button" onClick={loadHistory} disabled={historyLoading}>{historyLoading ? 'Refreshing' : 'Refresh'}</button>
            </div>
            <div className="history-grid">
              {history.length ? history.slice(0, historyPreviewCount).map((item) => (
                <HistoryItem
                  key={item.id}
                  item={item}
                  onPreview={setResult}
                  onDownload={downloadGeneration}
                  onEdit={editGeneration}
                  onFluxEdit={openEditor}
                  onDelete={setDeleteTarget}
                  downloadBusy={downloadLoadingId === item.id}
                  editBusy={editLoadingId === item.id}
                />
              )) : (
                <div className="history-empty">{historyLoading ? 'Loading history…' : 'Nothing yet. Your first avatar is saved here automatically.'}</div>
              )}
            </div>
            {history.length > historyPreviewCount && (
              <button className="history-more" type="button" onClick={() => setHistoryModalOpen(true)}>
                See all {history.length} avatars
                <Icon name="arrow" size={15} />
              </button>
            )}
          </section>
        </section>

        <ResultPanel
          result={result}
          loading={loading}
          error={error}
          selectedCount={selectedCount}
          size={avatarSize}
          quality={quality}
          onGenerate={generate}
          canGenerate={hasBrief}
          paymentNotice={paymentNotice}
          onDownload={downloadGeneration}
          onEdit={editGeneration}
          candidates={candidates}
          onPickCandidate={setResult}
          parentGeneration={parentGeneration}
          genCount={genBackend === 'openai' ? genCount : 1}
          downloadLoading={Boolean(downloadLoadingId)}
          editLoading={Boolean(editLoadingId)}
          genBackend={genBackend}
          defaultModelLabel={genBackend === 'openai' ? openaiModelName : checkpoints.length ? 'ComfyUI local' : 'No model selected'}
          onFlux2Edit={() => openEditor(result)}
          onUploadEdit={() => openEditor(null)}
        />
      </main>

      <footer>
        <div className="footer-brand"><strong>Tmall AI Avatar Studio</strong><span>A great avatar for everyone</span></div>
        <p>Images are AI generated. Please follow the platform rules and use them responsibly.</p>
        <span>Powered by ComfyUI</span>
      </footer>

      <HistoryModal
        open={historyModalOpen}
        items={history}
        loading={historyLoading}
        onRefresh={loadHistory}
        onClose={() => setHistoryModalOpen(false)}
        onPreview={(item) => {
          setResult(item);
          setHistoryModalOpen(false);
          document.querySelector('.result-panel')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }}
        onDownload={downloadGeneration}
        onEdit={editGeneration}
        onFluxEdit={openEditor}
        onDelete={setDeleteTarget}
        downloadLoadingId={downloadLoadingId}
        editLoadingId={editLoadingId}
      />

      <PromptPreviewDialog
        open={promptPreviewOpen}
        loading={promptPreviewLoading}
        preview={promptPreview}
        onClose={() => setPromptPreviewOpen(false)}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        eyebrow="Delete"
        title="Delete this avatar?"
        message="The image file and its record are removed for good."
        confirmLabel="Delete"
        loading={deleteLoading}
        onConfirm={() => deleteTarget && performDelete(deleteTarget)}
        onCancel={() => setDeleteTarget(null)}
      />

      <DownloadDialog
        open={Boolean(confirmDownloadTarget)}
        willCharge={false}
        loading={Boolean(downloadLoadingId)}
        onConfirm={async (options) => {
          const target = confirmDownloadTarget;
          setConfirmDownloadTarget(null);
          if (target) await performDownload(target, options);
        }}
        onCancel={() => setConfirmDownloadTarget(null)}
      />

      <PromptDialog
        open={Boolean(editTarget)}
        eyebrow="Keep editing"
        title="How should this avatar change?"
        message="Describe what to change; everything else stays as close to the original as possible."
        placeholder="For example: change the background to a cherry blossom campus, keep the face and hair the same."
        submitLabel="Create a new version"
        loading={Boolean(editLoadingId)}
        onSubmit={async (instruction) => {
          const target = editTarget;
          setEditTarget(null);
          if (target) await performEdit(target, instruction);
        }}
        onCancel={() => setEditTarget(null)}
      />

      <ImageEditor
        open={editorOpen}
        source={editorSource}
        busy={editing}
        error={editError}
        modelReady={flux2Ready}
        modelChecking={flux2Checking}
        onClose={closeEditor}
        onSubmit={submitEdit}
        onSourceChange={setEditorSource}
      />
    </div>
  );
}

export default App;
