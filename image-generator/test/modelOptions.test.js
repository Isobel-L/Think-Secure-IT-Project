import assert from 'node:assert/strict';
import test from 'node:test';
import * as modelOptions from '../src/modelOptions.js';

test('selects the server-recommended available FLUX.1 prompt mode', () => {
  assert.equal(typeof modelOptions.normalizePromptModes, 'function');
  const result = modelOptions.normalizePromptModes({
    translatorReady: true,
    selectedPromptMode: 'flux1-qwen',
    promptModes: [
      { id: 'flux1-qwen', label: 'FLUX.1 中文增强（推荐）', available: true },
      { id: 'flux1-raw', label: 'FLUX.1 raw prompt', available: true },
    ],
  });
  assert.equal(result.selected, 'flux1-qwen');
  assert.equal(result.modes.length, 2);
});

test('falls back to raw FLUX.1 prompts when Qwen is unavailable', () => {
  const result = modelOptions.normalizePromptModes({
    translatorReady: false,
    selectedPromptMode: 'flux1-qwen',
    promptModes: [
      { id: 'flux1-qwen', label: 'Prompt translation', available: false },
      { id: 'flux1-raw', label: 'Raw prompt', available: true },
    ],
  });
  assert.equal(result.selected, 'flux1-raw');
  assert.equal(result.modes.find((mode) => mode.id === 'flux1-qwen').available, false);
});

test('ignores unknown mode IDs and supplies stable FLUX.1 defaults', () => {
  const result = modelOptions.normalizePromptModes({
    promptModes: [{ id: 'flux2', label: 'not allowed', available: true }],
  });
  assert.deepEqual(result, {
    modes: [
      { id: 'flux1-qwen', label: 'FLUX.1 with prompt translation (recommended)', available: false },
      { id: 'flux1-raw', label: 'FLUX.1 raw prompt', available: true },
    ],
    selected: 'flux1-raw',
  });
});
