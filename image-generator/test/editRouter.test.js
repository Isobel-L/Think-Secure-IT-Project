import assert from 'node:assert/strict';
import http from 'node:http';
import test from 'node:test';
import express from 'express';
import request from 'supertest';
import sharp from 'sharp';
import { createEditRouter, createFlux2HealthHandler } from '../server/editRouter.js';

const MiB = 1024 * 1024;

async function png(color = { r: 255, g: 0, b: 0, alpha: 1 }) {
  return sharp({ create: { width: 32, height: 32, channels: 4, background: color } }).png().toBuffer();
}

function appWith(overrides = {}) {
  const calls = { edited: [], reserved: 0, released: 0, saved: [] };
  const deps = {
    requireAuth: (req, _res, next) => { req.user = { id: 'user-1' }; next(); },
    getGenerationImage: async () => overrides.source || Buffer.from(''),
    reserve: async () => { calls.reserved += 1; return { reservation: { id: 'reservation-1' }, allowance: {} }; },
    release: async () => { calls.released += 1; },
    save: async (value) => { calls.saved.push(value); return { id: 'edit-1', downloadUrl: '/api/generations/edit-1/download' }; },
    billing: async () => ({ canGenerate: true }),
    health: async () => ({ ok: true }),
    edit: async (value) => {
      calls.edited.push(value);
      return { bytes: value.source, provider: 'comfyui', model: 'flux-2-klein-4b-fp8.safetensors', createdAt: new Date(0).toISOString(), comfy: {} };
    },
    ...overrides,
  };
  const app = express(); app.use('/api', createEditRouter(deps));
  return { app, calls };
}

async function waitFor(check, timeoutMs = 1000) {
  const startedAt = Date.now();
  while (!check()) {
    if (Date.now() - startedAt >= timeoutMs) throw new Error('Timed out waiting for test condition.');
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
}

test('requires exactly one source and a prompt', async () => {
  const { app, calls } = appWith({ source: await png() });
  const missingPrompt = await request(app).post('/api/edits').field('prompt', '');
  assert.equal(missingPrompt.status, 400);
  assert.equal(missingPrompt.body.code, 'EDIT_PROMPT_REQUIRED');
  const missingSource = await request(app).post('/api/edits').field('prompt', 'red coat');
  assert.equal(missingSource.status, 400);
  assert.equal(missingSource.body.code, 'EDIT_SOURCE_REQUIRED');
  const longPrompt = await request(app).post('/api/edits').field('prompt', 'x'.repeat(1201)).attach('sourceImage', await png(), 'source.png');
  assert.equal(longPrompt.status, 400);
  assert.equal(longPrompt.body.code, 'EDIT_PROMPT_REQUIRED');
  assert.equal(calls.reserved, 0);
  assert.equal(calls.saved.length, 0);
});

test('saves a history edit and consumes the reservation through save', async () => {
  const source = await png(); const { app, calls } = appWith({ source });
  const response = await request(app).post('/api/edits').field('prompt', 'change coat to red').field('sourceGenerationId', '11111111-1111-4111-8111-111111111111');
  assert.equal(response.status, 200);
  assert.equal(calls.saved.length, 1);
  assert.equal(calls.saved[0].reservationId, 'reservation-1');
  assert.equal(calls.saved[0].metadata.operation, 'edit');
  assert.equal(calls.saved[0].metadata.sourceGenerationId, '11111111-1111-4111-8111-111111111111');
  assert.equal(calls.released, 0);
  assert.equal(response.body.operation, 'edit');
  assert.equal(response.body.savedToHistory, true);
  assert.equal(response.body.downloadUrl, '/api/generations/edit-1/download');
  assert.equal(response.body.billing.canGenerate, true);
});

test('compiles structured color controls before invoking FLUX.2', async () => {
  const source = await png(); const { app, calls } = appWith({ source });
  const response = await request(app).post('/api/edits')
    .field('editCategory', 'color')
    .field('editTarget', 'hair')
    .field('editOption', 'coral')
    .field('sourceGenerationId', '11111111-1111-4111-8111-111111111111');

  assert.equal(response.status, 200);
  assert.match(calls.edited[0].prompt, /hair color/i);
  assert.equal(calls.saved[0].metadata.editControls.category, 'color');
  assert.equal(calls.saved[0].metadata.editControls.colorHex, '#FF6B6B');
});

test('rejects invalid structured controls before reserving quota', async () => {
  const source = await png(); const { app, calls } = appWith({ source });
  const response = await request(app).post('/api/edits')
    .field('editCategory', 'color')
    .field('colorHex', '#1234')
    .attach('sourceImage', source, 'source.png');

  assert.equal(response.status, 400);
  assert.equal(response.body.code, 'EDIT_CONTROL_INVALID');
  assert.equal(calls.reserved, 0);
});

test('saves an edit without consuming quota when reservation dependencies are omitted', async () => {
  const source = await png();
  const { app, calls } = appWith({ source, reserve: undefined, release: undefined });
  const response = await request(app).post('/api/edits').field('prompt', 'change coat to blue')
    .field('sourceGenerationId', '11111111-1111-4111-8111-111111111111');

  assert.equal(response.status, 200);
  assert.equal(calls.reserved, 0);
  assert.equal(calls.released, 0);
  assert.equal(calls.saved.length, 1);
  assert.equal(calls.saved[0].reservationId, undefined);
  assert.equal(calls.saved[0].metadata.billing, undefined);
});

test('releases a reservation when ComfyUI editing fails', async () => {
  const source = await png(); const { app, calls } = appWith({ source, edit: async () => { throw new Error('ComfyUI failed'); } });
  const response = await request(app).post('/api/edits').field('prompt', 'red').field('sourceGenerationId', '11111111-1111-4111-8111-111111111111');
  assert.equal(response.status, 503);
  assert.equal(response.body.code, 'FLUX2_NOT_READY');
  assert.equal(calls.released, 1);
  assert.equal(calls.saved.length, 0);
});

test('preserves the stable ComfyUI execution failure code', async () => {
  const source = await png();
  const executionFailure = Object.assign(new Error('ComfyUI workflow execution failed.'), {
    code: 'COMFYUI_EXECUTION_FAILED',
    status: 502,
  });
  const { app, calls } = appWith({ source, edit: async () => { throw executionFailure; } });
  const response = await request(app).post('/api/edits').field('prompt', 'red')
    .field('sourceGenerationId', '11111111-1111-4111-8111-111111111111');
  assert.equal(response.status, 502);
  assert.equal(response.body.code, 'COMFYUI_EXECUTION_FAILED');
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

test('treats an empty PNG mask as a semantic edit', async () => {
  const source = await png(); const emptyMask = await png({ r: 0, g: 0, b: 0, alpha: 1 });
  const { app, calls } = appWith({ source });
  const response = await request(app).post('/api/edits').field('prompt', 'red')
    .attach('sourceImage', source, 'source.png').attach('mask', emptyMask, 'mask.png');
  assert.equal(response.status, 200);
  assert.equal(response.body.masked, false);
  assert.equal(calls.saved[0].metadata.masked, false);
});

test('rejects unauthenticated, unowned, conflicting, and invalid file requests', async () => {
  const source = await png();
  const unauthenticated = appWith({ requireAuth: (_req, res) => res.status(401).json({ code: 'AUTH_REQUIRED' }) }).app;
  const unauthorizedResponse = await request(unauthenticated).post('/api/edits').field('prompt', 'red').attach('sourceImage', source, 'source.png');
  assert.equal(unauthorizedResponse.status, 401);
  assert.equal(unauthorizedResponse.body.code, 'AUTH_REQUIRED');
  const unowned = appWith({ getGenerationImage: async () => null }).app;
  const unownedResponse = await request(unowned).post('/api/edits').field('prompt', 'red').field('sourceGenerationId', '22222222-2222-4222-8222-222222222222');
  assert.equal(unownedResponse.status, 404);
  assert.equal(unownedResponse.body.code, 'EDIT_SOURCE_NOT_FOUND');
  const conflictingFixture = appWith({ source });
  const conflicting = conflictingFixture.app;
  const conflictingSource = await request(conflicting).post('/api/edits').field('prompt', 'red').field('sourceGenerationId', '11111111-1111-4111-8111-111111111111').attach('sourceImage', source, 'source.png');
  assert.equal(conflictingSource.status, 400);
  assert.equal(conflictingSource.body.code, 'EDIT_SOURCE_REQUIRED');
  const invalidMime = await request(conflicting).post('/api/edits').field('prompt', 'red').attach('sourceImage', Buffer.from('text'), { filename: 'source.txt', contentType: 'text/plain' });
  assert.equal(invalidMime.status, 400);
  assert.equal(invalidMime.body.code, 'EDIT_IMAGE_INVALID');
  const invalidId = await request(conflicting).post('/api/edits').field('prompt', 'red').field('sourceGenerationId', 'not-a-uuid');
  assert.equal(invalidId.status, 400);
  assert.equal(invalidId.body.code, 'EDIT_SOURCE_REQUIRED');
  const invalidMaskMime = await request(conflicting).post('/api/edits').field('prompt', 'red').attach('sourceImage', source, 'source.png').attach('mask', source, { filename: 'mask.webp', contentType: 'image/webp' });
  assert.equal(invalidMaskMime.status, 400);
  assert.equal(invalidMaskMime.body.code, 'EDIT_IMAGE_INVALID');
  const unexpectedFile = await request(conflicting).post('/api/edits').field('prompt', 'red').attach('sourceImage', source, 'source.png').attach('extra', source, 'extra.png');
  assert.equal(unexpectedFile.status, 400);
  assert.equal(unexpectedFile.body.code, 'EDIT_MULTIPART_INVALID');
  assert.equal(conflictingFixture.calls.reserved, 0);
  assert.equal(conflictingFixture.calls.saved.length, 0);
});

test('validates image bytes before reserving quota', async () => {
  const { app, calls } = appWith();
  const response = await request(app).post('/api/edits').field('prompt', 'red')
    .attach('sourceImage', Buffer.from('not an image'), { filename: 'source.png', contentType: 'image/png' });
  assert.equal(response.status, 400);
  assert.equal(response.body.code, 'EDIT_IMAGE_INVALID');
  assert.equal(calls.reserved, 0);
});

test('rejects a mask larger than four MiB before image decoding', async () => {
  const source = await png(); const { app, calls } = appWith({ source });
  const response = await request(app).post('/api/edits').field('prompt', 'red')
    .attach('sourceImage', source, 'source.png')
    .attach('mask', Buffer.alloc((4 * MiB) + 1), { filename: 'mask.png', contentType: 'image/png' });
  assert.equal(response.status, 413);
  assert.equal(response.body.code, 'EDIT_IMAGE_TOO_LARGE');
  assert.equal(calls.reserved, 0);
  assert.equal(calls.saved.length, 0);
});

test('enforces a configured source upload limit below four MiB', async () => {
  const { app, calls } = appWith({ config: { maxUploadMb: 1, maskFeather: 8 } });
  const response = await request(app).post('/api/edits').field('prompt', 'red')
    .attach('sourceImage', Buffer.alloc(MiB + 1), { filename: 'source.png', contentType: 'image/png' });
  assert.equal(response.status, 413);
  assert.equal(response.body.code, 'EDIT_IMAGE_TOO_LARGE');
  assert.equal(calls.reserved, 0);
});

test('allows a configured source upload limit above ten MiB', async () => {
  const { app, calls } = appWith({ config: { maxUploadMb: 12, maskFeather: 8 } });
  const response = await request(app).post('/api/edits').field('prompt', 'red')
    .attach('sourceImage', Buffer.alloc((10 * MiB) + 1), { filename: 'source.png', contentType: 'image/png' });
  assert.equal(response.status, 400);
  assert.equal(response.body.code, 'EDIT_IMAGE_INVALID');
  assert.equal(calls.reserved, 0);
});

test('passes the configured feather radius when normalizing a mask', async () => {
  const source = await png();
  const mask = await png({ r: 255, g: 255, b: 255, alpha: 1 });
  let maskOptions;
  const { app } = appWith({
    config: { maxUploadMb: 10, maskFeather: 23 },
    normalizeMask: async (_buffer, options) => {
      maskOptions = options;
      return { buffer: Buffer.alloc(0), empty: true, full: false };
    },
  });
  const response = await request(app).post('/api/edits').field('prompt', 'red')
    .attach('sourceImage', source, 'source.png').attach('mask', mask, 'mask.png');
  assert.equal(response.status, 200);
  assert.deepEqual(maskOptions, { width: 32, height: 32, featherRadius: 23, fillEnclosed: false });
});

test('fills enclosed mask regions only for magic erase requests', async () => {
  const source = await png();
  const mask = await png({ r: 255, g: 255, b: 255, alpha: 1 });
  let maskOptions;
  const { app } = appWith({
    normalizeMask: async (_buffer, options) => {
      maskOptions = options;
      return { buffer: mask, empty: false, full: true };
    },
  });
  const response = await request(app).post('/api/edits')
    .field('operation', 'remove')
    .attach('sourceImage', source, 'source.png')
    .attach('mask', mask, 'mask.png');

  assert.equal(response.status, 200);
  assert.equal(maskOptions.fillEnclosed, true);
});

test('bounds multipart file count and text field size with stable errors', async () => {
  const source = await png(); const { app, calls } = appWith({ source });
  const tooManyFiles = await request(app).post('/api/edits').field('prompt', 'red')
    .attach('sourceImage', source, 'one.png')
    .attach('mask', source, 'mask.png')
    .attach('sourceImage', source, 'two.png');
  assert.equal(tooManyFiles.status, 400);
  assert.equal(tooManyFiles.body.code, 'EDIT_MULTIPART_INVALID');
  const oversizedField = await request(app).post('/api/edits')
    .field('prompt', 'x'.repeat((16 * 1024) + 1))
    .attach('sourceImage', source, 'source.png');
  assert.equal(oversizedField.status, 400);
  assert.equal(oversizedField.body.code, 'EDIT_MULTIPART_INVALID');
  assert.equal(calls.reserved, 0);
  assert.equal(calls.saved.length, 0);
});

test('auth runs before oversized file parsing', async () => {
  let authenticated = 0;
  const { app, calls } = appWith({
    requireAuth: (authRequest, response) => {
      authenticated += 1;
      authRequest.once('end', () => response.status(401).json({ code: 'AUTH_REQUIRED' }));
      authRequest.resume();
    },
  });
  const response = await request(app).post('/api/edits').field('prompt', 'red')
    .attach('sourceImage', Buffer.alloc((10 * MiB) + 1), { filename: 'source.png', contentType: 'image/png' });
  assert.equal(response.status, 401);
  assert.equal(response.body.code, 'AUTH_REQUIRED');
  assert.equal(authenticated, 1);
  assert.equal(calls.reserved, 0);
});

test('checks FLUX.2 readiness before reserving quota', async () => {
  const source = await png(); const { app, calls } = appWith({ source, health: async () => ({ ok: false }) });
  const response = await request(app).post('/api/edits').field('prompt', 'red').attach('sourceImage', source, 'source.png');
  assert.equal(response.status, 503);
  assert.equal(response.body.code, 'FLUX2_NOT_READY');
  assert.equal(calls.reserved, 0);
  assert.equal(calls.saved.length, 0);
});

test('serves injectable FLUX.2 health responses for ready and unavailable states', async () => {
  const readyApp = express();
  readyApp.get('/api/comfyui/flux2/health', createFlux2HealthHandler(async () => ({ ok: true, model: 'flux2' })));
  const ready = await request(readyApp).get('/api/comfyui/flux2/health');
  assert.equal(ready.status, 200);
  assert.deepEqual(ready.body, { ok: true, model: 'flux2' });

  const unavailableApp = express();
  unavailableApp.get('/api/comfyui/flux2/health', createFlux2HealthHandler(async () => ({ ok: false, error: 'offline' })));
  const unavailable = await request(unavailableApp).get('/api/comfyui/flux2/health');
  assert.equal(unavailable.status, 503);
  assert.deepEqual(unavailable.body, { ok: false, error: 'offline' });
});

test('returns payment-required billing without starting an edit', async () => {
  const source = await png();
  let edited = 0;
  const { app, calls } = appWith({
    source,
    reserve: async () => { calls.reserved += 1; return { reservation: null, allowance: {} }; },
    billing: async () => ({ canGenerate: false, freeRemaining: 0, paidCredits: 0 }),
    edit: async () => { edited += 1; throw new Error('must not edit'); },
  });
  const response = await request(app).post('/api/edits').field('prompt', 'red').attach('sourceImage', source, 'source.png');
  assert.equal(response.status, 402);
  assert.equal(response.body.code, 'PAYMENT_REQUIRED');
  assert.equal(response.body.billing.canGenerate, false);
  assert.equal(edited, 0);
  assert.equal(calls.released, 0);
});

test('releases exactly once when saving the completed edit fails', async () => {
  const source = await png();
  const { app, calls } = appWith({ source, save: async () => { throw new Error('database save failed'); } });
  const response = await request(app).post('/api/edits').field('prompt', 'red').attach('sourceImage', source, 'source.png');
  assert.equal(response.status, 502);
  assert.equal(calls.released, 1);
});

test('fetches fallible billing before save and releases when billing fails', async () => {
  const source = await png();
  const { app, calls } = appWith({ source, billing: async () => { throw new Error('billing failed'); } });
  const response = await request(app).post('/api/edits').field('prompt', 'red').attach('sourceImage', source, 'source.png');
  assert.equal(response.status, 502);
  assert.equal(response.body.code, 'IMAGE_EDIT_FAILED');
  assert.equal(calls.saved.length, 0);
  assert.equal(calls.released, 1);
});

test('does not persist an edit after the client aborts', async () => {
  const source = await png();
  let finishEdit;
  let editSignal;
  const { app, calls } = appWith({
    source,
    edit: ({ source: editSource, signal }) => new Promise((resolve) => {
      editSignal = signal;
      finishEdit = () => resolve({ bytes: editSource, provider: 'comfyui', model: 'flux2', createdAt: new Date(0).toISOString(), comfy: {} });
    }),
  });
  const server = await new Promise((resolve) => {
    const listening = app.listen(0, () => resolve(listening));
  });
  try {
    const boundary = 'task-4-abort-boundary';
    const body = Buffer.concat([
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="prompt"\r\n\r\nred\r\n`),
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="sourceImage"; filename="source.png"\r\nContent-Type: image/png\r\n\r\n`),
      source,
      Buffer.from(`\r\n--${boundary}--\r\n`),
    ]);
    let client;
    const clientDone = new Promise((resolve) => {
      client = http.request({
        method: 'POST',
        port: server.address().port,
        path: '/api/edits',
        headers: {
          'content-type': `multipart/form-data; boundary=${boundary}`,
          'content-length': body.length,
        },
      });
      client.on('error', resolve);
      client.end(body);
    });
    await waitFor(() => calls.reserved === 1);
    await waitFor(() => Boolean(finishEdit));
    client.destroy(new Error('test client abort'));
    await clientDone;
    await waitFor(() => editSignal?.aborted);
    assert.equal(calls.released, 0);
    finishEdit();
    await waitFor(() => calls.released === 1);
    assert.equal(calls.saved.length, 0);
    assert.equal(calls.released, 1);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('releases exactly once when masked compositing fails', async () => {
  const source = await png(); const mask = await png({ r: 255, g: 255, b: 255, alpha: 1 });
  const { app, calls } = appWith({ source, edit: async () => ({ bytes: Buffer.from('invalid'), provider: 'comfyui', model: 'flux2', createdAt: new Date(0).toISOString(), comfy: {} }) });
  const response = await request(app).post('/api/edits').field('prompt', 'red')
    .attach('sourceImage', source, 'source.png').attach('mask', mask, 'mask.png');
  assert.equal(response.status, 502);
  assert.equal(calls.released, 1);
  assert.equal(calls.saved.length, 0);
});

test('magic erase removes the masked region without requiring a prompt', async () => {
  const source = await png(); const mask = await png({ r: 255, g: 255, b: 255, alpha: 1 });
  const { app, calls } = appWith({ source });
  const response = await request(app).post('/api/edits')
    .field('prompt', '').field('operation', 'remove')
    .attach('sourceImage', source, 'source.png').attach('mask', mask, 'mask.png');

  assert.equal(response.status, 200);
  assert.equal(response.body.operation, 'remove');
  assert.equal(response.body.masked, true);
  assert.equal(calls.edited.length, 1);
  assert.equal(calls.edited[0].operation, 'remove');
  assert.ok(Buffer.isBuffer(calls.edited[0].mask));
  assert.match(calls.edited[0].prompt, /移除|背景/);
  assert.equal(calls.saved[0].metadata.operation, 'remove');
  assert.equal(calls.saved[0].prompt, 'Magic erase: cleared the selected area');
});

test('magic erase ignores structured category fields', async () => {
  const source = await png(); const mask = await png({ r: 255, g: 255, b: 255, alpha: 1 });
  const { app, calls } = appWith({ source });
  const response = await request(app).post('/api/edits')
    .field('operation', 'remove')
    .field('editCategory', 'not-a-category')
    .attach('sourceImage', source, 'source.png')
    .attach('mask', mask, 'mask.png');

  assert.equal(response.status, 200);
  assert.equal(calls.saved[0].metadata.editControls, null);
});

test('magic erase requires a painted mask', async () => {
  const source = await png();
  const { app, calls } = appWith({ source });

  const noMask = await request(app).post('/api/edits')
    .field('prompt', '').field('operation', 'remove')
    .attach('sourceImage', source, 'source.png');
  assert.equal(noMask.status, 400);
  assert.equal(noMask.body.code, 'EDIT_MASK_REQUIRED');

  const emptyMask = await png({ r: 0, g: 0, b: 0, alpha: 1 });
  const blank = await request(app).post('/api/edits')
    .field('prompt', '').field('operation', 'remove')
    .attach('sourceImage', source, 'source.png').attach('mask', emptyMask, 'mask.png');
  assert.equal(blank.status, 400);
  assert.equal(blank.body.code, 'EDIT_MASK_REQUIRED');
  assert.equal(calls.reserved, 0);
  assert.equal(calls.saved.length, 0);
});
