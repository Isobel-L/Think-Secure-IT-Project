function createProfile(profile) {
  return Object.freeze({
    ...profile,
    runtime: Object.freeze({ ...profile.runtime }),
  });
}

export const GENERATION_PROFILE = createProfile({
  id: 'flux1-schnell',
  label: 'FLUX.1 Schnell',
  operation: 'generation',
  checkpoint: 'flux1-schnell-fp8.safetensors',
  runtime: {
    width: 1024,
    height: 1024,
    steps: 4,
    cfg: 1,
    samplerName: 'euler',
    scheduler: 'simple',
    denoise: 1,
  },
});

export const FLUX2_EDIT_PROFILE = createProfile({
  id: 'flux2-klein-4b',
  label: 'FLUX.2 Klein 4B',
  operation: 'edit',
  checkpoint: 'flux-2-klein-4b-fp8.safetensors',
  runtime: {
    steps: 4,
    cfg: 1,
    samplerName: 'euler',
    scheduler: 'simple',
    denoise: 1,
    maskFeather: 8,
  },
});

const profiles = new Map([
  [GENERATION_PROFILE.id, GENERATION_PROFILE],
  [FLUX2_EDIT_PROFILE.id, FLUX2_EDIT_PROFILE],
]);

export function getModelProfile(id) {
  return profiles.get(id) || null;
}
