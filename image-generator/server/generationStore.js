// Generation history for the database-free build: images go into a local folder
// (AVATAR_STORAGE_DIR, ./data/avatars by default) and their metadata into a generations.json
// beside them. The exported signatures match the server/db.js functions the routes used, so
// switching back to Postgres only means pointing server/index.js at ./db.js again.
import { readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { deleteImageFiles, ensureStorageDir, readImage, saveImage } from './imageStore.js';

// Past this cap the oldest record is evicted along with its files, so the folder cannot grow forever.
const historyLimit = Math.max(1, Number.parseInt(process.env.GUEST_HISTORY_LIMIT, 10) || 200);

function storageDir() {
  return path.resolve(process.env.AVATAR_STORAGE_DIR || './data/avatars');
}

function indexPath() {
  return path.join(storageDir(), 'generations.json');
}

let records = null;
// Serialised writes: concurrent generations must not clobber each other's index file.
let writeChain = Promise.resolve();

async function loadRecords() {
  if (records) return records;
  try {
    const parsed = JSON.parse(await readFile(indexPath(), 'utf8'));
    records = Array.isArray(parsed) ? parsed.filter((item) => item && typeof item.id === 'string') : [];
  } catch {
    // No index on first run, or a corrupted one: start from an empty history instead of failing.
    records = [];
  }
  return records;
}

function persist() {
  const snapshot = JSON.stringify(records ?? []);
  writeChain = writeChain.then(async () => {
    await ensureStorageDir();
    // Write a temp file and rename it, so an interrupted process cannot leave half a JSON document.
    const target = indexPath();
    const temporary = `${target}.tmp`;
    await writeFile(temporary, snapshot);
    await rename(temporary, target);
  }).catch((error) => {
    console.error('[generation-store]', error?.message || error);
  });
  return writeChain;
}

export function isDatabaseConfigured() {
  return false;
}

// Guest mode has no billing: generating, editing and downloading are unlimited and never lock an image.
export function guestBillingStatus() {
  return {
    guestMode: true,
    unlimitedUsage: true,
    canGenerate: true,
    canDownload: true,
    freeLimit: null,
    freeUsed: 0,
    freeRemaining: null,
    paidCredits: 0,
    plan: null,
    plans: [],
    provider: 'none',
    testPaymentEnabled: false,
  };
}

function publicGeneration(record) {
  return {
    id: record.id,
    parentGenerationId: record.parentGenerationId,
    image: `/api/generations/${record.id}/image`,
    thumb: `/api/generations/${record.id}/thumb`,
    prompt: record.prompt,
    negativePrompt: record.negativePrompt,
    brief: record.brief,
    avoid: record.avoid,
    selections: record.selections,
    strategy: record.strategy,
    metadata: record.metadata,
    provider: record.provider,
    model: record.model,
    // Without billing there is no download lock, so these stay null and the UI always allows another edit.
    downloadedAt: null,
    lockedAt: null,
    locked: false,
    createdAt: record.createdAt,
    downloadUrl: `/api/generations/${record.id}/download`,
  };
}

async function findRecord(generationId) {
  return (await loadRecords()).find((record) => record.id === generationId) || null;
}

export async function initializeStore() {
  await ensureStorageDir();
  await loadRecords();
  return records.length;
}

export async function saveAvatarGeneration({
  image,
  prompt,
  negativePrompt,
  brief,
  avoid,
  selections,
  strategy,
  metadata,
  provider,
  model,
  parentGenerationId,
}) {
  await loadRecords();
  const { imageFile, thumbFile } = await saveImage(image);
  const record = {
    // The stored file is named with a UUID; reusing it as the record id keeps the two easy to match up.
    id: path.parse(imageFile).name,
    parentGenerationId: parentGenerationId || null,
    imageFile,
    thumbFile,
    prompt: prompt || '',
    negativePrompt: negativePrompt || '',
    brief: brief || '',
    avoid: avoid || '',
    selections: selections || {},
    strategy: strategy || {},
    metadata: metadata || {},
    provider: provider || '',
    model: model || '',
    createdAt: new Date().toISOString(),
  };

  records.unshift(record);
  const evicted = records.splice(historyLimit);
  await persist();
  for (const stale of evicted) {
    await deleteImageFiles(stale.imageFile, stale.thumbFile).catch(() => {});
  }
  return publicGeneration(record);
}

export async function listAvatarGenerations(_userId, limit = 24) {
  return (await loadRecords()).slice(0, limit).map(publicGeneration);
}

export async function getAvatarGeneration({ generationId }) {
  const record = await findRecord(generationId);
  return record ? publicGeneration(record) : null;
}

export async function getAvatarGenerationImageBytes({ generationId }) {
  const record = await findRecord(generationId);
  return record ? readImage(record.imageFile) : null;
}

export async function getAvatarGenerationThumbBytes({ generationId }) {
  const record = await findRecord(generationId);
  if (!record) return null;
  return (await readImage(record.thumbFile)) || readImage(record.imageFile);
}

export async function deleteAvatarGeneration({ generationId }) {
  await loadRecords();
  const position = records.findIndex((record) => record.id === generationId);
  if (position < 0) return false;

  const [removed] = records.splice(position, 1);
  await persist();
  await deleteImageFiles(removed.imageFile, removed.thumbFile).catch(() => {});
  return true;
}
