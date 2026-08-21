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

test('uses EXIF-corrected dimensions before resizing a rotated JPEG', async () => {
  const input = await sharp({
    create: { width: 400, height: 200, channels: 3, background: '#f00' },
  }).jpeg().withMetadata({ orientation: 6 }).toBuffer();
  const result = await normalizeSourceImage(input, { maxEdge: 320, maxPixels: 100_000 });
  assert.deepEqual([result.width, result.height], [160, 320]);
  const metadata = await sharp(result.buffer).metadata();
  assert.deepEqual([metadata.width, metadata.height], [160, 320]);
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
  const maskPixels = await sharp(result.buffer).greyscale().raw().toBuffer();
  assert.equal(maskPixels[(4 * 8) + 4], 255);
});

test('fills the interior of a closed magic erase outline', async () => {
  const width = 7;
  const height = 7;
  const rgba = Buffer.alloc(width * height * 4);
  for (let y = 2; y <= 4; y += 1) {
    for (let x = 2; x <= 4; x += 1) {
      if (x === 2 || x === 4 || y === 2 || y === 4) rgba[((y * width) + x) * 4 + 3] = 255;
    }
  }
  const input = await sharp(rgba, { raw: { width, height, channels: 4 } }).png().toBuffer();
  const result = await normalizeMask(input, { width, height, featherRadius: 0, fillEnclosed: true });
  const pixels = await sharp(result.buffer).greyscale().raw().toBuffer();

  assert.equal(pixels[(3 * width) + 3], 255);
  assert.equal(pixels[(1 * width) + 1], 0);
});

test('does not fill the interior of an open magic erase outline', async () => {
  const width = 7;
  const height = 7;
  const rgba = Buffer.alloc(width * height * 4);
  for (let y = 2; y <= 4; y += 1) {
    for (let x = 2; x <= 4; x += 1) {
      if ((x === 2 || x === 4 || y === 2 || y === 4) && !(x === 3 && y === 2)) {
        rgba[((y * width) + x) * 4 + 3] = 255;
      }
    }
  }
  const input = await sharp(rgba, { raw: { width, height, channels: 4 } }).png().toBuffer();
  const result = await normalizeMask(input, { width, height, featherRadius: 0, fillEnclosed: true });
  const pixels = await sharp(result.buffer).greyscale().raw().toBuffer();

  assert.equal(pixels[(3 * width) + 3], 0);
});

test('feathers inward without adding alpha outside the binary mask', async () => {
  const raw = Buffer.alloc(32 * 32);
  for (let y = 8; y < 24; y += 1) for (let x = 8; x < 24; x += 1) raw[(y * 32) + x] = 255;
  const input = await sharp(raw, { raw: { width: 32, height: 32, channels: 1 } }).png().toBuffer();
  const result = await normalizeMask(input, { width: 32, height: 32, featherRadius: 4 });
  assert.equal((await sharp(result.buffer).metadata()).channels, 1);
  const alpha = await sharp(result.buffer).greyscale().raw().toBuffer();
  assert.equal(alpha[(7 * 32) + 7], 0);
  assert.ok(alpha[(8 * 32) + 8] > 0 && alpha[(8 * 32) + 8] < 255);
  assert.ok(alpha[(16 * 32) + 16] > 200);
  assert.equal(alpha[(12 * 32) + 8], alpha[(12 * 32) + 23]);
  assert.equal(alpha[(8 * 32) + 12], alpha[(23 * 32) + 12]);
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
