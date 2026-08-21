import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { parseDataUrl } from './imageUtils.js';

const imageFilePattern = /^[0-9a-f-]+(\.thumb)?\.(png|webp)$/i;

function storageDir() {
  return path.resolve(process.env.AVATAR_STORAGE_DIR || './data/avatars');
}

export async function ensureStorageDir() {
  await mkdir(storageDir(), { recursive: true });
}

export async function saveImage(dataUrlOrBuffer) {
  const parsed = Buffer.isBuffer(dataUrlOrBuffer) ? null : parseDataUrl(dataUrlOrBuffer);
  const input = Buffer.isBuffer(dataUrlOrBuffer) ? dataUrlOrBuffer : parsed?.buffer;
  if (!input?.length) throw new Error('Image data is empty or invalid.');

  const metadata = await sharp(input, { animated: false }).metadata();
  const original = metadata.format === 'png' ? input : await sharp(input, { animated: false }).png().toBuffer();
  const thumbnail = await sharp(original, { animated: false })
    .resize(256, 256, { fit: 'cover' })
    .webp({ quality: 80 })
    .toBuffer();
  const id = randomUUID();
  const imageFile = `${id}.png`;
  const thumbFile = `${id}.thumb.webp`;

  await ensureStorageDir();
  await Promise.all([
    writeFile(path.join(storageDir(), imageFile), original),
    writeFile(path.join(storageDir(), thumbFile), thumbnail),
  ]);
  return { imageFile, thumbFile };
}

export async function readImage(fileName) {
  if (!imageFilePattern.test(fileName || '')) return null;
  try {
    return {
      buffer: await readFile(path.join(storageDir(), fileName)),
      mimeType: fileName.toLowerCase().endsWith('.webp') ? 'image/webp' : 'image/png',
    };
  } catch {
    return null;
  }
}

export async function deleteImageFiles(imageFile, thumbFile) {
  await Promise.all([imageFile, thumbFile].map(async (fileName) => {
    if (!imageFilePattern.test(fileName || '')) return;
    await rm(path.join(storageDir(), fileName), { force: true }).catch(() => {});
  }));
}
