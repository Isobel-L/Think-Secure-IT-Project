import assert from 'node:assert/strict';
import test from 'node:test';
import * as comfyModel from '../server/comfyModel.js';
import {
  buildComfyWorkflow,
  normalizeCheckpointName,
  resolveComfyCheckpoint,
} from '../server/comfyModel.js';

test('normalizes checkpoint request values without accepting non-strings', () => {
  assert.equal(normalizeCheckpointName(' portrait.safetensors '), 'portrait.safetensors');
  assert.equal(normalizeCheckpointName({ name: 'bad' }), '');
});

test('uses an explicitly requested available checkpoint', async () => {
  const result = await resolveComfyCheckpoint({
    requestedCheckpoint: 'portrait.safetensors',
    config: { checkpointName: 'default.safetensors' },
    availableCheckpoints: ['default.safetensors', 'portrait.safetensors'],
  });

  assert.equal(result.checkpoint, 'portrait.safetensors');
  assert.equal(result.usedFallback, false);
});

test('falls back to the first checkpoint when the configured default is missing', async () => {
  const result = await resolveComfyCheckpoint({
    config: { checkpointName: 'missing.safetensors' },
    availableCheckpoints: ['available.safetensors'],
  });

  assert.equal(result.checkpoint, 'available.safetensors');
  assert.equal(result.usedFallback, true);
});

test('rejects an explicitly requested missing checkpoint', async () => {
  await assert.rejects(
    resolveComfyCheckpoint({
      requestedCheckpoint: 'missing.safetensors',
      config: { checkpointName: 'default.safetensors' },
      availableCheckpoints: ['default.safetensors'],
    }),
    /not available/i,
  );
});

test('builds the workflow with the resolved checkpoint', () => {
  const workflow = buildComfyWorkflow({
    prompt: 'portrait',
    negativePrompt: '',
    config: {
      checkpointName: 'portrait.safetensors',
      width: 512,
      height: 512,
      steps: 4,
      cfg: 1,
      samplerName: 'euler',
      scheduler: 'simple',
      seed: 1,
    },
  });

  assert.equal(workflow['1'].inputs.ckpt_name, 'portrait.safetensors');
});

test('does not expose a FLUX.2 generation dispatcher from the FLUX.1 model module', () => {
  assert.equal(comfyModel.getComfyGenerationEngine, undefined);
  assert.equal(comfyModel.generateWithConfiguredComfy, undefined);
});
