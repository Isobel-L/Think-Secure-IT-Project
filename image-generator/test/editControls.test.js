import assert from 'node:assert/strict';
import test from 'node:test';
import {
  EditControlError,
  colorSwatches,
  compileEditInstruction,
  editCategories,
} from '../shared/editControls.js';

const cases = [
  ['hairstyle', { editOption: 'long-wavy' }],
  ['clothing', { editTarget: 'outfit', editOption: 'formal' }],
  ['expression', { editOption: 'gentle-smile' }],
  ['background', { editOption: 'clean-studio' }],
  ['lighting', { editOption: 'warm-light' }],
  ['style', { editOption: 'watercolor' }],
  ['replace', { editTarget: '胸针', prompt: '替换为小巧的星形胸针' }],
  ['custom', { prompt: '只把刘海稍微变短' }],
];

test('publishes all approved edit categories and curated colors', () => {
  assert.deepEqual(editCategories.map((category) => category.id), [
    'color', 'hairstyle', 'clothing', 'expression', 'background', 'lighting', 'style', 'replace', 'custom',
  ]);
  assert.ok(colorSwatches.length >= 10);
  assert.ok(colorSwatches.every((swatch) => /^#[0-9A-F]{6}$/.test(swatch.hex)));
});

for (const [category, input] of cases) {
  test(`compiles the ${category} category into a preservation-aware instruction`, () => {
    const result = compileEditInstruction({ editCategory: category, ...input });
    assert.equal(result.controls.category, category);
    assert.match(result.prompt, /Preserve|保持/);
    assert.ok(result.prompt.length < 1400);
  });
}

test('binds color edits to an explicit object and curated swatch', () => {
  const result = compileEditInstruction({
    editCategory: 'color',
    editTarget: 'hair',
    editOption: 'coral',
  });
  assert.match(result.prompt, /hair color/i);
  assert.match(result.prompt, /#FF6B6B/);
  assert.deepEqual(result.controls, {
    category: 'color',
    target: 'hair',
    option: 'coral',
    colorHex: '#FF6B6B',
  });
});

test('accepts normalized custom HEX and rejects missing targets or invalid HEX', () => {
  const custom = compileEditInstruction({ editCategory: 'color', editTarget: 'clothing', colorHex: '#12abEF' });
  assert.equal(custom.controls.colorHex, '#12ABEF');
  assert.throws(
    () => compileEditInstruction({ editCategory: 'color', colorHex: '#112233' }),
    (error) => error instanceof EditControlError && error.code === 'EDIT_CONTROL_INVALID',
  );
  assert.throws(
    () => compileEditInstruction({ editCategory: 'color', editTarget: 'hair', colorHex: '#1234' }),
    EditControlError,
  );
});

test('treats a legacy prompt-only request as a custom edit', () => {
  const result = compileEditInstruction({ prompt: '把背景改成浅灰色' });
  assert.equal(result.controls.category, 'custom');
  assert.match(result.prompt, /把背景改成浅灰色/);
});
