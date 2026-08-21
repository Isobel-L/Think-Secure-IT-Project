# FLUX Backend Parameter Optimization Design

## Scope

This design targets `flux1-schnell-fp8.safetensors` for generation and `flux-2-klein-4b-fp8.safetensors` for editing. It preserves authentication, PostgreSQL history, local unlimited usage, downloads, locking, magic erase, and the OpenAI edit fallback.

## Model Profiles

Generation uses 1024 x 1024, 4 steps, CFG 1, Euler, Simple, denoise 1, and a random seed by default. FLUX.2 editing uses 4 steps, CFG 1, Euler, Simple, denoise 1, and mask feather 8. Runtime settings are backend configuration, not creative parameter chips.

## Parameter Model

Every creative option has a stable ID, label, prompt fragment, model support, reliability, exclusive group, conflicts, and optional maximum selection count. The stable UI contains generic visual styles, character traits, hair style and color, outfit, compatible accessories, avatar-safe composition, expression, scene, palette, and lighting.

Named IP styles, fake sampling controls, 4K claims, commercial-use claims, full-body avatar poses, and unreliable complex interactions are removed. Quality safeguards become fixed prompt requirements.

The newest explicit selection wins. The shared conflict resolver removes older values in the same exclusive group, declared conflicts, and values beyond a group limit. It returns both the normalized state and replacement notices.

## Backend Validation

The server accepts only IDs supported by the active model profile. Legacy Chinese labels are mapped to current IDs where an unambiguous migration exists. Unknown or unsupported IDs return `400 PARAMETER_SELECTION_INVALID` with field-level details.

Generation prompts use this order: subject, composition, appearance, outfit, expression and pose, style, palette and lighting, scene, fixed quality constraints. The prompt never contains steps, CFG, sampler claims, commercial-use claims, or uniqueness claims.

## FLUX.2 Edit Controls

Editing categories are color, hairstyle, clothing, expression, background, lighting, style, replace, custom, and the existing magic erase operation. Structured edits are compiled on the server so browser input cannot bypass validation.

Color edits require a target and either a curated swatch ID or a valid six-digit HEX value. Targets are hair, eyes, clothing, background, and accessory. The compiled instruction names one target, one color, and preservation constraints. Exact pixel-level color matching is not promised.

Magic erase remains a separate `remove` operation and continues to require a painted mask. Existing free-text requests remain supported as `custom` edits.

## Evaluation

Static tests cover schema validity, random click sequences, conflict invariants, prompt output, runtime profiles, edit templates, and unsupported input. A benchmark manifest uses seeds 42, 314159, and 20260714. Parameters are stable at 80 percent success with no more than 5 percent hard failures, experimental at 60-79 percent, and removed below 60 percent or above 15 percent hard failures.

## Acceptance Criteria

- Visible creative controls never claim to change runtime settings.
- Conflicts are replaced deterministically and explained to the user.
- Server validation rejects unsupported values before invoking a model.
- FLUX.1 receives concise profile-specific prompts.
- FLUX.2 receives one validated primary edit operation.
- Color controls bind a target object to a swatch or HEX value.
- Existing magic erase and OpenAI fallback tests remain green.
- A reproducible benchmark manifest and score classifier are available from npm scripts.

