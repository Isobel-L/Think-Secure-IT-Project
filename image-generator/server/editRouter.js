import express from 'express';
import multer from 'multer';
import {
  compositeMaskedEdit,
  normalizeMask,
  normalizeSourceImage,
} from './imageEdit.js';
import { getFlux2EditConfig } from './flux2Edit.js';
import { EditControlError, compileEditInstruction } from '../shared/editControls.js';

const MiB = 1024 * 1024;
const sourceIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const sourceMimeTypes = new Set(['image/png', 'image/jpeg', 'image/webp']);
const multipartLimitCodes = new Set([
  'LIMIT_FIELD_KEY',
  'LIMIT_FIELD_VALUE',
  'LIMIT_FIELD_COUNT',
  'LIMIT_FILE_COUNT',
  'LIMIT_PART_COUNT',
  'LIMIT_UNEXPECTED_FILE',
]);

function createUpload(maxUploadMb) {
  return multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: Math.max(maxUploadMb * MiB, 4 * MiB),
      fieldSize: 16 * 1024,
      fields: 8,
      files: 2,
      parts: 10,
    },
  }).fields([
    { name: 'sourceImage', maxCount: 1 },
    { name: 'mask', maxCount: 1 },
  ]);
}

function publicEditError(error) {
  if (error instanceof EditControlError) return { status: error.status, code: error.code, error: error.message };
  if (error?.code === 'COMFYUI_EXECUTION_FAILED') return { status: 502, code: error.code, error: 'ComfyUI workflow execution failed.' };
  if (error?.code === 'EDIT_MULTIPART_INVALID') return { status: 400, code: error.code, error: 'Invalid multipart edit request.' };
  if (error?.code === 'EDIT_IMAGE_INVALID') return { status: 400, code: error.code, error: 'That image file is not valid. Please pick another one.' };
  if (error?.code === 'EDIT_IMAGE_TOO_LARGE' || error?.code === 'LIMIT_FILE_SIZE') return { status: 413, code: 'EDIT_IMAGE_TOO_LARGE', error: 'The uploaded image is over the size limit.' };
  if (error?.code === 'COMFYUI_EDIT_TIMEOUT') return { status: 503, code: error.code, error: 'The local model timed out. Please try again.' };
  if (Number(error?.status) === 429) return { status: 429, code: 'SERVICE_BUSY', error: 'A lot of edits are queued right now. Please try again shortly.' };
  if (/moderation|safety|content policy/i.test(error?.message || '')) return { status: 400, code: 'CONTENT_NOT_ALLOWED', error: 'This edit request may contain content that cannot be generated. Please adjust it and try again.' };
  if (/ComfyUI|fetch failed|ECONNREFUSED|aborted/i.test(error?.message || '')) return { status: 503, code: 'FLUX2_NOT_READY', error: 'The local FLUX.2 model or ComfyUI is unavailable.' };
  return { status: 502, code: 'IMAGE_EDIT_FAILED', error: 'The edit failed. Please try again.' };
}

function invalidUploadError(error) {
  if (!multipartLimitCodes.has(error?.code)) return error;
  return Object.assign(new Error('Invalid multipart edit request.'), { code: 'EDIT_MULTIPART_INVALID' });
}

function requestAbortError() {
  return Object.assign(new Error('Edit request aborted by client.'), { code: 'EDIT_REQUEST_ABORTED' });
}

function observeRequestAbort(request, response) {
  const controller = new AbortController();
  const abort = () => {
    if (!controller.signal.aborted) controller.abort(requestAbortError());
  };
  const close = () => {
    if (!response.writableFinished) abort();
  };
  request.once('aborted', abort);
  response.once('close', close);
  if (request.aborted) abort();
  return {
    signal: controller.signal,
    cleanup() {
      request.off('aborted', abort);
      response.off('close', close);
    },
  };
}

function throwIfAborted(signal) {
  if (signal.aborted) throw signal.reason || requestAbortError();
}

function runAbortable(signal, work) {
  throwIfAborted(signal);
  return new Promise((resolve, reject) => {
    const abort = () => reject(signal.reason || requestAbortError());
    signal.addEventListener('abort', abort, { once: true });
    Promise.resolve().then(work).then(
      (value) => {
        signal.removeEventListener('abort', abort);
        resolve(value);
      },
      (error) => {
        signal.removeEventListener('abort', abort);
        reject(error);
      },
    );
  });
}

export function createFlux2HealthHandler(healthCheck) {
  return async (_request, response) => {
    const health = await healthCheck();
    return response.status(health.ok ? 200 : 503).json(health);
  };
}

export function createEditRouter(deps) {
  const router = express.Router();
  const config = deps.config || getFlux2EditConfig();
  const upload = createUpload(config.maxUploadMb);
  const normalizeEditMask = deps.normalizeMask || normalizeMask;

  router.post('/edits', deps.requireAuth, upload, async (request, response, next) => {
    let reservation = null;
    let persisted = false;
    const abort = observeRequestAbort(request, response);

    try {
      const prompt = typeof request.body.prompt === 'string' ? request.body.prompt.trim() : '';
      const operation = request.body.operation === 'remove' ? 'remove' : 'edit';
      const compiledInstruction = operation === 'remove' ? null : compileEditInstruction(request.body);
      const sourceGenerationId = typeof request.body.sourceGenerationId === 'string' ? request.body.sourceGenerationId.trim() : '';
      const sourceFile = request.files?.sourceImage?.[0];
      const maskFile = request.files?.mask?.[0];
      if (operation === 'remove' && !maskFile) return response.status(400).json({ code: 'EDIT_MASK_REQUIRED', error: 'Circle the area you want removed first.' });
      if (Boolean(sourceGenerationId) === Boolean(sourceFile)) return response.status(400).json({ code: 'EDIT_SOURCE_REQUIRED', error: 'Pick a saved image or upload a local one.' });
      if (sourceGenerationId && !sourceIdPattern.test(sourceGenerationId)) return response.status(400).json({ code: 'EDIT_SOURCE_REQUIRED', error: 'That saved-image reference is not valid.' });
      if (sourceFile && !sourceMimeTypes.has(sourceFile.mimetype)) return response.status(400).json({ code: 'EDIT_IMAGE_INVALID', error: 'The source image must be PNG, JPEG or WebP.' });
      if (maskFile && maskFile.mimetype !== 'image/png') return response.status(400).json({ code: 'EDIT_IMAGE_INVALID', error: 'The mask must be a PNG.' });
      if (maskFile && maskFile.size > 4 * MiB) return response.status(413).json({ code: 'EDIT_IMAGE_TOO_LARGE', error: 'The mask must be 4 MiB or smaller.' });

      if (sourceFile && sourceFile.size > config.maxUploadMb * MiB) {
        return response.status(413).json({ code: 'EDIT_IMAGE_TOO_LARGE', error: 'Source image exceeds the configured upload limit.' });
      }

      let sourceBytes = sourceFile?.buffer;
      if (sourceGenerationId) {
        const storedImage = await deps.getGenerationImage({ userId: request.user.id, generationId: sourceGenerationId });
        sourceBytes = Buffer.isBuffer(storedImage) ? storedImage : storedImage?.buffer;
        if (!sourceBytes) return response.status(404).json({ code: 'EDIT_SOURCE_NOT_FOUND', error: 'Edit source was not found.' });
      }

      const source = await normalizeSourceImage(sourceBytes);
      const mask = maskFile ? await normalizeEditMask(maskFile.buffer, {
        width: source.width,
        height: source.height,
        featherRadius: config.maskFeather,
        // Magic erase reads the mask as a lasso: whatever a closed stroke encircles joins the selection.
        fillEnclosed: operation === 'remove',
      }) : null;
      const masked = Boolean(mask && !mask.empty);
      if (operation === 'remove' && !masked) {
        return response.status(400).json({ code: 'EDIT_MASK_REQUIRED', error: 'Circle the area you want removed first.' });
      }
      const health = await deps.health(config);
      if (!health.ok) {
        return response.status(503).json({ code: health.code || 'FLUX2_NOT_READY', error: health.error || 'The image editing service is unavailable.' });
      }

      if (typeof deps.reserve === 'function') {
        const entitlement = await deps.reserve(request.user.id);
        if (!entitlement.reservation) {
          return response.status(402).json({
            code: 'PAYMENT_REQUIRED',
            error: 'The first five free generations are used up; further generations need a ¥5 Alipay payment.',
            billing: await runAbortable(abort.signal, () => deps.billing(request.user.id)),
          });
        }
        reservation = entitlement.reservation;
      }

      throwIfAborted(abort.signal);
      const editPrompt = operation === 'remove'
        ? '移除被蒙版选中区域内的内容，使用与周围环境一致的背景自然填充，保持画面其余部分完全不变，不要添加任何新物体、文字或水印。'
        : compiledInstruction.prompt;
      const result = await deps.edit({
        source: source.buffer,
        prompt: editPrompt,
        mask: masked ? mask.buffer : null,
        operation,
        width: source.width,
        height: source.height,
        signal: abort.signal,
        config,
      });
      throwIfAborted(abort.signal);
      const finalBytes = masked
        ? await runAbortable(abort.signal, () => compositeMaskedEdit({ original: source.buffer, edited: result.bytes, mask: mask.buffer, width: source.width, height: source.height }))
        : Buffer.from(result.bytes);
      const image = `data:image/png;base64,${finalBytes.toString('base64')}`;
      const billing = await runAbortable(abort.signal, () => deps.billing(request.user.id));
      throwIfAborted(abort.signal);
      const isOpenAI = result.provider === 'openai';
      const historyPrompt = operation === 'remove' ? 'Magic erase: cleared the selected area' : (prompt || compiledInstruction.prompt);
      const generation = await deps.save({
        userId: request.user.id,
        image,
        prompt: historyPrompt,
        negativePrompt: '',
        brief: historyPrompt,
        avoid: '',
        selections: {},
        strategy: isOpenAI ? 'openai-image-edit' : 'flux2-reference-edit',
        provider: result.provider,
        model: result.model,
        reservationId: reservation?.id,
        metadata: {
          operation, sourceGenerationId: sourceGenerationId || null,
          editControls: compiledInstruction?.controls || null,
          source: sourceGenerationId ? 'history' : 'upload', masked,
          backend: isOpenAI ? 'openai' : 'comfyui',
          workflow: isOpenAI ? 'openai-images-edit' : 'flux2-reference-edit-v1',
          size: `${source.width}x${source.height}`, createdAt: result.createdAt,
          ...(reservation ? { billing: { reservationId: reservation.id } } : {}),
          ...(result.comfy ? { comfy: result.comfy } : {}),
        },
      });
      persisted = true;
      return response.json({
        image,
        provider: result.provider,
        model: result.model,
        createdAt: result.createdAt,
        operation,
        editControls: compiledInstruction?.controls || null,
        masked,
        generation,
        savedToHistory: true,
        downloadUrl: generation.downloadUrl,
        billing,
      });
    } catch (error) {
      if (abort.signal.aborted || error?.code === 'EDIT_REQUEST_ABORTED') return;
      if (response.headersSent) return next(error);
      const publicError = publicEditError(error);
      return response.status(publicError.status).json(publicError);
    } finally {
      abort.cleanup();
      if (reservation && !persisted && typeof deps.release === 'function') {
        await deps.release({ reservationId: reservation.id, userId: request.user.id }).catch((error) => {
          console.error('[edit-reservation-release]', error);
        });
      }
    }
  });

  router.use((error, _request, response, next) => {
    if (response.headersSent) return next(error);
    const publicError = publicEditError(invalidUploadError(error));
    return response.status(publicError.status).json(publicError);
  });

  return router;
}
