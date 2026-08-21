const DEFAULT_EXPECTED_MS = 40_000;

export function computeSimulatedProgress(elapsedMs, { expectedMs = DEFAULT_EXPECTED_MS, cap = 0.96 } = {}) {
  const numericElapsed = Number(elapsedMs);
  const elapsed = Math.max(0, Number.isNaN(numericElapsed) ? 0 : numericElapsed);
  const tau = Math.max(1, Number.isFinite(expectedMs) ? expectedMs : DEFAULT_EXPECTED_MS);
  const safeCap = Math.min(0.999, Math.max(0.01, Number.isFinite(cap) ? cap : 0.96));
  const progress = safeCap * (1 - Math.exp(-elapsed / tau));
  return Math.min(safeCap - Number.EPSILON, Math.max(0, progress));
}

export function estimateExpectedMs({ backend, quality, operation = 'generate', count = 1 } = {}) {
  if (operation === 'edit' || operation === 'remove') return 45_000;

  // Candidates generate in parallel, so a batch takes roughly 1.5x a single image.
  const countFactor = Number(count) > 1 ? 1.5 : 1;
  const normalizedBackend = String(backend || '').toLowerCase();
  if (['comfy', 'comfyui', 'flux', 'flux-schnell', 'flux.1-schnell'].includes(normalizedBackend)) return 15_000 * countFactor;
  if (['local', 'local-model', 'local-sd', 'local-sd1.5', 'sd1.5'].includes(normalizedBackend)) return 20_000 * countFactor;

  if (normalizedBackend === 'openai') {
    return (({ low: 20_000, medium: 40_000, high: 75_000 })[quality] || DEFAULT_EXPECTED_MS) * countFactor;
  }

  return DEFAULT_EXPECTED_MS * countFactor;
}

export function progressStageLabel(progress, operation = 'generate') {
  const value = Math.max(0, Number.isFinite(progress) ? progress : 0);
  if (operation === 'edit' || operation === 'remove') {
    if (value < 0.2) return 'Analysing the source image…';
    if (value < 0.6) return 'Repainting the selection…';
    if (value < 0.9) return 'Blending the edges…';
    return 'Almost done…';
  }

  if (value < 0.15) return 'Reading your description…';
  if (value < 0.4) return 'Laying out the composition…';
  if (value < 0.7) return 'Painting the details…';
  if (value < 0.9) return 'Refining the face and lighting…';
  return 'Almost done, rendering at full resolution…';
}
