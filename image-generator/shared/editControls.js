const choice = (id, label, prompt) => ({ id, label, prompt });
const target = (id, label, prompt) => ({ id, label, prompt });

export const colorTargets = [
  target('hair', '头发', 'hair'),
  target('eyes', '眼睛', 'eye irises'),
  target('clothing', '服装', 'main clothing'),
  target('background', '背景', 'background'),
  target('accessory', '配饰', 'selected accessory'),
];

export const colorSwatches = [
  { id: 'coral', label: '珊瑚红', hex: '#FF6B6B' },
  { id: 'rose', label: '玫瑰粉', hex: '#E85D9E' },
  { id: 'amber', label: '琥珀黄', hex: '#F4B942' },
  { id: 'mint', label: '薄荷绿', hex: '#65C8A1' },
  { id: 'teal', label: '青绿色', hex: '#279E9A' },
  { id: 'sky', label: '天空蓝', hex: '#55A7E8' },
  { id: 'navy', label: '深海蓝', hex: '#31558C' },
  { id: 'violet', label: '紫罗兰', hex: '#8A67C7' },
  { id: 'silver', label: '银灰', hex: '#B9C0CC' },
  { id: 'charcoal', label: '炭黑', hex: '#343840' },
  { id: 'ivory', label: '象牙白', hex: '#F5F0E6' },
  { id: 'chestnut', label: '栗棕', hex: '#81523F' },
];

export const editCategories = [
  { id: 'color', label: '颜色', targets: colorTargets, options: [] },
  {
    id: 'hairstyle', label: '发型', targets: [], options: [
      choice('long-wavy', '长卷发', 'change the hairstyle to long softly wavy hair'),
      choice('short-layered', '短层次发', 'change the hairstyle to a short layered cut'),
      choice('straight-hair', '柔顺直发', 'change the hairstyle to smooth straight hair'),
      choice('soft-bangs', '轻薄刘海', 'add light natural bangs while keeping the face visible'),
    ],
  },
  {
    id: 'clothing', label: '服装', targets: [
      target('outfit', '整套服装', 'entire outfit'),
      target('upper-clothing', '上装', 'upper clothing'),
      target('clothing-accessory', '服装配件', 'clothing accessory'),
    ], options: [
      choice('formal', '简洁正装', 'a clean formal design'),
      choice('casual', '日常休闲', 'a contemporary casual design'),
      choice('campus', '校园制服', 'a neat campus uniform design'),
      choice('fantasy', '幻想服饰', 'a restrained fantasy costume design'),
    ],
  },
  {
    id: 'expression', label: '表情', targets: [], options: [
      choice('gentle-smile', '自然微笑', 'change the expression to a gentle natural smile'),
      choice('calm', '平静', 'change the expression to calm and relaxed'),
      choice('confident', '自信', 'change the expression to quietly confident'),
      choice('surprised', '轻微惊讶', 'change the expression to subtly surprised'),
    ],
  },
  {
    id: 'background', label: '背景', targets: [], options: [
      choice('clean-studio', '简洁棚拍', 'replace the background with a clean softly lit studio background'),
      choice('campus', '校园', 'replace the background with a softly simplified campus scene'),
      choice('seaside', '海边', 'replace the background with a calm seaside scene'),
      choice('neon-city', '霓虹街道', 'replace the background with a controlled neon city scene'),
    ],
  },
  {
    id: 'lighting', label: '光线', targets: [], options: [
      choice('soft-daylight', '柔和日光', 'change the lighting to soft natural daylight'),
      choice('warm-light', '暖色光', 'change the lighting to soft warm portrait light'),
      choice('studio-light', '棚拍柔光', 'change the lighting to clean soft studio light'),
      choice('cinematic-light', '电影光影', 'change the lighting to restrained cinematic portrait light'),
    ],
  },
  {
    id: 'style', label: '画面风格', targets: [], options: [
      choice('clean-anime', '清爽动漫', 'render the image in a clean refined anime portrait style'),
      choice('semi-realistic', '半写实', 'render the image in a painterly semi-realistic portrait style'),
      choice('watercolor', '水彩', 'render the image with delicate restrained watercolor texture'),
      choice('line-art', '简洁线稿', 'render the image in a clean minimal line-art style'),
    ],
  },
  { id: 'replace', label: '替换物体', targets: [], options: [] },
  { id: 'custom', label: '自定义', targets: [], options: [] },
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
    if (!categoryId && !customPrompt) invalid('请填写不超过 1200 字的修改要求。', 'EDIT_PROMPT_REQUIRED');
    invalid('请选择有效的图片修改分类。');
  }
  if (customPrompt.length > 1200) invalid('请填写不超过 1200 字的修改要求。', 'EDIT_PROMPT_REQUIRED');

  if (category.id === 'custom') {
    if (!customPrompt) invalid('请填写不超过 1200 字的修改要求。', 'EDIT_PROMPT_REQUIRED');
    return {
      prompt: `Apply only this requested edit: ${customPrompt}. ${preservationLine}`,
      controls: { category: 'custom', target: '', option: '', colorHex: '' },
    };
  }

  if (category.id === 'replace') {
    const replaceTarget = text(input.editTarget, 80);
    if (!replaceTarget || !customPrompt) invalid('替换物体需要填写目标物体和替换要求。');
    return {
      prompt: `Replace only ${replaceTarget} as follows: ${customPrompt}. Match the surrounding perspective, lighting, and edges. ${preservationLine}`,
      controls: { category: 'replace', target: replaceTarget, option: '', colorHex: '' },
    };
  }

  if (category.id === 'color') {
    const colorTarget = colorTargets.find((entry) => entry.id === input.editTarget);
    if (!colorTarget) invalid('颜色修改必须选择要变色的对象。');
    const swatch = swatchMap.get(text(input.editOption, 40));
    const rawHex = text(input.colorHex, 7).toUpperCase();
    if (input.colorHex && !hexPattern.test(rawHex)) invalid('颜色值必须是六位 HEX，例如 #FF6B6B。');
    const colorHex = rawHex || swatch?.hex;
    if (!colorHex) invalid('请选择色卡或输入六位 HEX 颜色。');
    const colorLabel = swatch && swatch.hex === colorHex ? `${swatch.label} ` : '';
    const extra = customPrompt ? ` Additional constraint: ${customPrompt}.` : '';
    return {
      prompt: `Change only the ${colorTarget.prompt} color to ${colorLabel}${colorHex}. Keep material texture, shading, and boundaries natural.${extra} ${preservationLine}`,
      controls: { category: 'color', target: colorTarget.id, option: swatch?.id || '', colorHex },
    };
  }

  const selectedOption = category.options.find((entry) => entry.id === input.editOption);
  if (!selectedOption) invalid(`“${category.label}”分类需要选择一个有效选项。`);
  let selectedTarget = '';
  let targetPrompt = '';
  if (category.targets.length) {
    const targetEntry = category.targets.find((entry) => entry.id === input.editTarget);
    if (!targetEntry) invalid(`“${category.label}”分类需要选择修改对象。`);
    selectedTarget = targetEntry.id;
    targetPrompt = `Apply this only to the ${targetEntry.prompt}: `;
  }
  const extra = customPrompt ? ` Additional constraint: ${customPrompt}.` : '';
  return {
    prompt: `${targetPrompt}${selectedOption.prompt}. Keep edges, perspective, and visual continuity natural.${extra} ${preservationLine}`,
    controls: { category: category.id, target: selectedTarget, option: selectedOption.id, colorHex: '' },
  };
}
