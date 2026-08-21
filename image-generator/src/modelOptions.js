const defaults = [
  { id: 'flux1-qwen', label: 'FLUX.1 with prompt translation (recommended)', available: false },
  { id: 'flux1-raw', label: 'FLUX.1 raw prompt', available: true },
];

export function normalizePromptModes(payload = {}) {
  const allowed = new Set(defaults.map((mode) => mode.id));
  const supplied = Array.isArray(payload.promptModes)
    ? payload.promptModes
      .filter((mode) => allowed.has(mode?.id))
      .map((mode) => ({
        id: mode.id,
        label: typeof mode.label === 'string' && mode.label.trim()
          ? mode.label.trim()
          : defaults.find((item) => item.id === mode.id).label,
        available: mode.available !== false,
      }))
    : [];
  const modes = supplied.length ? supplied : defaults.map((mode) => ({ ...mode }));
  if (!modes.some((mode) => mode.id === 'flux1-raw')) modes.push({ ...defaults[1] });
  if (!payload.translatorReady) {
    const qwen = modes.find((mode) => mode.id === 'flux1-qwen');
    if (qwen) qwen.available = false;
  }
  const requested = modes.find((mode) => (
    mode.id === payload.selectedPromptMode && mode.available
  ));
  const selected = requested?.id
    || modes.find((mode) => mode.available)?.id
    || 'flux1-raw';
  return { modes, selected };
}
