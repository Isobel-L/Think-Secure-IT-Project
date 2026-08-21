import { requestComfyJson } from './comfyClient.js';

const requiredNodes = ['CLIPLoader', 'TextGenerate', 'PreviewAny'];

function integer(value, min, max, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Math.min(max, Math.max(min, Number.isFinite(parsed) ? parsed : fallback));
}

function cleanText(value, maxLength) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, maxLength) : '';
}

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

export function getPromptTranslatorConfig(env = process.env) {
  return {
    baseUrl: (env.COMFYUI_BASE_URL || 'http://127.0.0.1:8188').replace(/\/+$/, ''),
    clipName: env.COMFY_TRANSLATOR_CLIP_NAME || env.COMFY_FLUX2_CLIP_NAME || 'qwen_3_4b.safetensors',
    clipType: env.COMFY_TRANSLATOR_CLIP_TYPE || 'flux2',
    maxLength: integer(env.COMFY_TRANSLATOR_MAX_LENGTH, 64, 1024, 384),
    retries: integer(env.COMFY_TRANSLATOR_RETRIES, 0, 3, 1),
    pollIntervalMs: integer(env.COMFY_POLL_INTERVAL_MS, 250, 30000, 1500),
    maxPollAttempts: integer(env.COMFY_MAX_POLL_ATTEMPTS, 1, 1000, 120),
    timeoutMs: integer(env.COMFY_TIMEOUT_MS, 5000, 600000, 30000),
  };
}

export function buildPromptTranslationWorkflow({ brief, avoid = '', config = getPromptTranslatorConfig() }) {
  const source = JSON.stringify({
    brief: cleanText(brief, 1200),
    avoid: cleanText(avoid, 400),
  });
  const prompt = [
    'Translate the supplied Chinese image-generation fields into precise, concise English.',
    'Return exactly one JSON object with string fields "brief" and "avoid". Do not use Markdown or add commentary.',
    'Preserve every subject, action, object, setting, count, age, gender, identity, exclusion, and spatial relationship.',
    'Do not add new people, accessories, activities, settings, styles, or visual details.',
    `Input JSON: ${source}`,
  ].join('\n');

  return {
    '1': {
      class_type: 'CLIPLoader',
      inputs: { clip_name: config.clipName, type: config.clipType, device: 'default' },
    },
    '2': {
      class_type: 'TextGenerate',
      inputs: {
        clip: ['1', 0],
        prompt,
        max_length: config.maxLength,
        sampling_mode: 'off',
        thinking: false,
        use_default_template: true,
      },
    },
    '3': { class_type: 'PreviewAny', inputs: { source: ['2', 0] } },
  };
}

function parseTranslationOutput(value) {
  const normalized = String(value || '')
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();
  const parsed = JSON.parse(normalized);
  const brief = cleanText(parsed?.brief, 1200);
  const avoid = cleanText(parsed?.avoid, 400);
  if (!brief) throw new Error('Qwen translation did not return a non-empty English brief.');
  return { brief, avoid };
}

export function extractPromptTranslation(history, promptId) {
  const record = history?.[promptId] || history;
  const text = record?.outputs?.['3']?.text?.[0];
  if (typeof text !== 'string') return null;
  return parseTranslationOutput(text);
}

function historyFailed(history, promptId) {
  const record = history?.[promptId] || history;
  const status = record?.status;
  return status?.status_str === 'error'
    || status?.messages?.some((message) => (
      Array.isArray(message) ? message[0] === 'execution_error' : message?.type === 'execution_error'
    ));
}

async function runTranslationAttempt({ brief, avoid, config, requestJson, delay }) {
  const workflow = buildPromptTranslationWorkflow({ brief, avoid, config });
  const queued = await requestJson(config, '/prompt', {
    method: 'POST',
    body: JSON.stringify({ prompt: workflow }),
  });
  if (queued.node_errors && Object.keys(queued.node_errors).length) {
    throw new Error(`ComfyUI rejected Qwen translation workflow: ${JSON.stringify(queued.node_errors)}`);
  }
  if (!queued.prompt_id) throw new Error('ComfyUI did not return a translation prompt_id.');

  for (let attempt = 0; attempt < config.maxPollAttempts; attempt += 1) {
    const history = await requestJson(config, `/history/${encodeURIComponent(queued.prompt_id)}`);
    if (historyFailed(history, queued.prompt_id)) throw new Error('Qwen translation workflow execution failed.');
    const translation = extractPromptTranslation(history, queued.prompt_id);
    if (translation) return translation;
    const record = history?.[queued.prompt_id] || history;
    if (record?.status?.completed) throw new Error('Qwen translation output was missing or invalid.');
    await delay(config.pollIntervalMs);
  }
  throw new Error('Timed out waiting for Qwen translation output.');
}

export async function translatePromptWithQwen({
  brief,
  avoid = '',
  config = getPromptTranslatorConfig(),
  deps = {},
}) {
  const sourceBrief = cleanText(brief, 1200);
  const sourceAvoid = cleanText(avoid, 400);
  const requestJson = deps.requestJson || requestComfyJson;
  const delay = deps.delay || wait;

  for (let attempt = 0; attempt <= config.retries; attempt += 1) {
    try {
      const translated = await runTranslationAttempt({
        brief: sourceBrief,
        avoid: sourceAvoid,
        config,
        requestJson,
        delay,
      });
      return {
        ...translated,
        translatedPrompt: translated.brief,
        translationUsed: true,
        translationFallback: false,
        translator: config.clipName,
      };
    } catch {
      // Retry using the same deterministic workflow, then fall back to the original FLUX.1 prompt.
    }
  }

  return {
    brief: sourceBrief,
    avoid: sourceAvoid,
    translatedPrompt: '',
    translationUsed: false,
    translationFallback: true,
    translator: config.clipName,
  };
}

export async function getPromptTranslatorHealth(
  config = getPromptTranslatorConfig(),
  { requestJson = requestComfyJson } = {},
) {
  try {
    await requestJson(config, '/system_stats');
    const objectInfo = await requestJson(config, '/object_info');
    const choices = (node, input) => objectInfo[node]?.input?.required?.[input]?.[0] || [];
    const missingNodes = requiredNodes.filter((name) => !objectInfo[name]);
    const clipFound = choices('CLIPLoader', 'clip_name').includes(config.clipName);
    const clipTypeFound = choices('CLIPLoader', 'type').includes(config.clipType);
    return {
      ok: missingNodes.length === 0 && clipFound && clipTypeFound,
      endpoint: config.baseUrl,
      translator: config.clipName,
      clipFound,
      clipTypeFound,
      missingNodes,
      error: null,
    };
  } catch (error) {
    return {
      ok: false,
      endpoint: config.baseUrl,
      translator: config.clipName,
      clipFound: false,
      clipTypeFound: false,
      missingNodes: [],
      error: error.message,
    };
  }
}
