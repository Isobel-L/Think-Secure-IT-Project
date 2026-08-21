import assert from 'node:assert/strict';
import test from 'node:test';
import { catalog, examples, flattenedGroups, getOption } from '../shared/catalog.js';
import { normalizeSelectionState, resolveSelectionToggle } from '../shared/selectionRules.js';

test('catalog exposes stable option objects without fake runtime or IP choices', () => {
  assert.ok(catalog.length >= 5);
  assert.ok(flattenedGroups.every((group) => ['single', 'multiple'].includes(group.mode)));
  const options = flattenedGroups.flatMap((group) => group.options);
  assert.ok(options.every((option) => option.id && option.label && option.prompt));
  assert.ok(options.every((option) => ['stable', 'experimental'].includes(option.reliability)));
  assert.ok(options.every((option) => option.modelSupport.includes('flux1-schnell')));
  const publicText = JSON.stringify(catalog);
  assert.doesNotMatch(publicText, /20\s*steps|CFG\s*=|Genshin|Naruto|One Piece|Demon Slayer/i);
  assert.ok(examples.every((example) => Object.values(example.selection).flat().every((value) => /^[a-z0-9-]+$/.test(value))));
});

test('resolves stable IDs and unambiguous legacy labels', () => {
  assert.equal(getOption('baseStyle', 'anime-clean')?.label, 'Clean anime');
  assert.equal(getOption('baseStyle', 'Clean anime')?.id, 'anime-clean');
  assert.equal(getOption('baseStyle', 'no-such-option'), null);
});

test('single-choice groups replace the previous selection', () => {
  const first = resolveSelectionToggle({}, 'baseStyle', 'anime-clean');
  const second = resolveSelectionToggle(first.selections, 'baseStyle', 'semi-realistic');
  assert.deepEqual(second.selections.baseStyle, ['semi-realistic']);
  assert.deepEqual(second.removed, [{ groupId: 'baseStyle', optionId: 'anime-clean' }]);
  assert.match(second.notice, /Replaced/);
});

test('accessories retain only the two most recently selected options', () => {
  let state = {};
  for (const optionId of ['headphones', 'glasses', 'necklace']) {
    state = resolveSelectionToggle(state, 'accessories', optionId).selections;
  }
  assert.deepEqual(state.accessories, ['glasses', 'necklace']);
});

test('declared cross-group conflicts use latest-click-wins behavior', () => {
  const withHanfu = resolveSelectionToggle({}, 'clothing', 'hanfu').selections;
  const result = resolveSelectionToggle(withHanfu, 'persona', 'mecha-pilot');
  assert.deepEqual(result.selections.persona, ['mecha-pilot']);
  assert.equal(result.selections.clothing, undefined);
  assert.deepEqual(result.removed, [{ groupId: 'clothing', optionId: 'hanfu' }]);
});

test('normalizes legacy payloads and reports unsupported values', () => {
  const result = normalizeSelectionState({
    baseStyle: ['Clean anime'],
    accessories: ['headphones', 'no-such-option'],
    unknownGroup: ['anything'],
  }, 'flux1-schnell');
  assert.deepEqual(result.selections, {
    baseStyle: ['anime-clean'],
    accessories: ['headphones'],
  });
  assert.equal(result.errors.length, 2);
});

test('resolver preserves catalog invariants over 1,000 deterministic toggles', () => {
  const operations = flattenedGroups.flatMap((group) => group.options.map((option) => [group.id, option.id]));
  let selections = {};
  for (let index = 0; index < 1000; index += 1) {
    const [groupId, optionId] = operations[(index * 37) % operations.length];
    selections = resolveSelectionToggle(selections, groupId, optionId).selections;
    for (const group of flattenedGroups) {
      const selected = selections[group.id] || [];
      assert.ok(selected.length <= group.maxSelections);
      assert.ok(selected.every((id) => getOption(group.id, id)?.modelSupport.includes('flux1-schnell')));
    }
    const selectedKeys = Object.entries(selections).flatMap(([groupId, ids]) => ids.map((id) => `${groupId}.${id}`));
    for (const key of selectedKeys) {
      const [groupId, optionId] = key.split('.');
      const conflicts = getOption(groupId, optionId).conflicts || [];
      assert.equal(conflicts.some((conflict) => selectedKeys.includes(conflict)), false);
    }
  }
});
