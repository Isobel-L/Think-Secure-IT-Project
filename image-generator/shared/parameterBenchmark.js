import { flattenedGroups } from './catalog.js';
import { colorSwatches, colorTargets, editCategories } from './editControls.js';
import { FLUX2_EDIT_PROFILE, GENERATION_PROFILE } from './modelProfiles.js';

export const benchmarkSeeds = Object.freeze([42, 314159, 20260714]);

function generationCases() {
  return flattenedGroups.flatMap((group) => group.options.map((option) => ({
    id: `generation.${group.id}.${option.id}`,
    modelProfileId: GENERATION_PROFILE.id,
    reliability: option.reliability,
    request: {
      brief: '单人社交头像，面部清晰，构图简洁。',
      selections: { [group.id]: [option.id] },
    },
    checks: ['executionSuccess', 'instructionAdherence', 'faceIntegrity', 'cropSafety', 'artifactFree'],
  })));
}

function editCases() {
  const color = colorTargets.map((entry, index) => ({
    id: `edit.color.${entry.id}`,
    modelProfileId: FLUX2_EDIT_PROFILE.id,
    request: {
      editCategory: 'color',
      editTarget: entry.id,
      editOption: colorSwatches[index % colorSwatches.length].id,
      colorHex: colorSwatches[index % colorSwatches.length].hex,
    },
    checks: ['executionSuccess', 'instructionAdherence', 'subjectPreservation', 'boundaryQuality', 'artifactFree'],
  }));
  const predefined = editCategories.flatMap((category) => category.options.map((option) => ({
    id: `edit.${category.id}.${option.id}`,
    modelProfileId: FLUX2_EDIT_PROFILE.id,
    request: {
      editCategory: category.id,
      editTarget: category.targets[0]?.id || '',
      editOption: option.id,
    },
    checks: ['executionSuccess', 'instructionAdherence', 'subjectPreservation', 'compositionStability', 'artifactFree'],
  })));
  return [
    ...color,
    ...predefined,
    {
      id: 'edit.replace.accessory',
      modelProfileId: FLUX2_EDIT_PROFILE.id,
      request: { editCategory: 'replace', editTarget: '胸针', prompt: '替换为小巧的星形胸针' },
      checks: ['executionSuccess', 'instructionAdherence', 'subjectPreservation', 'boundaryQuality', 'artifactFree'],
    },
    {
      id: 'edit.custom.bangs',
      modelProfileId: FLUX2_EDIT_PROFILE.id,
      request: { editCategory: 'custom', prompt: '只把刘海稍微变短，其他内容保持不变' },
      checks: ['executionSuccess', 'instructionAdherence', 'subjectPreservation', 'artifactFree'],
    },
  ];
}

export function createBenchmarkManifest() {
  return {
    schemaVersion: 1,
    modelProfiles: [GENERATION_PROFILE.id, FLUX2_EDIT_PROFILE.id],
    seeds: [...benchmarkSeeds],
    scoringScale: { min: 1, max: 5 },
    scoringFields: [
      'executionSuccess',
      'instructionAdherence',
      'subjectPreservation',
      'faceIntegrity',
      'cropSafety',
      'compositionStability',
      'boundaryQuality',
      'artifactFree',
      'hardFailure',
      'notes',
    ],
    classification: {
      stable: 'successRate >= 80 and hardFailureRate <= 5',
      experimental: 'successRate >= 60 unless hardFailureRate > 15',
      remove: 'successRate < 60 or hardFailureRate > 15',
    },
    generationCases: generationCases(),
    editCases: editCases(),
  };
}

export function classifyBenchmarkScore({ successRate, hardFailureRate }) {
  for (const value of [successRate, hardFailureRate]) {
    if (!Number.isFinite(value) || value < 0 || value > 100) {
      throw new RangeError('Benchmark rates must be percentages from 0 to 100.');
    }
  }
  if (successRate < 60 || hardFailureRate > 15) return 'remove';
  if (successRate >= 80 && hardFailureRate <= 5) return 'stable';
  return 'experimental';
}
