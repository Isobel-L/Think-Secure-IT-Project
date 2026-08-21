import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { colorSwatches, compileEditInstruction, editCategories } from '../../shared/editControls.js';
import {
  canvasToPngBlob,
  drawEditorImage,
  fillEnclosedMask,
  getErrorMessage,
  hasPaintedMask,
  isSupportedImageMimeType,
  mapPointerToImage,
} from '../imageEditor.js';
import { estimateExpectedMs } from '../progressModel.js';
import GenerationProgress from './GenerationProgress.jsx';
import { Icon } from './Icons.jsx';

const BRUSH_SIZE = 36;
const MAX_HISTORY = 20;

export default function ImageEditor({
  open,
  source,
  onSourceChange,
  onClose,
  onSubmit,
  busy,
  error,
  modelReady,
  modelChecking,
}) {
  const baseCanvasRef = useRef(null);
  const imageRef = useRef(null);
  const maskCanvasRef = useRef(null);
  const uploadInputRef = useRef(null);
  const historyRef = useRef([]);
  const drawingRef = useRef(null);
  const ownedUrlRef = useRef('');
  const sessionKeyRef = useRef('');
  const submissionRef = useRef(false);
  const [fileImage, setFileImage] = useState({ file: null, url: '' });
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [readySessionKey, setReadySessionKey] = useState('');
  const [prompt, setPrompt] = useState('');
  const [editCategory, setEditCategory] = useState('custom');
  const [editTarget, setEditTarget] = useState('');
  const [editOption, setEditOption] = useState('');
  const [colorHex, setColorHex] = useState('');
  const [magicErase, setMagicErase] = useState(false);
  const [tool, setTool] = useState('brush');
  const [zoom, setZoom] = useState(100);
  const [maskPainted, setMaskPainted] = useState(false);
  const [undoCount, setUndoCount] = useState(0);
  const [imageError, setImageError] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [submissionState, setSubmissionState] = useState('idle');

  // Read through a ref so finalizeActiveStroke keeps its identity when tool/magicErase change: it
  // sits in the session-reset useLayoutEffect's dependency chain, where a new reference would wipe
  // the whole canvas.
  const toolRef = useRef('brush');
  const magicEraseRef = useRef(false);
  toolRef.current = tool;
  magicEraseRef.current = magicErase;

  const fileImageUrl = fileImage.file === source?.file ? fileImage.url : '';
  const imageUrl = source?.image || fileImageUrl;
  const sourceKey = source ? `${source.generationId || ''}:${source.image || fileImageUrl}` : '';
  const sessionKey = `${open ? 'open' : 'closed'}:${sourceKey}`;
  const imageReady = readySessionKey === sessionKey && canvasSize.width > 0 && canvasSize.height > 0;
  const localBusy = submissionState !== 'idle';
  const interactionDisabled = busy || localBusy;
  const sourceReplacementDisabled = interactionDisabled || modelChecking;
  const activeCategory = editCategories.find((category) => category.id === editCategory) || editCategories.at(-1);
  const compiledInstruction = useMemo(() => {
    if (magicErase) return { prompt: '', controls: null, error: '' };
    try {
      return {
        ...compileEditInstruction({ prompt, editCategory, editTarget, editOption, colorHex }),
        error: '',
      };
    } catch (compileError) {
      return { prompt: '', controls: null, error: compileError.message };
    }
  }, [colorHex, editCategory, editOption, editTarget, magicErase, prompt]);
  const submitDisabled = sourceReplacementDisabled || !source || !imageReady || !modelReady
    || (magicErase ? !maskPainted : Boolean(compiledInstruction.error));
  sessionKeyRef.current = sessionKey;

  const selectEditCategory = useCallback((category) => {
    setEditCategory(category.id);
    setEditTarget(category.targets[0]?.id || '');
    if (category.id === 'color') {
      setEditOption(colorSwatches[0].id);
      setColorHex(colorSwatches[0].hex);
    } else {
      setEditOption(category.options[0]?.id || '');
      setColorHex('');
    }
  }, []);

  const updateMaskState = useCallback(() => {
    const canvas = maskCanvasRef.current;
    if (!canvas || !canvas.width || !canvas.height) return;
    const context = canvas.getContext('2d');
    setMaskPainted(hasPaintedMask(context.getImageData(0, 0, canvas.width, canvas.height)));
  }, []);

  const finalizeActiveStroke = useCallback(({ pointerId, target, commit }) => {
    const drawing = drawingRef.current;
    if (!drawing || (pointerId !== undefined && drawing.pointerId !== pointerId)) return;
    drawingRef.current = null;
    if (target?.hasPointerCapture?.(drawing.pointerId)) target.releasePointerCapture(drawing.pointerId);

    const canvas = maskCanvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!commit || drawing.sessionKey !== sessionKeyRef.current) {
      if (canvas.width === drawing.snapshot.width && canvas.height === drawing.snapshot.height) context.putImageData(drawing.snapshot, 0, 0);
      updateMaskState();
      return;
    }

    historyRef.current = [...historyRef.current, drawing.snapshot].slice(-MAX_HISTORY);
    if (magicEraseRef.current && toolRef.current === 'brush') fillEnclosedMask(canvas);
    setUndoCount(historyRef.current.length);
    updateMaskState();
  }, [updateMaskState]);

  const cancelActiveStroke = useCallback(() => {
    finalizeActiveStroke({ commit: false });
  }, [finalizeActiveStroke]);

  // Enabling magic erase also fills the interior of already-drawn closed loops, as one undoable step.
  const toggleMagicErase = useCallback(() => {
    setTool('brush');
    const next = !magicErase;
    setMagicErase(next);
    if (!next) return;
    const canvas = maskCanvasRef.current;
    if (!canvas?.width || !canvas?.height) return;
    const context = canvas.getContext('2d');
    const snapshot = context.getImageData(0, 0, canvas.width, canvas.height);
    if (fillEnclosedMask(canvas)) {
      historyRef.current = [...historyRef.current, snapshot].slice(-MAX_HISTORY);
      setUndoCount(historyRef.current.length);
      updateMaskState();
    }
  }, [magicErase, updateMaskState]);

  useEffect(() => {
    if (source?.image || !source?.file) {
      setFileImage({ file: null, url: '' });
      return undefined;
    }

    const objectUrl = URL.createObjectURL(source.file);
    setFileImage({ file: source.file, url: objectUrl });
    return () => URL.revokeObjectURL(objectUrl);
  }, [source?.file, source?.image]);

  useEffect(() => {
    if (ownedUrlRef.current && source?.image !== ownedUrlRef.current) {
      URL.revokeObjectURL(ownedUrlRef.current);
      ownedUrlRef.current = '';
    }
  }, [source?.image]);

  useEffect(() => () => {
    if (ownedUrlRef.current) URL.revokeObjectURL(ownedUrlRef.current);
  }, []);

  useEffect(() => {
    if (!open) {
      setMagicErase(false);
      setEditCategory('custom');
      setEditTarget('');
      setEditOption('');
      setColorHex('');
      setPrompt('');
    }
  }, [open]);

  const drawCurrentImage = useCallback((image, eventSessionKey) => {
    const baseCanvas = baseCanvasRef.current;
    const maskCanvas = maskCanvasRef.current;
    if (eventSessionKey !== sessionKeyRef.current || image !== imageRef.current || !open) return false;
    const size = drawEditorImage({ image, baseCanvas, maskCanvas });
    if (!size) return false;

    historyRef.current = [];
    setUndoCount(0);
    setMaskPainted(false);
    setCanvasSize(size);
    setReadySessionKey(eventSessionKey);
    return true;
  }, [open]);

  useLayoutEffect(() => {
    cancelActiveStroke();
    setCanvasSize({ width: 0, height: 0 });
    setReadySessionKey('');
    setMaskPainted(false);
    setUndoCount(0);
    setImageError('');
    setSubmitError('');
    historyRef.current = [];
    if (baseCanvasRef.current) {
      baseCanvasRef.current.width = 1;
      baseCanvasRef.current.height = 1;
    }
    if (maskCanvasRef.current) {
      maskCanvasRef.current.width = 1;
      maskCanvasRef.current.height = 1;
    }
    const image = imageRef.current;
    if (image?.complete) drawCurrentImage(image, sessionKey);
  }, [cancelActiveStroke, drawCurrentImage, sessionKey]);

  const handleImageLoad = useCallback((event, eventSessionKey) => {
    drawCurrentImage(event.currentTarget, eventSessionKey);
  }, [drawCurrentImage]);

  const handleImageError = useCallback((event, eventSessionKey) => {
    if (eventSessionKey !== sessionKeyRef.current || event.currentTarget !== imageRef.current) return;
    setImageError('无法加载这张图片。');
  }, []);

  const pointFromEvent = useCallback((event) => {
    const canvas = maskCanvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    return mapPointerToImage({
      clientX: event.clientX,
      clientY: event.clientY,
      rect,
      width: canvas.width,
      height: canvas.height,
    });
  }, []);

  const paintSegment = useCallback((from, to) => {
    const canvas = maskCanvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    context.save();
    context.globalCompositeOperation = tool === 'erase' ? 'destination-out' : 'source-over';
    context.strokeStyle = 'rgba(254, 2, 55, 0.52)';
    context.fillStyle = 'rgba(254, 2, 55, 0.52)';
    context.lineWidth = BRUSH_SIZE;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.beginPath();
    context.moveTo(from.x, from.y);
    context.lineTo(to.x, to.y);
    context.stroke();
    if (from.x === to.x && from.y === to.y) {
      context.beginPath();
      context.arc(to.x, to.y, BRUSH_SIZE / 2, 0, Math.PI * 2);
      context.fill();
    }
    context.restore();
  }, [tool]);

  const handlePointerDown = useCallback((event) => {
    if (drawingRef.current || !event.isPrimary || interactionDisabled || !imageReady) return;
    const canvas = maskCanvasRef.current;
    const point = pointFromEvent(event);
    if (!canvas || !point) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    drawingRef.current = {
      pointerId: event.pointerId,
      point,
      sessionKey,
      snapshot: canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height),
    };
    paintSegment(point, point);
  }, [imageReady, interactionDisabled, paintSegment, pointFromEvent, sessionKey]);

  const handlePointerMove = useCallback((event) => {
    const drawing = drawingRef.current;
    if (!drawing || drawing.pointerId !== event.pointerId) return;
    const point = pointFromEvent(event);
    if (!point) return;
    event.preventDefault();
    paintSegment(drawing.point, point);
    drawing.point = point;
  }, [paintSegment, pointFromEvent]);

  const finishStroke = useCallback((event) => {
    finalizeActiveStroke({ pointerId: event.pointerId, target: event.currentTarget, commit: true });
  }, [finalizeActiveStroke]);

  const cancelStroke = useCallback((event) => {
    finalizeActiveStroke({ pointerId: event.pointerId, target: event.currentTarget, commit: false });
  }, [finalizeActiveStroke]);

  const undo = useCallback(() => {
    const snapshot = historyRef.current.pop();
    const canvas = maskCanvasRef.current;
    if (!snapshot || !canvas) return;
    canvas.getContext('2d').putImageData(snapshot, 0, 0);
    setUndoCount(historyRef.current.length);
    updateMaskState();
  }, [updateMaskState]);

  const clearMask = useCallback(() => {
    const canvas = maskCanvasRef.current;
    if (!canvas || !maskPainted) return;
    const context = canvas.getContext('2d');
    historyRef.current = [...historyRef.current, context.getImageData(0, 0, canvas.width, canvas.height)].slice(-MAX_HISTORY);
    context.clearRect(0, 0, canvas.width, canvas.height);
    setUndoCount(historyRef.current.length);
    setMaskPainted(false);
  }, [maskPainted]);

  const handleUpload = useCallback((event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || sourceReplacementDisabled) return;
    if (!isSupportedImageMimeType(file.type)) {
      setUploadError('仅支持 PNG、JPEG 或 WebP 图片。');
      return;
    }
    setUploadError('');
    if (ownedUrlRef.current) URL.revokeObjectURL(ownedUrlRef.current);
    const objectUrl = URL.createObjectURL(file);
    ownedUrlRef.current = objectUrl;
    onSourceChange({ file, image: objectUrl, generationId: '' });
  }, [onSourceChange, sourceReplacementDisabled]);

  const handleSubmit = useCallback(async (event) => {
    event.preventDefault();
    if (submitDisabled || submissionRef.current) return;
    submissionRef.current = true;
    setSubmitError('');
    try {
      const canvas = maskCanvasRef.current;
      if (!canvas) throw new Error('蒙版画布尚未准备好。');
      const context = canvas.getContext('2d');
      const painted = hasPaintedMask(context.getImageData(0, 0, canvas.width, canvas.height));
      if (magicErase && !painted) throw new Error('请先圈出要消除的区域。');
      setSubmissionState(painted ? 'exporting' : 'submitting');
      const maskBlob = painted ? await canvasToPngBlob(canvas) : null;
      const maskFile = painted ? new File([maskBlob], 'mask.png', { type: 'image/png' }) : null;
      setSubmissionState('submitting');
      await onSubmit({
        prompt: magicErase ? '' : prompt.trim(),
        operation: magicErase ? 'remove' : 'edit',
        sourceGenerationId: source.generationId || '',
        sourceFile: source.file || null,
        maskFile,
        ...(magicErase ? {} : {
          editCategory,
          editTarget,
          editOption,
          colorHex,
        }),
      });
    } catch (submissionError) {
      setSubmitError(getErrorMessage(submissionError, '提交编辑请求失败。'));
    } finally {
      submissionRef.current = false;
      setSubmissionState('idle');
    }
  }, [colorHex, editCategory, editOption, editTarget, magicErase, onSubmit, prompt, source, submitDisabled]);

  if (!open) return null;

  return (
    <div className="image-editor-overlay" role="dialog" aria-modal="true" aria-label="图像编辑器" style={{ position: 'fixed', inset: 0, zIndex: 90, display: 'grid', placeItems: 'center', padding: 20, background: 'rgba(0, 0, 0, 0.52)' }}>
      <form className="image-editor" onSubmit={handleSubmit} style={{ width: 'min(960px, 100%)', maxHeight: 'calc(100vh - 40px)', overflow: 'auto', padding: 20, background: '#fff', borderRadius: 8 }}>
        <header className="editor-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <h2 style={{ margin: 0 }}>{magicErase ? '魔法消除' : '图像局部微调'}</h2>
            <p style={{ margin: '6px 0 0', color: '#666', fontSize: 13 }}>
              {magicErase ? '圈出要消除的内容，AI 会用周围背景自然填充' : maskPainted ? '蒙版局部修改' : '整图语义修改'}
            </p>
          </div>
          <button className="editor-close" type="button" onClick={onClose} disabled={interactionDisabled} aria-label="关闭图像编辑器" title="关闭图像编辑器">
            <Icon name="close" />
          </button>
        </header>

        {modelChecking && <p className="editor-message" role="status">正在检查图像编辑服务</p>}
        {!modelChecking && !modelReady && <p className="editor-message editor-error" role="alert">图像编辑服务未就绪</p>}
        {submissionState === 'exporting' && <p className="editor-message" role="status">正在导出蒙版…</p>}
        {(error || uploadError || submitError || imageError) && <p className="editor-message editor-error" role="alert">{error || uploadError || submitError || imageError}</p>}

        {!source ? (
          <div className="editor-empty" style={{ minHeight: 280, display: 'grid', placeItems: 'center', border: '1px dashed #bbb', marginTop: 18 }}>
            <div className="editor-empty-content" style={{ textAlign: 'center' }}>
              <Icon name="upload" size={30} />
              <p>上传 PNG、JPEG 或 WebP 图片</p>
              <button className="editor-upload-button" type="button" onClick={() => uploadInputRef.current?.click()} disabled={sourceReplacementDisabled} aria-label="上传本地图片" title="上传本地图片">
                <Icon name="upload" /> 上传图片
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="editor-toolbar" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 18 }}>
              <button
                className="magic-erase-toggle"
                type="button"
                onClick={toggleMagicErase}
                disabled={interactionDisabled || !imageReady}
                aria-pressed={magicErase}
                aria-label="魔法消除"
                title="圈选后自动消除，无需填写提示词"
              >
                <Icon name="spark" /> 魔法消除
              </button>
              <button type="button" onClick={() => setTool('brush')} disabled={interactionDisabled || !imageReady} aria-pressed={tool === 'brush'} aria-label="画笔" title="画笔">
                <Icon name="brush" /> 画笔
              </button>
              <button type="button" onClick={() => setTool('erase')} disabled={interactionDisabled || !imageReady} aria-pressed={tool === 'erase'} aria-label="橡皮擦" title="橡皮擦">
                <Icon name="eraser" /> 橡皮擦
              </button>
              <button type="button" onClick={undo} disabled={interactionDisabled || undoCount === 0} aria-label="撤销" title="撤销">
                <Icon name="undo" /> 撤销
              </button>
              <button type="button" onClick={clearMask} disabled={interactionDisabled || !maskPainted} aria-label="清除蒙版" title="清除蒙版">
                <Icon name="trash" /> 清除
              </button>
              <button type="button" onClick={() => setZoom(100)} disabled={interactionDisabled || !imageReady || zoom === 100} aria-label="重置视图" title="重置视图">
                <Icon name="reset" /> 重置视图
              </button>
              <button type="button" onClick={() => uploadInputRef.current?.click()} disabled={sourceReplacementDisabled} aria-label="替换图片" title="替换图片">
                <Icon name="upload" /> 替换图片
              </button>
              <label className="editor-zoom" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                缩放 {zoom}%
                <input type="range" min="50" max="200" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} disabled={interactionDisabled || !imageReady} aria-label="画布缩放" />
              </label>
            </div>

            <div className="editor-canvas-viewport" style={{ marginTop: 16, maxHeight: '55vh', overflow: 'auto', border: '1px solid #ddd', background: '#f5f5f5' }}>
              <div className="editor-canvas-wrap" style={{ position: 'relative', width: `${zoom}%`, minWidth: '200px' }}>
                {/* 画布尺寸由 drawEditorImage 直接设置；交给 React 绑定会在重渲染时重设尺寸并清空已绘制的底图。 */}
                <canvas className="editor-base-canvas" ref={baseCanvasRef} aria-label="原始图像" style={{ display: 'block', width: '100%', height: 'auto' }} />
                <canvas
                  ref={maskCanvasRef}
                  className="editor-mask-canvas"
                  aria-label="蒙版绘制画布"
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={finishStroke}
                  onPointerCancel={cancelStroke}
                  onLostPointerCapture={finishStroke}
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', touchAction: 'none', cursor: tool === 'erase' ? 'cell' : 'crosshair', pointerEvents: imageReady && !interactionDisabled ? 'auto' : 'none' }}
                />
              </div>
            </div>
          </>
        )}

        <img key={sessionKey} ref={imageRef} src={imageUrl || undefined} alt="" onLoad={(event) => handleImageLoad(event, sessionKey)} onError={(event) => handleImageError(event, sessionKey)} style={{ display: 'none' }} />
        <input ref={uploadInputRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={handleUpload} disabled={sourceReplacementDisabled} style={{ display: 'none' }} />

        {!magicErase && (
          <section className="editor-controls" aria-label="FLUX.2 编辑分类">
            <div className="editor-category-list" role="group" aria-label="修改分类">
              {editCategories.map((category) => (
                <button
                  type="button"
                  className={editCategory === category.id ? 'active' : ''}
                  aria-pressed={editCategory === category.id}
                  onClick={() => selectEditCategory(category)}
                  disabled={interactionDisabled}
                  key={category.id}
                >
                  {category.label}
                </button>
              ))}
            </div>

            {activeCategory.targets.length > 0 && (
              <label className="editor-control-field">
                修改对象
                <select value={editTarget} onChange={(event) => setEditTarget(event.target.value)} disabled={interactionDisabled}>
                  {activeCategory.targets.map((entry) => <option value={entry.id} key={entry.id}>{entry.label}</option>)}
                </select>
              </label>
            )}

            {editCategory === 'replace' && (
              <label className="editor-control-field">
                要替换的物体
                <input value={editTarget} onChange={(event) => setEditTarget(event.target.value.slice(0, 80))} disabled={interactionDisabled} placeholder="例如：胸针、帽子、桌面上的杯子" />
              </label>
            )}

            {activeCategory.options.length > 0 && (
              <div className="editor-option-list" role="group" aria-label={`${activeCategory.label}选项`}>
                {activeCategory.options.map((entry) => (
                  <button
                    type="button"
                    className={editOption === entry.id ? 'active' : ''}
                    aria-pressed={editOption === entry.id}
                    onClick={() => setEditOption(entry.id)}
                    disabled={interactionDisabled}
                    key={entry.id}
                  >
                    {entry.label}
                  </button>
                ))}
              </div>
            )}

            {editCategory === 'color' && (
              <div className="editor-color-panel">
                <div className="editor-swatches" role="group" aria-label="颜色色卡">
                  {colorSwatches.map((swatch) => (
                    <button
                      type="button"
                      className={editOption === swatch.id && colorHex === swatch.hex ? 'active' : ''}
                      style={{ '--swatch-color': swatch.hex }}
                      aria-label={`${swatch.label} ${swatch.hex}`}
                      title={`${swatch.label} ${swatch.hex}`}
                      onClick={() => {
                        setEditOption(swatch.id);
                        setColorHex(swatch.hex);
                      }}
                      disabled={interactionDisabled}
                      key={swatch.id}
                    />
                  ))}
                </div>
                <label className="editor-color-input">
                  自定义颜色
                  <input
                    type="color"
                    value={/^#[0-9A-Fa-f]{6}$/.test(colorHex) ? colorHex : '#000000'}
                    onChange={(event) => {
                      setEditOption('');
                      setColorHex(event.target.value.toUpperCase());
                    }}
                    disabled={interactionDisabled}
                  />
                  <input
                    value={colorHex}
                    onChange={(event) => {
                      setEditOption('');
                      setColorHex(event.target.value.toUpperCase().slice(0, 7));
                    }}
                    disabled={interactionDisabled}
                    aria-label="HEX 颜色"
                    placeholder="#FF6B6B"
                  />
                </label>
              </div>
            )}

            <label className="editor-prompt">
              {editCategory === 'custom' ? '编辑提示词' : editCategory === 'replace' ? '替换要求' : '补充要求（可选）'}
              <textarea value={prompt} onChange={(event) => setPrompt(event.target.value.slice(0, 1200))} disabled={interactionDisabled} rows="3" />
            </label>
            {compiledInstruction.error
              ? <p className="editor-control-error" role="status">{compiledInstruction.error}</p>
              : <p className="editor-prompt-preview"><strong>模型将执行：</strong>{compiledInstruction.prompt}</p>}
          </section>
        )}
        <GenerationProgress
          running={busy || submissionState === 'submitting'}
          failed={Boolean(error || submitError)}
          expectedMs={estimateExpectedMs({ operation: magicErase ? 'remove' : 'edit' })}
          operation={magicErase ? 'remove' : 'edit'}
        />
        <button className="editor-submit" type="submit" disabled={submitDisabled} style={{ marginTop: 14 }}>
          {submissionState === 'exporting'
            ? '正在导出蒙版…'
            : submissionState === 'submitting' || busy
              ? '正在提交…'
              : magicErase
                ? maskPainted ? '消除选中区域' : '先圈出要消除的区域'
                : '提交编辑'}
        </button>
      </form>
    </div>
  );
}
