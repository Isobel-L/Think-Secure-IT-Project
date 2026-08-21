import { catalog, flattenedGroups, getGroup, getOption } from './catalog.js';

const optionKey = (groupId, optionId) => `${groupId}.${optionId}`;

function cloneSelections(selections) {
  return Object.fromEntries(Object.entries(selections || {})
    .filter(([, values]) => Array.isArray(values) && values.length)
    .map(([groupId, values]) => [groupId, [...values]]));
}

function conflictsWith(option, key) {
  return (option.conflicts || []).includes(key);
}

function removalNotice(removed) {
  if (!removed.length) return '';
  const labels = removed.map(({ groupId, optionId }) => getOption(groupId, optionId)?.label || optionId);
  return `Replaced conflicting or excess options: ${labels.join(', ')}`;
}

export function resolveSelectionToggle(selections, groupId, optionId, modelId = 'flux1-schnell') {
  const group = getGroup(groupId);
  const selectedOption = getOption(groupId, optionId);
  if (!group || !selectedOption || !selectedOption.modelSupport.includes(modelId)) {
    throw new RangeError(`Unsupported parameter selection: ${groupId}.${optionId}`);
  }

  const next = cloneSelections(selections);
  const current = next[groupId] || [];
  if (current.includes(selectedOption.id)) {
    const remaining = current.filter((id) => id !== selectedOption.id);
    if (remaining.length) next[groupId] = remaining;
    else delete next[groupId];
    return {
      selections: next,
      removed: [{ groupId, optionId: selectedOption.id }],
      notice: '',
    };
  }

  const removed = [];
  const newKey = optionKey(groupId, selectedOption.id);
  for (const [existingGroupId, ids] of Object.entries(next)) {
    const retained = ids.filter((id) => {
      const existing = getOption(existingGroupId, id);
      const existingKey = optionKey(existingGroupId, id);
      const conflict = conflictsWith(selectedOption, existingKey) || conflictsWith(existing || {}, newKey);
      const sameSingleGroup = existingGroupId === groupId && group.mode === 'single';
      if (conflict || sameSingleGroup) {
        removed.push({ groupId: existingGroupId, optionId: id });
        return false;
      }
      return true;
    });
    if (retained.length) next[existingGroupId] = retained;
    else delete next[existingGroupId];
  }

  const updated = [...(next[groupId] || []), selectedOption.id];
  while (updated.length > group.maxSelections) {
    removed.push({ groupId, optionId: updated.shift() });
  }
  next[groupId] = updated;

  return {
    selections: next,
    removed,
    notice: removalNotice(removed),
  };
}

export function randomSelections(modelId = 'flux1-schnell', random = Math.random) {
  const groups = flattenedGroups.filter((group) => group.options.some((option) => option.modelSupport.includes(modelId)));
  const shuffled = [...groups].sort(() => random() - 0.5);
  const picked = shuffled.slice(0, 4 + Math.floor(random() * 4));
  const baseStyle = groups.find((group) => group.id === 'baseStyle');
  // baseStyle has to be applied last: resolveSelectionToggle drops earlier conflicting picks, so a
  // baseStyle landing early in the shuffle could be evicted by a later group.
  const chosen = baseStyle
    ? [...picked.filter((group) => group !== baseStyle), baseStyle]
    : picked;

  let selections = {};
  for (const group of chosen) {
    const supported = group.options.filter((option) => option.modelSupport.includes(modelId));
    if (!supported.length) continue;
    const want = group.mode === 'single'
      ? 1
      : 1 + Math.floor(random() * Math.max(1, Math.min(group.maxSelections || 1, 2)));
    const picks = [...supported].sort(() => random() - 0.5).slice(0, want);
    for (const option of picks) {
      if ((selections[group.id] || []).includes(option.id)) continue;
      selections = resolveSelectionToggle(selections, group.id, option.id, modelId).selections;
    }
  }
  return { selections };
}

export function selectionLabels(selections) {
  return Object.entries(selections || {}).flatMap(([groupId, ids]) =>
    (Array.isArray(ids) ? ids : []).map((id) => getOption(groupId, id)?.label).filter(Boolean));
}

export function normalizeSelectionState(input, modelId = 'flux1-schnell') {
  const selections = {};
  const errors = [];
  if (input == null) return { selections, errors };
  if (typeof input !== 'object' || Array.isArray(input)) {
    return { selections, errors: [{ code: 'INVALID_SELECTIONS', value: input }] };
  }

  for (const [groupId, rawValues] of Object.entries(input)) {
    if (!getGroup(groupId)) {
      errors.push({ code: 'UNKNOWN_GROUP', groupId });
      continue;
    }
    const values = Array.isArray(rawValues) ? rawValues : [rawValues];
    for (const value of values) {
      const resolved = getOption(groupId, value);
      if (!resolved) {
        errors.push({ code: 'UNKNOWN_OPTION', groupId, value });
        continue;
      }
      if (!resolved.modelSupport.includes(modelId)) {
        errors.push({ code: 'UNSUPPORTED_OPTION', groupId, value });
        continue;
      }
      const result = resolveSelectionToggle(selections, groupId, resolved.id, modelId);
      Object.keys(selections).forEach((key) => delete selections[key]);
      Object.assign(selections, result.selections);
    }
  }

  return { selections, errors };
}

export function getPublicCatalog(modelId = 'flux1-schnell') {
  return catalog.map((section) => ({
    ...section,
    groups: section.groups.map((group) => ({
      ...group,
      options: group.options.filter((entry) => entry.modelSupport.includes(modelId)),
    })).filter((group) => group.options.length),
  })).filter((section) => section.groups.length);
}
