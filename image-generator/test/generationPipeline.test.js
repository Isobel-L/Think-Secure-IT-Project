import assert from 'node:assert/strict';
import test from 'node:test';
import * as pipeline from '../server/generationPipeline.js';

test('uses Qwen translation before invoking only the FLUX.1 generator', async () => {
  assert.equal(typeof pipeline.generateWithFlux1Pipeline, 'function');
  const calls = [];
  const result = await pipeline.generateWithFlux1Pipeline({
    brief: '少年在咖啡馆写代码',
    avoid: '女性',
    selections: {},
    checkpointName: 'flux1-schnell-fp8.safetensors',
    promptMode: 'flux1-qwen',
    deps: {
      translate: async () => ({
        brief: 'A teenage boy writes code in a cafe.',
        avoid: 'female',
        translatedPrompt: 'A teenage boy writes code in a cafe.',
        translationUsed: true,
        translationFallback: false,
        translator: 'qwen_3_4b.safetensors',
      }),
      generateFlux1: async (input) => {
        calls.push(input);
        return { provider: 'comfyui', model: 'flux1-schnell-fp8.safetensors', image: 'data:image/png;base64,eA==' };
      },
    },
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].checkpointName, 'flux1-schnell-fp8.safetensors');
  assert.match(calls[0].prompt.split('\n')[0], /A teenage boy writes code in a cafe/);
  assert.equal(result.model, 'flux1-schnell-fp8.safetensors');
  assert.equal(result.translationUsed, true);
  assert.equal(result.translationFallback, false);
  assert.equal(result.translator, 'qwen_3_4b.safetensors');
  assert.equal(result.sourceBrief, '少年在咖啡馆写代码');
});

test('raw mode bypasses Qwen but still invokes FLUX.1', async () => {
  let translated = false;
  let generatedPrompt = '';
  const result = await pipeline.generateWithFlux1Pipeline({
    brief: '少年在咖啡馆写代码',
    selections: {},
    promptMode: 'flux1-raw',
    deps: {
      translate: async () => { translated = true; },
      generateFlux1: async ({ prompt }) => {
        generatedPrompt = prompt;
        return { provider: 'comfyui', model: 'flux1-schnell-fp8.safetensors', image: 'data:image/png;base64,eA==' };
      },
    },
  });

  assert.equal(translated, false);
  assert.match(generatedPrompt.split('\n')[0], /少年在咖啡馆写代码/);
  assert.equal(result.translationUsed, false);
  assert.equal(result.translationFallback, false);
  assert.equal(result.promptMode, 'flux1-raw');
});

test('normalizes unsupported modes to the configured FLUX.1 Qwen mode', () => {
  assert.equal(pipeline.normalizePromptMode('flux1-raw'), 'flux1-raw');
  assert.equal(pipeline.normalizePromptMode('flux1-qwen'), 'flux1-qwen');
  assert.equal(pipeline.normalizePromptMode('flux2'), 'flux1-qwen');
  assert.equal(pipeline.normalizePromptMode('', { COMFY_PROMPT_MODE: 'flux1-raw' }), 'flux1-raw');
});
