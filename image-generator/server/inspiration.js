const MAX_LABELS = 12;
const MAX_LABEL_LENGTH = 20;
const MAX_BRIEF_LENGTH = 120;

// Local fallback pool for when OpenAI is unavailable, so the button always produces something.
export const fallbackBriefs = [
  '一位银发少年靠在天台栏杆上，风衣被夜风吹起，城市灯光在身后模糊成光斑。',
  '扎着丸子头的女孩捧着一杯热可可，窗外飘着细雪，眼神温柔又满足。',
  '戴圆框眼镜的青年坐在旧书店角落，指尖停在书页上，午后阳光落在肩头。',
  '一位短发少女骑在自行车上回头微笑，身后是开满向日葵的乡间小路。',
  '穿着宽大卫衣的男孩戴着耳机闭眼听歌，霓虹灯牌的光映在他的侧脸上。',
  '长发女生撑着透明雨伞站在便利店门口，雨丝细密，路面倒映着暖黄灯光。',
  '一位精灵般的少女头戴花环，蝴蝶停在她指尖，森林里洒下点点晨光。',
  '穿飞行员夹克的青年抱着一只橘猫，站在停机坪上，夕阳把云染成金色。',
  '梳着双马尾的少女在画室里回眸，颊边沾着一点蓝色颜料，笑得明亮。',
  '一位白衬衫少年在海边礁石上远眺，海风撩起衣角，浪花在脚下碎成白色。',
];

const topicHints = [
  '一个安静的日常瞬间', '一次旅途中的偶遇', '一个充满活力的动作', '一段温柔的独处时光',
  '一个略带奇幻色彩的场景', '一个都市夜晚的画面', '一个自然光线下的侧写', '一个季节感强烈的场景',
];

export function sanitizeInspirationLabels(input) {
  if (!Array.isArray(input)) return [];
  const seen = new Set();
  const labels = [];
  for (const value of input) {
    const label = typeof value === 'string' ? value.trim().slice(0, MAX_LABEL_LENGTH) : '';
    if (!label || seen.has(label)) continue;
    seen.add(label);
    labels.push(label);
    if (labels.length >= MAX_LABELS) break;
  }
  return labels;
}

export function buildInspirationMessages(labels, topicHint) {
  const labelLine = labels.length ? `已选风格标签：${labels.join('、')}。` : '风格不限。';
  return [
    {
      role: 'system',
      content: '你是天猫 AI 头像馆的创意文案，为用户随机生成一句用于 AI 头像生成的中文描述。只输出描述本身：一句话、30 到 60 字，包含人物特征、神态或动作、场景氛围。不要引号、不要前后缀、不要解释、不要换行。描述必须适合全年龄用户。',
    },
    {
      role: 'user',
      content: `${labelLine}灵感方向：${topicHint}。请给出一句与标签气质相符、细节具体的头像描述。`,
    },
  ];
}

export function normalizeInspirationBrief(value) {
  const brief = String(value || '')
    .replace(/\s+/g, ' ')
    .replace(/^["'“”‘’`\s]+|["'“”‘’`\s]+$/g, '')
    .trim();
  if (!brief) return '';
  return brief.slice(0, MAX_BRIEF_LENGTH);
}

export function pickFallbackBrief(random = Math.random) {
  return fallbackBriefs[Math.floor(random() * fallbackBriefs.length)] || fallbackBriefs[0];
}

export function getInspirationModel(env = process.env) {
  return env.OPENAI_TEXT_MODEL || 'gpt-4.1-mini';
}

export async function generateInspirationBrief({ labels = [], client, model, random = Math.random }) {
  if (client) {
    try {
      const topicHint = topicHints[Math.floor(random() * topicHints.length)];
      const completion = await client.chat.completions.create({
        model,
        messages: buildInspirationMessages(labels, topicHint),
        max_completion_tokens: 2048,
      });
      const brief = normalizeInspirationBrief(completion?.choices?.[0]?.message?.content);
      if (brief) return { brief, source: 'openai' };
    } catch (error) {
      console.error('[inspiration]', error?.message || error);
    }
  }
  return { brief: pickFallbackBrief(random), source: 'fallback' };
}
