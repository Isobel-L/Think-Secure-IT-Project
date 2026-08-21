import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

test('Docker app forwards every FLUX.2 edit setting', (t) => {
  const expected = {
    NODE_ENV: 'development',
    AVATAR_STORAGE_DIR: './data/test-avatars',
    DEV_UNLIMITED_USAGE: 'true',
    ENABLE_TEST_PAYMENTS: 'true',
    COMFYUI_BASE_URL: 'http://host.docker.internal:8188',
    COMFY_GENERATION_ENGINE: 'flux1',
    COMFY_PROMPT_MODE: 'flux1-qwen',
    COMFY_TRANSLATOR_CLIP_NAME: 'probe-translator.safetensors',
    COMFY_TRANSLATOR_CLIP_TYPE: 'flux2',
    COMFY_TRANSLATOR_MAX_LENGTH: '384',
    COMFY_TRANSLATOR_RETRIES: '1',
    COMFY_FLUX2_UNET_NAME: 'probe-unet.safetensors',
    COMFY_FLUX2_CLIP_NAME: 'probe-clip.safetensors',
    COMFY_FLUX2_VAE_NAME: 'probe-vae.safetensors',
    COMFY_FLUX2_STEPS: '7',
    COMFY_FLUX2_CFG: '1.5',
    COMFY_FLUX2_SAMPLER_NAME: 'probe-sampler',
    COMFY_FLUX2_SCHEDULER: 'probe-scheduler',
    COMFY_FLUX2_SEED: '42',
    COMFY_FLUX2_MASK_FEATHER: '12',
    COMFY_EDIT_MAX_UPLOAD_MB: '9',
  };
  const result = spawnSync('docker', ['compose', 'config', '--format', 'json'], {
    cwd: process.cwd(),
    encoding: 'utf8',
    env: { ...process.env, ...expected },
  });

  if (result.error?.code === 'ENOENT') {
    t.skip('Docker Compose is not installed.');
    return;
  }
  assert.equal(result.status, 0, result.stderr);
  const environment = JSON.parse(result.stdout).services.app.environment;
  for (const [key, value] of Object.entries(expected)) {
    assert.equal(environment[key], value, `${key} must be forwarded to the app container`);
  }
  assert.ok(
    JSON.parse(result.stdout).services.app.volumes.some((volume) => volume.type === 'bind' && volume.target === '/app/data'),
    'the app container must persist avatar images through /app/data',
  );
});
