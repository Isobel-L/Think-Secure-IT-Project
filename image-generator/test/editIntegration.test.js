import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  buildEditFormData,
  canOpenImageEditor,
  findParentGeneration,
  getEditorSource,
  isUnlimitedLocalUsage,
  mergeEditedGeneration,
  readJsonResponse,
  resolveHistoryRefresh,
  shouldUseFlux2Editor,
} from '../src/editIntegration.js';

test('finds the parent generation for direct and wrapped results', () => {
  const parent = { id: 'parent-1', image: '/parent.png' };
  const history = [{ id: 'newer' }, parent, { id: 'older' }];

  assert.equal(findParentGeneration(history, { id: 'edit-1', parentGenerationId: 'parent-1' }), parent);
  assert.equal(findParentGeneration(history, { generation: { id: 'edit-2', parentGenerationId: 'parent-1' } }), parent);
});

test('returns null when a generation has no available parent', () => {
  const history = [{ id: 'parent-1' }];

  assert.equal(findParentGeneration(history, { id: 'original' }), null);
  assert.equal(findParentGeneration(history, { id: 'edit-1', parentGenerationId: 'missing' }), null);
  assert.equal(findParentGeneration(null, { id: 'edit-1', parentGenerationId: 'parent-1' }), null);
});

test('normalizes current and history results into editor sources', () => {
  assert.deepEqual(getEditorSource({ id: 'history-id', image: '/history.png' }), {
    image: '/history.png',
    generationId: 'history-id',
  });
  assert.deepEqual(getEditorSource({ image: '/current.png', generation: { id: 'current-id' } }), {
    image: '/current.png',
    generationId: 'current-id',
  });
  assert.equal(getEditorSource(null), null);
});

test('builds an ID-backed edit form without a source image', () => {
  const form = buildEditFormData({ prompt: 'change the coat', sourceGenerationId: 'generation-id' });

  assert.equal(form.get('prompt'), 'change the coat');
  assert.equal(form.get('sourceGenerationId'), 'generation-id');
  assert.equal(form.has('sourceImage'), false);
  assert.equal(form.has('mask'), false);
});

test('builds an upload-backed edit form with an optional mask', () => {
  const sourceFile = new Blob(['source'], { type: 'image/png' });
  const maskFile = new Blob(['mask'], { type: 'image/png' });
  const form = buildEditFormData({ prompt: 'change the sky', sourceFile, maskFile });

  assert.equal(form.get('prompt'), 'change the sky');
  assert.equal(form.has('sourceGenerationId'), false);
  assert.equal(form.get('sourceImage').size, sourceFile.size);
  assert.equal(form.get('mask').size, maskFile.size);
});

test('adds structured FLUX.2 edit controls to multipart requests', () => {
  const form = buildEditFormData({
    prompt: '颜色稍微柔和一些',
    sourceGenerationId: 'generation-id',
    editCategory: 'color',
    editTarget: 'hair',
    editOption: 'coral',
    colorHex: '#FF6B6B',
  });

  assert.equal(form.get('editCategory'), 'color');
  assert.equal(form.get('editTarget'), 'hair');
  assert.equal(form.get('editOption'), 'coral');
  assert.equal(form.get('colorHex'), '#FF6B6B');
});

test('rejects missing or conflicting edit sources', () => {
  const sourceFile = new Blob(['source'], { type: 'image/png' });

  assert.throws(() => buildEditFormData({ prompt: 'change the sky' }), /exactly one edit source/i);
  assert.throws(
    () => buildEditFormData({ prompt: 'change the sky', sourceGenerationId: 'generation-id', sourceFile }),
    /exactly one edit source/i,
  );
});

test('requires an authenticated user before opening the editor', () => {
  assert.equal(canOpenImageEditor(null), false);
  assert.equal(canOpenImageEditor({ id: 'user-1' }), true);
});

test('recognizes explicit local unlimited billing mode', () => {
  assert.equal(isUnlimitedLocalUsage({ unlimitedUsage: true }), true);
  assert.equal(isUnlimitedLocalUsage({ unlimitedUsage: false }), false);
  assert.equal(isUnlimitedLocalUsage(null), false);
});

test('routes local backend edits through the FLUX.2 editor', () => {
  assert.equal(shouldUseFlux2Editor({ provider: 'comfyui' }), true);
  assert.equal(shouldUseFlux2Editor({ provider: 'local-model' }), true);
  assert.equal(shouldUseFlux2Editor({ provider: 'openai' }), false);
  assert.equal(shouldUseFlux2Editor({ generation: { provider: 'comfyui' } }), true);
});

test('prepends a successful edit without duplicating its history entry', () => {
  const edited = { id: 'edit-1', image: '/edited.png' };
  const history = [
    { id: 'older-1', image: '/older.png' },
    { id: 'edit-1', image: '/stale-edit.png' },
  ];

  assert.deepEqual(mergeEditedGeneration(history, edited), [edited, history[0]]);
  assert.equal(mergeEditedGeneration(history, null), history);
});

test('reads JSON objects and rejects malformed responses with a localized fallback', async () => {
  const payload = { ok: true };

  assert.equal(await readJsonResponse({ json: async () => payload }, '读取失败。'), payload);
  await assert.rejects(
    readJsonResponse({ json: async () => { throw new SyntaxError('invalid JSON'); } }, '服务器响应格式无效。'),
    /服务器响应格式无效/,
  );
  await assert.rejects(
    readJsonResponse({ json: async () => null }, '服务器响应格式无效。'),
    /服务器响应格式无效/,
  );
});

test('prepends a pending edit while the accepted server response is missing it', () => {
  const pendingGeneration = { id: 'edit-2', image: '/fresh-edit.png' };
  const responseItems = [
    { id: 'older-1', image: '/older.png' },
  ];

  assert.equal(resolveHistoryRefresh({
    requestId: 4,
    currentRequestId: 5,
    items: responseItems,
    pendingGeneration,
  }), null);
  assert.deepEqual(resolveHistoryRefresh({
    requestId: 5,
    currentRequestId: 5,
    items: responseItems,
    pendingGeneration,
  }), {
    history: [pendingGeneration, responseItems[0]],
    pendingAcknowledged: false,
  });
});

test('preserves server order and replacement when the pending edit is acknowledged', () => {
  const pendingGeneration = { id: 'edit-2', image: '/optimistic.png' };
  const responseItems = [
    { id: 'newer-3', image: '/newer.png' },
    { id: 'edit-2', image: '/server-edit.png' },
    { id: 'older-1', image: '/older.png' },
  ];

  assert.deepEqual(resolveHistoryRefresh({
    requestId: 6,
    currentRequestId: 6,
    items: responseItems,
    pendingGeneration,
  }), {
    history: responseItems,
    pendingAcknowledged: true,
  });
});

test('keeps later server ordering after the pending edit has been cleared', () => {
  const responseItems = [
    { id: 'newest-4', image: '/newest.png' },
    { id: 'newer-3', image: '/newer.png' },
    { id: 'edit-2', image: '/server-edit.png' },
  ];

  assert.deepEqual(resolveHistoryRefresh({
    requestId: 7,
    currentRequestId: 7,
    items: responseItems,
    pendingGeneration: null,
  }), {
    history: responseItems,
    pendingAcknowledged: false,
  });
});

test('keeps zoom overflow on the viewport without clamping the canvas wrapper', async () => {
  const styles = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');

  assert.doesNotMatch(styles, /\.editor-canvas-wrap\s*\{[^}]*max-width\s*:/);
  assert.match(styles, /\.editor-canvas-viewport\s*\{[^}]*overflow:\s*auto/);
});
