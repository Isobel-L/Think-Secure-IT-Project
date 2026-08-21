import { generateWithComfy } from './comfyModel.js';
import { buildPromptBundle } from './prompt.js';
import { translatePromptWithQwen } from './promptTranslator.js';
import { GENERATION_PROFILE } from '../shared/modelProfiles.js';

const promptModes = new Set(['flux1-qwen', 'flux1-raw']);

export function normalizePromptMode(value, env = process.env) {
  const requested = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (promptModes.has(requested)) return requested;
  const configured = String(env.COMFY_PROMPT_MODE || '').trim().toLowerCase();
  return promptModes.has(configured) ? configured : 'flux1-qwen';
}

export function getPromptModeCatalog({ translatorReady = true } = {}) {
  return [
    {
      id: 'flux1-qwen',
      label: 'FLUX.1 with prompt translation (recommended)',
      available: translatorReady,
    },
    {
      id: 'flux1-raw',
      label: 'FLUX.1 raw prompt',
      available: true,
    },
  ];
}

export async function generateWithFlux1Pipeline({
  brief,
  avoid = '',
  selections = {},
  checkpointName = '',
  promptMode,
  deps = {},
}) {
  const mode = normalizePromptMode(promptMode, deps.env || process.env);
  const translate = deps.translate || translatePromptWithQwen;
  const generateFlux1 = deps.generateFlux1 || generateWithComfy;
  const translation = mode === 'flux1-qwen'
    ? await translate({ brief, avoid })
    : {
      brief,
      avoid,
      translatedPrompt: '',
      translationUsed: false,
      translationFallback: false,
      translator: '',
    };
  const bundle = buildPromptBundle({
    brief: translation.brief,
    avoid: translation.avoid,
    selections,
    modelId: GENERATION_PROFILE.id,
    strict: true,
  });
  const generated = await generateFlux1({
    prompt: bundle.prompt,
    negativePrompt: bundle.negativePrompt,
    checkpointName,
  });

  return {
    ...generated,
    strategy: bundle.strategy,
    bundle,
    sourceBrief: brief,
    translatedPrompt: translation.translatedPrompt,
    translationUsed: translation.translationUsed,
    translationFallback: translation.translationFallback,
    translator: translation.translator,
    promptMode: mode,
  };
}
