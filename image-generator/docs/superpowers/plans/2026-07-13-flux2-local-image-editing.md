# FLUX.2 Klein Local Image Editing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add authenticated prompt-only and brush-mask image editing backed by the local ComfyUI `flux-2-klein-4b-fp8.safetensors` model, with exact preservation outside the mask, quota accounting, and history persistence.

**Architecture:** A focused image-processing module normalizes uploads and performs deterministic mask compositing, while a separate FLUX.2 adapter validates the three required model files and submits a core-node reference-edit workflow to ComfyUI. An injected Express router owns multipart validation, entitlement reservation, and persistence; React adds a canvas editor without changing the existing text-to-image route.

**Tech Stack:** Node.js 22, Express 5, React 19, Vite 6, Node test runner, Multer, Sharp, Supertest, PostgreSQL, Docker Compose, ComfyUI HTTP API

## Global Constraints

- Do not call OpenAI for FLUX.2 editing and do not require `OPENAI_API_KEY`.
- Use only ComfyUI core nodes; do not depend on `TextEncodeFlux2ImageEdit` or any custom-node package.
- Use `flux-2-klein-4b-fp8.safetensors`, `qwen_3_4b.safetensors`, and `flux2-vae.safetensors` by default.
- Use `steps=4`, `cfg=1`, `sampler=euler`, and `scheduler=simple` by default.
- Accept exactly one source: an owned `sourceGenerationId` or one uploaded `sourceImage`.
- Accept PNG, JPEG, and WebP sources up to 10 MiB; accept a PNG mask up to 4 MiB.
- Preserve normalized original pixels exactly wherever the original binary mask is zero.
- A successful edit consumes one existing generation entitlement and creates one new history record.
- Every failure after reservation releases that reservation.
- Keep `/api/generate`, existing model selection, login, payment, download, and PostgreSQL schema behavior compatible.
- Keep the existing global JSON body limit at 1 MiB; multipart limits belong to the edit router.
- Never run `docker compose down -v`; preserve the existing PostgreSQL named volume.

---

## File Map

**Create**

- `server/imageEdit.js`: decode, validate, normalize, inspect masks, feather inward, and composite.
- `server/comfyClient.js`: shared ComfyUI JSON/buffer requests, workflow queue polling, image upload, and output retrieval.
- `server/flux2Edit.js`: FLUX.2 config, dependency health, core-node workflow, and edit execution.
- `server/editRouter.js`: authenticated multipart endpoint with dependency injection and quota lifecycle.
- `src/components/ImageEditor.jsx`: responsive pointer-based editing canvas and controls.
- `src/imageEditor.js`: pure canvas coordinate and request helpers.
- `test/imageEdit.test.js`, `test/comfyClient.test.js`, `test/flux2Edit.test.js`, `test/editRouter.test.js`, `test/imageEditor.test.js`.

**Modify**

- `server/comfyModel.js`: consume shared ComfyUI transport without changing public generation behavior.
- `server/index.js`: mount edit and FLUX.2 health routes and import the shared stored-image parser from `server/imageEdit.js`.
- `src/App.jsx`: own editor state, submit edits, refresh billing/history, and select sources.
- `src/components/Icons.jsx`: add the small editor tool icons to the existing icon map.
- `src/components/ResultPanel.jsx`: add the edit entry action.
- `src/styles.css`: editor and responsive layout.
- `package.json`, `package-lock.json`: runtime and test dependencies.
- `.env.example`, `README.md`: model settings and operating instructions.

---

### Task 1: Deterministic Image And Mask Processing

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `server/imageEdit.js`
- Create: `test/imageEdit.test.js`

**Interfaces:**
- Produces: `parseDataUrl(value) -> { buffer: Buffer, mimeType: string } | null`
- Produces: `fetchStoredImage(value, fetchImpl?) -> Promise<Buffer>`
- Produces: `normalizeSourceImage(buffer, options?) -> Promise<{ buffer, width, height, mimeType }>`
- Produces: `normalizeMask(buffer, { width, height, featherRadius? }) -> Promise<{ buffer, empty, full }>`
- Produces: `compositeMaskedEdit({ original, edited, mask, width, height }) -> Promise<Buffer>`

- [ ] **Step 1: Install bounded upload and image dependencies**

Run:

```powershell
npm install multer sharp
npm install --save-dev supertest
```

Expected: `package.json` contains `multer` and `sharp` in `dependencies`, `supertest` in `devDependencies`, and the lockfile updates without audit failure blocking installation.

- [ ] **Step 2: Write failing normalization and compositing tests**

Create `test/imageEdit.test.js`:

```js
import assert from 'node:assert/strict';
import test from 'node:test';
import sharp from 'sharp';
import {
  compositeMaskedEdit,
  normalizeMask,
  normalizeSourceImage,
  parseDataUrl,
} from '../server/imageEdit.js';

async function solid(width, height, rgba) {
  return sharp({ create: { width, height, channels: 4, background: rgba } }).png().toBuffer();
}

test('parses base64 data URLs', () => {
  const parsed = parseDataUrl('data:image/png;base64,aGVsbG8=');
  assert.equal(parsed.mimeType, 'image/png');
  assert.equal(parsed.buffer.toString(), 'hello');
});

test('normalizes source orientation, color space, dimensions, and format', async () => {
  const input = await solid(100, 50, { r: 255, g: 0, b: 0, alpha: 1 });
  const result = await normalizeSourceImage(input, { maxEdge: 64, maxPixels: 4096 });
  assert.deepEqual([result.width, result.height], [64, 32]);
  assert.equal(result.mimeType, 'image/png');
  assert.equal((await sharp(result.buffer).metadata()).space, 'srgb');
});

test('detects empty and full masks', async () => {
  const emptyInput = await solid(8, 8, { r: 0, g: 0, b: 0, alpha: 1 });
  const fullInput = await solid(8, 8, { r: 255, g: 255, b: 255, alpha: 1 });
  assert.equal((await normalizeMask(emptyInput, { width: 8, height: 8 })).empty, true);
  assert.equal((await normalizeMask(fullInput, { width: 8, height: 8 })).full, true);
});

test('rejects a non-PNG mask even when it decodes as an image', async () => {
  const jpegMask = await sharp({ create: { width: 8, height: 8, channels: 3, background: '#fff' } }).jpeg().toBuffer();
  await assert.rejects(normalizeMask(jpegMask, { width: 8, height: 8 }), /PNG/);
});

test('uses alpha for a transparent browser-canvas mask', async () => {
  const rgba = Buffer.alloc(8 * 8 * 4);
  rgba[((4 * 8) + 4) * 4 + 3] = 255;
  const canvasMask = await sharp(rgba, { raw: { width: 8, height: 8, channels: 4 } }).png().toBuffer();
  const result = await normalizeMask(canvasMask, { width: 8, height: 8, featherRadius: 0 });
  assert.equal(result.empty, false);
  assert.equal(result.full, false);
});

test('feathers inward without adding alpha outside the binary mask', async () => {
  const raw = Buffer.alloc(32 * 32);
  for (let y = 8; y < 24; y += 1) for (let x = 8; x < 24; x += 1) raw[(y * 32) + x] = 255;
  const input = await sharp(raw, { raw: { width: 32, height: 32, channels: 1 } }).png().toBuffer();
  const result = await normalizeMask(input, { width: 32, height: 32, featherRadius: 4 });
  const alpha = await sharp(result.buffer).greyscale().raw().toBuffer();
  assert.equal(alpha[(7 * 32) + 7], 0);
  assert.ok(alpha[(8 * 32) + 8] > 0 && alpha[(8 * 32) + 8] < 255);
  assert.ok(alpha[(16 * 32) + 16] > alpha[(8 * 32) + 8]);
});

test('keeps every decoded pixel outside the original mask unchanged', async () => {
  const original = await solid(8, 8, { r: 255, g: 0, b: 0, alpha: 1 });
  const edited = await solid(8, 8, { r: 0, g: 0, b: 255, alpha: 1 });
  const maskRaw = Buffer.alloc(8 * 8);
  for (let y = 2; y < 6; y += 1) for (let x = 2; x < 6; x += 1) maskRaw[(y * 8) + x] = 255;
  const maskInput = await sharp(maskRaw, { raw: { width: 8, height: 8, channels: 1 } }).png().toBuffer();
  const mask = await normalizeMask(maskInput, { width: 8, height: 8, featherRadius: 2 });
  const output = await compositeMaskedEdit({ original, edited, mask: mask.buffer, width: 8, height: 8 });
  const originalPixels = await sharp(original).removeAlpha().raw().toBuffer();
  const outputPixels = await sharp(output).removeAlpha().raw().toBuffer();
  for (let pixel = 0; pixel < 64; pixel += 1) {
    if (maskRaw[pixel] !== 0) continue;
    assert.deepEqual(
      [...outputPixels.subarray(pixel * 3, (pixel * 3) + 3)],
      [...originalPixels.subarray(pixel * 3, (pixel * 3) + 3)],
    );
  }
});
```

- [ ] **Step 3: Run the test and verify the red state**

Run: `node --test test/imageEdit.test.js`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `server/imageEdit.js`.

- [ ] **Step 4: Implement validation, normalization, inward feathering, and compositing**

Create `server/imageEdit.js` with these exports and constants:

```js
import sharp from 'sharp';

const sourceFormats = new Set(['png', 'jpeg', 'webp']);

export function parseDataUrl(value) {
  const match = /^data:([^;,]+)?(;base64)?,(.*)$/s.exec(value || '');
  if (!match) return null;
  return {
    mimeType: match[1] || 'application/octet-stream',
    buffer: match[2] ? Buffer.from(match[3] || '', 'base64') : Buffer.from(decodeURIComponent(match[3] || '')),
  };
}

export async function fetchStoredImage(value, fetchImpl = fetch) {
  const parsed = parseDataUrl(value);
  if (parsed) return parsed.buffer;
  if (!/^https?:\/\//i.test(value || '')) throw Object.assign(new Error('Stored image is not readable.'), { code: 'EDIT_IMAGE_INVALID', status: 400 });
  const response = await fetchImpl(value);
  if (!response.ok) throw Object.assign(new Error(`Stored image HTTP ${response.status}.`), { code: 'EDIT_IMAGE_INVALID', status: 400 });
  return Buffer.from(await response.arrayBuffer());
}

export async function normalizeSourceImage(buffer, { maxEdge = 1024, maxPixels = 16_777_216 } = {}) {
  let metadata;
  try { metadata = await sharp(buffer, { animated: false, limitInputPixels: maxPixels }).metadata(); }
  catch { throw Object.assign(new Error('Source image is malformed.'), { code: 'EDIT_IMAGE_INVALID', status: 400 }); }
  if (!sourceFormats.has(metadata.format) || !metadata.width || !metadata.height || metadata.pages > 1) {
    throw Object.assign(new Error('Source must be a static PNG, JPEG, or WebP image.'), { code: 'EDIT_IMAGE_INVALID', status: 400 });
  }
  const scale = Math.min(1, maxEdge / Math.max(metadata.width, metadata.height));
  const width = Math.max(16, Math.round((metadata.width * scale) / 16) * 16);
  const height = Math.max(16, Math.round((metadata.height * scale) / 16) * 16);
  const normalized = await sharp(buffer, { animated: false, limitInputPixels: maxPixels })
    .rotate().resize(width, height, { fit: 'fill' }).toColourspace('srgb').removeAlpha().png().toBuffer();
  return { buffer: normalized, width, height, mimeType: 'image/png' };
}

export async function normalizeMask(buffer, { width, height, featherRadius = 8 }) {
  let binary;
  try {
    const metadata = await sharp(buffer, { animated: false, limitInputPixels: width * height * 4 }).metadata();
    if (metadata.format !== 'png' || metadata.pages > 1) throw new Error('Mask format is not PNG.');
    const resized = sharp(buffer, { animated: false, limitInputPixels: width * height * 4 })
      .rotate().resize(width, height, { fit: 'fill', kernel: sharp.kernel.nearest });
    if (metadata.hasAlpha) {
      const alpha = await resized.clone().ensureAlpha().extractChannel('alpha').raw().toBuffer();
      const hasTransparency = alpha.some((value) => value < 255);
      binary = hasTransparency
        ? await sharp(alpha, { raw: { width, height, channels: 1 } }).threshold(1).raw().toBuffer()
        : await resized.clone().greyscale().threshold(1).raw().toBuffer();
    } else {
      binary = await resized.greyscale().threshold(1).raw().toBuffer();
    }
  } catch {
    throw Object.assign(new Error('Mask must be a valid PNG image.'), { code: 'EDIT_IMAGE_INVALID', status: 400 });
  }
  let painted = 0;
  for (const value of binary) if (value) painted += 1;
  if (painted === 0) return { buffer: await sharp(binary, { raw: { width, height, channels: 1 } }).png().toBuffer(), empty: true, full: false };
  const radius = Math.max(0, Math.min(64, Math.round(featherRadius)));
  let alpha = binary;
  if (radius > 0) {
    const blurred = await sharp(binary, { raw: { width, height, channels: 1 } }).blur(Math.max(0.3, radius / 2)).raw().toBuffer();
    alpha = Buffer.alloc(binary.length);
    for (let index = 0; index < binary.length; index += 1) alpha[index] = binary[index] === 0 ? 0 : blurred[index];
  }
  return {
    buffer: await sharp(alpha, { raw: { width, height, channels: 1 } }).png().toBuffer(),
    empty: false,
    full: painted === binary.length,
  };
}

export async function compositeMaskedEdit({ original, edited, mask, width, height }) {
  const alpha = await sharp(mask).resize(width, height, { kernel: sharp.kernel.nearest }).greyscale().raw().toBuffer();
  const overlay = await sharp(edited).resize(width, height, { fit: 'fill' }).toColourspace('srgb').removeAlpha()
    .joinChannel(alpha, { raw: { width, height, channels: 1 } }).png().toBuffer();
  return sharp(original).resize(width, height, { fit: 'fill' }).toColourspace('srgb')
    .composite([{ input: overlay, blend: 'over' }]).png().toBuffer();
}
```

- [ ] **Step 5: Run focused and full tests**

Run: `node --test test/imageEdit.test.js`

Expected: 7 tests PASS.

Run: `npm test`

Expected: all existing and image-processing tests PASS.

- [ ] **Step 6: Commit image processing**

```powershell
git add package.json package-lock.json server/imageEdit.js test/imageEdit.test.js
git commit -m "feat: add deterministic masked image compositing"
```

### Task 2: Shared ComfyUI Transport

**Files:**
- Create: `server/comfyClient.js`
- Create: `test/comfyClient.test.js`
- Modify: `server/comfyModel.js`
- Modify: `test/comfyModel.test.js`

**Interfaces:**
- Produces: `requestComfyJson(config, pathname, options?)`
- Produces: `requestComfyBuffer(config, pathname, options?)`
- Produces: `uploadComfyImage(config, { buffer, filename }) -> Promise<{ imageName, upload }>`
- Produces: `runComfyWorkflow(config, workflow) -> Promise<{ bytes, promptId, image, workflow }>`
- Preserves: all current exports and return fields from `server/comfyModel.js`.

- [ ] **Step 1: Write failing transport helper tests**

Create `test/comfyClient.test.js`:

```js
import assert from 'node:assert/strict';
import test from 'node:test';
import { extractComfyImages, uploadComfyImage } from '../server/comfyClient.js';

test('extracts images from prompt-specific ComfyUI history', () => {
  const history = { abc: { outputs: { 12: { images: [{ filename: 'out.png', subfolder: '', type: 'output' }] } } } };
  assert.equal(extractComfyImages(history, 'abc')[0].filename, 'out.png');
});

test('uploads a source using the ComfyUI image multipart contract', async () => {
  let received;
  const fetchImpl = async (url, options) => {
    received = { url, options };
    return new Response(JSON.stringify({ name: 'source.png', subfolder: 'tmall_edits', type: 'input' }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };
  const result = await uploadComfyImage(
    { baseUrl: 'http://comfy.test', timeoutMs: 1000 },
    { buffer: Buffer.from('png'), filename: 'source.png', fetchImpl },
  );
  assert.equal(received.url, 'http://comfy.test/upload/image');
  assert.equal(received.options.method, 'POST');
  assert.match(received.options.body.get('image').name, /source\.png$/);
  assert.equal(result.imageName, 'tmall_edits/source.png');
});
```

- [ ] **Step 2: Verify the transport test fails**

Run: `node --test test/comfyClient.test.js`

Expected: FAIL with `ERR_MODULE_NOT_FOUND`.

- [ ] **Step 3: Implement the shared client**

Create `server/comfyClient.js` with:

```js
const defaultTimeoutMs = 30000;

function delay(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

async function timedFetch(url, options, timeoutMs, fetchImpl) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs || defaultTimeoutMs);
  try { return await fetchImpl(url, { ...options, signal: controller.signal }); }
  finally { clearTimeout(timeout); }
}

export async function requestComfyJson(config, pathname, options = {}) {
  const { fetchImpl = fetch, timeoutMs, ...fetchOptions } = options;
  const response = await timedFetch(`${config.baseUrl}${pathname}`, {
    ...fetchOptions,
    headers: { ...(fetchOptions.body && typeof fetchOptions.body === 'string' ? { 'content-type': 'application/json' } : {}), ...(fetchOptions.headers || {}) },
  }, timeoutMs || config.timeoutMs, fetchImpl);
  const text = await response.text();
  const payload = text ? JSON.parse(text) : {};
  if (!response.ok) throw Object.assign(new Error(`ComfyUI ${response.status}: ${text}`), { status: response.status });
  return payload;
}

export async function requestComfyBuffer(config, pathname, options = {}) {
  const { fetchImpl = fetch, timeoutMs, ...fetchOptions } = options;
  const response = await timedFetch(`${config.baseUrl}${pathname}`, fetchOptions, timeoutMs || config.timeoutMs, fetchImpl);
  if (!response.ok) throw Object.assign(new Error(`ComfyUI image ${response.status}: ${await response.text()}`), { status: response.status });
  return Buffer.from(await response.arrayBuffer());
}

export function extractComfyImages(history, promptId) {
  const outputs = (history[promptId] || history).outputs || {};
  return Object.values(outputs).flatMap((output) => output.images || []);
}

export async function uploadComfyImage(config, { buffer, filename, fetchImpl = fetch }) {
  const form = new FormData();
  form.append('image', new Blob([buffer], { type: 'image/png' }), filename);
  form.append('type', 'input');
  form.append('subfolder', 'tmall_edits');
  form.append('overwrite', 'true');
  const upload = await requestComfyJson(config, '/upload/image', { method: 'POST', body: form, fetchImpl });
  const imageName = upload.subfolder ? `${upload.subfolder}/${upload.name}` : upload.name;
  if (!imageName) throw new Error('ComfyUI upload did not return an image name.');
  return { imageName, upload };
}

export async function runComfyWorkflow(config, workflow, { fetchImpl = fetch } = {}) {
  const queue = await requestComfyJson(config, '/prompt', { method: 'POST', body: JSON.stringify({ prompt: workflow }), fetchImpl });
  if (queue.node_errors && Object.keys(queue.node_errors).length) throw new Error(`ComfyUI rejected workflow: ${JSON.stringify(queue.node_errors)}`);
  const promptId = queue.prompt_id;
  if (!promptId) throw new Error('ComfyUI did not return prompt_id.');
  let images = [];
  for (let attempt = 0; attempt < config.maxPollAttempts; attempt += 1) {
    const history = await requestComfyJson(config, `/history/${encodeURIComponent(promptId)}`, { fetchImpl });
    images = extractComfyImages(history, promptId);
    if (images.length) break;
    await delay(config.pollIntervalMs);
  }
  if (!images.length) throw Object.assign(new Error('Timed out waiting for ComfyUI output image.'), { code: 'COMFYUI_EDIT_TIMEOUT', status: 503 });
  const image = images[0];
  const query = new URLSearchParams({ filename: image.filename, subfolder: image.subfolder || '', type: image.type || 'output' });
  const bytes = await requestComfyBuffer(config, `/view?${query}`, { fetchImpl });
  return { bytes, promptId, image, workflow };
}
```

- [ ] **Step 4: Refactor existing generation onto the shared transport**

In `server/comfyModel.js`, remove its local `delay`, `requestJson`, `requestBuffer`, and `extractComfyImages` implementations; import:

```js
import { requestComfyJson, runComfyWorkflow } from './comfyClient.js';
export { extractComfyImages } from './comfyClient.js';
```

Use `requestComfyJson(config, '/object_info/CheckpointLoaderSimple', ...)` and `requestComfyJson(config, '/system_stats', ...)`. Replace the queue/poll/view block in `generateWithComfy` with:

```js
const completed = await runComfyWorkflow(config, workflow);
return {
  image: `data:image/png;base64,${completed.bytes.toString('base64')}`,
  prompt,
  negativePrompt,
  model: resolved.checkpoint,
  provider: 'comfyui',
  size: `${config.width}x${config.height}`,
  outputFormat: 'png',
  createdAt: new Date().toISOString(),
  comfy: {
    endpoint: config.baseUrl,
    checkpoint: resolved.checkpoint,
    promptId: completed.promptId,
    filename: completed.image.filename,
    workflow,
  },
};
```

- [ ] **Step 5: Verify transport and text-to-image regressions**

Run: `node --test test/comfyClient.test.js test/comfyModel.test.js`

Expected: all tests PASS, including current checkpoint resolution tests.

Run: `npm test`

Expected: all tests PASS.

- [ ] **Step 6: Commit the shared transport**

```powershell
git add server/comfyClient.js server/comfyModel.js test/comfyClient.test.js test/comfyModel.test.js
git commit -m "refactor: share ComfyUI workflow transport"
```

### Task 3: FLUX.2 Workflow, Dependency Health, And Execution

**Files:**
- Create: `server/flux2Edit.js`
- Create: `test/flux2Edit.test.js`

**Interfaces:**
- Produces: `getFlux2EditConfig(env?) -> Flux2EditConfig`
- Produces: `inspectFlux2Dependencies(objectInfo, config) -> Flux2Health`
- Produces: `getFlux2EditHealth(config?, deps?) -> Promise<Flux2Health>`
- Produces: `buildFlux2EditWorkflow({ prompt, imageName, width, height, config }) -> object`
- Produces: `editWithFlux2({ source, prompt, width, height, config?, deps? }) -> Promise<{ bytes, provider, model, createdAt, comfy }>`

- [ ] **Step 1: Write failing config, health, and workflow tests**

Create `test/flux2Edit.test.js`:

```js
import assert from 'node:assert/strict';
import test from 'node:test';
import { buildFlux2EditWorkflow, editWithFlux2, getFlux2EditConfig, inspectFlux2Dependencies } from '../server/flux2Edit.js';

const config = {
  baseUrl: 'http://127.0.0.1:8188', unetName: 'flux-2-klein-4b-fp8.safetensors',
  clipName: 'qwen_3_4b.safetensors', vaeName: 'flux2-vae.safetensors',
  steps: 4, cfg: 1, samplerName: 'euler', scheduler: 'simple', seed: 7,
  pollIntervalMs: 1, maxPollAttempts: 2, timeoutMs: 1000,
};

test('uses stable FLUX.2 Klein defaults and clamps values', () => {
  const value = getFlux2EditConfig({ COMFY_FLUX2_STEPS: '99999', COMFY_FLUX2_CFG: '-2' });
  assert.equal(value.unetName, 'flux-2-klein-4b-fp8.safetensors');
  assert.equal(value.steps, 80);
  assert.equal(value.cfg, 0);
});

test('requires exact model files, flux2 CLIP type, and core nodes', () => {
  const objectInfo = {
    UNETLoader: { input: { required: { unet_name: [['flux-2-klein-4b-fp8.safetensors']] } } },
    CLIPLoader: { input: { required: { clip_name: [['qwen_3_4b.safetensors']], type: [['flux2']] } } },
    VAELoader: { input: { required: { vae_name: [['flux2-vae.safetensors']] } } },
  };
  for (const name of ['LoadImage', 'VAEEncode', 'ReferenceLatent', 'CLIPTextEncode', 'EmptyFlux2LatentImage', 'KSampler', 'VAEDecode', 'SaveImage']) objectInfo[name] = {};
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

test('uploads, runs, returns metadata, and invokes the cleanup hook', async () => {
  let cleaned = false;
  const result = await editWithFlux2({
    source: Buffer.from('source'), prompt: 'red coat', width: 512, height: 512, config,
    deps: {
      upload: async () => ({ imageName: 'tmall_edits/source.png' }),
      run: async (_config, workflow) => ({ bytes: Buffer.from('output'), promptId: 'prompt-1', image: { filename: 'edit.png' }, workflow }),
      cleanup: async () => { cleaned = true; },
    },
  });
  assert.equal(result.bytes.toString(), 'output');
  assert.equal(result.model, config.unetName);
  assert.equal(result.comfy.promptId, 'prompt-1');
  assert.equal(cleaned, true);
});
```

- [ ] **Step 2: Verify FLUX.2 tests fail**

Run: `node --test test/flux2Edit.test.js`

Expected: FAIL with `ERR_MODULE_NOT_FOUND`.

- [ ] **Step 3: Implement config and exact dependency inspection**

Create `server/flux2Edit.js` with clamped config and these constants:

```js
import { randomUUID } from 'node:crypto';
import { requestComfyJson, runComfyWorkflow, uploadComfyImage } from './comfyClient.js';

const requiredNodes = ['UNETLoader', 'CLIPLoader', 'VAELoader', 'LoadImage', 'VAEEncode', 'ReferenceLatent', 'CLIPTextEncode', 'EmptyFlux2LatentImage', 'KSampler', 'VAEDecode', 'SaveImage'];
const integer = (value, min, max, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Math.min(max, Math.max(min, Number.isFinite(parsed) ? parsed : fallback));
};
const decimal = (value, min, max, fallback) => {
  const parsed = Number.parseFloat(value); return Math.min(max, Math.max(min, Number.isFinite(parsed) ? parsed : fallback));
};

export function getFlux2EditConfig(env = process.env) {
  return {
    baseUrl: (env.COMFYUI_BASE_URL || 'http://127.0.0.1:8188').replace(/\/+$/, ''),
    unetName: env.COMFY_FLUX2_UNET_NAME || 'flux-2-klein-4b-fp8.safetensors',
    clipName: env.COMFY_FLUX2_CLIP_NAME || 'qwen_3_4b.safetensors',
    vaeName: env.COMFY_FLUX2_VAE_NAME || 'flux2-vae.safetensors',
    steps: integer(env.COMFY_FLUX2_STEPS, 1, 80, 4), cfg: decimal(env.COMFY_FLUX2_CFG, 0, 20, 1),
    samplerName: env.COMFY_FLUX2_SAMPLER_NAME || 'euler', scheduler: env.COMFY_FLUX2_SCHEDULER || 'simple',
    seed: integer(env.COMFY_FLUX2_SEED, -1, 2 ** 32 - 1, -1),
    pollIntervalMs: integer(env.COMFY_POLL_INTERVAL_MS, 250, 30000, 1500),
    maxPollAttempts: integer(env.COMFY_MAX_POLL_ATTEMPTS, 1, 1000, 120),
    timeoutMs: integer(env.COMFY_TIMEOUT_MS, 5000, 600000, 30000),
    maskFeather: integer(env.COMFY_FLUX2_MASK_FEATHER, 0, 64, 8),
    maxUploadMb: integer(env.COMFY_EDIT_MAX_UPLOAD_MB, 1, 25, 10),
  };
}

export function inspectFlux2Dependencies(objectInfo, config = getFlux2EditConfig()) {
  const choices = (node, input) => objectInfo[node]?.input?.required?.[input]?.[0] || [];
  const missingNodes = requiredNodes.filter((name) => !objectInfo[name]);
  const unetFound = choices('UNETLoader', 'unet_name').includes(config.unetName);
  const clipFound = choices('CLIPLoader', 'clip_name').includes(config.clipName);
  const vaeFound = choices('VAELoader', 'vae_name').includes(config.vaeName);
  const flux2TypeFound = choices('CLIPLoader', 'type').includes('flux2');
  return { ok: missingNodes.length === 0 && unetFound && clipFound && vaeFound && flux2TypeFound, endpoint: config.baseUrl, unet: config.unetName, clip: config.clipName, vae: config.vaeName, unetFound, clipFound, vaeFound, flux2TypeFound, missingNodes };
}
```

- [ ] **Step 4: Implement the exact core-node workflow and runtime**

Add to `server/flux2Edit.js`:

```js
export function buildFlux2EditWorkflow({ prompt, imageName, width, height, config = getFlux2EditConfig() }) {
  const seed = config.seed === -1 ? Math.floor(Math.random() * 1_000_000_000) : config.seed;
  return {
    '1': { class_type: 'UNETLoader', inputs: { unet_name: config.unetName, weight_dtype: 'default' } },
    '2': { class_type: 'CLIPLoader', inputs: { clip_name: config.clipName, type: 'flux2', device: 'default' } },
    '3': { class_type: 'VAELoader', inputs: { vae_name: config.vaeName } },
    '4': { class_type: 'LoadImage', inputs: { image: imageName } },
    '5': { class_type: 'VAEEncode', inputs: { pixels: ['4', 0], vae: ['3', 0] } },
    '6': { class_type: 'CLIPTextEncode', inputs: { text: prompt, clip: ['2', 0] } },
    '7': { class_type: 'ReferenceLatent', inputs: { conditioning: ['6', 0], latent: ['5', 0] } },
    '8': { class_type: 'CLIPTextEncode', inputs: { text: '', clip: ['2', 0] } },
    '9': { class_type: 'EmptyFlux2LatentImage', inputs: { width, height, batch_size: 1 } },
    '10': { class_type: 'KSampler', inputs: { seed, steps: config.steps, cfg: config.cfg, sampler_name: config.samplerName, scheduler: config.scheduler, denoise: 1, model: ['1', 0], positive: ['7', 0], negative: ['8', 0], latent_image: ['9', 0] } },
    '11': { class_type: 'VAEDecode', inputs: { samples: ['10', 0], vae: ['3', 0] } },
    '12': { class_type: 'SaveImage', inputs: { filename_prefix: 'tmall_flux2_edit', images: ['11', 0] } },
  };
}

export async function getFlux2EditHealth(config = getFlux2EditConfig(), { requestJson = requestComfyJson } = {}) {
  try {
    await requestJson(config, '/system_stats');
    const objectInfo = await requestJson(config, '/object_info');
    return { ...inspectFlux2Dependencies(objectInfo, config), error: null };
  } catch (error) {
    return { ok: false, endpoint: config.baseUrl, unet: config.unetName, clip: config.clipName, vae: config.vaeName, missingNodes: [], error: error.message };
  }
}

export async function editWithFlux2({ source, prompt, width, height, config = getFlux2EditConfig(), deps = {} }) {
  const upload = deps.upload || uploadComfyImage;
  const run = deps.run || runComfyWorkflow;
  const cleanup = deps.cleanup || (async () => {});
  const filename = `source-${randomUUID()}.png`;
  let uploaded = null;
  try {
    uploaded = await upload(config, { buffer: source, filename });
    const workflow = buildFlux2EditWorkflow({ prompt, imageName: uploaded.imageName, width, height, config });
    const completed = await run(config, workflow);
    return { bytes: completed.bytes, provider: 'comfyui', model: config.unetName, createdAt: new Date().toISOString(), comfy: { endpoint: config.baseUrl, promptId: completed.promptId, filename: completed.image.filename, diffusionModel: config.unetName, textEncoder: config.clipName, vae: config.vaeName, workflow } };
  } finally {
    if (uploaded) await cleanup(config, uploaded).catch(() => {});
  }
}
```

The default cleanup hook is a no-op because current core ComfyUI installations do not expose a guaranteed input-file deletion endpoint. Keep the hook in the adapter, call it in `finally`, and document periodic cleanup of `ComfyUI/input/tmall_edits`; a future verified ComfyUI cleanup API can be injected without changing route or workflow code.

- [ ] **Step 5: Run focused and full tests**

Run: `node --test test/flux2Edit.test.js test/comfyClient.test.js test/comfyModel.test.js`

Expected: all tests PASS.

Run: `npm test`

Expected: all tests PASS.

- [ ] **Step 6: Commit the FLUX.2 adapter**

```powershell
git add server/flux2Edit.js test/flux2Edit.test.js
git commit -m "feat: add core-node FLUX.2 edit workflow"
```

### Task 4: Authenticated Edit API, Quota, And History

**Files:**
- Create: `server/editRouter.js`
- Create: `test/editRouter.test.js`
- Modify: `server/index.js`

**Interfaces:**
- Consumes: image helpers, `getFlux2EditHealth`, `editWithFlux2`, and current DB entitlement/history functions.
- Produces: `createEditRouter(deps) -> express.Router`
- Produces: `POST /api/edits`
- Produces: `GET /api/comfyui/flux2/health`

- [ ] **Step 1: Write failing multipart route tests with injected dependencies**

Create `test/editRouter.test.js` using Express and Supertest. The test dependency fixture must record reservation release and saved metadata:

```js
import assert from 'node:assert/strict';
import test from 'node:test';
import express from 'express';
import request from 'supertest';
import sharp from 'sharp';
import { createEditRouter } from '../server/editRouter.js';

async function png(color = { r: 255, g: 0, b: 0, alpha: 1 }) {
  return sharp({ create: { width: 32, height: 32, channels: 4, background: color } }).png().toBuffer();
}

function appWith(overrides = {}) {
  const calls = { released: 0, saved: [] };
  const deps = {
    requireAuth: (req, _res, next) => { req.user = { id: 'user-1' }; next(); },
    getGeneration: async () => ({ id: '11111111-1111-4111-8111-111111111111', image: `data:image/png;base64,${(overrides.source || Buffer.from('')).toString('base64')}` }),
    reserve: async () => ({ reservation: { id: 'reservation-1' }, allowance: {} }),
    release: async () => { calls.released += 1; },
    save: async (value) => { calls.saved.push(value); return { id: 'edit-1', downloadUrl: '/api/generations/edit-1/download' }; },
    billing: async () => ({ canGenerate: true }),
    health: async () => ({ ok: true }),
    edit: async ({ source }) => ({ bytes: source, provider: 'comfyui', model: 'flux-2-klein-4b-fp8.safetensors', createdAt: new Date(0).toISOString(), comfy: {} }),
    ...overrides,
  };
  const app = express(); app.use('/api', createEditRouter(deps));
  return { app, calls };
}

test('requires exactly one source and a prompt', async () => {
  const { app } = appWith({ source: await png() });
  assert.equal((await request(app).post('/api/edits').field('prompt', '')).status, 400);
  assert.equal((await request(app).post('/api/edits').field('prompt', 'red coat')).status, 400);
});

test('saves a history edit and consumes the reservation through save', async () => {
  const source = await png(); const { app, calls } = appWith({ source });
  const response = await request(app).post('/api/edits').field('prompt', 'change coat to red').field('sourceGenerationId', '11111111-1111-4111-8111-111111111111');
  assert.equal(response.status, 200);
  assert.equal(calls.saved.length, 1);
  assert.equal(calls.saved[0].reservationId, 'reservation-1');
  assert.equal(calls.saved[0].metadata.operation, 'edit');
  assert.equal(calls.saved[0].metadata.sourceGenerationId, '11111111-1111-4111-8111-111111111111');
});

test('releases a reservation when ComfyUI editing fails', async () => {
  const source = await png(); const { app, calls } = appWith({ source, edit: async () => { throw new Error('ComfyUI failed'); } });
  const response = await request(app).post('/api/edits').field('prompt', 'red').field('sourceGenerationId', '11111111-1111-4111-8111-111111111111');
  assert.equal(response.status, 502);
  assert.equal(calls.released, 1);
});

test('accepts a local PNG source and optional PNG mask', async () => {
  const source = await png(); const mask = await png({ r: 255, g: 255, b: 255, alpha: 1 });
  const { app, calls } = appWith({ source });
  const response = await request(app).post('/api/edits').field('prompt', 'red').attach('sourceImage', source, 'source.png').attach('mask', mask, 'mask.png');
  assert.equal(response.status, 200);
  assert.equal(calls.saved[0].metadata.masked, true);
  assert.equal(calls.saved[0].metadata.source, 'upload');
});

test('rejects unauthenticated, unowned, conflicting, and invalid file requests', async () => {
  const source = await png();
  const unauthenticated = appWith({ requireAuth: (_req, res) => res.status(401).json({ code: 'AUTH_REQUIRED' }) }).app;
  assert.equal((await request(unauthenticated).post('/api/edits').field('prompt', 'red').attach('sourceImage', source, 'source.png')).status, 401);
  const unowned = appWith({ getGeneration: async () => null }).app;
  assert.equal((await request(unowned).post('/api/edits').field('prompt', 'red').field('sourceGenerationId', '22222222-2222-4222-8222-222222222222')).status, 404);
  const conflicting = appWith({ source }).app;
  assert.equal((await request(conflicting).post('/api/edits').field('prompt', 'red').field('sourceGenerationId', '11111111-1111-4111-8111-111111111111').attach('sourceImage', source, 'source.png')).status, 400);
  assert.equal((await request(conflicting).post('/api/edits').field('prompt', 'red').attach('sourceImage', Buffer.from('text'), { filename: 'source.txt', contentType: 'text/plain' })).status, 400);
});

test('rejects a mask larger than four MiB before image decoding', async () => {
  const source = await png(); const { app } = appWith({ source });
  const response = await request(app).post('/api/edits').field('prompt', 'red')
    .attach('sourceImage', source, 'source.png')
    .attach('mask', Buffer.alloc((4 * 1024 * 1024) + 1), { filename: 'mask.png', contentType: 'image/png' });
  assert.equal(response.status, 413);
  assert.equal(response.body.code, 'EDIT_IMAGE_TOO_LARGE');
});
```

- [ ] **Step 2: Verify the route tests fail**

Run: `node --test test/editRouter.test.js`

Expected: FAIL with `ERR_MODULE_NOT_FOUND`.

- [ ] **Step 3: Implement the injected multipart router**

Create `server/editRouter.js`. Build a Multer memory parser with a 10 MiB per-file ceiling, accept at most one `sourceImage` and one `mask`, reject unexpected fields, then reject `maskFile.size > 4 * 1024 * 1024` with `413 EDIT_IMAGE_TOO_LARGE`. Require source MIME to be `image/png`, `image/jpeg`, or `image/webp`, require mask MIME to be `image/png`, and still decode both with Sharp instead of trusting MIME or filename. Export `createEditRouter(deps)`. The handler must execute this exact lifecycle:

```js
const prompt = typeof request.body.prompt === 'string' ? request.body.prompt.trim() : '';
const sourceGenerationId = typeof request.body.sourceGenerationId === 'string' ? request.body.sourceGenerationId.trim() : '';
const sourceFile = request.files?.sourceImage?.[0];
const maskFile = request.files?.mask?.[0];
if (!prompt || prompt.length > 1200) return response.status(400).json({ code: 'EDIT_PROMPT_REQUIRED', error: '请填写不超过 1200 字的修改要求。' });
if (Boolean(sourceGenerationId) === Boolean(sourceFile)) return response.status(400).json({ code: 'EDIT_SOURCE_REQUIRED', error: '请选择一张历史图片或上传一张本地图片。' });
if (sourceGenerationId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(sourceGenerationId)) return response.status(400).json({ code: 'EDIT_SOURCE_REQUIRED', error: '历史图片参数无效。' });
if (sourceFile && !['image/png', 'image/jpeg', 'image/webp'].includes(sourceFile.mimetype)) return response.status(400).json({ code: 'EDIT_IMAGE_INVALID', error: '原图仅支持 PNG、JPEG 或 WebP。' });
if (maskFile && maskFile.mimetype !== 'image/png') return response.status(400).json({ code: 'EDIT_IMAGE_INVALID', error: '蒙版必须是 PNG。' });
if (maskFile && maskFile.size > 4 * 1024 * 1024) return response.status(413).json({ code: 'EDIT_IMAGE_TOO_LARGE', error: '蒙版不能超过 4 MiB。' });
```

Resolve history with `deps.getGeneration({ userId: request.user.id, generationId: sourceGenerationId })`; return 404 when absent. Normalize with `normalizeSourceImage`, normalize a present mask with `normalizeMask`, and treat an empty mask as semantic mode. Check `deps.health()` before reservation and return `503 FLUX2_NOT_READY` when false. Reserve with `deps.reserve(request.user.id)` and return the existing `402 PAYMENT_REQUIRED` shape when unavailable.

Run `deps.edit({ source, prompt, width, height })`; composite only for a non-empty mask. Save through:

```js
const generation = await deps.save({
  userId: request.user.id,
  image: `data:image/png;base64,${finalBytes.toString('base64')}`,
  prompt,
  negativePrompt: '',
  brief: prompt,
  avoid: '',
  selections: {},
  strategy: 'flux2-reference-edit',
  provider: result.provider,
  model: result.model,
  reservationId: reservation.id,
  metadata: {
    operation: 'edit', sourceGenerationId: sourceGenerationId || null,
    source: sourceGenerationId ? 'history' : 'upload', masked,
    backend: 'comfyui', workflow: 'flux2-reference-edit-v1',
    size: `${width}x${height}`, createdAt: result.createdAt,
    billing: { reservationId: reservation.id }, comfy: result.comfy,
  },
});
```

Track `let reservation = null` and `let persisted = false`. Set `persisted = true` only after `deps.save` returns. In a `finally` block, release when `reservation && !persisted`; this covers validation races, ComfyUI failures, database failures, and client disconnects without leaving a reserved entitlement. Use this exact mapper and only send it when headers have not already been sent:

```js
function publicEditError(error) {
  if (error?.code === 'EDIT_IMAGE_INVALID') return { status: 400, code: error.code, error: '图片文件无效，请重新选择。' };
  if (error?.code === 'EDIT_IMAGE_TOO_LARGE' || error?.code === 'LIMIT_FILE_SIZE') return { status: 413, code: 'EDIT_IMAGE_TOO_LARGE', error: '上传图片超过大小限制。' };
  if (error?.code === 'COMFYUI_EDIT_TIMEOUT') return { status: 503, code: error.code, error: '本地模型处理超时，请稍后重试。' };
  if (/ComfyUI|fetch failed|ECONNREFUSED|aborted/i.test(error?.message || '')) return { status: 503, code: 'FLUX2_NOT_READY', error: '本地 FLUX.2 或 ComfyUI 暂不可用。' };
  return { status: 502, code: 'IMAGE_EDIT_FAILED', error: '图片修改失败，请稍后重试。' };
}
```

Return `{ image, provider, model, createdAt, operation: 'edit', masked, generation, savedToHistory: true, downloadUrl, billing }` on success.

- [ ] **Step 4: Mount real dependencies and health route**

In `server/index.js`, import `createEditRouter`, `getFlux2EditHealth`, and `editWithFlux2`. Mount:

```js
app.get('/api/comfyui/flux2/health', async (_request, response) => {
  const health = await getFlux2EditHealth();
  return response.status(health.ok ? 200 : 503).json(health);
});

app.use('/api', createEditRouter({
  requireAuth,
  getGeneration: getAvatarGeneration,
  reserve: reserveGenerationEntitlement,
  release: releaseGenerationReservation,
  save: saveAvatarGeneration,
  billing: getBillingStatus,
  health: getFlux2EditHealth,
  edit: editWithFlux2,
}));
```

Remove the duplicated local `parseDataUrl` only after both generation download and edit history source loading import the same helper from `server/imageEdit.js`.

- [ ] **Step 5: Run API, regression, lint, and build checks**

Run: `node --test test/editRouter.test.js test/imageEdit.test.js test/flux2Edit.test.js`

Expected: all focused tests PASS.

Run: `npm test`

Expected: all tests PASS.

Run: `npm run check`

Expected: ESLint exits 0.

Run: `npm run build`

Expected: Vite production build succeeds.

- [ ] **Step 6: Commit the edit API**

```powershell
git add server/editRouter.js server/index.js test/editRouter.test.js
git commit -m "feat: add authenticated FLUX.2 edit API"
```

### Task 5: Canvas Model And Image Editor Component

**Files:**
- Create: `src/imageEditor.js`
- Create: `test/imageEditor.test.js`
- Create: `src/components/ImageEditor.jsx`
- Modify: `src/components/Icons.jsx`

**Interfaces:**
- Produces: `mapPointerToImage({ clientX, clientY, rect, width, height }) -> { x, y }`
- Produces: `hasPaintedMask(imageData) -> boolean`
- Produces: `<ImageEditor open source onSourceChange onClose onSubmit busy error modelReady modelChecking />`
- Calls: `onSubmit({ prompt, sourceGenerationId?, sourceFile?, maskFile? })`.

- [ ] **Step 1: Write failing pure canvas tests**

Create `test/imageEditor.test.js`:

```js
import assert from 'node:assert/strict';
import test from 'node:test';
import { hasPaintedMask, mapPointerToImage } from '../src/imageEditor.js';

test('maps pointer coordinates into source pixels and clamps edges', () => {
  assert.deepEqual(mapPointerToImage({ clientX: 60, clientY: 45, rect: { left: 10, top: 20, width: 100, height: 50 }, width: 1000, height: 500 }), { x: 500, y: 250 });
  assert.deepEqual(mapPointerToImage({ clientX: -5, clientY: 200, rect: { left: 0, top: 0, width: 100, height: 100 }, width: 512, height: 512 }), { x: 0, y: 511 });
});

test('detects painted alpha pixels', () => {
  assert.equal(hasPaintedMask({ data: Uint8ClampedArray.from([0, 0, 0, 0, 255, 255, 255, 0]) }), false);
  assert.equal(hasPaintedMask({ data: Uint8ClampedArray.from([255, 255, 255, 1]) }), true);
});
```

- [ ] **Step 2: Verify the canvas test fails**

Run: `node --test test/imageEditor.test.js`

Expected: FAIL with `ERR_MODULE_NOT_FOUND`.

- [ ] **Step 3: Implement pure helpers**

Create `src/imageEditor.js`:

```js
export function mapPointerToImage({ clientX, clientY, rect, width, height }) {
  const x = Math.round(((clientX - rect.left) / rect.width) * width);
  const y = Math.round(((clientY - rect.top) / rect.height) * height);
  return { x: Math.max(0, Math.min(width - 1, x)), y: Math.max(0, Math.min(height - 1, y)) };
}

export function hasPaintedMask(imageData) {
  for (let index = 3; index < imageData.data.length; index += 4) if (imageData.data[index] > 0) return true;
  return false;
}
```

- [ ] **Step 4: Build the controlled editor component**

Create `src/components/ImageEditor.jsx`. It must:

- render nothing when `open` is false;
- load `source.image` or an object URL for `source.file` into an image element;
- set the base and mask canvas backing dimensions to `image.naturalWidth` and `image.naturalHeight`;
- draw a semi-transparent Tmall-red round stroke on pointer move while drawing;
- use `globalCompositeOperation = 'destination-out'` in erase mode;
- store an `ImageData` snapshot before each completed stroke and cap undo history at 20;
- clear and restore mask snapshots without changing the base canvas;
- provide a 50%-200% zoom control and a reset-view button that restores 100% zoom;
- export a transparent PNG mask with `canvas.toBlob(..., 'image/png')`;
- pass no `maskFile` when `hasPaintedMask(context.getImageData(...))` is false;
- support `source=null` by showing a local PNG/JPEG/WebP upload control, then call `onSourceChange({ file, image: objectUrl, generationId: '' })`;
- require a trimmed prompt and `modelReady === true` before calling `onSubmit`;
- revoke every object URL on source change and unmount.

Use native buttons and the existing `Icon` component for close, brush, eraser, undo, clear, reset-view, and upload actions. Show `正在检查本地 FLUX.2` while `modelChecking`; show a blocking `本地 FLUX.2 模型未就绪` state and keep submit disabled when `modelReady` is false. The form submission payload is:

```js
await onSubmit({
  prompt: prompt.trim(),
  sourceGenerationId: source.generationId || '',
  sourceFile: source.file || null,
  maskFile: maskBlob ? new File([maskBlob], 'mask.png', { type: 'image/png' }) : null,
});
```

Add these Lucide-compatible entries to the existing `paths` map in `src/components/Icons.jsx` so no button references an undefined icon:

```jsx
close: <path d="M18 6 6 18M6 6l12 12" />,
upload: <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4m14-7-5-5-5 5m5-5v12" />,
undo: <path d="M9 14 4 9l5-5M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />,
trash: <path d="M3 6h18m-2 0-1 14H6L5 6m3 0V3h8v3m-6 4v6m4-6v6" />,
eraser: <path d="m7 21-4-4L16 4a2.8 2.8 0 0 1 4 4L9 19l-2 2Zm-2-6 4 4m4-4h8" />,
brush: <path d="m14 4 6 6M4 20c2 0 4-1 4-3 0-1-.5-2-1-3l9-9a2.8 2.8 0 0 1 4 4l-9 9c-1-.5-2-1-3-1-2 0-3 1-4 3Z" />,
```

The component labels the no-mask mode `整图语义修改` and painted mode `蒙版局部修改`. Disable source replacement and submission while `busy`.

- [ ] **Step 5: Run component-adjacent quality checks**

Run: `node --test test/imageEditor.test.js`

Expected: 2 tests PASS.

Run: `npm run check`

Expected: ESLint exits 0 with no hook dependency warnings.

Run: `npm run build`

Expected: Vite builds the new component successfully.

- [ ] **Step 6: Commit the editor component**

```powershell
git add src/imageEditor.js src/components/ImageEditor.jsx src/components/Icons.jsx test/imageEditor.test.js
git commit -m "feat: add browser mask editor"
```

### Task 6: Page Integration And Responsive Editing UI

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/components/ResultPanel.jsx`
- Modify: `src/styles.css`

**Interfaces:**
- Consumes: `POST /api/edits` multipart response.
- Produces: edit entry points for current and history results.
- Produces: current result, history, and billing refresh after success.

- [ ] **Step 1: Add editor state and multipart submission to App**

In `src/App.jsx`, import `ImageEditor` and add:

```jsx
const [editorOpen, setEditorOpen] = useState(false);
const [editorSource, setEditorSource] = useState(null);
const [editing, setEditing] = useState(false);
const [editError, setEditError] = useState('');
const [flux2Ready, setFlux2Ready] = useState(false);
const [flux2Checking, setFlux2Checking] = useState(false);

const loadFlux2Health = async () => {
  setFlux2Checking(true);
  try {
    const response = await fetch('/api/comfyui/flux2/health');
    const health = await response.json();
    setFlux2Ready(response.ok && health.ok);
    if (!response.ok) setEditError(health.error || '本地 FLUX.2 模型未就绪。');
  } catch { setFlux2Ready(false); setEditError('无法连接本地 FLUX.2 服务。'); }
  finally { setFlux2Checking(false); }
};

const openEditor = (item = result) => {
  setEditorSource(item ? { image: item.image, generationId: item.id || item.generation?.id || '' } : null);
  setEditError('');
  setEditorOpen(true);
  loadFlux2Health();
};

const submitEdit = async ({ prompt, sourceGenerationId, sourceFile, maskFile }) => {
  const form = new FormData(); form.append('prompt', prompt);
  if (sourceGenerationId) form.append('sourceGenerationId', sourceGenerationId);
  if (sourceFile) form.append('sourceImage', sourceFile);
  if (maskFile) form.append('mask', maskFile);
  setEditing(true); setEditError('');
  try {
    const response = await fetch('/api/edits', { method: 'POST', credentials: 'include', body: form });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || '图片修改失败，请稍后重试。');
    setResult(payload); setBilling(payload.billing); setEditorOpen(false); await loadHistory();
  } catch (editFailure) { setEditError(editFailure.message); }
  finally { setEditing(false); }
};
```

When a local file is selected inside the editor, replace `editorSource` with `{ file, image: objectUrl, generationId: '' }`; the component remains responsible for revoking its own preview URL. Render an always-available logged-in `上传图片微调` action that calls `openEditor(null)`, so local upload does not require a previously generated image.

- [ ] **Step 2: Add current-result and history edit actions**

Extend `ResultPanel` with `onEdit` and `onUploadEdit`. Render edit next to download when a result exists:

```jsx
<button type="button" onClick={onEdit}><Icon name="wand" size={17} />局部微调</button>
```

Render a separate logged-in upload action even when no result exists:

```jsx
{user && <button className="upload-edit-button" type="button" onClick={onUploadEdit}><Icon name="upload" size={17} />上传图片微调</button>}
```

Add a compact edit button to each history item that calls `openEditor(item)` without triggering the preview button. Pass `onEdit={() => openEditor(result)}` and `onUploadEdit={() => openEditor(null)}` to `ResultPanel`.

Render the editor once near the end of `App`:

```jsx
<ImageEditor
  open={editorOpen}
  source={editorSource}
  busy={editing}
  error={editError}
  modelReady={flux2Ready}
  modelChecking={flux2Checking}
  onClose={() => !editing && setEditorOpen(false)}
  onSubmit={submitEdit}
  onSourceChange={setEditorSource}
/>
```

- [ ] **Step 3: Add restrained responsive styles**

Append styles using the existing red/white design tokens:

```css
.image-editor-overlay { position: fixed; inset: 0; z-index: 80; display: grid; place-items: center; padding: 20px; background: rgba(0,0,0,.58); }
.image-editor { width: min(1080px, 100%); max-height: calc(100vh - 40px); overflow: auto; border-radius: 8px; background: #fff; box-shadow: 0 24px 80px rgba(0,0,0,.26); }
.editor-header,.editor-toolbar,.editor-actions { display: flex; align-items: center; gap: 8px; }
.editor-header { justify-content: space-between; padding: 16px 18px; border-bottom: 1px solid #eee; }
.editor-layout { display: grid; grid-template-columns: minmax(0,1fr) 300px; min-height: 560px; }
.editor-stage { display: grid; place-items: center; min-width: 0; padding: 18px; background: #f4f4f4; }
.editor-canvas-wrap { position: relative; width: min(100%, 720px); max-height: 72vh; }
.editor-canvas-wrap canvas { display: block; width: 100%; height: auto; }
.editor-mask-canvas { position: absolute; inset: 0; touch-action: none; cursor: crosshair; }
.editor-controls { padding: 18px; border-left: 1px solid #eee; }
.editor-controls textarea { width: 100%; min-height: 140px; resize: vertical; }
.editor-mode { display: inline-flex; margin-bottom: 12px; padding: 4px 8px; border-radius: 6px; background: #f5f5f5; font-size: 12px; }
.editor-toolbar button,.editor-header button { width: 36px; height: 36px; display: inline-grid; place-items: center; border: 1px solid #ddd; border-radius: 6px; background: #fff; }
.editor-toolbar button.active { border-color: var(--tmall); color: var(--tmall); background: #fff3f5; }
.editor-submit { width: 100%; min-height: 44px; border: 0; border-radius: 6px; color: #fff; background: var(--tmall); font-weight: 700; }
.history-edit { width: 100%; margin-top: 4px; }
@media (max-width: 760px) {
  .image-editor-overlay { padding: 0; align-items: stretch; }
  .image-editor { max-height: 100vh; border-radius: 0; }
  .editor-layout { display: flex; min-height: 0; flex-direction: column; }
  .editor-stage { padding: 10px; }
  .editor-controls { border-top: 1px solid #eee; border-left: 0; }
  .editor-toolbar { flex-wrap: wrap; }
}
```

Adjust existing `.result-actions` to a two-column grid and keep each action at least 40px high. Verify long Chinese errors wrap rather than overflow.

- [ ] **Step 4: Run static and production checks**

Run: `npm run check`

Expected: ESLint exits 0.

Run: `npm run build`

Expected: Vite production build succeeds with no unresolved imports.

Run: `npm test`

Expected: all backend and pure frontend tests PASS.

- [ ] **Step 5: Commit page integration**

```powershell
git add src/App.jsx src/components/ResultPanel.jsx src/styles.css
git commit -m "feat: integrate FLUX.2 image editing UI"
```

### Task 7: Configuration, Documentation, Docker, And Real Verification

**Files:**
- Modify: `.env.example`
- Modify: `README.md`
- Modify: `.env` (ignored local configuration; do not commit)
- Verify: `docker-compose.yml`

**Interfaces:**
- Consumes: host ComfyUI at `http://127.0.0.1:8188` and Docker bridge address `http://host.docker.internal:8188`.
- Produces: working app at `http://localhost:8787` with persistent PostgreSQL history.

- [ ] **Step 1: Document exact edit model settings**

Add to `.env.example` and the ComfyUI section of `README.md`:

```dotenv
COMFY_FLUX2_UNET_NAME=flux-2-klein-4b-fp8.safetensors
COMFY_FLUX2_CLIP_NAME=qwen_3_4b.safetensors
COMFY_FLUX2_VAE_NAME=flux2-vae.safetensors
COMFY_FLUX2_STEPS=4
COMFY_FLUX2_CFG=1
COMFY_FLUX2_SAMPLER_NAME=euler
COMFY_FLUX2_SCHEDULER=simple
COMFY_FLUX2_SEED=-1
COMFY_FLUX2_MASK_FEATHER=8
COMFY_EDIT_MAX_UPLOAD_MB=10
```

Document model directories (`models/diffusion_models`, `models/text_encoders`, `models/vae`), `/api/comfyui/flux2/health`, accepted upload formats, semantic versus mask mode, one-credit accounting, and the model-switch sequence. State clearly that the edit path does not call OpenAI. Also document periodic removal of stale files under `ComfyUI/input/tmall_edits` while ComfyUI is stopped, because the current core upload API has no guaranteed delete operation.

- [ ] **Step 2: Update local ignored configuration without overwriting secrets**

Ensure `.env` contains the same `COMFY_FLUX2_*` values and preserves current database, JWT, OAuth, and payment values. For Docker, retain:

```dotenv
IMAGE_BACKEND=comfyui
COMFYUI_BASE_URL=http://host.docker.internal:8188
```

- [ ] **Step 3: Run the full local quality gate**

Run:

```powershell
npm test
npm run check
npm run build
git diff --check
```

Expected: every command exits 0 and no whitespace errors are reported.

- [ ] **Step 4: Verify host ComfyUI dependencies**

Run:

```powershell
Invoke-RestMethod http://127.0.0.1:8188/system_stats | ConvertTo-Json -Depth 4
Invoke-RestMethod http://127.0.0.1:8188/object_info | Out-Null
```

Expected: ComfyUI reports the CUDA device and `/object_info` returns 200.

- [ ] **Step 5: Rebuild only the app service and preserve PostgreSQL**

Run:

```powershell
docker compose up -d --build --force-recreate app
docker compose ps
```

Expected: application is Up and PostgreSQL remains Up (healthy). Do not run `docker compose down -v`.

- [ ] **Step 6: Verify runtime health**

Run:

```powershell
Invoke-RestMethod http://localhost:8787/api/health | ConvertTo-Json -Depth 5
Invoke-RestMethod http://localhost:8787/api/comfyui/flux2/health | ConvertTo-Json -Depth 5
```

Expected: application health reports `backend: comfyui`; FLUX.2 health reports `ok: true`, all three `*Found` fields true, `flux2TypeFound: true`, and no missing nodes.

- [ ] **Step 7: Perform authenticated semantic and masked edits**

Register a unique temporary local account with a PowerShell web session. Generate or upload a 512x512 source. Submit one `/api/edits` request with no mask and verify `operation: edit`, `masked: false`, a PNG data URL, one new history row, and one entitlement consumed. Submit a second request with a small center-square PNG mask and verify `masked: true`, another history row, and a second entitlement consumed.

Decode the masked response with `sharp` and compare every pixel outside the submitted binary mask to the normalized source; expected mismatch count is `0`. Delete only the temporary user and its cascaded records after verification.

- [ ] **Step 8: Verify existing account and text-to-image regressions**

With the same temporary account, call `/api/auth/me`, `/api/billing/status`, `/api/generations`, and one existing `/api/generate` request using the currently selected text-to-image checkpoint. Expected: login cookie remains valid, billing totals reflect the edits, history includes both original and edit records, and text-to-image generation still returns `provider: comfyui`. Download one generated record through `/api/generations/:id/download` and verify a non-empty PNG response.

- [ ] **Step 9: Verify browser layout on desktop and mobile**

Open `http://localhost:8787`, sign in with the temporary account, and inspect the editor at 1440x900 and 390x844. Confirm the canvas is visible, drawing follows the pointer, controls do not cover the image, text wraps, the modal does not clip, and editing success updates the result and history without page reload.

- [ ] **Step 10: Verify model switching stability**

Temporarily set `COMFY_FLUX2_UNET_NAME` to a nonexistent filename, recreate only the app service, and confirm `/api/comfyui/flux2/health` returns `503` with `unetFound: false` while `/api/generate` remains available. Restore `flux-2-klein-4b-fp8.safetensors`, recreate the app service, and confirm health returns `200` again.

- [ ] **Step 11: Commit docs and configuration example**

```powershell
git add .env.example README.md
git commit -m "docs: explain local FLUX.2 image editing"
```

- [ ] **Step 12: Final scoped review**

Run:

```powershell
git status --short
git log --oneline -8
npm test
npm run check
npm run build
docker compose ps
```

Expected: only intentional local ignored configuration remains uncommitted; the feature commits are visible; tests, lint, and build pass; application and PostgreSQL are running.
