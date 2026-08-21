import { flattenedGroups, getOption } from '../shared/catalog.js';
import { normalizeSelectionState } from '../shared/selectionRules.js';

function cleanText(value, maxLength) {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/\s+/g, ' ').slice(0, maxLength);
}

export class ParameterSelectionError extends Error {
  constructor(details) {
    super('提交的参数选择无效，请刷新页面后重新选择。');
    this.name = 'ParameterSelectionError';
    this.code = 'PARAMETER_SELECTION_INVALID';
    this.status = 400;
    this.details = details;
  }
}

export function normalizeSelections(input = {}, { modelId = 'flux1-schnell', strict = false } = {}) {
  const result = normalizeSelectionState(input, modelId);
  if (strict && result.errors.length) throw new ParameterSelectionError(result.errors);
  return result.selections;
}

export const defaultNegativePrompt = [
  'low quality',
  'blurry',
  'bad anatomy',
  'asymmetrical eyes',
  'distorted face',
  'extra fingers',
  'extra limbs',
  'hands covering face',
  'cropped head',
  'cut off hair',
  'distant subject',
  'complex background',
  'watermark',
  'signature',
  'text',
  'logo',
].join(', ');

function selectedOptions(selections) {
  return flattenedGroups.flatMap((group) => (selections[group.id] || [])
    .map((optionId) => ({ group, option: getOption(group.id, optionId) }))
    .filter(({ option }) => option));
}

export function analyzePromptStrategy({ selections, modelId = 'flux1-schnell' }) {
  const selected = selectedOptions(selections);
  const experimentalSelections = selected
    .filter(({ option }) => option.reliability === 'experimental')
    .map(({ group, option }) => ({ groupId: group.id, optionId: option.id }));
  return {
    modelId,
    riskLevel: experimentalSelections.length ? 'experimental' : 'stable',
    appliedGroups: [...new Set(selected.map(({ group }) => group.id))],
    experimentalSelections,
    fixedRuntime: true,
  };
}

export function buildPromptBundle({
  brief,
  selections = {},
  avoid,
  modelId = 'flux1-schnell',
  strict = true,
} = {}) {
  const safeBrief = cleanText(brief, 1200);
  const safeAvoid = cleanText(avoid, 400);
  const normalizedSelections = normalizeSelections(selections, { modelId, strict });
  const selected = selectedOptions(normalizedSelections);
  const creativeDirection = selected.map(({ option }) => option.prompt).join(', ');
  const strategy = analyzePromptStrategy({ selections: normalizedSelections, modelId });

  const prompt = [
    safeBrief
      ? `PRIMARY INSTRUCTION: ${safeBrief}`
      : 'PRIMARY INSTRUCTION: Create a single-subject social avatar.',
    creativeDirection ? `Selected direction: ${creativeDirection}.` : '',
    safeAvoid ? `Explicit exclusions: ${safeAvoid}.` : '',
    'Instruction priority: the PRIMARY INSTRUCTION overrides presets and generic avatar conventions whenever they conflict.',
    'Content fidelity: preserve every requested subject, action, object, setting, count, and relationship. Do not replace or omit them, and do not change an explicitly requested age, gender, identity, or activity.',
    'Composition requirements: create a 1:1 square avatar image and use framing wide enough to show every requested action and object. Scene and activity requests must include their environment; do not convert them into an isolated headshot. For portrait-only requests, keep comfortable margins for square and circular crops.',
    'Quality requirements: when a face is visible, keep facial anatomy coherent and eyes readable. Use natural proportions, a clean silhouette, complete requested subjects and objects, and no visible words or branding.',
    'Preserve one dominant style, one readable scene, and one clear emotional direction without overriding the primary content.',
  ].filter(Boolean).join('\n');

  return {
    prompt,
    negativePrompt: [defaultNegativePrompt, safeAvoid].filter(Boolean).join(', '),
    strategy,
    normalizedSelections,
  };
}

export function buildImagePrompt(input) {
  return buildPromptBundle(input).prompt;
}
