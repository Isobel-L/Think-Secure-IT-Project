import assert from 'node:assert/strict';
import test from 'node:test';
import {
  computeSimulatedProgress,
  estimateExpectedMs,
  progressStageLabel,
} from '../src/progressModel.js';

test('simulated progress starts at zero, rises monotonically, and never reaches its cap', () => {
  const options = { expectedMs: 40_000, cap: 0.96 };
  const samples = [0, 2_000, 10_000, 40_000, 120_000, Number.POSITIVE_INFINITY]
    .map((elapsedMs) => computeSimulatedProgress(elapsedMs, options));

  assert.equal(samples[0], 0);
  for (let index = 1; index < samples.length; index += 1) {
    assert.ok(samples[index] >= samples[index - 1]);
  }
  assert.ok(samples[3] >= 0.55 && samples[3] <= 0.75);
  assert.ok(samples.every((value) => value < options.cap));
});

test('estimates OpenAI quality tiers and provides sensible backend defaults', () => {
  const low = estimateExpectedMs({ backend: 'openai', quality: 'low', operation: 'generate' });
  const medium = estimateExpectedMs({ backend: 'openai', quality: 'medium', operation: 'generate' });
  const high = estimateExpectedMs({ backend: 'openai', quality: 'high', operation: 'generate' });

  assert.ok(high > medium && medium > low);
  assert.equal(estimateExpectedMs({ backend: 'comfyui', operation: 'generate' }), 15_000);
  assert.equal(estimateExpectedMs({ backend: 'local-sd1.5', operation: 'generate' }), 20_000);
  assert.equal(estimateExpectedMs({ backend: 'unknown', operation: 'generate' }), 40_000);
  assert.equal(estimateExpectedMs({ backend: 'openai', operation: 'edit' }), 45_000);
  assert.equal(estimateExpectedMs({ backend: 'comfyui', operation: 'remove' }), 45_000);
});

test('returns generation stage labels at every threshold boundary', () => {
  assert.equal(progressStageLabel(0, 'generate'), '正在理解你的描述…');
  assert.equal(progressStageLabel(0.149, 'generate'), '正在理解你的描述…');
  assert.equal(progressStageLabel(0.15, 'generate'), '正在构图…');
  assert.equal(progressStageLabel(0.4, 'generate'), '正在绘制细节…');
  assert.equal(progressStageLabel(0.7, 'generate'), '正在优化面部与光影…');
  assert.equal(progressStageLabel(0.9, 'generate'), '即将完成，正在高清渲染…');
});

test('uses a distinct set of stage labels for edits and removals', () => {
  assert.equal(progressStageLabel(0, 'edit'), '正在分析原图…');
  assert.equal(progressStageLabel(0.2, 'edit'), '正在重绘选区…');
  assert.equal(progressStageLabel(0.6, 'edit'), '正在融合边缘…');
  assert.equal(progressStageLabel(0.9, 'edit'), '即将完成…');
  assert.equal(progressStageLabel(0.5, 'remove'), '正在重绘选区…');
  assert.notEqual(progressStageLabel(0.5, 'edit'), progressStageLabel(0.5, 'generate'));
});

test('multi-candidate generation extends the expected duration', () => {
  const single = estimateExpectedMs({ backend: 'openai', quality: 'medium', operation: 'generate', count: 1 });
  const batch = estimateExpectedMs({ backend: 'openai', quality: 'medium', operation: 'generate', count: 4 });
  assert.equal(batch, single * 1.5);
  assert.equal(estimateExpectedMs({ backend: 'openai', operation: 'edit', count: 4 }), 45_000);
});
