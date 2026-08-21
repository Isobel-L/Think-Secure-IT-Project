import assert from 'node:assert/strict';
import test from 'node:test';
import sharp from 'sharp';
import { transformDownloadImage } from '../server/imageUtils.js';

async function sourcePng() {
  return sharp({ create: { width: 1024, height: 1024, channels: 3, background: { r: 200, g: 40, b: 80 } } })
    .png().toBuffer();
}

test('returns null for the untransformed original', async () => {
  assert.equal(await transformDownloadImage(await sourcePng(), { size: 1024, shape: 'square' }), null);
  assert.equal(await transformDownloadImage(await sourcePng(), {}), null);
});

test('resizes square exports to the requested edge', async () => {
  const output = await transformDownloadImage(await sourcePng(), { size: 640, shape: 'square' });
  const metadata = await sharp(output).metadata();
  assert.equal(metadata.width, 640);
  assert.equal(metadata.height, 640);
  assert.equal(metadata.format, 'png');
});

test('circle exports are transparent in the corners and opaque in the center', async () => {
  const output = await transformDownloadImage(await sourcePng(), { size: 256, shape: 'circle' });
  const { data, info } = await sharp(output).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  assert.equal(info.width, 256);
  const alphaAt = (x, y) => data[((y * info.width) + x) * 4 + 3];
  assert.equal(alphaAt(2, 2), 0);
  assert.equal(alphaAt(253, 2), 0);
  assert.equal(alphaAt(128, 128), 255);
});

test('falls back to the original edge for unknown sizes', async () => {
  const output = await transformDownloadImage(await sourcePng(), { size: 999, shape: 'circle' });
  const metadata = await sharp(output).metadata();
  assert.equal(metadata.width, 1024);
});
