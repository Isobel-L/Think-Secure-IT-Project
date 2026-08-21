# FLUX.1 Qwen Chinese Prompt Translation Pipeline

## Goal

Improve Chinese instruction following while keeping model responsibilities fixed:

- FLUX.1 Schnell performs every initial text-to-image generation.
- `qwen_3_4b.safetensors` translates and normalizes Chinese prompts before FLUX.1 runs.
- FLUX.2 Klein performs every edit that starts from an existing image.
- FLUX.2 is never selected automatically for initial generation.

## Verified Local Capability

The installed ComfyUI exposes `CLIPLoader`, `TextGenerate`, and `PreviewAny`. A local probe using `qwen_3_4b.safetensors` with `CLIPLoader(type=flux2)` and `TextGenerate` translated:

```text
一个少年程序员坐在咖啡馆中写代码
```

to:

```text
A teenage programmer sits in a cafe writing code.
```

The Qwen file therefore remains a ComfyUI text model in this design. It does not replace FLUX.1's native text-conditioning interface.

## Generation Data Flow

1. The browser submits the original brief, exclusions, creative selections, and a generation prompt mode.
2. Existing deterministic selection rules normalize IDs and remove declared conflicts.
3. The backend builds a translation request that requires Qwen to preserve subjects, actions, objects, setting, count, age, gender, identity, and spatial relationships.
4. A small ComfyUI text-only workflow runs `CLIPLoader -> TextGenerate -> PreviewAny`.
5. The backend extracts and validates the generated English text.
6. The prompt compiler places the translated instruction first, then adds compatible selected directions, exclusions, composition rules, and quality rules.
7. The existing FLUX.1 checkpoint workflow generates the image.
8. The database stores the Chinese source brief, final FLUX.1 prompt, translation status, and model metadata.

The Qwen translation result is text. It is not connected directly as FLUX.1 conditioning because FLUX.1 and FLUX.2 use incompatible text-conditioning architectures.

## Prompt Modes

The generation selector exposes only FLUX.1 pipelines:

- `flux1-qwen`: FLUX.1 with Qwen Chinese-to-English translation. This is the default and recommended mode.
- `flux1-raw`: FLUX.1 with the normalized user text without Qwen. This is an advanced diagnostic fallback.

Available FLUX.1 checkpoints may remain selectable separately when ComfyUI reports more than one compatible checkpoint. FLUX.2 does not appear in the initial-generation selector.

## Translation Contract

The translator receives a stable instruction and must return only one English image prompt. It must:

- preserve all explicit content and relationships;
- avoid adding a new person, gender, accessory, activity, or setting;
- resolve no catalog conflicts itself;
- retain explicit exclusions as exclusions;
- remain concise enough for FLUX.1 conditioning;
- omit explanations, Markdown, labels, and quotation marks.

The backend trims the output, rejects empty or oversized text, removes known response wrappers, and records whether translation succeeded.

## Failure Handling

- A transport or ComfyUI execution failure triggers one translation retry.
- Invalid text output also triggers one retry with deterministic sampling.
- If both attempts fail, generation continues through `flux1-raw` and returns `translationFallback: true` in metadata.
- A FLUX.1 generation failure follows the existing customer-facing ComfyUI error path.
- Translation failure never routes initial generation to FLUX.2.

## Editing Boundary

Every edit request continues through the existing FLUX.2 reference-edit workflow. The editor receives the selected history image or uploaded source, structured edit controls, optional mask, and edit instruction. Qwen translation for initial generation is not inserted into the edit path because FLUX.2 already uses its own multilingual Qwen encoder.

## API Changes

`GET /api/comfyui/models` returns:

- compatible FLUX.1 checkpoints;
- prompt modes `flux1-qwen` and `flux1-raw`;
- default prompt mode `flux1-qwen`;
- Qwen translation readiness.

`POST /api/generate` accepts `promptMode` and returns:

- `sourceBrief`;
- `translatedPrompt` when translation succeeds;
- `translationUsed`;
- `translationFallback`;
- FLUX.1 checkpoint metadata.

`POST /api/prompt-preview` may run translation only when explicitly requested; otherwise it returns the deterministic pre-translation bundle so preview calls do not repeatedly load the text model.

## Configuration

```dotenv
COMFY_GENERATION_ENGINE=flux1
COMFY_PROMPT_MODE=flux1-qwen
COMFY_TRANSLATOR_CLIP_NAME=qwen_3_4b.safetensors
COMFY_TRANSLATOR_CLIP_TYPE=flux2
COMFY_TRANSLATOR_MAX_LENGTH=384
COMFY_TRANSLATOR_RETRIES=1
```

FLUX.2 generation code introduced by the previous experiment is removed from the initial-generation dispatcher. The FLUX.2 edit implementation remains unchanged.

## Testing

- Unit-test the Qwen translation workflow graph and history text extraction.
- Unit-test translation validation, retry, and raw fallback.
- Unit-test prompt ordering so translated user content precedes generic constraints.
- Unit-test dispatch so every generation mode invokes FLUX.1 and no generation path invokes FLUX.2.
- Unit-test the model API contract and browser selector payload.
- Retain all FLUX.2 edit tests.
- Run one local Chinese end-to-end probe and verify metadata identifies FLUX.1 as the image model and Qwen as the translator.

## Success Criteria

- Chinese generation requests are translated before FLUX.1 by default.
- The generated image metadata always identifies a FLUX.1 checkpoint for initial generation.
- FLUX.2 is used only when an edit has an existing source image.
- Users can bypass translation without changing the image model.
- Translation failures do not block local generation and never change the model boundary.
