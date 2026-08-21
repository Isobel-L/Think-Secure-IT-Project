import assert from 'node:assert/strict';
import test from 'node:test';
import {
  FLUX2_EDIT_PROFILE,
  GENERATION_PROFILE,
  getModelProfile,
} from '../shared/modelProfiles.js';

test('publishes immutable approved FLUX runtime profiles', () => {
  assert.deepEqual(GENERATION_PROFILE.runtime, {
    width: 1024,
    height: 1024,
    steps: 4,
    cfg: 1,
    samplerName: 'euler',
    scheduler: 'simple',
    denoise: 1,
  });
  assert.deepEqual(FLUX2_EDIT_PROFILE.runtime, {
    steps: 4,
    cfg: 1,
    samplerName: 'euler',
    scheduler: 'simple',
    denoise: 1,
    maskFeather: 8,
  });
  assert.equal(Object.isFrozen(GENERATION_PROFILE), true);
  assert.equal(Object.isFrozen(GENERATION_PROFILE.runtime), true);
  assert.equal(Object.isFrozen(FLUX2_EDIT_PROFILE), true);
  assert.equal(getModelProfile('flux1-schnell'), GENERATION_PROFILE);
  assert.equal(getModelProfile('flux2-klein-4b'), FLUX2_EDIT_PROFILE);
  assert.equal(getModelProfile('unknown'), null);
});
