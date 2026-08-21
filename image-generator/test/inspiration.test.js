import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildInspirationMessages,
  fallbackBriefs,
  generateInspirationBrief,
  getInspirationModel,
  normalizeInspirationBrief,
  pickFallbackBrief,
  sanitizeInspirationLabels,
} from '../server/inspiration.js';
import { normalizeSelectionState, randomSelections, selectionLabels } from '../shared/selectionRules.js';

test('sanitizes inspiration labels to short unique strings', () => {
  assert.deepEqual(sanitizeInspirationLabels(null), []);
  assert.deepEqual(sanitizeInspirationLabels(['  清爽动漫 ', '清爽动漫', 42, '']), ['清爽动漫']);
  const flood = Array.from({ length: 30 }, (_, index) => `标签${index}`);
  assert.equal(sanitizeInspirationLabels(flood).length, 12);
  assert.equal(sanitizeInspirationLabels(['x'.repeat(50)])[0].length, 20);
});

test('builds chat messages that carry the selected labels', () => {
  const messages = buildInspirationMessages(['清爽动漫', '高马尾'], '一个都市夜晚的画面');
  assert.equal(messages.length, 2);
  assert.match(messages[1].content, /清爽动漫、高马尾/);
  assert.match(messages[1].content, /都市夜晚/);
  assert.match(buildInspirationMessages([], 'x')[1].content, /风格不限/);
});

test('normalizes model output into a clean single-line brief', () => {
  assert.equal(normalizeInspirationBrief('“一位少女在海边。”'), '一位少女在海边。');
  assert.equal(normalizeInspirationBrief('  多行\n描述  '), '多行 描述');
  assert.equal(normalizeInspirationBrief(''), '');
  assert.equal(normalizeInspirationBrief('长'.repeat(300)).length, 120);
});

test('falls back to the local pool when OpenAI is missing or fails', async () => {
  const noClient = await generateInspirationBrief({ labels: [], client: null, model: 'x', random: () => 0 });
  assert.equal(noClient.source, 'fallback');
  assert.equal(noClient.brief, fallbackBriefs[0]);

  const failing = { chat: { completions: { create: async () => { throw new Error('boom'); } } } };
  const failed = await generateInspirationBrief({ labels: [], client: failing, model: 'x', random: () => 0.999 });
  assert.equal(failed.source, 'fallback');
  assert.equal(failed.brief, pickFallbackBrief(() => 0.999));
});

test('uses the OpenAI completion when it returns usable text', async () => {
  const client = {
    chat: {
      completions: {
        create: async ({ model, messages }) => {
          assert.equal(model, 'test-model');
          assert.equal(messages.length, 2);
          return { choices: [{ message: { content: '“一位戴耳机的少年走过霓虹街头。”' } }] };
        },
      },
    },
  };
  const result = await generateInspirationBrief({ labels: ['赛博科幻'], client, model: 'test-model' });
  assert.equal(result.source, 'openai');
  assert.equal(result.brief, '一位戴耳机的少年走过霓虹街头。');
});

test('reads the text model from the environment with a sensible default', () => {
  assert.equal(getInspirationModel({}), 'gpt-4.1-mini');
  assert.equal(getInspirationModel({ OPENAI_TEXT_MODEL: 'my-model' }), 'my-model');
});

test('random selections always satisfy the selection rules', () => {
  for (let round = 0; round < 200; round += 1) {
    const { selections } = randomSelections();
    const { errors } = normalizeSelectionState(selections);
    assert.deepEqual(errors, [], `round ${round} produced invalid selections`);
    assert.ok(Object.keys(selections).length >= 1, 'at least one group selected');
    assert.ok(selections.baseStyle?.length === 1, 'baseStyle is always chosen once');
    const labels = selectionLabels(selections);
    assert.ok(labels.length >= 1);
    assert.ok(labels.every((label) => typeof label === 'string' && label.length > 0));
  }
});

test('random selections vary between runs', () => {
  const snapshots = new Set(Array.from({ length: 12 }, () => JSON.stringify(randomSelections().selections)));
  assert.ok(snapshots.size > 1, 'expected different random outcomes');
});
