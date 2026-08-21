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
const flux2HealthResponseError = '图像编辑服务状态响应格式无效。';

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
    { id: 1, label: '描述头像' },
    { id: 2, label: '选择风格' },
    { id: 3, label: '生成下载' },
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
      const data = await readJsonResponse(response, '历史记录响应格式无效。');
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
      if (!response.ok || !data.ok) throw new Error(data.error || '无法读取本地模型列表。');

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
      setModelsError('本地 ComfyUI 未连接，暂时只能使用云端模型。');
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
      if (!ready) setEditError(health.error || '图像编辑服务未就绪。');
    } catch (healthError) {
      if (requestId !== flux2HealthRequestRef.current) return;
      setFlux2Ready(false);
      setEditError(healthError.message === flux2HealthResponseError
        ? flux2HealthResponseError
        : '无法连接图像编辑服务。');
    } finally {
      if (requestId === flux2HealthRequestRef.current) setFlux2Checking(false);
    }
  };

  const openEditor = (item = result) => {
    const generation = item?.generation || item;
    if (generation?.locked || generation?.downloadedAt || generation?.lockedAt) {
      setError('这张头像已经确认下载并锁定，不能继续修改。');
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
      const payload = await readJsonResponse(response, '图片修改响应格式无效，请稍后重试。');
      if (!response.ok) throw new Error(payload.error || '图片修改失败，请稍后重试。');

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
      setEditError(editFailure.message || '图片修改失败，请稍后重试。');
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
      setError('请先填写头像文字描述，再选择头像风格。');
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
      if (!ok || !data.brief) throw new Error(data.error || '灵感生成失败，请稍后再试。');
      setBrief(data.brief);
      setSelections(random.selections);
      setSelectionNotice('');
    } catch (inspirationError) {
      setError(inspirationError.message || '灵感生成失败，请稍后再试。');
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
      setError('请先填写头像文字描述，再生成头像。');
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
        '生成失败，请稍后重试。',
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
      setError(requestError.message || '暂时无法连接头像生成服务。');
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
        let message = '下载失败，请稍后重试。';
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

      setPaymentNotice('头像已下载，可以继续修改这张图。');
    } catch (downloadError) {
      setError(downloadError.message || '下载失败，请稍后重试。');
    } finally {
      setDownloadLoadingId('');
    }
  };

  const downloadGeneration = (generationLike) => {
    const generation = generationLike?.generation || generationLike;
    if (!generation?.id && !generationLike?.downloadUrl) {
      setError('请先生成或选择一张头像。');
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
        '修改失败，请稍后重试。',
      );
      setResult(data);
      if (data.generation) setHistory((current) => [data.generation, ...current.filter((item) => item.id !== data.generation.id)].slice(0, historyLimit));
      setPaymentNotice('已基于原图生成一个可继续修改的新版本。');
    } catch (editError) {
      setError(editError.message || '修改失败，请稍后重试。');
    } finally {
      setEditLoadingId('');
    }
  };

  const editGeneration = (generationLike) => {
    const generation = generationLike?.generation || generationLike;
    if (!generation?.id) {
      setError('请先选择一张已生成的头像。');
      return;
    }
    if (isGenerationLocked(generation)) {
      setError('这张头像已经确认下载并锁定，不能继续修改。');
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
        '无法生成提示词预览。',
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
      await apiOrThrow(`/api/generations/${generation.id}`, { method: 'DELETE' }, '删除失败，请稍后重试。');
      setHistory((current) => current.filter((item) => item.id !== generation.id));
      setResult((current) => {
        if (!current) return current;
        if (current.id === generation.id || current.generation?.id === generation.id) return null;
        return current;
      });
      setPaymentNotice('已删除这张头像记录。');
    } catch (deleteError) {
      setError(deleteError.message || '删除失败，请稍后重试。');
    } finally {
      setDeleteLoading(false);
      setDeleteTarget(null);
    }
  };

  return (
    <div className="app-shell">
      <div className="utility-bar">
        <div>
          <span>天猫 AI 头像馆</span>
          <span>消费者服务平台</span>
          <a href="https://www.tmall.com/?page_offline=true" target="_blank" rel="noreferrer">
            访问天猫官网 <span aria-hidden="true">↗</span>
          </a>
        </div>
      </div>

      <header className="topbar" id="top">
        <a
          className="brand"
          href="https://www.tmall.com/?page_offline=true"
          target="_blank"
          rel="noreferrer"
          aria-label="访问天猫官网（新窗口打开）"
          title="访问天猫官网"
        >
          <img className="brand-logo" src="/tmall-logo.png" alt="天猫" />
          <span className="brand-copy"><strong>天猫</strong><small>AI 头像馆</small></span>
          <span className="brand-external" aria-hidden="true">↗</span>
        </a>
        <nav className="step-nav" aria-label="定制步骤">
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
          <span className="guest-pill" title="当前版本不需要登录，生成记录保存在服务端本地文件夹">访客模式</span>
          <button className="reset-button" type="button" onClick={reset}><Icon name="reset" size={17} />重新定制</button>
        </div>
      </header>

      <section className="tmall-hero">
        <div className="hero-content">
          <span className="hero-tag"><Icon name="spark" size={13} /> 天猫 AI 智能定制服务</span>
          <h1>一句话，生成你的<br /><em>专属 AI 头像</em></h1>
          <p>选风格、定形象、挑氛围。无需专业提示词，轻松生成适合社交平台的高清头像。</p>
          <div className="hero-benefits">
            <span><b>1:1</b> 标准方形</span>
            <span><b>高清</b> PNG 下载</span>
            <span><b>适配</b> 圆形裁剪</span>
          </div>
          <div className="hero-actions">
            <a className="hero-primary" href="#customizer">开始定制头像</a>
            <a className="hero-secondary" href="https://www.tmall.com/?page_offline=true" target="_blank" rel="noreferrer">
              逛天猫商城 <span aria-hidden="true">↗</span>
            </a>
          </div>
        </div>
        <HeroShowcase items={history} />
      </section>

      <div className="trust-strip">
        <div><strong>01</strong><span>自由描述<br /><small>说出你的头像灵感</small></span></div>
        <div><strong>02</strong><span>百种组合<br /><small>人物与画风随心选</small></span></div>
        <div><strong>03</strong><span>智能构图<br /><small>自动适配头像安全区</small></span></div>
        <div><strong>04</strong><span>高清交付<br /><small>生成后即可下载</small></span></div>
      </div>

      <main className="customizer-layout" id="customizer">
        <section className="creator-panel">
          <div className="section-card brief-card">
            <div className="card-heading">
              <div className="number-title"><b>1</b><div><h2>描述你的理想头像</h2><p>写下人物、故事或感觉，AI 会帮你补全画面</p></div></div>
              <span className="required-pill">必填</span>
            </div>
            <label className="brief-input">
              <span className="sr-only">头像创意描述</span>
              <textarea
                value={brief}
                onChange={(event) => {
                  setBrief(event.target.value.slice(0, 1200));
                  if (error.includes('请先填写头像文字描述')) setError('');
                }}
                placeholder="例如：一位银发少女戴着耳机，清冷又温柔，背景是淡粉色的模糊光斑……"
                rows="5"
              />
              <small>{brief.length} / 1200</small>
            </label>
            <div className="inspiration-row">
              <span>灵感模板</span>
              {examples.map((example) => (
                <button type="button" onClick={() => applyExample(example)} key={example.label}>
                  <Icon name="wand" size={15} /><strong>{example.label}</strong><small>{example.description}</small>
                </button>
              ))}
              <button type="button" className="inspiration-random" onClick={applyRandomInspiration} disabled={inspirationLoading}>
                <Icon name="spark" size={15} />
                <strong>{inspirationLoading ? '生成中…' : '随机灵感'}</strong>
                <small>AI 随机写描述 + 随机勾风格</small>
              </button>
            </div>
          </div>

          <div className="section-card recipe-card">
            <div className="card-heading recipe-heading">
              <div className="number-title"><b>2</b><div><h2>选择头像风格</h2><p>已选择 {selectedCount} 项，单选项目会自动替换</p></div></div>
              <div className="completion"><span>完成度 {completion}%</span><i><b style={{ width: `${completion}%` }} /></i></div>
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
            <div className="number-title"><b>3</b><div><h2>确认头像规格</h2><p>已锁定为社交头像安全构图</p></div></div>
            <div className="settings-grid">
              <div className="locked-setting"><span>输出规格</span><strong>1024 × 1024</strong><small>1:1 标准方形 PNG</small></div>
              <label>生成精度
                <select value={quality} onChange={(event) => setQuality(event.target.value)}>
                  <option value="low">快速预览</option>
                  <option value="medium">高清头像（推荐）</option>
                  <option value="high">超精细头像</option>
                </select>
              </label>
              <label>生成数量
                <select
                  value={genBackend === 'openai' ? genCount : 1}
                  onChange={(event) => setGenCount(Number(event.target.value) === 4 ? 4 : 1)}
                  disabled={genBackend !== 'openai'}
                >
                  <option value="1">1 张</option>
                  <option value="4">4 张候选（挑一张，仅云端）</option>
                </select>
              </label>
              <label className="model-setting">生成模型
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
                    {!openaiAvailable && checkpoints.length === 0 && <option value="">暂无可用模型</option>}
                    {(genBackend === '' && (openaiAvailable || checkpoints.length > 0)) && <option value="" disabled>选择生成模型</option>}
                    {openaiAvailable && <option value="openai">OpenAI · {openaiModelName}（云端）</option>}
                    {checkpoints.map((name) => <option key={name} value={`comfy:${name}`}>ComfyUI 本地 · {name}</option>)}
                  </select>
                  <button type="button" onClick={loadComfyModels} disabled={modelsLoading}>
                    {modelsLoading ? '读取中' : '刷新'}
                  </button>
                </span>
                {modelsError && genBackend !== 'openai' && <small className="model-error">{modelsError}</small>}
              </label>
              {genBackend === 'comfyui' && (
                <label className="model-setting">中文指令处理
                  <select
                    value={promptMode}
                    onChange={(event) => setPromptMode(event.target.value)}
                    disabled={modelsLoading || promptModes.length === 0}
                  >
                    {promptModes.map((mode) => (
                      <option key={mode.id} value={mode.id} disabled={!mode.available}>
                        {mode.label}{mode.available ? '' : '（不可用）'}
                      </option>
                    ))}
                  </select>
                  <small>{translatorReady
                    ? 'Qwen3 先将中文整理为英文，再交给 FLUX.1 生图。'
                    : 'Qwen3 暂不可用，当前使用 FLUX.1 原始提示词。'}</small>
                </label>
              )}
            </div>
            <label className="avoid-input">不希望出现的内容（选填）
              <input value={avoid} onChange={(event) => setAvoid(event.target.value.slice(0, 400))} placeholder="例如：不要文字、不要复杂背景、不要夸张表情" />
            </label>
            <div className="avatar-standard">
              <Icon name="check" size={15} />
              <span>系统会自动保持头部完整、面部居中，并为微信、QQ、微博等圆形头像预留安全边距。</span>
            </div>
            <button className="prompt-preview-button" type="button" onClick={openPromptPreview} disabled={!hasBrief} title={hasBrief ? '查看将发送给模型的完整提示词' : '先填写头像描述'}>
              <Icon name="copy" size={14} />
              查看 AI 提示词
            </button>
          </div>

          <section className="section-card history-card">
            <div className="card-heading">
              <div className="number-title"><b>4</b><div><h2>我的生成记录</h2><p>生成和修改都会保存到服务端本地文件夹，可以反复修改和下载</p></div></div>
              <button className="ghost-mini" type="button" onClick={loadHistory} disabled={historyLoading}>{historyLoading ? '刷新中' : '刷新'}</button>
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
                <div className="history-empty">{historyLoading ? '正在读取历史记录…' : '暂无记录。生成第一张头像后会自动保存。'}</div>
              )}
            </div>
            {history.length > historyPreviewCount && (
              <button className="history-more" type="button" onClick={() => setHistoryModalOpen(true)}>
                查看全部 {history.length} 张头像
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
          defaultModelLabel={genBackend === 'openai' ? openaiModelName : checkpoints.length ? 'ComfyUI 本地' : '未选择模型'}
          onFlux2Edit={() => openEditor(result)}
          onUploadEdit={() => openEditor(null)}
        />
      </main>

      <footer>
        <div className="footer-brand"><strong>天猫 AI 头像馆</strong><span>让每个人都有一张专属好头像</span></div>
        <p>本服务由 AI 生成，请遵守平台规则并妥善使用生成内容。</p>
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
        eyebrow="删除确认"
        title="删除这张头像记录？"
        message="删除后头像文件和记录将一并移除，无法恢复。"
        confirmLabel="删除"
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
        eyebrow="继续修改"
        title="你想怎么修改这张头像？"
        message="描述要修改的部分，其余内容会尽量保持不变。"
        placeholder="例如：把背景换成樱花校园，保持人物脸型和发型不变。"
        submitLabel="生成新版本"
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
