import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import sharp from 'sharp';
import {
  deleteImageFiles,
  readImage,
  saveImage,
} from '../server/imageStore.js';

async function withStorage(t) {
  const previous = process.env.AVATAR_STORAGE_DIR;
  const directory = await mkdtemp(path.join(tmpdir(), 'avatar-image-store-'));
  process.env.AVATAR_STORAGE_DIR = directory;
  t.after(async () => {
    if (previous === undefined) delete process.env.AVATAR_STORAGE_DIR;
    else process.env.AVATAR_STORAGE_DIR = previous;
    await rm(directory, { recursive: true, force: true });
  });
}

test('saves a PNG and a WebP thumbnail, then reads the original bytes', async (t) => {
  await withStorage(t);
  const original = await sharp({
    create: { width: 640, height: 480, channels: 4, background: { r: 220, g: 20, b: 80, alpha: 1 } },
  }).png().toBuffer();
  const dataUrl = `data:image/png;base64,${original.toString('base64')}`;

  const saved = await saveImage(dataUrl);
  assert.match(saved.imageFile, /^[0-9a-f-]+\.png$/i);
  assert.match(saved.thumbFile, /^[0-9a-f-]+\.thumb\.webp$/i);

  const image = await readImage(saved.imageFile);
  const thumbnail = await readImage(saved.thumbFile);
  assert.equal(image.mimeType, 'image/png');
  assert.deepEqual(image.buffer, original);
  assert.equal(thumbnail.mimeType, 'image/webp');
  const metadata = await sharp(thumbnail.buffer).metadata();
  assert.equal(metadata.format, 'webp');
  assert.ok(metadata.width <= 256);
  assert.ok(metadata.height <= 256);
});

test('normalizes non-PNG input to a PNG original', async (t) => {
  await withStorage(t);
  const jpeg = await sharp({
    create: { width: 24, height: 16, channels: 3, background: { r: 10, g: 30, b: 50 } },
  }).jpeg().toBuffer();

  const saved = await saveImage(jpeg);
  const image = await readImage(saved.imageFile);
  assert.equal((await sharp(image.buffer).metadata()).format, 'png');
});

test('rejects unsafe file names instead of reading outside storage', async (t) => {
  await withStorage(t);
  assert.equal(await readImage('../x.png'), null);
  assert.equal(await readImage('not-an-avatar.png'), null);
});

test('deletes stored files and tolerates missing or unsafe names', async (t) => {
  await withStorage(t);
  const original = await sharp({
    create: { width: 16, height: 16, channels: 3, background: { r: 0, g: 0, b: 0 } },
  }).png().toBuffer();
  const saved = await saveImage(original);

  await deleteImageFiles(saved.imageFile, saved.thumbFile);
  await deleteImageFiles(saved.imageFile, '../outside.webp');
  assert.equal(await readImage(saved.imageFile), null);
  assert.equal(await readImage(saved.thumbFile), null);
});
