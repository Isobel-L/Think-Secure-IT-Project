import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ParameterSelectionError,
  buildPromptBundle,
  defaultNegativePrompt,
  normalizeSelections,
} from '../server/prompt.js';

test('compiles a concise FLUX.1 prompt in stable catalog order', () => {
  const bundle = buildPromptBundle({
    brief: '一位在海边回头的年轻人',
    selections: {
      lighting: ['sunset-light'],
      baseStyle: ['anime-clean'],
      framing: ['bust'],
    },
    modelId: 'flux1-schnell',
  });
  assert.ok(bundle.prompt.indexOf('clean anime portrait') < bundle.prompt.indexOf('balanced bust portrait'));
  assert.ok(bundle.prompt.indexOf('balanced bust portrait') < bundle.prompt.indexOf('warm sunset lighting'));
  assert.ok(bundle.prompt.length < 1800);
  assert.deepEqual(bundle.normalizedSelections.baseStyle, ['anime-clean']);
});

test('migrates unambiguous legacy labels to stable IDs', () => {
  assert.deepEqual(normalizeSelections({ baseStyle: ['清爽动漫'] }, { strict: true }), {
    baseStyle: ['anime-clean'],
  });
});

test('always applies fixed avatar quality requirements', () => {
  const bundle = buildPromptBundle({ brief: '简洁头像', selections: {} });
  assert.match(bundle.prompt, /requested subject/i);
  assert.match(bundle.prompt, /square avatar/i);
  assert.match(bundle.prompt, /face.*visible/i);
  assert.match(defaultNegativePrompt, /watermark/i);
  assert.match(defaultNegativePrompt, /text/i);
});

test('keeps a scene brief as the highest-priority instruction without forcing a headshot', () => {
  const brief = 'a teenage programmer sitting at a cafe table and coding on a laptop';
  const bundle = buildPromptBundle({ brief, selections: {} });

  assert.equal(bundle.prompt.split('\n')[0], `PRIMARY INSTRUCTION: ${brief}`);
  assert.match(bundle.prompt, /preserve every requested subject, action, object, setting, count, and relationship/i);
  assert.match(bundle.prompt, /wide enough to show every requested action and object/i);
  assert.doesNotMatch(bundle.prompt, /head-and-shoulders|restrained background/i);
});

test('does not expose fake sampling settings through creative prompts', () => {
  const bundle = buildPromptBundle({ brief: '赛博头像', selections: { detail: ['crisp-detail'] } });
  assert.doesNotMatch(bundle.prompt, /20\s*steps|20\s*步|CFG\s*=|sampler|scheduler/i);
});

test('strict normalization rejects unknown groups and option IDs', () => {
  assert.throws(
    () => normalizeSelections({ baseStyle: ['not-real'], fake: ['x'] }, { strict: true }),
    (error) => {
      assert.ok(error instanceof ParameterSelectionError);
      assert.equal(error.status, 400);
      assert.equal(error.code, 'PARAMETER_SELECTION_INVALID');
      assert.equal(error.details.length, 2);
      return true;
    },
  );
});

test('compiler resolves conflicts before creating model text', () => {
  const bundle = buildPromptBundle({
    brief: '未来驾驶员',
    selections: { clothing: ['hanfu'], persona: ['mecha-pilot'] },
  });
  assert.equal(bundle.normalizedSelections.clothing, undefined);
  assert.deepEqual(bundle.normalizedSelections.persona, ['mecha-pilot']);
  assert.doesNotMatch(bundle.prompt, /hanfu/i);
});
