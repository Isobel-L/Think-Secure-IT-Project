import assert from 'node:assert/strict';
import test from 'node:test';
import { pickShowcaseAvatars } from '../src/heroShowcase.js';

const emptySlots = { main: null, back: null, front: null };

test('returns empty showcase slots for empty or non-array input', () => {
  assert.deepEqual(pickShowcaseAvatars(), emptySlots);
  assert.deepEqual(pickShowcaseAvatars([]), emptySlots);
  assert.deepEqual(pickShowcaseAvatars(null), emptySlots);
  assert.deepEqual(pickShowcaseAvatars({ image: 'not-an-array' }), emptySlots);
});

test('maps one avatar only to the main slot', () => {
  assert.deepEqual(pickShowcaseAvatars([{ image: 'newest-original', thumb: 'newest-thumb' }]), {
    main: 'newest-thumb',
    back: null,
    front: null,
  });
});

test('maps two avatars from the main slot to the back slot', () => {
  assert.deepEqual(pickShowcaseAvatars([{ image: 'newest' }, { image: 'older' }]), {
    main: 'newest',
    back: 'older',
    front: null,
  });
});

test('maps the three newest avatars from the largest disc to the smallest disc', () => {
  assert.deepEqual(pickShowcaseAvatars([
    { image: 'newest-original', thumb: 'newest-thumb' },
    { image: 'middle' },
    { image: 'oldest-original', thumb: 'oldest-thumb' },
    { image: 'ignored' },
  ]), {
    main: 'newest-thumb',
    back: 'middle',
    front: 'oldest-thumb',
  });
});

test('leaves a slot empty when its history item has no image', () => {
  assert.deepEqual(pickShowcaseAvatars([
    { image: 'newest' },
    { id: 'missing-image' },
    { image: 'third' },
  ]), {
    main: 'newest',
    back: null,
    front: 'third',
  });
});
