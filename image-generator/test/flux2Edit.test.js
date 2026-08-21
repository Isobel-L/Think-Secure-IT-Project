import assert from 'node:assert/strict';
import test from 'node:test';
import * as flux2 from '../server/flux2Edit.js';
import {
  buildFlux2EditWorkflow,
  editWithFlux2,
  getFlux2EditConfig,
  getFlux2EditHealth,
  inspectFlux2Dependencies,
} from '../server/flux2Edit.js';

const config = {
  baseUrl: 'http://127.0.0.1:8188', unetName: 'flux-2-klein-4b-fp8.safetensors',
  clipName: 'qwen_3_4b.safetensors', vaeName: 'flux2-vae.safetensors',
  steps: 4, cfg: 1, samplerName: 'euler', scheduler: 'simple', seed: 7,
  pollIntervalMs: 1, maxPollAttempts: 2, timeoutMs: 1000,
};

function createFlux2ObjectInfo() {
  const objectInfo = {
    UNETLoader: { input: { required: { unet_name: [['flux-2-klein-4b-fp8.safetensors']] } } },
    CLIPLoader: { input: { required: { clip_name: [['qwen_3_4b.safetensors']], type: [['flux2']] } } },
    VAELoader: { input: { required: { vae_name: [['flux2-vae.safetensors']] } } },
  };
  for (const name of ['LoadImage', 'LoadImageMask', 'VAEEncode', 'ReferenceLatent', 'SetLatentNoiseMask', 'CLIPTextEncode', 'EmptyFlux2LatentImage', 'KSampler', 'VAEDecode', 'SaveImage']) objectInfo[name] = {};
  return objectInfo;
}

test('uses stable FLUX.2 Klein defaults and clamps values', () => {
  const value = getFlux2EditConfig({ COMFY_FLUX2_STEPS: '99999', COMFY_FLUX2_CFG: '-2' });
  assert.equal(value.unetName, 'flux-2-klein-4b-fp8.safetensors');
  assert.equal(value.steps, 80);
  assert.equal(value.cfg, 0);
  const minimum = getFlux2EditConfig({ COMFY_FLUX2_STEPS: '0', COMFY_FLUX2_CFG: '0', COMFY_FLUX2_SEED: '-1' });
  assert.equal(minimum.steps, 1);
  assert.equal(minimum.cfg, 0);
  assert.equal(minimum.seed, -1);
});

test('requires exact model files, flux2 CLIP type, and core nodes', () => {
  const objectInfo = createFlux2ObjectInfo();
  assert.equal(inspectFlux2Dependencies(objectInfo, config).ok, true);
  delete objectInfo.ReferenceLatent;
  assert.deepEqual(inspectFlux2Dependencies(objectInfo, config).missingNodes, ['ReferenceLatent']);
});

test('builds a core-only FLUX.2 reference edit graph', () => {
  const workflow = buildFlux2EditWorkflow({ prompt: 'change the coat to red', imageName: 'tmall_edits/source.png', width: 768, height: 1024, config });
  assert.deepEqual(workflow['1'].inputs, { unet_name: config.unetName, weight_dtype: 'default' });
  assert.deepEqual(workflow['2'].inputs, { clip_name: config.clipName, type: 'flux2', device: 'default' });
  assert.equal(workflow['4'].inputs.image, 'tmall_edits/source.png');
  assert.deepEqual(workflow['7'].inputs.latent, ['5', 0]);
  assert.deepEqual(workflow['10'].inputs.positive, ['7', 0]);
  assert.deepEqual(workflow['10'].inputs.latent_image, ['9', 0]);
  assert.equal(workflow['9'].class_type, 'EmptyFlux2LatentImage');
  assert.equal(Object.values(workflow).some((node) => node.class_type === 'TextEncodeFlux2ImageEdit'), false);
});

test('loads a submitted mask and constrains FLUX.2 sampling to its selected region', () => {
  const workflow = buildFlux2EditWorkflow({
    prompt: 'remove the selected object and fill the background',
    imageName: 'tmall_edits/source.png',
    maskName: 'tmall_edits/mask.png',
    width: 1024,
    height: 1024,
    config,
  });

  assert.deepEqual(workflow['13'], {
    class_type: 'LoadImageMask',
    inputs: { image: 'tmall_edits/mask.png', channel: 'red' },
  });
  assert.deepEqual(workflow['14'], {
    class_type: 'SetLatentNoiseMask',
    inputs: { samples: ['5', 0], mask: ['13', 0] },
  });
  assert.deepEqual(workflow['10'].inputs.latent_image, ['14', 0]);
});

test('keeps FLUX.2 scoped to source-image editing', () => {
  assert.equal(flux2.buildFlux2GenerationWorkflow, undefined);
  assert.equal(flux2.generateWithFlux2, undefined);
});

test('uploads, runs, returns metadata, and invokes the cleanup hook', async () => {
  let cleaned = false;
  let uploadSignal;
  let runSignal;
  const signal = new AbortController().signal;
  const result = await editWithFlux2({
    source: Buffer.from('source'), prompt: 'red coat', width: 512, height: 512, config, signal,
    deps: {
      upload: async (_config, options) => {
        uploadSignal = options.signal;
        return { imageName: 'tmall_edits/source.png' };
      },
      run: async (_config, workflow, options) => {
        runSignal = options.signal;
        return { bytes: Buffer.from('output'), promptId: 'prompt-1', image: { filename: 'edit.png' }, workflow };
      },
      cleanup: async () => { cleaned = true; },
    },
  });
  assert.equal(result.bytes.toString(), 'output');
  assert.equal(result.model, config.unetName);
  assert.equal(result.comfy.promptId, 'prompt-1');
  assert.equal(uploadSignal, signal);
  assert.equal(runSignal, signal);
  assert.equal(cleaned, true);
});

test('uploads the normalized mask and includes it in the executed FLUX.2 workflow', async () => {
  const uploads = [];
  const cleaned = [];
  let executedWorkflow;
  await editWithFlux2({
    source: Buffer.from('source'),
    mask: Buffer.from('mask'),
    prompt: 'remove selected object',
    width: 512,
    height: 512,
    config,
    deps: {
      upload: async (_config, options) => {
        uploads.push(options);
        return { imageName: `tmall_edits/${options.filename}` };
      },
      run: async (_config, workflow) => {
        executedWorkflow = workflow;
        return { bytes: Buffer.from('output'), promptId: 'masked-1', image: { filename: 'masked.png' } };
      },
      cleanup: async (_config, uploaded) => { cleaned.push(uploaded.imageName); },
    },
  });

  assert.equal(uploads.length, 2);
  assert.match(uploads[0].filename, /^source-.*\.png$/);
  assert.match(uploads[1].filename, /^mask-.*\.png$/);
  assert.equal(uploads[1].buffer.toString(), 'mask');
  assert.equal(executedWorkflow['13'].inputs.image, `tmall_edits/${uploads[1].filename}`);
  assert.deepEqual(executedWorkflow['10'].inputs.latent_image, ['14', 0]);
  assert.equal(cleaned.length, 2);
});

test('rejects invalid FLUX.2 dimensions before upload', async () => {
  const invalidDimensions = [[0, 512], [512, 0], [512.5, 512], [Infinity, 512], [513, 512], [512, 2064]];
  for (const [width, height] of invalidDimensions) {
    let uploaded = false;
    await assert.rejects(
      editWithFlux2({
        source: Buffer.from('source'), prompt: 'red coat', width, height, config,
        deps: { upload: async () => { uploaded = true; } },
      }),
      (error) => error.code === 'FLUX2_EDIT_INVALID_DIMENSIONS'
        && error.status === 400
        && error.message === 'FLUX.2 edit dimensions must be positive integers, multiples of 16, and no larger than 2048 pixels.',
    );
    assert.equal(uploaded, false);
  }
});

test('tolerates synchronous no-op and throwing cleanup hooks', async () => {
  for (const cleanup of [() => undefined, () => { throw new Error('cleanup failed'); }]) {
    const result = await editWithFlux2({
      source: Buffer.from('source'), prompt: 'red coat', width: 512, height: 512, config,
      deps: {
        upload: async () => ({ imageName: 'tmall_edits/source.png' }),
        run: async () => ({ bytes: Buffer.from('output'), promptId: 'prompt-1', image: { filename: 'edit.png' } }),
        cleanup,
      },
    });
    assert.equal(result.bytes.toString(), 'output');
  }
});

test('reports healthy exact FLUX.2 dependencies', async () => {
  const paths = [];
  const health = await getFlux2EditHealth(config, {
    requestJson: async (_config, pathname) => {
      paths.push(pathname);
      return pathname === '/object_info' ? createFlux2ObjectInfo() : {};
    },
  });
  assert.equal(health.ok, true);
  assert.equal(health.error, null);
  assert.equal(health.unetFound, true);
  assert.equal(health.clipFound, true);
  assert.equal(health.vaeFound, true);
  assert.equal(health.flux2TypeFound, true);
  assert.deepEqual(health.missingNodes, []);
  assert.deepEqual(paths, ['/system_stats', '/object_info']);
});

test('reports FLUX.2 health transport failures', async () => {
  const health = await getFlux2EditHealth(config, {
    requestJson: async () => { throw new Error('ComfyUI offline'); },
  });
  assert.deepEqual(health, {
    ok: false,
    endpoint: config.baseUrl,
    unet: config.unetName,
    clip: config.clipName,
    vae: config.vaeName,
    missingNodes: [],
    error: 'ComfyUI offline',
  });
});
