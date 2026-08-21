import 'dotenv/config';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import OpenAI, { toFile } from 'openai';
import { File } from 'node:buffer';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createAuthRouter, optionalAuth, requireAuth } from './auth.js';
import {
  confirmPayment,
  constructStripeEvent,
  createLocalTestPurchase,
  createPaymentCheckout,
  fulfillDirectAlipayNotification,
  fulfillStripeCheckout,
  getBillingStatus,
  getConfiguredPaymentProvider,
  isPaymentConfigured,
  isTestPaymentEnabled,
  isUnlimitedUsageEnabled,
  publicBillingStatus,
} from './billing.js';
import {
  getComfyConfig,
  getComfyHealth,
  normalizeCheckpointName,
  resolveComfyCheckpoint,
} from './comfyModel.js';
import {
  cancelUserPlan,
  deleteAvatarGeneration,
  getAvatarGeneration,
  getAvatarGenerationImageBytes,
  getAvatarGenerationThumbBytes,
  initializeDatabase,
  isDatabaseConfigured,
  listAvatarGenerations,
  migrateLegacyImages,
  reserveDownloadForGeneration,
  saveAvatarGeneration,
} from './db.js';
import { createEditRouter, createFlux2HealthHandler } from './editRouter.js';
import { editWithFlux2, getFlux2EditConfig, getFlux2EditHealth } from './flux2Edit.js';
import { ensureStorageDir } from './imageStore.js';
import { generateInspirationBrief, getInspirationModel, sanitizeInspirationLabels } from './inspiration.js';
import { downloadSizes, extensionForMimeType, imageToStoredDataUrl, transformDownloadImage } from './imageUtils.js';
import { createRateLimiter, securityHeaders } from './middleware.js';
import { editWithOpenAI, getOpenAIEditConfig, getOpenAIEditHealth } from './openaiEdit.js';
import { buildLocalModelPayload, generateWithLocalModel, getLocalModelConfig, getLocalModelHealth } from './localModel.js';
import { GENERATION_PROFILE } from '../shared/modelProfiles.js';
import { getPublicCatalog } from '../shared/selectionRules.js';
import { ParameterSelectionError, buildPromptBundle, normalizeSelections } from './prompt.js';
import {
  generateWithFlux1Pipeline,
  getPromptModeCatalog,
  normalizePromptMode,
} from './generationPipeline.js';
import {
  getPromptTranslatorConfig,
  getPromptTranslatorHealth,
} from './promptTranslator.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = Number(process.env.PORT) || 8787;
const host = process.env.HOST || '127.0.0.1';
const model = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-2';
const imageBackend = (process.env.IMAGE_BACKEND || 'openai').toLowerCase();
const usesLocalModel = ['local', 'local-sd', 'local-sd1.5', 'sd1.5'].includes(imageBackend);
const usesComfy = ['comfy', 'comfyui', 'flux', 'flux-schnell', 'flux.1-schnell'].includes(imageBackend);
const activeBackend = usesComfy ? 'comfyui' : usesLocalModel ? 'local-sd1.5' : 'openai';

if (typeof globalThis.File === 'undefined') {
  globalThis.File = File;
}

if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  console.warn('[security] JWT_SECRET is not set in production. Sessions are signed with an insecure development fallback.');
}

function createOpenAIClient() {
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    ...(process.env.OPENAI_BASE_URL ? { baseURL: process.env.OPENAI_BASE_URL } : {}),
  });
}

function buildEditPrompt({ original, instruction }) {
  return [
    '请基于输入头像进行编辑，输出一张新的 1:1 社交头像 PNG。',
    '必须尽量保持同一个人物身份、脸型、发型、五官比例、头部完整、面部居中和圆形头像裁剪安全区。',
    '只修改用户明确要求修改的部分；没有被用户提到的主体特征和构图不要大幅改变。',
    original?.prompt ? `原始头像提示词参考：${original.prompt}` : '',
    `用户本次修改要求：${instruction}`,
  ].filter(Boolean).join('\n\n');
}

export function customerFacingError(status, message) {
  if (/ComfyUI|ECONNREFUSED|fetch failed|system_stats|CheckpointLoaderSimple|checkpoint|Timed out/i.test(message)) {
    return { status: 503, code: 'LOCAL_COMFYUI_UNAVAILABLE', error: '本地 ComfyUI 或 FLUX 模型暂不可用，请确认 ComfyUI 已启动且 checkpoint 名称正确。' };
  }
  if (/billing|quota|hard limit|insufficient_quota/i.test(message)) {
    return { status: 503, code: 'SERVICE_QUOTA_EXCEEDED', error: '当前头像生成服务额度不足，请联系商家客服或稍后再试。' };
  }
  if (status === 401 || /api key|authentication/i.test(message)) {
    return { status: 503, code: 'SERVICE_AUTH_ERROR', error: '头像生成服务正在维护，请联系商家客服。' };
  }
  if (/moderation|safety|content policy/i.test(message)) {
    return { status: 400, code: 'CONTENT_NOT_ALLOWED', error: '当前描述可能包含不适合生成的内容，请调整后再试。' };
  }
  if (status === 429) {
    return { status: 429, code: 'SERVICE_BUSY', error: '当前生成用户较多，请稍后再试。' };
  }
  return { status, code: 'IMAGE_GENERATION_FAILED', error: '头像生成暂时失败，请稍后重试。' };
}

app.disable('x-powered-by');
app.use(securityHeaders);
app.use(compression());
app.use(cors({ origin: /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/, credentials: true }));
app.use(cookieParser());

const authLimiter = createRateLimiter({ windowMs: 10 * 60_000, max: 20, code: 'AUTH_RATE_LIMITED', message: '登录尝试过于频繁，请 10 分钟后再试。' });
const generateLimiter = createRateLimiter({ windowMs: 60_000, max: 6, code: 'GENERATION_RATE_LIMITED', message: '生成请求过于频繁，请稍等片刻再试。' });
const checkoutLimiter = createRateLimiter({ windowMs: 60_000, max: 10, code: 'CHECKOUT_RATE_LIMITED', message: '下单过于频繁，请稍后再试。' });
const inspirationLimiter = createRateLimiter({ windowMs: 60_000, max: 10, code: 'INSPIRATION_RATE_LIMITED', message: '随机灵感请求过于频繁，请稍后再试。' });

app.post('/api/billing/alipay/notify', express.urlencoded({ extended: false, limit: '64kb' }), async (request, response) => {
  try {
    await fulfillDirectAlipayNotification(request.body);
    return response.type('text/plain').send('success');
  } catch (error) {
    console.error('[alipay-webhook]', error?.message || error);
    return response.status(400).type('text/plain').send('failure');
  }
});

app.post('/api/billing/webhook', express.raw({ type: 'application/json' }), async (request, response) => {
  try {
    const event = constructStripeEvent(request.body, request.headers['stripe-signature']);
    if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
      await fulfillStripeCheckout(event.data.object.id);
    }
    return response.json({ received: true });
  } catch (error) {
    console.error('[stripe-webhook]', error?.message || error);
    return response.status(400).send('Invalid Stripe webhook.');
  }
});

app.use(express.json({ limit: '1mb' }));
app.use(optionalAuth);

app.get('/api/health', (_request, response) => {
  response.json({
    ok: true,
    backend: activeBackend,
    model: usesComfy ? getComfyConfig().checkpointName : usesLocalModel ? 'local-sd1.5' : model,
    configured: usesComfy ? Boolean(getComfyConfig().baseUrl) : usesLocalModel ? Boolean(getLocalModelConfig().baseUrl) : Boolean(process.env.OPENAI_API_KEY),
    openaiConfigured: Boolean(process.env.OPENAI_API_KEY),
    openaiModel: model,
    databaseConfigured: isDatabaseConfigured(),
    paymentConfigured: isPaymentConfigured(),
    paymentProvider: getConfiguredPaymentProvider(),
    testPaymentEnabled: isTestPaymentEnabled(),
    unlimitedUsage: isUnlimitedUsageEnabled(),
    localModel: usesLocalModel ? { endpoint: getLocalModelConfig().baseUrl } : undefined,
    comfyui: usesComfy ? { endpoint: getComfyConfig().baseUrl, checkpoint: getComfyConfig().checkpointName } : undefined,
  });
});

app.post('/api/inspiration', requireAuth, inspirationLimiter, async (request, response) => {
  const labels = sanitizeInspirationLabels(request.body?.labels);
  const result = await generateInspirationBrief({
    labels,
    client: process.env.OPENAI_API_KEY ? createOpenAIClient() : null,
    model: getInspirationModel(),
  });
  return response.json(result);
});

app.get('/api/parameters', (_request, response) => {
  response.json({
    profile: GENERATION_PROFILE,
    catalog: getPublicCatalog(GENERATION_PROFILE.id),
  });
});

app.use(['/api/auth/login', '/api/auth/register'], authLimiter);
app.use('/api/auth', createAuthRouter());

app.get('/api/billing/status', requireAuth, async (request, response) => {
  response.json({ billing: await getBillingStatus(request.user.id) });
});

app.post('/api/billing/test-purchase', requireAuth, async (request, response) => {
  if (!isTestPaymentEnabled()) {
    return response.status(404).json({ code: 'TEST_PAYMENT_DISABLED', error: '本地模拟支付未开启。' });
  }

  try {
    const planId = request.body?.planId || null;
    return response.status(201).json(await createLocalTestPurchase(request.user.id, planId));
  } catch (error) {
    if (error?.code === 'INVALID_PLAN') return response.status(400).json({ code: error.code, error: '套餐参数无效。' });
    if (error?.code === 'PLAN_DOWNGRADE_BLOCKED') return response.status(400).json({ code: error.code, error: '已有更高级别的套餐，无法降级购买。' });
    console.error('[test-payment]', error);
    return response.status(500).json({ code: 'TEST_PAYMENT_FAILED', error: '模拟支付暂时失败，请检查本地数据库。' });
  }
});

app.post('/api/billing/plan/cancel', requireAuth, async (request, response) => {
  try {
    const allowance = await cancelUserPlan(request.user.id);
    if (!allowance) return response.status(404).json({ code: 'ACCOUNT_NOT_FOUND', error: '账号不存在。' });
    return response.json({ cancelled: true, billing: publicBillingStatus(allowance) });
  } catch (error) {
    console.error('[plan-cancel]', error);
    return response.status(500).json({ code: 'PLAN_CANCEL_FAILED', error: '取消套餐失败，请稍后重试。' });
  }
});

app.post('/api/billing/checkout', requireAuth, checkoutLimiter, async (request, response) => {
  try {
    const planId = request.body?.planId || null;
    const checkout = await createPaymentCheckout({ user: request.user, planId });
    return response.status(201).json(checkout);
  } catch (error) {
    if (error?.code === 'INVALID_PLAN') return response.status(400).json({ code: error.code, error: '套餐参数无效。' });
    if (error?.code === 'PLAN_DOWNGRADE_BLOCKED') return response.status(400).json({ code: error.code, error: '已有更高级别的套餐，无法降级购买。' });
    if (error?.code === 'GENERATION_ENTITLEMENT_AVAILABLE') {
      return response.status(409).json({ code: error.code, error: '当前账号仍有可用下载次数，无需支付。', billing: error.billing });
    }
    if (error?.code === 'PAYMENT_NOT_CONFIGURED') {
      return response.status(503).json({ code: error.code, error: '支付宝支付尚未配置，请联系商家。' });
    }
    console.error('[payment-checkout]', error);
    return response.status(502).json({ code: 'PAYMENT_SESSION_FAILED', error: '暂时无法创建支付宝订单，请稍后重试。' });
  }
});

app.post('/api/billing/confirm', requireAuth, async (request, response) => {
  const sessionId = typeof request.body?.sessionId === 'string' ? request.body.sessionId.trim() : '';
  const orderId = typeof request.body?.orderId === 'string' ? request.body.orderId.trim() : '';
  if (!orderId && !sessionId.startsWith('cs_')) {
    return response.status(400).json({ code: 'INVALID_CHECKOUT_REFERENCE', error: '支付订单参数无效。' });
  }

  try {
    const result = await confirmPayment({ sessionId, orderId, userId: request.user.id });
    return response.status(result.paid ? 200 : 202).json(result);
  } catch (error) {
    const status = error?.code === 'PAYMENT_ACCOUNT_MISMATCH' ? 403 : 502;
    console.error('[payment-confirm]', error);
    return response.status(status).json({ code: error?.code || 'PAYMENT_CONFIRM_FAILED', error: '暂时无法确认支付宝到账状态，请稍后刷新。' });
  }
});

app.get('/api/local-model/health', async (_request, response) => {
  try {
    const health = await getLocalModelHealth();
    response.json({ ok: true, endpoint: getLocalModelConfig().baseUrl, health });
  } catch (error) {
    response.status(503).json({
      ok: false,
      endpoint: getLocalModelConfig().baseUrl,
      error: error?.message || '本地模型服务不可用。',
    });
  }
});

app.get('/api/comfyui/health', async (_request, response) => {
  const health = await getComfyHealth();
  response.status(health.ok ? 200 : 503).json(health);
});

// 微调编辑器后端跟随 IMAGE_BACKEND：comfy 时走本地 FLUX.2，否则走 OpenAI images.edit。
const editBackend = usesComfy
  ? { health: getFlux2EditHealth, edit: editWithFlux2, config: getFlux2EditConfig() }
  : { health: getOpenAIEditHealth, edit: editWithOpenAI, config: getOpenAIEditConfig() };

app.get('/api/comfyui/flux2/health', createFlux2HealthHandler(() => editBackend.health(editBackend.config)));

app.use('/api', createEditRouter({
  requireAuth,
  getGenerationImage: getAvatarGenerationImageBytes,
  save: saveAvatarGeneration,
  billing: getBillingStatus,
  ...editBackend,
}));

app.get('/api/comfyui/models', async (_request, response) => {
  try {
    const config = getComfyConfig();
    const resolved = await resolveComfyCheckpoint({ config });
    const translatorHealth = await getPromptTranslatorHealth(getPromptTranslatorConfig());
    const selectedPromptMode = translatorHealth.ok
      ? normalizePromptMode('', process.env)
      : 'flux1-raw';
    return response.json({
      ok: true,
      generationEngine: 'flux1',
      checkpoints: resolved.availableCheckpoints,
      configuredCheckpoint: config.checkpointName,
      selectedCheckpoint: resolved.checkpoint,
      usedFallback: resolved.usedFallback,
      promptModes: getPromptModeCatalog({ translatorReady: translatorHealth.ok }),
      selectedPromptMode,
      translatorReady: translatorHealth.ok,
      translator: translatorHealth.translator,
      translatorError: translatorHealth.error,
    });
  } catch (error) {
    return response.status(503).json({
      ok: false,
      checkpoints: [],
      promptModes: getPromptModeCatalog({ translatorReady: false }),
      selectedPromptMode: 'flux1-raw',
      translatorReady: false,
      error: error?.message || 'ComfyUI checkpoints are unavailable.',
    });
  }
});

app.post('/api/prompt-preview', (request, response) => {
  try {
    const bundle = buildPromptBundle({
      brief: request.body?.brief,
      selections: request.body?.selections,
      avoid: request.body?.avoid,
      modelId: GENERATION_PROFILE.id,
      strict: true,
    });
    return response.json({
      prompt: bundle.prompt,
      negativePrompt: bundle.negativePrompt,
      strategy: bundle.strategy,
      normalizedSelections: bundle.normalizedSelections,
      localModelPayload: buildLocalModelPayload({
        brief: request.body?.brief,
        selections: bundle.normalizedSelections,
        avoid: request.body?.avoid,
      }),
    });
  } catch (error) {
    if (error instanceof ParameterSelectionError) {
      return response.status(error.status).json({ code: error.code, error: error.message, details: error.details });
    }
    throw error;
  }
});

app.get('/api/generations', requireAuth, async (request, response) => {
  const limit = Math.min(60, Math.max(1, Number.parseInt(request.query?.limit, 10) || 24));
  const items = await listAvatarGenerations(request.user.id, limit);
  response.json({ items });
});

function sendStoredImage(response, image) {
  response.setHeader('Content-Type', image.mimeType);
  response.setHeader('Content-Length', String(image.buffer.length));
  response.setHeader('Cache-Control', 'private, max-age=31536000, immutable');
  return response.send(image.buffer);
}

app.get('/api/generations/:id/image', requireAuth, async (request, response) => {
  const image = await getAvatarGenerationImageBytes({ userId: request.user.id, generationId: request.params.id });
  if (!image) return response.status(404).json({ code: 'GENERATION_NOT_FOUND', error: '没有找到该生成记录。' });
  return sendStoredImage(response, image);
});

app.get('/api/generations/:id/thumb', requireAuth, async (request, response) => {
  const image = await getAvatarGenerationThumbBytes({ userId: request.user.id, generationId: request.params.id });
  if (!image) return response.status(404).json({ code: 'GENERATION_NOT_FOUND', error: '没有找到该生成记录。' });
  return sendStoredImage(response, image);
});

app.get('/api/generations/:id/download', requireAuth, async (request, response) => {
  const original = await getAvatarGeneration({ userId: request.user.id, generationId: request.params.id });
  if (!original) return response.status(404).json({ code: 'GENERATION_NOT_FOUND', error: '没有找到该生成记录。' });

  const stored = await getAvatarGenerationImageBytes({ userId: request.user.id, generationId: request.params.id });
  if (!stored) {
    return response.status(422).json({ code: 'IMAGE_NOT_DOWNLOADABLE', error: '该生成记录没有可下载的图片数据。' });
  }

  // 导出选项:尺寸(1024/640/256)与形状(square/circle 透明)。
  const requestedSize = Number.parseInt(request.query?.size, 10);
  const size = downloadSizes.includes(requestedSize) ? requestedSize : 1024;
  const shape = request.query?.shape === 'circle' ? 'circle' : 'square';
  const transformed = await transformDownloadImage(stored.buffer, { size, shape }).catch(() => null);
  const data = transformed ? { buffer: transformed, mimeType: 'image/png' } : stored;
  const variant = `${size}${shape === 'circle' ? '-round' : ''}`;

  if (isUnlimitedUsageEnabled()) {
    const extension = extensionForMimeType(data.mimeType);
    response.setHeader('Content-Type', data.mimeType);
    response.setHeader('Content-Length', String(data.buffer.length));
    response.setHeader('X-Avatar-Locked', 'false');
    response.setHeader('X-Billing-Charged', 'false');
    response.setHeader('X-Development-Unlimited', 'true');
    response.setHeader('Content-Disposition', `attachment; filename="tmall-ai-avatar-${original.id}-${variant}.${extension}"`);
    return response.send(data.buffer);
  }

  const reserved = await reserveDownloadForGeneration({ userId: request.user.id, generationId: request.params.id });
  if (!reserved.generation) return response.status(404).json({ code: 'GENERATION_NOT_FOUND', error: '没有找到该生成记录。' });
  if (reserved.paymentRequired) {
    return response.status(402).json({
      code: 'PAYMENT_REQUIRED',
      error: '免费头像下载额度已用完，继续下载需使用支付宝支付 ¥5。',
      billing: publicBillingStatus(reserved.allowance),
    });
  }

  const generation = reserved.generation;
  const extension = extensionForMimeType(data.mimeType);
  response.setHeader('Content-Type', data.mimeType);
  response.setHeader('Content-Length', String(data.buffer.length));
  response.setHeader('X-Avatar-Locked', 'true');
  response.setHeader('X-Billing-Charged', reserved.charged ? 'true' : 'false');
  response.setHeader('Content-Disposition', `attachment; filename="tmall-ai-avatar-${generation.id}-${variant}.${extension}"`);
  return response.send(data.buffer);
});

app.post('/api/generations/:id/edit', requireAuth, generateLimiter, async (request, response) => {
  const instruction = typeof request.body?.instruction === 'string' ? request.body.instruction.trim() : '';
  const allowedQualities = new Set(['low', 'medium', 'high', 'auto']);
  const size = '1024x1024';
  const quality = allowedQualities.has(request.body?.quality) ? request.body.quality : 'medium';

  if (!instruction) {
    return response.status(400).json({ code: 'EDIT_INSTRUCTION_REQUIRED', error: '请填写你想修改这张头像的要求。' });
  }
  if (usesComfy || usesLocalModel) {
    return response.status(503).json({ code: 'IMAGE_EDIT_UNSUPPORTED_BACKEND', error: '当前本地图片后端暂不支持基于历史头像修改，请切换到 OpenAI 图片后端。' });
  }
  if (!process.env.OPENAI_API_KEY) {
    return response.status(503).json({
      error: '服务端尚未配置 OPENAI_API_KEY。请复制 .env.example 为 .env 后填写密钥。',
      code: 'API_KEY_MISSING',
    });
  }

  const original = await getAvatarGeneration({ userId: request.user.id, generationId: request.params.id });
  if (!original) return response.status(404).json({ code: 'GENERATION_NOT_FOUND', error: '没有找到该生成记录。' });
  if (original.locked || original.downloadedAt || original.lockedAt) {
    return response.status(409).json({ code: 'GENERATION_LOCKED', error: '这张头像已经确认下载并锁定，不能继续修改。' });
  }

  const inputImage = await getAvatarGenerationImageBytes({ userId: request.user.id, generationId: request.params.id });
  if (!inputImage) {
    return response.status(422).json({ code: 'IMAGE_NOT_EDITABLE', error: '该生成记录没有可编辑的图片数据。' });
  }

  try {
    const prompt = buildEditPrompt({ original, instruction });
    const result = await createOpenAIClient().images.edit({
      model,
      image: await toFile(inputImage.buffer, `tmall-ai-avatar-${original.id}.${extensionForMimeType(inputImage.mimeType)}`, {
        type: inputImage.mimeType,
      }),
      prompt,
      size,
      quality,
      output_format: 'png',
      n: 1,
    });
    const image = result.data?.[0]?.b64_json;
    if (!image) throw new Error('图片编辑服务未返回可用的图像数据。');

    const payload = {
      image: `data:image/png;base64,${image}`,
      prompt,
      negativePrompt: original.negativePrompt || '',
      strategy: original.strategy || {},
      model,
      provider: 'openai',
      createdAt: new Date().toISOString(),
    };
    const generation = await saveAvatarGeneration({
      userId: request.user.id,
      parentGenerationId: original.id,
      image: payload.image,
      prompt,
      negativePrompt: payload.negativePrompt,
      brief: instruction,
      avoid: original.avoid,
      selections: original.selections,
      strategy: {
        ...(original.strategy || {}),
        edit: {
          sourceGenerationId: original.id,
          instruction,
        },
      },
      provider: 'openai',
      model,
      metadata: {
        quality,
        size,
        backend: 'openai',
        createdAt: payload.createdAt,
        edit: {
          sourceGenerationId: original.id,
          sourceCreatedAt: original.createdAt,
        },
      },
    });
    const billing = await getBillingStatus(request.user.id);
    return response.json({
      ...payload,
      generation,
      savedToHistory: true,
      downloadUrl: generation.downloadUrl,
      billing,
    });
  } catch (error) {
    const status = Number(error?.status) >= 400 && Number(error?.status) < 600 ? Number(error.status) : 502;
    const message = error?.error?.message || error?.message || '图片编辑服务暂时不可用。';
    console.error('[image-edit]', { backend: activeBackend, status, message });
    const publicError = customerFacingError(status, message);
    return response.status(publicError.status).json(publicError);
  }
});

app.delete('/api/generations/:id', requireAuth, async (request, response) => {
  const deleted = await deleteAvatarGeneration({ userId: request.user.id, generationId: request.params.id });
  if (!deleted) return response.status(404).json({ code: 'GENERATION_NOT_FOUND', error: '没有找到该生成记录。' });
  return response.json({ ok: true });
});

async function saveGenerationForUser({ request, result, bundle, brief, avoid, selections, quality, size, backend = activeBackend }) {
  if (!request.user || !isDatabaseConfigured() || !result?.image) throw new Error('Generation history database is unavailable.');

  const storedImage = await imageToStoredDataUrl(result.image);
  return saveAvatarGeneration({
    userId: request.user.id,
    image: storedImage,
    prompt: result.prompt || bundle.prompt,
    negativePrompt: result.negativePrompt || bundle.negativePrompt,
    brief,
    avoid,
    selections,
    strategy: result.strategy || bundle.strategy,
    provider: result.provider || backend,
    model: result.model || model,
    metadata: {
      quality,
      size: result.size || size,
      backend,
      createdAt: result.createdAt,
      localModel: result.localModel ? {
        endpoint: result.localModel.endpoint,
        imageUrl: result.localModel.imageUrl,
      } : undefined,
      comfy: result.comfy ? {
        endpoint: result.comfy.endpoint,
        checkpoint: result.comfy.checkpoint,
        promptId: result.comfy.promptId,
        filename: result.comfy.filename,
      } : undefined,
      translation: result.promptMode ? {
        promptMode: result.promptMode,
        sourceBrief: result.sourceBrief || brief,
        translatedPrompt: result.translatedPrompt || '',
        translationUsed: Boolean(result.translationUsed),
        translationFallback: Boolean(result.translationFallback),
        translator: result.translator || '',
      } : undefined,
    },
  });
}

app.post('/api/generate', requireAuth, generateLimiter, async (request, response) => {
  const brief = typeof request.body?.brief === 'string' ? request.body.brief.trim() : '';
  const checkpointName = normalizeCheckpointName(request.body?.checkpoint);
  // 前端可以按请求选择生成后端；未指定时沿用服务器默认（IMAGE_BACKEND）。
  const requestedBackend = ['openai', 'comfyui'].includes(request.body?.backend) ? request.body.backend : null;
  const backend = requestedBackend || activeBackend;

  if (!brief) {
    return response.status(400).json({ error: '请先填写头像文字描述，再生成头像。' });
  }

  let selections;
  try {
    selections = normalizeSelections(request.body?.selections, { modelId: GENERATION_PROFILE.id, strict: true });
  } catch (error) {
    if (error instanceof ParameterSelectionError) {
      return response.status(error.status).json({ code: error.code, error: error.message, details: error.details });
    }
    throw error;
  }

  const allowedQualities = new Set(['low', 'medium', 'high', 'auto']);
  const size = '1024x1024';
  const quality = allowedQualities.has(request.body?.quality) ? request.body.quality : 'medium';
  let bundle = buildPromptBundle({
    brief,
    selections,
    avoid: request.body?.avoid,
    modelId: GENERATION_PROFILE.id,
    strict: true,
  });

  if (backend === 'openai' && !process.env.OPENAI_API_KEY) {
    return response.status(503).json({
      error: '服务端尚未配置 OPENAI_API_KEY。请复制 .env.example 为 .env 后填写密钥。',
      code: 'API_KEY_MISSING',
    });
  }

  try {
    let payload;

    if (backend === 'comfyui') {
      const pipelineResult = await generateWithFlux1Pipeline({
        brief,
        avoid: request.body?.avoid,
        selections,
        checkpointName,
        promptMode: request.body?.promptMode,
      });
      const { bundle: translatedBundle, ...result } = pipelineResult;
      bundle = translatedBundle;
      payload = {
        ...result,
      };
    } else if (backend === 'local-sd1.5') {
      const result = await generateWithLocalModel({ brief, selections, avoid: request.body?.avoid });
      payload = {
        ...result,
        prompt: result.prompt || bundle.prompt,
        avatarPrompt: bundle.prompt,
        strategy: bundle.strategy,
      };
    } else {
      // 仅 OpenAI 支持一次生成多张候选(count ∈ {1, 4})。
      const count = Number.parseInt(request.body?.count, 10) === 4 ? 4 : 1;
      const result = await createOpenAIClient().images.generate({
        model,
        prompt: bundle.prompt,
        size,
        quality,
        output_format: 'png',
        n: count,
      });
      const images = (result.data || []).map((item) => item.b64_json).filter(Boolean);
      if (!images.length) throw new Error('图片服务未返回可用的图像数据。');

      if (count > 1 && images.length > 1) {
        const createdAt = new Date().toISOString();
        const candidates = [];
        for (const image of images) {
          candidates.push(await saveGenerationForUser({
            request,
            result: {
              image: `data:image/png;base64,${image}`,
              prompt: bundle.prompt,
              negativePrompt: bundle.negativePrompt,
              strategy: bundle.strategy,
              model,
              provider: 'openai',
              createdAt,
            },
            bundle,
            brief,
            avoid: request.body?.avoid,
            selections,
            quality,
            size,
            backend,
          }));
        }
        const billing = await getBillingStatus(request.user.id);
        return response.json({
          candidates,
          count: candidates.length,
          provider: 'openai',
          model,
          createdAt,
          savedToHistory: true,
          billing,
        });
      }

      payload = {
        image: `data:image/png;base64,${images[0]}`,
        prompt: bundle.prompt,
        negativePrompt: bundle.negativePrompt,
        strategy: bundle.strategy,
        model,
        provider: 'openai',
        createdAt: new Date().toISOString(),
      };
    }

    const generation = await saveGenerationForUser({
      request,
      result: payload,
      bundle,
      brief,
      avoid: request.body?.avoid,
      selections,
      quality,
      size,
      backend,
    });
    const billing = await getBillingStatus(request.user.id);
    return response.json({
      ...payload,
      generation,
      savedToHistory: true,
      downloadUrl: generation.downloadUrl,
      billing,
    });
  } catch (error) {
    const status = Number(error?.status) >= 400 && Number(error?.status) < 600 ? Number(error.status) : 502;
    const message = error?.error?.message || error?.message || '图片生成服务暂时不可用。';
    console.error('[image-generation]', { backend, status, message });
    const publicError = customerFacingError(status, message);
    return response.status(publicError.status).json(publicError);
  }
});

const distPath = path.resolve(__dirname, '../dist');
app.use(express.static(distPath));
app.get(/.*/, (request, response, next) => {
  if (request.path.startsWith('/api/')) return next();
  return response.sendFile(path.join(distPath, 'index.html'));
});

await initializeDatabase().catch((error) => {
  console.error('[database-init]', error);
});
await ensureStorageDir().catch((error) => {
  console.error('[image-storage-init]', error);
});
await migrateLegacyImages().catch((error) => {
  console.error('[image-migration]', error);
});

const server = app.listen(port, host, () => {
  console.log(`Image Studio API running at http://${host}:${port}`);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, () => {
    console.log(`[shutdown] Received ${signal}, closing server…`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 5000).unref();
  });
}
