import assert from 'node:assert/strict';
import test from 'node:test';
import * as translator from '../server/promptTranslator.js';

const config = {
  baseUrl: 'http://127.0.0.1:8188',
  clipName: 'qwen_3_4b.safetensors',
  clipType: 'flux2',
  maxLength: 384,
  retries: 1,
  pollIntervalMs: 1,
  maxPollAttempts: 3,
  timeoutMs: 1000,
};

test('builds a deterministic Qwen text-only translation workflow', () => {
  assert.equal(typeof translator.buildPromptTranslationWorkflow, 'function');
  const workflow = translator.buildPromptTranslationWorkflow({
    brief: '一个少年程序员坐在咖啡馆中写代码',
    avoid: '女性，头巾',
    config,
  });

  assert.deepEqual(workflow['1'].inputs, {
    clip_name: 'qwen_3_4b.safetensors',
    type: 'flux2',
    device: 'default',
  });
  assert.equal(workflow['2'].class_type, 'TextGenerate');
  assert.equal(workflow['2'].inputs.sampling_mode, 'off');
  assert.equal(workflow['2'].inputs.thinking, false);
  assert.match(workflow['2'].inputs.prompt, /one JSON object/i);
  assert.match(workflow['2'].inputs.prompt, /一个少年程序员坐在咖啡馆中写代码/);
  assert.deepEqual(workflow['3'].inputs.source, ['2', 0]);
});

test('extracts and validates a fenced JSON translation from ComfyUI history', () => {
  assert.equal(typeof translator.extractPromptTranslation, 'function');
  const promptId = 'translation-1';
  const history = {
    [promptId]: {
      outputs: {
        '3': {
          text: ['```json\n{"brief":"A teenage programmer writes code in a cafe.","avoid":"female, headscarf"}\n```'],
        },
      },
    },
  };

  assert.deepEqual(translator.extractPromptTranslation(history, promptId), {
    brief: 'A teenage programmer writes code in a cafe.',
    avoid: 'female, headscarf',
  });
});

test('retries one invalid translation and returns the valid Qwen result', async () => {
  assert.equal(typeof translator.translatePromptWithQwen, 'function');
  let queueCount = 0;
  const requestJson = async (_config, pathname) => {
    if (pathname === '/prompt') {
      queueCount += 1;
      return { prompt_id: `translation-${queueCount}`, node_errors: {} };
    }
    if (pathname === '/history/translation-1') {
      return { 'translation-1': { status: { completed: true }, outputs: { '3': { text: ['not json'] } } } };
    }
    if (pathname === '/history/translation-2') {
      return {
        'translation-2': {
          status: { completed: true },
          outputs: { '3': { text: ['{"brief":"A boy codes in a cafe.","avoid":"female"}'] } },
        },
      };
    }
    throw new Error(`Unexpected path: ${pathname}`);
  };

  const result = await translator.translatePromptWithQwen({
    brief: '少年在咖啡馆写代码',
    avoid: '女性',
    config,
    deps: { requestJson, delay: async () => {} },
  });

  assert.equal(queueCount, 2);
  assert.deepEqual(result, {
    brief: 'A boy codes in a cafe.',
    avoid: 'female',
    translatedPrompt: 'A boy codes in a cafe.',
    translationUsed: true,
    translationFallback: false,
    translator: 'qwen_3_4b.safetensors',
  });
});

test('falls back to original text after both translation attempts fail', async () => {
  let attempts = 0;
  const result = await translator.translatePromptWithQwen({
    brief: '少年在咖啡馆写代码',
    avoid: '女性',
    config,
    deps: {
      requestJson: async (_config, pathname) => {
        if (pathname === '/prompt') attempts += 1;
        throw new Error('translator unavailable');
      },
      delay: async () => {},
    },
  });

  assert.equal(attempts, 2);
  assert.deepEqual(result, {
    brief: '少年在咖啡馆写代码',
    avoid: '女性',
    translatedPrompt: '',
    translationUsed: false,
    translationFallback: true,
    translator: 'qwen_3_4b.safetensors',
  });
});

test('reports whether the exact Qwen translator dependencies are ready', async () => {
  assert.equal(typeof translator.getPromptTranslatorHealth, 'function');
  const objectInfo = {
    CLIPLoader: { input: { required: {
      clip_name: [['qwen_3_4b.safetensors']],
      type: [['stable_diffusion', 'flux2']],
    } } },
    TextGenerate: {},
    PreviewAny: {},
  };
  const ready = await translator.getPromptTranslatorHealth(config, {
    requestJson: async (_config, pathname) => pathname === '/object_info' ? objectInfo : {},
  });
  assert.equal(ready.ok, true);
  assert.equal(ready.clipFound, true);
  assert.equal(ready.clipTypeFound, true);

  delete objectInfo.TextGenerate;
  const missing = await translator.getPromptTranslatorHealth(config, {
    requestJson: async (_config, pathname) => pathname === '/object_info' ? objectInfo : {},
  });
  assert.equal(missing.ok, false);
  assert.deepEqual(missing.missingNodes, ['TextGenerate']);
});
