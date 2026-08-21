import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildOpenAIEditPrompt,
  editWithOpenAI,
  getOpenAIEditConfig,
  getOpenAIEditHealth,
} from '../server/openaiEdit.js';

test('getOpenAIEditConfig reads model and clamps limits from the environment', () => {
  const config = getOpenAIEditConfig({
    OPENAI_API_KEY: 'sk-test',
    OPENAI_IMAGE_MODEL: 'gpt-image-1',
    OPENAI_EDIT_MASK_FEATHER: '200',
    OPENAI_EDIT_MAX_UPLOAD_MB: '0',
  });
  assert.equal(config.provider, 'openai');
  assert.equal(config.model, 'gpt-image-1');
  assert.equal(config.apiKeyConfigured, true);
  assert.equal(config.maskFeather, 64);
  assert.equal(config.maxUploadMb, 1);

  const defaults = getOpenAIEditConfig({});
  assert.equal(defaults.model, 'gpt-image-2');
  assert.equal(defaults.apiKeyConfigured, false);
  assert.equal(defaults.maskFeather, 8);
  assert.equal(defaults.maxUploadMb, 10);
});

test('getOpenAIEditHealth reflects API key configuration', async () => {
  const missing = await getOpenAIEditHealth(getOpenAIEditConfig({}));
  assert.equal(missing.ok, false);
  assert.equal(missing.code, 'API_KEY_MISSING');
  assert.match(missing.error, /OPENAI_API_KEY/);

  const ready = await getOpenAIEditHealth(getOpenAIEditConfig({ OPENAI_API_KEY: 'sk-test' }));
  assert.deepEqual(ready, { ok: true, provider: 'openai', model: 'gpt-image-2' });
});

test('editWithOpenAI submits the edit and returns decoded image bytes', async () => {
  const calls = [];
  const pngBytes = Buffer.from('edited-image');
  const client = {
    images: {
      edit: async (params, options) => {
        calls.push({ params, options });
        return { data: [{ b64_json: pngBytes.toString('base64') }] };
      },
    },
  };

  const config = getOpenAIEditConfig({ OPENAI_API_KEY: 'sk-test', OPENAI_IMAGE_MODEL: 'gpt-image-1' });
  const controller = new AbortController();
  const result = await editWithOpenAI({
    source: Buffer.from('source-image'),
    prompt: '把背景换成星空',
    width: 1024,
    height: 1024,
    signal: controller.signal,
    config,
    deps: { client },
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].params.model, 'gpt-image-1');
  assert.equal(calls[0].params.size, 'auto');
  assert.equal(calls[0].params.output_format, 'png');
  assert.equal(calls[0].params.prompt, buildOpenAIEditPrompt('把背景换成星空'));
  assert.match(calls[0].params.prompt, /只修改用户明确要求修改的部分/);
  assert.equal(calls[0].options.signal, controller.signal);

  assert.deepEqual(result.bytes, pngBytes);
  assert.equal(result.provider, 'openai');
  assert.equal(result.model, 'gpt-image-1');
  assert.ok(Date.parse(result.createdAt));
});

test('editWithOpenAI throws a coded error when no image data is returned', async () => {
  const client = { images: { edit: async () => ({ data: [] }) } };
  await assert.rejects(
    () => editWithOpenAI({
      source: Buffer.from('source-image'),
      prompt: 'test',
      config: getOpenAIEditConfig({ OPENAI_API_KEY: 'sk-test' }),
      deps: { client },
    }),
    (error) => error.code === 'OPENAI_EDIT_EMPTY',
  );
});

test('maskToOpenAIInpaintMask makes painted pixels transparent and the rest opaque', async () => {
  const { default: sharp } = await import('sharp');
  const { maskToOpenAIInpaintMask } = await import('../server/openaiEdit.js');

  // Left half white (selected), right half black (kept).
  const raw = Buffer.alloc(4 * 2, 0);
  raw[0] = 255; raw[1] = 255; raw[4] = 255; raw[5] = 255;
  const paintedLeft = await sharp(raw, { raw: { width: 4, height: 2, channels: 1 } })
    .toColourspace('b-w').png().toBuffer();

  const inpaintMask = await maskToOpenAIInpaintMask(paintedLeft, { width: 4, height: 2 });
  const { data, info } = await sharp(inpaintMask).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  assert.equal(info.channels, 4);
  assert.equal(data[3], 0);
  assert.equal(data[7], 0);
  assert.equal(data[11], 255);
  assert.equal(data[15], 255);
});

test('editWithOpenAI attaches an inpaint mask and passes the removal prompt through unchanged', async () => {
  const { default: sharp } = await import('sharp');
  const calls = [];
  const client = {
    images: {
      edit: async (params) => {
        calls.push(params);
        return { data: [{ b64_json: Buffer.from('erased').toString('base64') }] };
      },
    },
  };

  const raw = Buffer.alloc(16 * 16, 0);
  raw.fill(255, 0, 64);
  const mask = await sharp(raw, { raw: { width: 16, height: 16, channels: 1 } })
    .toColourspace('b-w').png().toBuffer();
  const source = await sharp({ create: { width: 16, height: 16, channels: 3, background: { r: 10, g: 20, b: 30 } } })
    .png().toBuffer();

  const removalPrompt = '移除被蒙版选中区域内的内容，使用背景自然填充。';
  const result = await editWithOpenAI({
    source,
    prompt: removalPrompt,
    mask,
    operation: 'remove',
    width: 16,
    height: 16,
    config: getOpenAIEditConfig({ OPENAI_API_KEY: 'sk-test' }),
    deps: { client },
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].prompt, removalPrompt);
  assert.ok(calls[0].mask);
  assert.equal(result.provider, 'openai');
});
