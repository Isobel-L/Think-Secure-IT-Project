const choice = (id, label, prompt) => ({ id, label, prompt });
const target = (id, label, prompt) => ({ id, label, prompt });

export const colorTargets = [
  target('hair', 'Hair', 'hair'),
  target('eyes', 'Eyes', 'eye irises'),
  target('clothing', 'Clothing', 'main clothing'),
  target('background', 'Background', 'background'),
  target('accessory', 'Accessory', 'selected accessory'),
];

export const colorSwatches = [
  { id: 'coral', label: 'Coral', hex: '#FF6B6B' },
  { id: 'rose', label: 'Rose', hex: '#E85D9E' },
  { id: 'amber', label: 'Amber', hex: '#F4B942' },
  { id: 'mint', label: 'Mint', hex: '#65C8A1' },
  { id: 'teal', label: 'Teal', hex: '#279E9A' },
  { id: 'sky', label: 'Sky blue', hex: '#55A7E8' },
  { id: 'navy', label: 'Navy', hex: '#31558C' },
  { id: 'violet', label: 'Violet', hex: '#8A67C7' },
  { id: 'silver', label: 'Silver', hex: '#B9C0CC' },
  { id: 'charcoal', label: 'Charcoal', hex: '#343840' },
  { id: 'ivory', label: 'Ivory', hex: '#F5F0E6' },
  { id: 'chestnut', label: 'Chestnut', hex: '#81523F' },
];

export const editCategories = [
  { id: 'color', label: 'Color', targets: colorTargets, options: [] },
  {
    id: 'hairstyle', label: 'Hair style', targets: [], options: [
      choice('long-wavy', 'Long wavy', 'change the hairstyle to long softly wavy hair'),
      choice('short-layered', 'Short layered', 'change the hairstyle to a short layered cut'),
      choice('straight-hair', 'Straight', 'change the hairstyle to smooth straight hair'),
      choice('soft-bangs', 'Soft bangs', 'add light natural bangs while keeping the face visible'),
    ],
  },
  {
    id: 'clothing', label: 'Clothing', targets: [
      target('outfit', 'Whole outfit', 'entire outfit'),
      target('upper-clothing', 'Top', 'upper clothing'),
      target('clothing-accessory', 'Clothing accessory', 'clothing accessory'),
    ], options: [
      choice('formal', 'Clean formal', 'a clean formal design'),
      choice('casual', 'Everyday casual', 'a contemporary casual design'),
      choice('campus', 'Campus uniform', 'a neat campus uniform design'),
      choice('fantasy', 'Fantasy costume', 'a restrained fantasy costume design'),
    ],
  },
  {
    id: 'expression', label: 'Expression', targets: [], options: [
      choice('gentle-smile', 'Gentle smile', 'change the expression to a gentle natural smile'),
      choice('calm', 'Calm', 'change the expression to calm and relaxed'),
      choice('confident', 'Confident', 'change the expression to quietly confident'),
      choice('surprised', 'Slightly surprised', 'change the expression to subtly surprised'),
    ],
  },
  {
    id: 'background', label: 'Background', targets: [], options: [
      choice('clean-studio', 'Clean studio', 'replace the background with a clean softly lit studio background'),
      choice('campus', 'Campus', 'replace the background with a softly simplified campus scene'),
      choice('seaside', 'Seaside', 'replace the background with a calm seaside scene'),
      choice('neon-city', 'Neon city', 'replace the background with a controlled neon city scene'),
    ],
  },
  {
    id: 'lighting', label: 'Lighting', targets: [], options: [
      choice('soft-daylight', 'Soft daylight', 'change the lighting to soft natural daylight'),
      choice('warm-light', 'Warm light', 'change the lighting to soft warm portrait light'),
      choice('studio-light', 'Soft studio light', 'change the lighting to clean soft studio light'),
      choice('cinematic-light', 'Cinematic', 'change the lighting to restrained cinematic portrait light'),
    ],
  },
  {
    id: 'style', label: 'Art style', targets: [], options: [
      choice('clean-anime', 'Clean anime', 'render the image in a clean refined anime portrait style'),
      choice('semi-realistic', 'Semi-realistic', 'render the image in a painterly semi-realistic portrait style'),
      choice('watercolor', 'Watercolor', 'render the image with delicate restrained watercolor texture'),
      choice('line-art', 'Minimal line art', 'render the image in a clean minimal line-art style'),
    ],
  },
  { id: 'replace', label: 'Replace object', targets: [], options: [] },
  { id: 'custom', label: 'Custom', targets: [], options: [] },
];

const categoryMap = new Map(editCategories.map((category) => [category.id, category]));
const swatchMap = new Map(colorSwatches.map((swatch) => [swatch.id, swatch]));
const hexPattern = /^#[0-9A-F]{6}$/;

function text(value, maxLength) {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/\s+/g, ' ').slice(0, maxLength);
}

export class EditControlError extends Error {
  constructor(message, code = 'EDIT_CONTROL_INVALID') {
    super(message);
    this.name = 'EditControlError';
    this.code = code;
    this.status = 400;
  }
}

function invalid(message, code) {
  throw new EditControlError(message, code);
}

const preservationLine = 'Preserve the subject identity, facial proportions, pose, composition, and every area not explicitly requested to change.';

export function compileEditInstruction(input = {}) {
  const customPrompt = text(input.prompt, 1201);
  const categoryId = text(input.editCategory, 40) || (customPrompt ? 'custom' : '');
  const category = categoryMap.get(categoryId);
  if (!category) {
    if (!categoryId && !customPrompt) invalid('Describe the edit you want, in 1200 characters or fewer.', 'EDIT_PROMPT_REQUIRED');
    invalid('Pick a valid edit category.');
  }
  if (customPrompt.length > 1200) invalid('Describe the edit you want, in 1200 characters or fewer.', 'EDIT_PROMPT_REQUIRED');

  if (category.id === 'custom') {
    if (!customPrompt) invalid('Describe the edit you want, in 1200 characters or fewer.', 'EDIT_PROMPT_REQUIRED');
    return {
      prompt: `Apply only this requested edit: ${customPrompt}. ${preservationLine}`,
      controls: { category: 'custom', target: '', option: '', colorHex: '' },
    };
  }

  if (category.id === 'replace') {
    const replaceTarget = text(input.editTarget, 80);
    if (!replaceTarget || !customPrompt) invalid('Replacing an object needs both the target object and what to replace it with.');
    return {
      prompt: `Replace only ${replaceTarget} as follows: ${customPrompt}. Match the surrounding perspective, lighting, and edges. ${preservationLine}`,
      controls: { category: 'replace', target: replaceTarget, option: '', colorHex: '' },
    };
  }

  if (category.id === 'color') {
    const colorTarget = colorTargets.find((entry) => entry.id === input.editTarget);
    if (!colorTarget) invalid('Choose which part should change color.');
    const swatch = swatchMap.get(text(input.editOption, 40));
    const rawHex = text(input.colorHex, 7).toUpperCase();
    if (input.colorHex && !hexPattern.test(rawHex)) invalid('The color must be a six-digit HEX value, for example #FF6B6B.');
    const colorHex = rawHex || swatch?.hex;
    if (!colorHex) invalid('Pick a swatch or enter a six-digit HEX color.');
    const colorLabel = swatch && swatch.hex === colorHex ? `${swatch.label} ` : '';
    const extra = customPrompt ? ` Additional constraint: ${customPrompt}.` : '';
    return {
      prompt: `Change only the ${colorTarget.prompt} color to ${colorLabel}${colorHex}. Keep material texture, shading, and boundaries natural.${extra} ${preservationLine}`,
      controls: { category: 'color', target: colorTarget.id, option: swatch?.id || '', colorHex },
    };
  }

  const selectedOption = category.options.find((entry) => entry.id === input.editOption);
  if (!selectedOption) invalid(`The ${category.label} category needs a valid option.`);
  let selectedTarget = '';
  let targetPrompt = '';
  if (category.targets.length) {
    const targetEntry = category.targets.find((entry) => entry.id === input.editTarget);
    if (!targetEntry) invalid(`The ${category.label} category needs a target to edit.`);
    selectedTarget = targetEntry.id;
    targetPrompt = `Apply this only to the ${targetEntry.prompt}: `;
  }
  const extra = customPrompt ? ` Additional constraint: ${customPrompt}.` : '';
  return {
    prompt: `${targetPrompt}${selectedOption.prompt}. Keep edges, perspective, and visual continuity natural.${extra} ${preservationLine}`,
    controls: { category: category.id, target: selectedTarget, option: selectedOption.id, colorHex: '' },
  };
}
