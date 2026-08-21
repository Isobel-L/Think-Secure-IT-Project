const MAX_LABELS = 12;
const MAX_LABEL_LENGTH = 20;
const MAX_BRIEF_LENGTH = 120;

// Local fallback pool for when OpenAI is unavailable, so the button always produces something.
export const fallbackBriefs = [
  'A silver-haired boy leaning on a rooftop railing, his coat lifted by the night wind, city lights blurring into bokeh behind him.',
  'A girl with a bun holding a mug of hot cocoa, fine snow drifting past the window, her expression soft and content.',
  'A young man in round glasses in the corner of an old bookshop, a finger resting on the page, afternoon sun on his shoulder.',
  'A short-haired girl glancing back from her bicycle, a country lane full of sunflowers behind her.',
  'A boy in an oversized hoodie listening to music with his eyes closed, neon signage reflected across his cheek.',
  'A long-haired student under a clear umbrella outside a convenience store, fine rain falling, warm light pooling on the wet pavement.',
  'An elf-like girl wearing a flower crown, a butterfly resting on her fingertip, morning light scattered through the forest.',
  'A young pilot in a flight jacket holding an orange cat on the apron, sunset turning the clouds gold.',
  'A girl in twin tails looking back in an art studio, a smear of blue paint on her cheek, smiling brightly.',
  'A boy in a white shirt looking out from the rocks by the sea, wind in his shirt, waves breaking white at his feet.',
];

const topicHints = [
  'a quiet everyday moment', 'a chance meeting while travelling', 'an energetic action', 'a gentle moment alone',
  'a lightly fantastical scene', 'a city night scene', 'a portrait in natural light', 'a scene with a strong sense of season',
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
  const labelLine = labels.length ? `Selected style tags: ${labels.join(', ')}.` : 'No style constraints.';
  return [
    {
      role: 'system',
      content: 'You are the copywriter for Tmall AI Avatar Studio. Write one English sentence describing an avatar for an image model. Output only the description: a single sentence of 20 to 40 words covering the character, their expression or action, and the mood of the scene. No quotation marks, no prefix or suffix, no explanation, no line breaks. It must be suitable for all ages.',
    },
    {
      role: 'user',
      content: `${labelLine} Direction: ${topicHint}. Give one specific avatar description that matches the mood of those tags.`,
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
