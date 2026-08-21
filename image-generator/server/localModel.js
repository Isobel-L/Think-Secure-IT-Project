const localOptionIds = {
  baseStyle: {
    '日系萌系': 'style_japanese_moe',
    '古风仙侠': 'style_xianxia',
    '赛博科幻': 'style_cyber_scifi',
    '机甲硬核': 'style_mecha_hardcore',
    '水墨淡彩': 'style_ink_wash',
    '校园清新': 'style_fresh_campus',
    '热血战斗': 'style_hot_blooded',
    '清冷治愈': 'style_cold_healing',
    '厚涂写实': 'style_painterly_realistic',
    '线稿简约': 'style_line_art',
  },
  ipStyle: {
    '原神风': 'ip_genshin',
    '火影忍者画风': 'ip_naruto',
    '鬼灭之刃质感': 'ip_demon_slayer',
    '海贼王手绘风': 'ip_one_piece',
    '罗小黑战记治愈风': 'ip_luo_xiaohei',
  },
  detail: {
    '4K 高清': 'texture_4k',
    '发丝清晰': 'texture_clear_hair',
    '阴影柔和': 'texture_soft_shadow',
    '锐化聚焦': 'texture_sharp_focus',
    '低饱和': 'texture_low_saturation',
    '马卡龙色调': 'texture_macaron',
    '霓虹光效': 'texture_neon',
  },
  hair: {
    '双马尾': 'hair_twin_tails',
    '高马尾': 'hair_high_ponytail',
    '短发狼尾': 'hair_wolf_cut',
    '长卷发': 'hair_long_curly',
    '呆毛': 'hair_ahoge',
    '粉毛': 'hair_pink',
    '蓝毛': 'hair_blue',
    '银发': 'hair_silver',
    '渐变发色': 'hair_gradient',
  },
  features: {
    '大眼睛': 'face_big_eyes',
    '异瞳': 'face_heterochromia',
    '浅杏眼': 'face_almond_eyes',
    '微笑唇': 'face_smiling_lips',
    '脸红娇羞': 'face_blushing',
    '清冷眼眸': 'face_cool_eyes',
    '元气桃眉': 'face_lively_brows',
  },
  face: {
    '雀斑': 'detail_freckles',
    '泪痣': 'detail_tear_mole',
    '猫耳': 'detail_cat_ears',
    '狐耳': 'detail_fox_ears',
    '兽耳': 'detail_fox_ears',
    '恶魔角': 'detail_devil_horns',
    '口罩遮脸': 'detail_face_mask',
    '圆框眼镜': 'detail_round_glasses',
    '方框眼镜': 'detail_square_glasses',
  },
  persona: {
    'JK 制服女生': 'identity_jk_girl',
    '校草风男生': 'identity_campus_boy',
    '社团达人': 'identity_anime_club',
    '动漫社成员': 'identity_anime_club',
    '汉服社成员': 'identity_hanfu_club',
    '学霸': 'identity_top_student',
    '篮球运动系': 'identity_basketball',
    '足球运动系': 'identity_football',
  },
  archetype: {
    '傲娇': 'persona_tsundere',
    '天然呆': 'persona_airhead',
    '病娇': 'persona_yandere',
    '中二': 'persona_chuunibyou',
    '温柔学长': 'persona_gentle_senior',
    '元气少女': 'persona_genki_girl',
    '清冷御姐': 'persona_cool_sister',
    '腹黑少年': 'persona_black_belly_boy',
  },
  special: {
    '情侣头像（双人互动）': 'setting_couple',
    '闺蜜头像（同款不同色）': 'setting_best_friends',
    '兄弟羁绊风': 'setting_brotherhood',
  },
  clothing: {
    'JK 制服': 'clothing_jk',
    '水手服': 'clothing_sailor',
    '汉服': 'clothing_hanfu',
    'Lolita': 'clothing_lolita',
    '校园西装': 'clothing_campus_suit',
    '运动校服': 'clothing_sports_uniform',
    '工装': 'clothing_workwear',
    '魔法学院服': 'clothing_magic_academy',
    '机甲战衣': 'clothing_mecha_armor',
  },
  accessories: {
    '猫耳发带': 'accessory_cat_ear_headband',
    '星星发卡': 'accessory_star_hairpin',
    '耳机': 'accessory_headphones',
    '项链': 'accessory_necklace',
    '书包': 'accessory_schoolbag',
    '棒球帽': 'accessory_baseball_cap',
    '佩剑': 'accessory_sword',
    '魔法杖': 'accessory_magic_staff',
    '围巾手套': 'accessory_scarf_gloves',
  },
  pose: {
    '正面视角': 'pose_front_view',
    '侧脸': 'pose_side_face',
    '半身像': 'pose_half_body',
    '全身像': 'pose_full_body',
    '坐姿': 'pose_sitting',
    '站姿': 'pose_standing',
    '低头浅笑': 'pose_lower_head_smile',
    '抬头望天': 'pose_looking_up',
  },
  interaction: {
    '比耶': 'action_v_sign',
    '托腮': 'action_chin_rest',
    '挥手': 'action_waving',
    '递情书': 'action_love_letter',
    '背靠背（情侣）': 'action_back_to_back',
    '并肩走': 'action_side_by_side',
    '摸头杀': 'action_head_pat',
    '对视微笑': 'action_smile_at_each_other',
  },
  motion: {
    '吹樱花': 'action_cherry_blossom',
    '戴耳机听歌': 'action_listening_music',
    '翻漫画书': 'action_reading_manga',
    '打篮球': 'action_playing_basketball',
    '施展魔法': 'action_casting_magic',
    '战斗姿势': 'action_battle_pose',
  },
  campusScene: {
    '樱花树下': 'scene_cherry_tree',
    '教室窗边': 'scene_classroom_window',
    '操场跑道': 'scene_track',
    '图书馆': 'scene_library',
    '放学小路': 'scene_after_school_path',
    '天台': 'scene_rooftop',
  },
  fantasyScene: {
    '星空下': 'scene_starry_sky',
    '海边落日': 'scene_seaside_sunset',
    '雨夜公交站': 'scene_rain_bus_stop',
    '异世界森林': 'scene_isekai_forest',
    '赛博朋克街道': 'scene_cyberpunk_street',
    '古风庭院': 'scene_ancient_courtyard',
  },
  background: {
    '纯白背景': 'background_plain_white',
    '纯粉背景': 'background_plain_pink',
    '纯蓝背景': 'background_plain_blue',
    '渐变背景': 'background_gradient',
    '模糊光斑': 'background_bokeh',
    '留白设计': 'background_white_space',
  },
  emotion: {
    '元气满满': 'emotion_energetic',
    '温柔治愈': 'emotion_healing',
    '清冷疏离': 'emotion_cold_distant',
    '傲娇炸毛': 'emotion_tsundere_angry',
    '害羞脸红': 'emotion_shy_blush',
    '热血激昂': 'emotion_hot_blooded',
    '厌世感': 'emotion_world_weary',
  },
  tone: {
    '甜妹感': 'mood_sweet_girl',
    '盐系': 'mood_salt_style',
    '氛围感': 'mood_atmospheric',
    '高级小众': 'mood_niche_premium',
    '甜而不腻': 'mood_not_too_sweet',
    '酷飒拽': 'mood_cool_sassy',
  },
  socialSize: {
    '微信头像': 'social_wechat',
    'QQ 头像': 'social_qq',
    '小红书头像': 'social_xiaohongshu',
    '微博头像': 'social_weibo',
    '正方形裁剪兼容': 'social_square_circle',
    '圆形裁剪兼容': 'social_square_circle',
  },
  specialNeeds: {
    '无水印': 'need_no_watermark',
    '高清无噪点': 'need_clean_hd',
    '不撞款': 'need_unique',
    '小众设计': 'need_niche_design',
    '可商用构图': 'need_commercial',
  },
  sampling: {
    '20 步采样': 'tech_steps_20',
    'CFG=5（黄金组合）': 'tech_cfg_5',
    'Sharp focus（锐化）': 'tech_sharp_focus',
  },
  negative: {
    '五官正常': 'avoid_normal_face',
    '无穿模': 'avoid_no_clipping',
    '发丝不模糊': 'avoid_clear_hair',
    '比例协调': 'avoid_good_proportion',
  },
};

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
  return (value || 'http://127.0.0.1:8000').replace(/\/+$/, '');
}

export function getLocalModelConfig() {
  return {
    baseUrl: normalizeBaseUrl(process.env.LOCAL_MODEL_BASE_URL),
    width: clampInteger(process.env.LOCAL_MODEL_WIDTH, 256, 1024, 512),
    height: clampInteger(process.env.LOCAL_MODEL_HEIGHT, 256, 1024, 512),
    steps: clampInteger(process.env.LOCAL_MODEL_STEPS, 1, 80, 20),
    cfg: clampFloat(process.env.LOCAL_MODEL_CFG, 1, 20, 7.5),
    seed: clampInteger(process.env.LOCAL_MODEL_SEED, -1, 2 ** 32 - 1, -1),
    timeoutMs: clampInteger(process.env.LOCAL_MODEL_TIMEOUT_MS, 5000, 600000, 240000),
  };
}

export function selectionsToLocalOptionIds(selections = {}) {
  const ids = [];

  for (const [groupId, values] of Object.entries(selections)) {
    if (!Array.isArray(values)) continue;
    const groupMap = localOptionIds[groupId];
    if (!groupMap) continue;

    for (const value of values) {
      const id = groupMap[value];
      if (id && !ids.includes(id)) ids.push(id);
    }
  }

  return ids;
}

export function buildLocalModelPayload({ brief, selections, avoid }) {
  const config = getLocalModelConfig();

  return {
    selected_options: selectionsToLocalOptionIds(selections),
    custom_prompt: brief || '',
    negative_prompt: avoid || '',
    generation: {
      width: config.width,
      height: config.height,
      steps: config.steps,
      cfg: config.cfg,
      seed: config.seed,
    },
  };
}

export async function getLocalModelHealth() {
  const config = getLocalModelConfig();
  const response = await fetch(`${config.baseUrl}/api/health`, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(Math.min(config.timeoutMs, 15000)),
  });

  if (!response.ok) {
    throw new Error(`Local model health check failed with HTTP ${response.status}.`);
  }

  return response.json();
}

export async function generateWithLocalModel({ brief, selections, avoid }) {
  const config = getLocalModelConfig();
  const payload = buildLocalModelPayload({ brief, selections, avoid });
  const response = await fetch(`${config.baseUrl}/api/generate`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(config.timeoutMs),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Local model generation failed with HTTP ${response.status}.`);
  }

  if (!data.image_url) {
    throw new Error('本地模型服务没有返回 image_url。');
  }

  const imageUrl = data.image_url.startsWith('http')
    ? data.image_url
    : `${config.baseUrl}${data.image_url.startsWith('/') ? '' : '/'}${data.image_url}`;

  return {
    image: imageUrl,
    prompt: data.prompt || '',
    negativePrompt: data.negative_prompt || '',
    model: 'local-sd1.5',
    provider: 'local-model',
    createdAt: new Date().toISOString(),
    localModel: {
      endpoint: config.baseUrl,
      request: payload,
      response: data,
      imageUrl,
    },
  };
}
