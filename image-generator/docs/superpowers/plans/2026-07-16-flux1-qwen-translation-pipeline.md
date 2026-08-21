# FLUX.1 Qwen Translation Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Translate and normalize Chinese generation prompts with the installed Qwen3 text model before every default FLUX.1 generation, while keeping all source-image edits on FLUX.2.

**Architecture:** A focused `promptTranslator` module submits a text-only ComfyUI workflow and validates its output. The generation route selects translated or raw prompt handling, then always invokes the existing FLUX.1 checkpoint workflow; the FLUX.2 module remains edit-only. The browser presents prompt handling separately from the FLUX.1 checkpoint selector.

**Tech Stack:** Node.js ESM, Express, ComfyUI HTTP API, React 19, Node test runner, ESLint, Vite.

## Global Constraints

- Initial generation always uses FLUX.1.
- Existing-image editing always uses FLUX.2.
- `qwen_3_4b.safetensors` generates translation text but never replaces FLUX.1 conditioning.
- Translation failure retries once, then falls back to raw FLUX.1 prompting.
- Do not push or pull GitHub; all work remains local.

---

### Task 1: ComfyUI Qwen Prompt Translator

**Files:**
- Create: `server/promptTranslator.js`
- Create: `test/promptTranslator.test.js`

**Interfaces:**
- Produces: `getPromptTranslatorConfig(env)`, `buildPromptTranslationWorkflow(input)`, `extractPromptTranslation(history, promptId)`, `getPromptTranslatorHealth(config, deps)`, and `translatePromptWithQwen(input)`.
- Translation result: `{ brief, avoid, translatedPrompt, translationUsed, translationFallback, translator }`.

- [ ] **Step 1: Write failing translator tests**

Cover exact `CLIPLoader -> TextGenerate -> PreviewAny` nodes, extraction from `outputs['3'].text[0]`, JSON validation, one retry, raw fallback, and health dependency checks.

```js
const workflow = buildPromptTranslationWorkflow({ brief: '少年在咖啡馆写代码', avoid: '女性', config });
assert.equal(workflow['1'].inputs.clip_name, 'qwen_3_4b.safetensors');
assert.equal(workflow['2'].class_type, 'TextGenerate');
assert.deepEqual(workflow['3'].inputs.source, ['2', 0]);
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test test/promptTranslator.test.js`

Expected: FAIL because `server/promptTranslator.js` does not exist.

- [ ] **Step 3: Implement the translator**

Use deterministic `sampling_mode: 'off'`, `thinking: false`, `use_default_template: true`, bounded polling, and a translation request that outputs JSON:

```json
{"brief":"English image prompt","avoid":"English exclusions"}
```

Strip optional Markdown fences, require a non-empty `brief`, cap output lengths, and return the original fields with `translationFallback: true` after the configured retry count.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `node --test test/promptTranslator.test.js`

Expected: all translator tests PASS.

### Task 2: FLUX.1-Only Generation Dispatch

**Files:**
- Modify: `server/index.js`
- Modify: `server/comfyModel.js`
- Modify: `server/flux2Edit.js`
- Modify: `server/prompt.js`
- Modify: `test/comfyModel.test.js`
- Modify: `test/flux2Edit.test.js`
- Modify: `test/prompt.test.js`

**Interfaces:**
- Consumes: `translatePromptWithQwen()` and `getPromptTranslatorHealth()` from Task 1.
- Produces: `POST /api/generate` response metadata and `GET /api/comfyui/models` prompt-mode contract.

- [ ] **Step 1: Replace experimental FLUX.2 generation tests with FLUX.1 boundary tests**

Assert that generation dispatch only calls `generateWithComfy`, that `flux2Edit.js` exports no text-to-image dispatcher, and that translated text remains the first prompt instruction.

- [ ] **Step 2: Run focused tests and verify RED**

Run: `node --test test/comfyModel.test.js test/flux2Edit.test.js test/prompt.test.js test/promptTranslator.test.js`

Expected: FAIL while the current experimental dispatcher still routes `COMFY_GENERATION_ENGINE=flux2` to FLUX.2.

- [ ] **Step 3: Implement generation routing and metadata**

Normalize request mode to `flux1-qwen` or `flux1-raw`. For `flux1-qwen`, translate first and build the final bundle from translated fields. Always call:

```js
await generateWithComfy({
  prompt: bundle.prompt,
  negativePrompt: bundle.negativePrompt,
  checkpointName,
});
```

Return and persist `sourceBrief`, `translatedPrompt`, `translationUsed`, `translationFallback`, and translator model information in `metadata.translation`. Remove the experimental FLUX.2 text-to-image functions and dispatcher.

- [ ] **Step 4: Update model discovery**

Keep `checkpoints` sourced from `CheckpointLoaderSimple`. Add:

```json
{
  "promptModes": [
    {"id":"flux1-qwen","label":"FLUX.1 中文增强（推荐）"},
    {"id":"flux1-raw","label":"FLUX.1 原始提示词"}
  ],
  "selectedPromptMode":"flux1-qwen",
  "translatorReady":true
}
```

Do not expose FLUX.2 in this endpoint's generation choices.

- [ ] **Step 5: Run focused tests and verify GREEN**

Run: `node --test test/comfyModel.test.js test/flux2Edit.test.js test/prompt.test.js test/promptTranslator.test.js`

Expected: all focused tests PASS.

### Task 3: Browser Prompt-Mode Selector

**Files:**
- Create: `src/modelOptions.js`
- Create: `test/modelOptions.test.js`
- Modify: `src/App.jsx`

**Interfaces:**
- Consumes: `promptModes`, `selectedPromptMode`, and `translatorReady` from `GET /api/comfyui/models`.
- Produces: `promptMode` in `POST /api/generate` JSON.

- [ ] **Step 1: Write failing option-normalization tests**

```js
assert.deepEqual(normalizePromptModes(apiPayload).selected, 'flux1-qwen');
assert.equal(normalizePromptModes({ translatorReady: false }).selected, 'flux1-raw');
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test test/modelOptions.test.js`

Expected: FAIL because `src/modelOptions.js` does not exist.

- [ ] **Step 3: Implement and connect the selector**

Add `promptModes` and `promptMode` state. Populate them in `loadComfyModels`, show a separate `中文指令处理` select beneath the FLUX.1 checkpoint selector, disable Qwen mode when the translator is unavailable, and send `promptMode` in generation requests.

- [ ] **Step 4: Run tests and build**

Run: `node --test test/modelOptions.test.js && npm run check && npm run build`

Expected: tests, ESLint, and Vite build PASS.

### Task 4: Configuration, Documentation, and End-to-End Verification

**Files:**
- Modify: `.env`
- Modify: `.env.example`
- Modify: `docker-compose.yml`
- Modify: `README.md`

**Interfaces:**
- Consumes: environment keys defined by `getPromptTranslatorConfig`.
- Produces: reproducible local and Docker configuration.

- [ ] **Step 1: Configure FLUX.1 generation plus Qwen translation**

Use:

```dotenv
COMFY_GENERATION_ENGINE=flux1
COMFY_PROMPT_MODE=flux1-qwen
COMFY_TRANSLATOR_CLIP_NAME=qwen_3_4b.safetensors
COMFY_TRANSLATOR_CLIP_TYPE=flux2
COMFY_TRANSLATOR_MAX_LENGTH=384
COMFY_TRANSLATOR_RETRIES=1
```

- [ ] **Step 2: Document the model boundary and fallback behavior**

Document that FLUX.1 always generates, Qwen only translates, FLUX.2 only edits, and `flux1-raw` bypasses translation.

- [ ] **Step 3: Run full verification**

Run: `npm test && npm run check && npm run build && git diff --check`

Expected: all tests PASS, lint PASS, build PASS, and no whitespace errors.

- [ ] **Step 4: Run one local Chinese end-to-end probe**

Generate from `一个少年程序员坐在咖啡馆中写代码` through the integrated translator and dispatcher. Verify the result metadata reports:

```json
{
  "model": "flux1-schnell-fp8.safetensors",
  "translationUsed": true,
  "translationFallback": false,
  "translator": "qwen_3_4b.safetensors"
}
```

Inspect the output image for the requested boy, cafe, laptop, and coding action.
