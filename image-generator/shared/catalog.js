const option = (id, label, prompt, extra = {}) => ({
  id,
  label,
  prompt,
  reliability: 'stable',
  modelSupport: ['flux1-schnell'],
  conflicts: [],
  ...extra,
});

export const catalog = [
  {
    id: 'style',
    name: '风格与质感',
    eyebrow: 'Style',
    groups: [
      {
        id: 'baseStyle', label: '基础画风', mode: 'single', maxSelections: 1, options: [
          option('anime-clean', '清爽动漫', 'clean anime portrait, refined cel shading'),
          option('semi-realistic', '半写实厚涂', 'painterly semi-realistic portrait, natural facial detail'),
          option('ink-wash', '水墨淡彩', 'delicate ink wash portrait, restrained watercolor texture', { conflicts: ['lighting.neon-light'] }),
          option('cyberpunk', '赛博科幻', 'cyberpunk character portrait, controlled futuristic details'),
          option('clean-line', '线稿简约', 'clean line-art portrait, minimal refined rendering'),
        ],
      },
      {
        id: 'detail', label: '细节质感', mode: 'multiple', maxSelections: 2, options: [
          option('crisp-detail', '清晰细节', 'crisp facial details and clean hair strands'),
          option('soft-shadows', '柔和阴影', 'soft natural shadows and smooth tonal transitions'),
          option('pastel-finish', '柔和低饱和', 'restrained pastel color treatment', { conflicts: ['detail.neon-accents'] }),
          option('neon-accents', '霓虹光效', 'controlled neon rim-light accents', { reliability: 'experimental', conflicts: ['detail.pastel-finish'] }),
        ],
      },
    ],
  },
  {
    id: 'character',
    name: '人物设定',
    eyebrow: 'Character',
    groups: [
      {
        id: 'hairStyle', label: '发型', mode: 'single', maxSelections: 1, options: [
          option('long-wavy', '长卷发', 'long softly wavy hair'),
          option('short-wolf', '短狼尾', 'short wolf-cut hairstyle'),
          option('high-ponytail', '高马尾', 'high ponytail hairstyle'),
          option('twin-tail', '双马尾', 'balanced twin-tail hairstyle'),
        ],
      },
      {
        id: 'hairColor', label: '发色', mode: 'single', maxSelections: 1, options: [
          option('natural-dark', '自然深色', 'natural dark hair color'),
          option('pink-hair', '粉色', 'soft pink hair color'),
          option('blue-hair', '蓝色', 'cool blue hair color'),
          option('silver-hair', '银色', 'silver hair color'),
        ],
      },
      {
        id: 'features', label: '面部特征', mode: 'multiple', maxSelections: 2, options: [
          option('expressive-eyes', '明亮眼神', 'bright expressive eyes'),
          option('heterochromia', '异色瞳', 'subtle heterochromia', { reliability: 'experimental' }),
          option('freckles', '雀斑', 'light natural freckles'),
          option('soft-blush', '淡淡脸红', 'subtle cheek blush'),
        ],
      },
      {
        id: 'persona', label: '人物身份', mode: 'single', maxSelections: 1, options: [
          option('campus-student', '校园学生', 'youthful campus student character'),
          option('fantasy-mage', '幻想法师', 'elegant fantasy mage character'),
          option('mecha-pilot', '机甲驾驶员', 'confident futuristic mecha pilot', { conflicts: ['clothing.hanfu'] }),
        ],
      },
    ],
  },
  {
    id: 'wardrobe',
    name: '穿搭与配饰',
    eyebrow: 'Wardrobe',
    groups: [
      {
        id: 'clothing', label: '服装', mode: 'single', maxSelections: 1, options: [
          option('school-uniform', '校园制服', 'neat school uniform'),
          option('hanfu', '汉服', 'elegant layered hanfu clothing', { conflicts: ['persona.mecha-pilot'] }),
          option('casual', '日常休闲', 'clean contemporary casual outfit'),
          option('sportswear', '运动服', 'simple athletic sportswear'),
          option('fantasy-robe', '幻想长袍', 'refined fantasy robe'),
          option('combat-suit', '机甲战衣', 'streamlined futuristic combat suit'),
        ],
      },
      {
        id: 'accessories', label: '配饰', mode: 'multiple', maxSelections: 2, options: [
          option('headphones', '耳机', 'stylish over-ear headphones'),
          option('glasses', '眼镜', 'clean thin-frame glasses'),
          option('necklace', '项链', 'small refined necklace'),
          option('star-hairclip', '星星发卡', 'small star-shaped hair clip'),
          option('cat-ears', '猫耳发饰', 'cat-ear headband accessory', { reliability: 'experimental' }),
          option('sheathed-sword', '佩剑', 'sheathed sword visible behind the shoulder', { reliability: 'experimental' }),
        ],
      },
    ],
  },
  {
    id: 'composition',
    name: '构图与动作',
    eyebrow: 'Composition',
    groups: [
      {
        id: 'framing', label: '头像构图', mode: 'single', maxSelections: 1, options: [
          option('headshot', '近景头像', 'close-up head-and-shoulders portrait'),
          option('bust', '胸像', 'balanced bust portrait'),
          option('half-body', '半身像', 'upper-body portrait with hands visible', { reliability: 'experimental' }),
        ],
      },
      {
        id: 'pose', label: '视角姿态', mode: 'single', maxSelections: 1, options: [
          option('front-facing', '正面', 'front-facing pose'),
          option('three-quarter', '四分之三侧面', 'three-quarter view'),
          option('side-profile', '侧脸', 'clean side-profile view'),
          option('looking-up', '微微抬头', 'slightly looking upward'),
        ],
      },
      {
        id: 'action', label: '表情动作', mode: 'single', maxSelections: 1, options: [
          option('gentle-smile', '自然微笑', 'gentle natural smile'),
          option('peace-sign', '比耶', 'small peace-sign gesture kept away from the face', { reliability: 'experimental' }),
          option('holding-book', '手持书本', 'holding a closed book near the chest', { reliability: 'experimental' }),
          option('casting-magic', '施展魔法', 'subtle magic-casting gesture with controlled light effects', { reliability: 'experimental' }),
        ],
      },
    ],
  },
  {
    id: 'scene',
    name: '场景与光线',
    eyebrow: 'Scene',
    groups: [
      {
        id: 'setting', label: '背景场景', mode: 'single', maxSelections: 1, options: [
          option('plain-light', '纯色浅背景', 'clean light plain background'),
          option('campus', '校园', 'softly simplified campus background'),
          option('library', '图书馆', 'quiet library background with shallow depth of field'),
          option('seaside', '海边', 'calm seaside background'),
          option('fantasy-forest', '幻想森林', 'restrained fantasy forest background'),
          option('neon-city', '霓虹街道', 'controlled neon city background', { reliability: 'experimental' }),
        ],
      },
      {
        id: 'lighting', label: '光线', mode: 'single', maxSelections: 1, options: [
          option('soft-daylight', '柔和日光', 'soft natural daylight'),
          option('studio-soft', '柔光棚拍', 'clean soft studio lighting'),
          option('sunset-light', '日落暖光', 'warm sunset lighting'),
          option('cinematic-light', '电影光影', 'controlled cinematic portrait lighting'),
          option('neon-light', '霓虹光', 'neon key light and rim light', { reliability: 'experimental', conflicts: ['baseStyle.ink-wash'] }),
        ],
      },
    ],
  },
  {
    id: 'mood',
    name: '情绪与色调',
    eyebrow: 'Mood',
    groups: [
      {
        id: 'emotion', label: '情绪', mode: 'single', maxSelections: 1, options: [
          option('cheerful', '元气', 'cheerful energetic expression'),
          option('gentle', '温柔', 'gentle relaxed expression'),
          option('calm', '清冷', 'calm reserved expression'),
          option('confident', '自信', 'quietly confident expression'),
          option('melancholic', '忧郁', 'subtle melancholic expression'),
        ],
      },
      {
        id: 'palette', label: '整体色调', mode: 'single', maxSelections: 1, options: [
          option('warm-palette', '暖色', 'harmonious warm color palette'),
          option('cool-palette', '冷色', 'harmonious cool color palette'),
          option('pastel-palette', '粉彩', 'soft pastel color palette'),
          option('monochrome-palette', '单色系', 'restrained monochromatic palette'),
        ],
      },
    ],
  },
  {
    id: 'format',
    name: '头像适配',
    eyebrow: 'Avatar format',
    groups: [
      {
        id: 'crop', label: '裁切安全区', mode: 'single', maxSelections: 1, options: [
          option('square-safe', '方形头像', 'square-avatar safe composition with centered face'),
          option('circle-safe', '圆形头像', 'circle-crop safe composition with clear margins'),
        ],
      },
    ],
  },
];

export const flattenedGroups = catalog.flatMap((section) => section.groups);

const groupMap = new Map(flattenedGroups.map((group) => [group.id, group]));

export function getGroup(groupId) {
  return groupMap.get(groupId) || null;
}

export function getOption(groupId, optionIdOrLegacyLabel) {
  const group = getGroup(groupId);
  if (!group || typeof optionIdOrLegacyLabel !== 'string') return null;
  const value = optionIdOrLegacyLabel.trim();
  return group.options.find((entry) => entry.id === value || entry.label === value) || null;
}

export const promptPhraseDefaults = {
  positive: [
    'premium social media avatar',
    'centered readable face',
    'clean coherent anatomy',
    'polished portrait rendering',
  ],
  negative: [
    'low quality',
    'blurry',
    'bad anatomy',
    'asymmetrical eyes',
    'cropped head',
    'watermark',
    'signature',
    'text',
    'logo',
  ],
};

// Kept temporarily for compatibility with the legacy prompt compiler.
export const promptPhrases = Object.fromEntries(flattenedGroups.map((group) => [
  group.id,
  Object.fromEntries(group.options.flatMap((entry) => [[entry.id, entry.prompt], [entry.label, entry.prompt]])),
]));

export const examples = [
  {
    label: '樱下新生',
    description: '清新的校园头像',
    prompt: '一位刚入学的元气少女，抱着书站在樱花树下，春日下午的风吹起发梢。',
    selection: {
      baseStyle: ['anime-clean'],
      detail: ['soft-shadows'],
      hairStyle: ['high-ponytail'],
      persona: ['campus-student'],
      clothing: ['school-uniform'],
      framing: ['bust'],
      setting: ['campus'],
      lighting: ['soft-daylight'],
      emotion: ['cheerful'],
      crop: ['circle-safe'],
    },
  },
  {
    label: '霓虹驾驶员',
    description: '克制的未来感头像',
    prompt: '雨夜霓虹街头的年轻机甲驾驶员，神情冷静，镜头有轻微电影感。',
    selection: {
      baseStyle: ['cyberpunk'],
      detail: ['crisp-detail', 'neon-accents'],
      hairColor: ['silver-hair'],
      persona: ['mecha-pilot'],
      clothing: ['combat-suit'],
      framing: ['bust'],
      setting: ['neon-city'],
      lighting: ['neon-light'],
      emotion: ['calm'],
      palette: ['cool-palette'],
    },
  },
  {
    label: '海风侧影',
    description: '温柔自然的社交头像',
    prompt: '海边落日中的年轻人，自然回头看向镜头，衣角被海风轻轻吹起。',
    selection: {
      baseStyle: ['semi-realistic'],
      detail: ['soft-shadows', 'pastel-finish'],
      hairStyle: ['short-wolf'],
      clothing: ['casual'],
      framing: ['headshot'],
      pose: ['three-quarter'],
      setting: ['seaside'],
      lighting: ['sunset-light'],
      emotion: ['gentle'],
      crop: ['square-safe'],
    },
  },
];
