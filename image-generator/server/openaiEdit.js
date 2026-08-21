import OpenAI, { toFile } from 'openai';
import sharp from 'sharp';

const integer = (value, min, max, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Math.min(max, Math.max(min, Number.isFinite(parsed) ? parsed : fallback));
};

export function getOpenAIEditConfig(env = process.env) {
  return {
    provider: 'openai',
    model: env.OPENAI_IMAGE_MODEL || 'gpt-image-2',
    apiKeyConfigured: Boolean(env.OPENAI_API_KEY),
    // Shared fields editRouter relies on, kept aligned with getFlux2EditConfig.
    maskFeather: integer(env.OPENAI_EDIT_MASK_FEATHER, 0, 64, 8),
    maxUploadMb: integer(env.OPENAI_EDIT_MAX_UPLOAD_MB, 1, 25, 10),
  };
}

export async function getOpenAIEditHealth(config = getOpenAIEditConfig()) {
  if (!config.apiKeyConfigured) {
    return {
      ok: false,
      provider: 'openai',
      model: config.model,
      code: 'API_KEY_MISSING',
      error: 'OPENAI_API_KEY is not configured on the server, so retouching is unavailable.',
    };
  }
  return { ok: true, provider: 'openai', model: config.model };
}

export function buildOpenAIEditPrompt(instruction) {
  return [
    '请基于输入图片进行编辑，输出一张新的图片。',
    '只修改用户明确要求修改的部分；没有被提到的主体特征、构图和画风尽量保持不变。',
    `用户本次修改要求：${instruction}`,
  ].join('\n\n');
}

// Convert the editor mask (white/bright = selected) into an OpenAI inpaint mask:
// alpha 0 where the user selected, meaning repaint, and alpha 255 everywhere that stays.
export async function maskToOpenAIInpaintMask(maskPng, { width, height }) {
  const painted = await sharp(maskPng)
    .resize(width, height, { fit: 'fill', kernel: sharp.kernel.nearest })
    .greyscale()
    .raw()
    .toBuffer();

  const rgba = Buffer.alloc(width * height * 4);
  for (let pixel = 0; pixel < width * height; pixel += 1) {
    rgba[(pixel * 4) + 3] = painted[pixel] > 0 ? 0 : 255;
  }
  return sharp(rgba, { raw: { width, height, channels: 4 } }).png().toBuffer();
}

export async function editWithOpenAI({ source, prompt, mask, operation = 'edit', width, height, signal, config = getOpenAIEditConfig(), deps = {} }) {
  const client = deps.client || new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    ...(process.env.OPENAI_BASE_URL ? { baseURL: process.env.OPENAI_BASE_URL } : {}),
  });

  const isRemoval = operation === 'remove';
  const params = {
    model: config.model,
    image: await toFile(source, 'edit-source.png', { type: 'image/png' }),
    // In remove mode editRouter supplies the prompt, a fixed erase instruction; a normal edit gets
    // wrapped in guidance to change only what was asked for.
    prompt: isRemoval ? prompt : buildOpenAIEditPrompt(prompt),
    size: 'auto',
    output_format: 'png',
    n: 1,
  };

  if (isRemoval && mask && width && height) {
    const inpaintMask = await maskToOpenAIInpaintMask(mask, { width, height });
    params.mask = await toFile(inpaintMask, 'mask.png', { type: 'image/png' });
  }

  const result = await client.images.edit(params, signal ? { signal } : undefined);

  const image = result.data?.[0]?.b64_json;
  if (!image) {
    throw Object.assign(new Error('OpenAI image edit returned no image data.'), { code: 'OPENAI_EDIT_EMPTY' });
  }

  return {
    bytes: Buffer.from(image, 'base64'),
    provider: 'openai',
    model: config.model,
    createdAt: new Date().toISOString(),
  };
}
