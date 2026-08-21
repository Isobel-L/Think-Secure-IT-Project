export function getEditorSource(item) {
  if (!item) return null;
  return {
    image: item.image,
    generationId: item.id || item.generation?.id || '',
  };
}

export function findParentGeneration(history, generationLike) {
  const generation = generationLike?.generation || generationLike;
  const parentId = generation?.parentGenerationId;
  if (!parentId || !Array.isArray(history)) return null;
  return history.find((item) => item.id === parentId) || null;
}

export function canOpenImageEditor(user) {
  return Boolean(user);
}

export function isUnlimitedLocalUsage(billing) {
  return billing?.unlimitedUsage === true;
}

export function shouldUseFlux2Editor(item) {
  const provider = item?.provider || item?.generation?.provider;
  return provider === 'comfyui' || provider === 'local-model';
}

export function mergeEditedGeneration(history, generation, limit = 24) {
  if (!generation) return history;
  return [generation, ...history.filter((item) => item.id !== generation.id)].slice(0, limit);
}

export function resolveHistoryRefresh({ requestId, currentRequestId, items, pendingGeneration }) {
  if (requestId !== currentRequestId) return null;
  const history = Array.isArray(items) ? items : [];
  if (!pendingGeneration) return { history, pendingAcknowledged: false };
  if (history.some((item) => item.id === pendingGeneration.id)) {
    return { history, pendingAcknowledged: true };
  }
  return {
    history: mergeEditedGeneration(history, pendingGeneration),
    pendingAcknowledged: false,
  };
}

export async function readJsonResponse(response, fallbackMessage) {
  try {
    const payload = await response.json();
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new TypeError('Invalid JSON payload');
    return payload;
  } catch {
    throw new Error(fallbackMessage);
  }
}

export function buildEditFormData({
  prompt,
  sourceGenerationId,
  sourceFile,
  maskFile,
  operation,
  editCategory,
  editTarget,
  editOption,
  colorHex,
}) {
  if (Boolean(sourceGenerationId) === Boolean(sourceFile)) {
    throw new Error('Exactly one edit source is required.');
  }

  const form = new FormData();
  form.append('prompt', prompt);
  if (operation && operation !== 'edit') form.append('operation', operation);
  if (editCategory) form.append('editCategory', editCategory);
  if (editTarget) form.append('editTarget', editTarget);
  if (editOption) form.append('editOption', editOption);
  if (colorHex) form.append('colorHex', colorHex);
  if (sourceGenerationId) form.append('sourceGenerationId', sourceGenerationId);
  if (sourceFile) form.append('sourceImage', sourceFile);
  if (maskFile) form.append('mask', maskFile);
  return form;
}
