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
    name: 'Style & texture',
    eyebrow: 'Style',
    groups: [
      {
        id: 'baseStyle', label: 'Base style', mode: 'single', maxSelections: 1, options: [
          option('anime-clean', 'Clean anime', 'clean anime portrait, refined cel shading'),
          option('semi-realistic', 'Semi-realistic paint', 'painterly semi-realistic portrait, natural facial detail'),
          option('ink-wash', 'Ink wash', 'delicate ink wash portrait, restrained watercolor texture', { conflicts: ['lighting.neon-light'] }),
          option('cyberpunk', 'Cyberpunk', 'cyberpunk character portrait, controlled futuristic details'),
          option('clean-line', 'Minimal line art', 'clean line-art portrait, minimal refined rendering'),
        ],
      },
      {
        id: 'detail', label: 'Detail & texture', mode: 'multiple', maxSelections: 2, options: [
          option('crisp-detail', 'Crisp detail', 'crisp facial details and clean hair strands'),
          option('soft-shadows', 'Soft shadows', 'soft natural shadows and smooth tonal transitions'),
          option('pastel-finish', 'Muted pastel', 'restrained pastel color treatment', { conflicts: ['detail.neon-accents'] }),
          option('neon-accents', 'Neon accents', 'controlled neon rim-light accents', { reliability: 'experimental', conflicts: ['detail.pastel-finish'] }),
        ],
      },
    ],
  },
  {
    id: 'character',
    name: 'Character setup',
    eyebrow: 'Character',
    groups: [
      {
        id: 'hairStyle', label: 'Hair style', mode: 'single', maxSelections: 1, options: [
          option('long-wavy', 'Long wavy', 'long softly wavy hair'),
          option('short-wolf', 'Wolf cut', 'short wolf-cut hairstyle'),
          option('high-ponytail', 'High ponytail', 'high ponytail hairstyle'),
          option('twin-tail', 'Twin tails', 'balanced twin-tail hairstyle'),
        ],
      },
      {
        id: 'hairColor', label: 'Hair color', mode: 'single', maxSelections: 1, options: [
          option('natural-dark', 'Natural dark', 'natural dark hair color'),
          option('pink-hair', 'Pink', 'soft pink hair color'),
          option('blue-hair', 'Blue', 'cool blue hair color'),
          option('silver-hair', 'Silver', 'silver hair color'),
        ],
      },
      {
        id: 'features', label: 'Facial features', mode: 'multiple', maxSelections: 2, options: [
          option('expressive-eyes', 'Bright eyes', 'bright expressive eyes'),
          option('heterochromia', 'Heterochromia', 'subtle heterochromia', { reliability: 'experimental' }),
          option('freckles', 'Freckles', 'light natural freckles'),
          option('soft-blush', 'Soft blush', 'subtle cheek blush'),
        ],
      },
      {
        id: 'persona', label: 'Persona', mode: 'single', maxSelections: 1, options: [
          option('campus-student', 'Campus student', 'youthful campus student character'),
          option('fantasy-mage', 'Fantasy mage', 'elegant fantasy mage character'),
          option('mecha-pilot', 'Mecha pilot', 'confident futuristic mecha pilot', { conflicts: ['clothing.hanfu'] }),
        ],
      },
    ],
  },
  {
    id: 'wardrobe',
    name: 'Wardrobe & accessories',
    eyebrow: 'Wardrobe',
    groups: [
      {
        id: 'clothing', label: 'Clothing', mode: 'single', maxSelections: 1, options: [
          option('school-uniform', 'School uniform', 'neat school uniform'),
          option('hanfu', 'Hanfu', 'elegant layered hanfu clothing', { conflicts: ['persona.mecha-pilot'] }),
          option('casual', 'Everyday casual', 'clean contemporary casual outfit'),
          option('sportswear', 'Sportswear', 'simple athletic sportswear'),
          option('fantasy-robe', 'Fantasy robe', 'refined fantasy robe'),
          option('combat-suit', 'Combat suit', 'streamlined futuristic combat suit'),
        ],
      },
      {
        id: 'accessories', label: 'Accessories', mode: 'multiple', maxSelections: 2, options: [
          option('headphones', 'Headphones', 'stylish over-ear headphones'),
          option('glasses', 'Glasses', 'clean thin-frame glasses'),
          option('necklace', 'Necklace', 'small refined necklace'),
          option('star-hairclip', 'Star hairclip', 'small star-shaped hair clip'),
          option('cat-ears', 'Cat-ear headband', 'cat-ear headband accessory', { reliability: 'experimental' }),
          option('sheathed-sword', 'Sheathed sword', 'sheathed sword visible behind the shoulder', { reliability: 'experimental' }),
        ],
      },
    ],
  },
  {
    id: 'composition',
    name: 'Composition & pose',
    eyebrow: 'Composition',
    groups: [
      {
        id: 'framing', label: 'Framing', mode: 'single', maxSelections: 1, options: [
          option('headshot', 'Close-up', 'close-up head-and-shoulders portrait'),
          option('bust', 'Bust', 'balanced bust portrait'),
          option('half-body', 'Half body', 'upper-body portrait with hands visible', { reliability: 'experimental' }),
        ],
      },
      {
        id: 'pose', label: 'Pose & angle', mode: 'single', maxSelections: 1, options: [
          option('front-facing', 'Front facing', 'front-facing pose'),
          option('three-quarter', 'Three-quarter', 'three-quarter view'),
          option('side-profile', 'Side profile', 'clean side-profile view'),
          option('looking-up', 'Looking up', 'slightly looking upward'),
        ],
      },
      {
        id: 'action', label: 'Expression & gesture', mode: 'single', maxSelections: 1, options: [
          option('gentle-smile', 'Gentle smile', 'gentle natural smile'),
          option('peace-sign', 'Peace sign', 'small peace-sign gesture kept away from the face', { reliability: 'experimental' }),
          option('holding-book', 'Holding a book', 'holding a closed book near the chest', { reliability: 'experimental' }),
          option('casting-magic', 'Casting magic', 'subtle magic-casting gesture with controlled light effects', { reliability: 'experimental' }),
        ],
      },
    ],
  },
  {
    id: 'scene',
    name: 'Scene & lighting',
    eyebrow: 'Scene',
    groups: [
      {
        id: 'setting', label: 'Setting', mode: 'single', maxSelections: 1, options: [
          option('plain-light', 'Plain light', 'clean light plain background'),
          option('campus', 'Campus', 'softly simplified campus background'),
          option('library', 'Library', 'quiet library background with shallow depth of field'),
          option('seaside', 'Seaside', 'calm seaside background'),
          option('fantasy-forest', 'Fantasy forest', 'restrained fantasy forest background'),
          option('neon-city', 'Neon city', 'controlled neon city background', { reliability: 'experimental' }),
        ],
      },
      {
        id: 'lighting', label: 'Lighting', mode: 'single', maxSelections: 1, options: [
          option('soft-daylight', 'Soft daylight', 'soft natural daylight'),
          option('studio-soft', 'Soft studio', 'clean soft studio lighting'),
          option('sunset-light', 'Sunset glow', 'warm sunset lighting'),
          option('cinematic-light', 'Cinematic', 'controlled cinematic portrait lighting'),
          option('neon-light', 'Neon light', 'neon key light and rim light', { reliability: 'experimental', conflicts: ['baseStyle.ink-wash'] }),
        ],
      },
    ],
  },
  {
    id: 'mood',
    name: 'Mood & palette',
    eyebrow: 'Mood',
    groups: [
      {
        id: 'emotion', label: 'Emotion', mode: 'single', maxSelections: 1, options: [
          option('cheerful', 'Cheerful', 'cheerful energetic expression'),
          option('gentle', 'Gentle', 'gentle relaxed expression'),
          option('calm', 'Calm', 'calm reserved expression'),
          option('confident', 'Confident', 'quietly confident expression'),
          option('melancholic', 'Melancholic', 'subtle melancholic expression'),
        ],
      },
      {
        id: 'palette', label: 'Palette', mode: 'single', maxSelections: 1, options: [
          option('warm-palette', 'Warm', 'harmonious warm color palette'),
          option('cool-palette', 'Cool', 'harmonious cool color palette'),
          option('pastel-palette', 'Pastel', 'soft pastel color palette'),
          option('monochrome-palette', 'Monochrome', 'restrained monochromatic palette'),
        ],
      },
    ],
  },
  {
    id: 'format',
    name: 'Avatar format',
    eyebrow: 'Format',
    groups: [
      {
        id: 'crop', label: 'Crop safe area', mode: 'single', maxSelections: 1, options: [
          option('square-safe', 'Square avatar', 'square-avatar safe composition with centered face'),
          option('circle-safe', 'Circle avatar', 'circle-crop safe composition with clear margins'),
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
    label: 'Cherry blossom freshman',
    description: 'A fresh campus avatar',
    prompt: 'A cheerful first-year student holding her books under a cherry blossom tree, hair lifted by the spring afternoon breeze.',
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
    label: 'Neon pilot',
    description: 'A restrained futuristic avatar',
    prompt: 'A young mecha pilot on a neon-lit street on a rainy night, calm expression, a subtle cinematic feel.',
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
    label: 'Sea breeze',
    description: 'A soft, natural social avatar',
    prompt: 'A young person at sunset by the sea, glancing back at the camera, clothes stirred by the ocean breeze.',
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
