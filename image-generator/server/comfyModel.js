import { requestComfyJson, runComfyWorkflow } from './comfyClient.js';
import { GENERATION_PROFILE } from '../shared/modelProfiles.js';

export { extractComfyImages } from './comfyClient.js';

function clampInteger(value, min, max, fallback) {
  const number = Number.parseInt(value, 10);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

function clampFloat(value, min, max, fallback) {
  const number = Number.parseFloat(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

function normalizeBaseUrl(value) {
  return (value || 'http://127.0.0.1:8188').replace(/\/+$/, '');
}

export function normalizeCheckpointName(value) {
  return typeof value === 'string' ? value.trim() : '';
}

export function getComfyConfig() {
  const defaults = GENERATION_PROFILE.runtime;
  return {
    baseUrl: normalizeBaseUrl(process.env.COMFYUI_BASE_URL),
    checkpointName: process.env.COMFY_CHECKPOINT_NAME || GENERATION_PROFILE.checkpoint,
    width: clampInteger(process.env.COMFY_WIDTH, 256, 2048, defaults.width),
    height: clampInteger(process.env.COMFY_HEIGHT, 256, 2048, defaults.height),
    steps: clampInteger(process.env.COMFY_STEPS, 1, 80, defaults.steps),
    cfg: clampFloat(process.env.COMFY_CFG, 0, 20, defaults.cfg),
    samplerName: process.env.COMFY_SAMPLER_NAME || defaults.samplerName,
    scheduler: process.env.COMFY_SCHEDULER || defaults.scheduler,
    seed: clampInteger(process.env.COMFY_SEED, -1, 2 ** 32 - 1, -1),
    pollIntervalMs: clampInteger(process.env.COMFY_POLL_INTERVAL_MS, 250, 30000, 1500),
    maxPollAttempts: clampInteger(process.env.COMFY_MAX_POLL_ATTEMPTS, 1, 1000, 120),
    timeoutMs: clampInteger(process.env.COMFY_TIMEOUT_MS, 5000, 600000, 30000),
  };
}

export function buildComfyWorkflow({ prompt, negativePrompt, config = getComfyConfig() }) {
  const seed = config.seed === -1 ? Math.floor(Math.random() * 1_000_000_000) : config.seed;

  return {
    '1': {
      class_type: 'CheckpointLoaderSimple',
      inputs: {
        ckpt_name: config.checkpointName,
      },
    },
    '3': {
      class_type: 'KSampler',
      inputs: {
        seed,
        steps: config.steps,
        cfg: config.cfg,
        sampler_name: config.samplerName,
        scheduler: config.scheduler,
        denoise: GENERATION_PROFILE.runtime.denoise,
        model: ['1', 0],
        positive: ['6', 0],
        negative: ['7', 0],
        latent_image: ['5', 0],
      },
    },
    '5': {
      class_type: 'EmptyLatentImage',
      inputs: {
        width: config.width,
        height: config.height,
        batch_size: 1,
      },
    },
    '6': {
      class_type: 'CLIPTextEncode',
      inputs: {
        text: prompt,
        clip: ['1', 1],
      },
    },
    '7': {
      class_type: 'CLIPTextEncode',
      inputs: {
        text: negativePrompt,
        clip: ['1', 1],
      },
    },
    '8': {
      class_type: 'VAEDecode',
      inputs: {
        samples: ['3', 0],
        vae: ['1', 2],
      },
    },
    '9': {
      class_type: 'SaveImage',
      inputs: {
        filename_prefix: 'tmall_ai_avatar',
        images: ['8', 0],
      },
    },
  };
}

export async function listComfyCheckpoints(config = getComfyConfig()) {
  const info = await requestComfyJson(config, '/object_info/CheckpointLoaderSimple', {
    timeoutMs: Math.min(config.timeoutMs, 15000),
  });
  const choices = info.CheckpointLoaderSimple?.input?.required?.ckpt_name?.[0] || [];
  return Array.isArray(choices)
    ? choices.filter((value) => typeof value === 'string' && value)
    : [];
}

export async function resolveComfyCheckpoint({
  requestedCheckpoint = '',
  config = getComfyConfig(),
  availableCheckpoints,
} = {}) {
  const available = availableCheckpoints || await listComfyCheckpoints(config);
  if (!available.length) throw new Error('ComfyUI has no compatible checkpoints available.');

  const requested = normalizeCheckpointName(requestedCheckpoint);
  if (requested) {
    if (!available.includes(requested)) {
      throw new Error(`Requested ComfyUI checkpoint is not available: ${requested}`);
    }
    return { checkpoint: requested, availableCheckpoints: available, usedFallback: false };
  }

  const configuredAvailable = available.includes(config.checkpointName);
  return {
    checkpoint: configuredAvailable ? config.checkpointName : available[0],
    availableCheckpoints: available,
    usedFallback: !configuredAvailable,
  };
}

export async function getComfyHealth() {
  const config = getComfyConfig();
  const status = {
    ok: false,
    endpoint: config.baseUrl,
    checkpoint: config.checkpointName,
    resolvedCheckpoint: null,
    checkpointFound: false,
    availableCheckpoints: [],
    error: null,
  };

  try {
    await requestComfyJson(config, '/system_stats', { timeoutMs: Math.min(config.timeoutMs, 15000) });
    status.availableCheckpoints = await listComfyCheckpoints(config);
    status.checkpointFound = status.availableCheckpoints.includes(config.checkpointName);
    const resolved = await resolveComfyCheckpoint({
      config,
      availableCheckpoints: status.availableCheckpoints,
    });
    status.resolvedCheckpoint = resolved.checkpoint;
    status.ok = true;
  } catch (error) {
    status.error = error?.message || 'Unknown ComfyUI error';
  }

  return status;
}

export async function generateWithComfy({ prompt, negativePrompt, checkpointName = '' }) {
  const config = getComfyConfig();
  const resolved = await resolveComfyCheckpoint({ requestedCheckpoint: checkpointName, config });
  const resolvedConfig = { ...config, checkpointName: resolved.checkpoint };
  const workflow = buildComfyWorkflow({ prompt, negativePrompt, config: resolvedConfig });
  const completed = await runComfyWorkflow(config, workflow);

  return {
    image: `data:image/png;base64,${completed.bytes.toString('base64')}`,
    prompt,
    negativePrompt,
    model: resolved.checkpoint,
    provider: 'comfyui',
    size: `${config.width}x${config.height}`,
    outputFormat: 'png',
    createdAt: new Date().toISOString(),
    comfy: {
      endpoint: config.baseUrl,
      checkpoint: resolved.checkpoint,
      promptId: completed.promptId,
      filename: completed.image.filename,
      workflow,
    },
  };
}
