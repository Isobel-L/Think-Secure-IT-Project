import { randomUUID } from 'node:crypto';
import { requestComfyJson, runComfyWorkflow, uploadComfyImage } from './comfyClient.js';
import { FLUX2_EDIT_PROFILE } from '../shared/modelProfiles.js';

const requiredNodes = ['UNETLoader', 'CLIPLoader', 'VAELoader', 'LoadImage', 'LoadImageMask', 'VAEEncode', 'ReferenceLatent', 'SetLatentNoiseMask', 'CLIPTextEncode', 'EmptyFlux2LatentImage', 'KSampler', 'VAEDecode', 'SaveImage'];
const maxDimension = 2048;
const invalidDimensionsMessage = 'FLUX.2 edit dimensions must be positive integers, multiples of 16, and no larger than 2048 pixels.';
const integer = (value, min, max, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Math.min(max, Math.max(min, Number.isFinite(parsed) ? parsed : fallback));
};
const decimal = (value, min, max, fallback) => {
  const parsed = Number.parseFloat(value);
  return Math.min(max, Math.max(min, Number.isFinite(parsed) ? parsed : fallback));
};

function validateFlux2Dimensions(width, height) {
  const valid = (value) => Number.isFinite(value)
    && Number.isInteger(value)
    && value > 0
    && value <= maxDimension
    && value % 16 === 0;
  if (!valid(width) || !valid(height)) {
    throw Object.assign(new Error(invalidDimensionsMessage), {
      code: 'FLUX2_EDIT_INVALID_DIMENSIONS',
      status: 400,
    });
  }
}

export function getFlux2EditConfig(env = process.env) {
  const defaults = FLUX2_EDIT_PROFILE.runtime;
  return {
    baseUrl: (env.COMFYUI_BASE_URL || 'http://127.0.0.1:8188').replace(/\/+$/, ''),
    unetName: env.COMFY_FLUX2_UNET_NAME || FLUX2_EDIT_PROFILE.checkpoint,
    clipName: env.COMFY_FLUX2_CLIP_NAME || 'qwen_3_4b.safetensors',
    vaeName: env.COMFY_FLUX2_VAE_NAME || 'flux2-vae.safetensors',
    steps: integer(env.COMFY_FLUX2_STEPS, 1, 80, defaults.steps),
    cfg: decimal(env.COMFY_FLUX2_CFG, 0, 20, defaults.cfg),
    samplerName: env.COMFY_FLUX2_SAMPLER_NAME || defaults.samplerName,
    scheduler: env.COMFY_FLUX2_SCHEDULER || defaults.scheduler,
    seed: integer(env.COMFY_FLUX2_SEED, -1, 2 ** 32 - 1, -1),
    pollIntervalMs: integer(env.COMFY_POLL_INTERVAL_MS, 250, 30000, 1500),
    maxPollAttempts: integer(env.COMFY_MAX_POLL_ATTEMPTS, 1, 1000, 120),
    timeoutMs: integer(env.COMFY_TIMEOUT_MS, 5000, 600000, 30000),
    maskFeather: integer(env.COMFY_FLUX2_MASK_FEATHER, 0, 64, defaults.maskFeather),
    maxUploadMb: integer(env.COMFY_EDIT_MAX_UPLOAD_MB, 1, 25, 10),
  };
}

export function inspectFlux2Dependencies(objectInfo, config = getFlux2EditConfig()) {
  const choices = (node, input) => objectInfo[node]?.input?.required?.[input]?.[0] || [];
  const missingNodes = requiredNodes.filter((name) => !objectInfo[name]);
  const unetFound = choices('UNETLoader', 'unet_name').includes(config.unetName);
  const clipFound = choices('CLIPLoader', 'clip_name').includes(config.clipName);
  const vaeFound = choices('VAELoader', 'vae_name').includes(config.vaeName);
  const flux2TypeFound = choices('CLIPLoader', 'type').includes('flux2');
  return {
    ok: missingNodes.length === 0 && unetFound && clipFound && vaeFound && flux2TypeFound,
    endpoint: config.baseUrl,
    unet: config.unetName,
    clip: config.clipName,
    vae: config.vaeName,
    unetFound,
    clipFound,
    vaeFound,
    flux2TypeFound,
    missingNodes,
  };
}

export function buildFlux2EditWorkflow({ prompt, imageName, maskName = '', width, height, config = getFlux2EditConfig() }) {
  const seed = config.seed === -1 ? Math.floor(Math.random() * 1_000_000_000) : config.seed;
  const workflow = {
    '1': { class_type: 'UNETLoader', inputs: { unet_name: config.unetName, weight_dtype: 'default' } },
    '2': { class_type: 'CLIPLoader', inputs: { clip_name: config.clipName, type: 'flux2', device: 'default' } },
    '3': { class_type: 'VAELoader', inputs: { vae_name: config.vaeName } },
    '4': { class_type: 'LoadImage', inputs: { image: imageName } },
    '5': { class_type: 'VAEEncode', inputs: { pixels: ['4', 0], vae: ['3', 0] } },
    '6': { class_type: 'CLIPTextEncode', inputs: { text: prompt, clip: ['2', 0] } },
    '7': { class_type: 'ReferenceLatent', inputs: { conditioning: ['6', 0], latent: ['5', 0] } },
    '8': { class_type: 'CLIPTextEncode', inputs: { text: '', clip: ['2', 0] } },
    '9': { class_type: 'EmptyFlux2LatentImage', inputs: { width, height, batch_size: 1 } },
    '10': { class_type: 'KSampler', inputs: { seed, steps: config.steps, cfg: config.cfg, sampler_name: config.samplerName, scheduler: config.scheduler, denoise: FLUX2_EDIT_PROFILE.runtime.denoise, model: ['1', 0], positive: ['7', 0], negative: ['8', 0], latent_image: maskName ? ['14', 0] : ['9', 0] } },
    '11': { class_type: 'VAEDecode', inputs: { samples: ['10', 0], vae: ['3', 0] } },
    '12': { class_type: 'SaveImage', inputs: { filename_prefix: 'tmall_flux2_edit', images: ['11', 0] } },
  };
  if (maskName) {
    workflow['13'] = { class_type: 'LoadImageMask', inputs: { image: maskName, channel: 'red' } };
    workflow['14'] = { class_type: 'SetLatentNoiseMask', inputs: { samples: ['5', 0], mask: ['13', 0] } };
  }
  return workflow;
}

export async function getFlux2EditHealth(config = getFlux2EditConfig(), { requestJson = requestComfyJson } = {}) {
  try {
    await requestJson(config, '/system_stats');
    const objectInfo = await requestJson(config, '/object_info');
    return { ...inspectFlux2Dependencies(objectInfo, config), error: null };
  } catch (error) {
    return {
      ok: false,
      endpoint: config.baseUrl,
      unet: config.unetName,
      clip: config.clipName,
      vae: config.vaeName,
      missingNodes: [],
      error: error.message,
    };
  }
}

export async function editWithFlux2({ source, prompt, mask = null, width, height, signal, config = getFlux2EditConfig(), deps = {} }) {
  validateFlux2Dimensions(width, height);
  const upload = deps.upload || uploadComfyImage;
  const run = deps.run || runComfyWorkflow;
  const cleanup = deps.cleanup || (async () => {});
  const requestId = randomUUID();
  const uploadedFiles = [];
  try {
    const uploadedSource = await upload(config, { buffer: source, filename: `source-${requestId}.png`, signal });
    uploadedFiles.push(uploadedSource);
    let uploadedMask = null;
    if (mask) {
      uploadedMask = await upload(config, { buffer: mask, filename: `mask-${requestId}.png`, signal });
      uploadedFiles.push(uploadedMask);
    }
    const workflow = buildFlux2EditWorkflow({
      prompt,
      imageName: uploadedSource.imageName,
      maskName: uploadedMask?.imageName || '',
      width,
      height,
      config,
    });
    const completed = await run(config, workflow, { signal });
    return {
      bytes: completed.bytes,
      provider: 'comfyui',
      model: config.unetName,
      createdAt: new Date().toISOString(),
      comfy: {
        endpoint: config.baseUrl,
        promptId: completed.promptId,
        filename: completed.image.filename,
        diffusionModel: config.unetName,
        textEncoder: config.clipName,
        vae: config.vaeName,
        maskApplied: Boolean(uploadedMask),
        workflow,
      },
    };
  } finally {
    for (const uploaded of uploadedFiles.reverse()) {
      try {
        await cleanup(config, uploaded);
      } catch {
        // Core ComfyUI has no reliable input-file deletion endpoint.
      }
    }
  }
}
