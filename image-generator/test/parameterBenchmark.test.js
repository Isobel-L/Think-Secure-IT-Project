import assert from 'node:assert/strict';
import test from 'node:test';
import { classifyBenchmarkScore, createBenchmarkManifest } from '../shared/parameterBenchmark.js';

test('creates a deterministic manifest for both approved model profiles', () => {
  const first = createBenchmarkManifest();
  const second = createBenchmarkManifest();
  assert.deepEqual(first, second);
  assert.deepEqual(first.seeds, [42, 314159, 20260714]);
  assert.deepEqual(first.modelProfiles, ['flux1-schnell', 'flux2-klein-4b']);
  assert.ok(first.generationCases.length >= 40);
  assert.ok(first.editCases.length >= 20);
  assert.ok(first.generationCases.every((item) => item.modelProfileId === 'flux1-schnell'));
  assert.ok(first.editCases.every((item) => item.modelProfileId === 'flux2-klein-4b'));
  assert.ok(first.scoringFields.includes('hardFailure'));
});

test('classifies exact benchmark threshold boundaries', () => {
  assert.equal(classifyBenchmarkScore({ successRate: 80, hardFailureRate: 5 }), 'stable');
  assert.equal(classifyBenchmarkScore({ successRate: 79.99, hardFailureRate: 5 }), 'experimental');
  assert.equal(classifyBenchmarkScore({ successRate: 60, hardFailureRate: 15 }), 'experimental');
  assert.equal(classifyBenchmarkScore({ successRate: 59.99, hardFailureRate: 0 }), 'remove');
  assert.equal(classifyBenchmarkScore({ successRate: 100, hardFailureRate: 15.01 }), 'remove');
});

test('rejects non-percentage benchmark scores', () => {
  assert.throws(() => classifyBenchmarkScore({ successRate: -1, hardFailureRate: 0 }), RangeError);
  assert.throws(() => classifyBenchmarkScore({ successRate: 80, hardFailureRate: 101 }), RangeError);
});
