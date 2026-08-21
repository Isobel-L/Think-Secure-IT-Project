# FLUX Backend Parameter Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build model-specific parameter validation, conflict resolution, prompt compilation, structured FLUX.2 editing controls, and a repeatable parameter benchmark for the two configured local FLUX models.

**Architecture:** Shared, browser-safe schema modules define creative parameters, model profiles, edit categories, and deterministic conflict behavior. The server validates and compiles all structured input before invoking ComfyUI, while React renders the same schema and sends IDs rather than trusted prompt fragments.

**Tech Stack:** Node.js ESM, Express 5, React 19, Vite 6, ComfyUI workflows, Node test runner, Supertest, Sharp.

## Global Constraints

- Generation profile: 1024 x 1024, steps 4, CFG 1, Euler, Simple, denoise 1.
- FLUX.2 edit profile: steps 4, CFG 1, Euler, Simple, denoise 1, mask feather 8.
- Preserve magic erase, OpenAI fallback, authentication, history, billing, and local unlimited usage.
- Do not add runtime dependencies.
- Structured values are validated server-side before model execution.

---

### Task 1: Model Profiles

**Files:**
- Create: `shared/modelProfiles.js`
- Modify: `server/comfyModel.js`
- Modify: `server/flux2Edit.js`
- Modify: `.env.example`
- Test: `test/modelProfiles.test.js`

**Interfaces:**
- Produces `GENERATION_PROFILE`, `FLUX2_EDIT_PROFILE`, and `getModelProfile(id)`.
- Existing environment variables may override operational values only within current clamps; approved defaults come from profiles.

- [ ] Write failing tests asserting exact approved defaults, immutable profile IDs, and existing environment clamps.
- [ ] Run `node --test test/modelProfiles.test.js test/comfyModel.test.js test/flux2Edit.test.js` and confirm the new module is missing.
- [ ] Implement profiles and consume their defaults in both workflow builders.
- [ ] Run the targeted tests and confirm they pass.
- [ ] Commit `feat: add FLUX model profiles`.

### Task 2: Structured Catalog and Conflict Resolver

**Files:**
- Replace: `shared/catalog.js`
- Create: `shared/selectionRules.js`
- Test: `test/selectionRules.test.js`

**Interfaces:**
- `catalog` contains option objects `{ id, label, prompt, reliability, modelSupport, conflicts }`.
- `getOption(groupId, optionIdOrLegacyLabel)` resolves IDs and unambiguous legacy labels.
- `resolveSelectionToggle(selections, groupId, optionId)` returns `{ selections, removed, notice }`.
- `normalizeSelectionState(input, modelId)` returns `{ selections, errors }`.

- [ ] Write failing schema, legacy-migration, single-choice, max-two-accessory, declared-conflict, and 1,000-sequence invariant tests.
- [ ] Run `node --test test/selectionRules.test.js` and confirm missing exports.
- [ ] Implement the optimized generic catalog and resolver.
- [ ] Update examples to stable IDs and verify no removed technical or IP choices remain.
- [ ] Run the targeted tests and confirm they pass.
- [ ] Commit `feat: add model-aware parameter rules`.

### Task 3: Server Validation and FLUX.1 Prompt Compiler

**Files:**
- Rewrite: `server/prompt.js`
- Modify: `server/index.js`
- Create: `test/prompt.test.js`

**Interfaces:**
- `normalizeSelections(input, { modelId, strict })` returns normalized IDs and throws `ParameterSelectionError` in strict mode.
- `buildPromptBundle({ brief, selections, avoid, modelId })` returns `{ prompt, negativePrompt, strategy, normalizedSelections }`.
- `/api/parameters` returns active profile and the supported public catalog.
- Invalid preview or generation requests return `400 PARAMETER_SELECTION_INVALID`.

- [ ] Write failing tests for concise prompt order, legacy migration, fixed quality requirements, removed fake settings, and strict invalid-ID errors.
- [ ] Run `node --test test/prompt.test.js` and confirm failures describe old behavior.
- [ ] Implement the compiler and route-level error responses.
- [ ] Add `/api/parameters` without requiring authentication.
- [ ] Run prompt tests plus the existing generation-related tests.
- [ ] Commit `feat: validate and compile FLUX parameters`.

### Task 4: Structured FLUX.2 Edit Compiler

**Files:**
- Create: `shared/editControls.js`
- Modify: `server/editRouter.js`
- Modify: `src/editIntegration.js`
- Test: `test/editControls.test.js`
- Test: `test/editRouter.test.js`
- Test: `test/editIntegration.test.js`

**Interfaces:**
- `editCategories`, `colorTargets`, and `colorSwatches` are browser-safe exports.
- `compileEditInstruction(input)` returns `{ prompt, controls }` or throws `EditControlError`.
- Form fields are `editCategory`, `editTarget`, `editOption`, and `colorHex`.
- Existing `operation=remove` bypasses category compilation and preserves magic erase.

- [ ] Write failing tests for every category, object-bound colors, custom HEX validation, custom prompt compatibility, and magic erase isolation.
- [ ] Run targeted tests and confirm missing compiler behavior.
- [ ] Implement shared definitions and server-side compilation.
- [ ] Store normalized edit controls in generation metadata.
- [ ] Run targeted tests and confirm they pass.
- [ ] Commit `feat: compile structured FLUX edits`.

### Task 5: Parameter UI and Automatic Replacement

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/components/ParameterSection.jsx`
- Modify: `src/styles.css`
- Test: `test/selectionRules.test.js`
- Test: `test/editIntegration.test.js`

**Interfaces:**
- React state stores option IDs.
- `toggleOption` delegates to `resolveSelectionToggle` and displays its notice.
- `ParameterSection` renders `option.label`, uses `option.id`, and marks experimental choices.

- [ ] Add failing integration assertions for ID-backed form payloads and replacement notices.
- [ ] Implement object-option rendering and resolver-backed selection updates.
- [ ] Add a compact replacement notice near the parameter list.
- [ ] Run targeted tests, ESLint, and a Vite build.
- [ ] Commit `feat: prevent conflicting parameter selections`.

### Task 6: FLUX.2 Category and Color UI

**Files:**
- Modify: `src/components/ImageEditor.jsx`
- Modify: `src/editIntegration.js`
- Modify: `src/styles.css`
- Test: `test/editControls.test.js`
- Test: `test/editIntegration.test.js`

**Interfaces:**
- Editor state tracks category, target, option, and custom HEX independently from canvas tool state.
- Category controls are hidden during magic erase.
- The prompt preview is generated from `compileEditInstruction`; custom remains editable.

- [ ] Add failing tests for generated multipart fields and color requirements.
- [ ] Implement category buttons, target control, curated swatches, native color input, HEX validation, and prompt preview.
- [ ] Preserve brush, eraser, undo, zoom, image replacement, and magic erase behavior.
- [ ] Run targeted tests, ESLint, and build.
- [ ] Commit `feat: add FLUX edit categories and colors`.

### Task 7: Benchmark and Final Verification

**Files:**
- Create: `shared/parameterBenchmark.js`
- Create: `scripts/createParameterBenchmark.js`
- Create: `test/parameterBenchmark.test.js`
- Modify: `package.json`
- Modify: `README.md`

**Interfaces:**
- `createBenchmarkManifest()` emits fixed seeds, generation cases, edit cases, scoring fields, and model profile IDs.
- `classifyBenchmarkScore({ successRate, hardFailureRate })` returns `stable`, `experimental`, or `remove` using approved thresholds.
- `npm run benchmark:parameters` prints valid JSON without invoking a model.

- [ ] Write failing manifest and threshold-boundary tests.
- [ ] Implement the manifest generator and npm script.
- [ ] Document execution, scoring, and the fact that generation is intentionally manual/controlled.
- [ ] Run `npm test`, `npm run check`, `npm run build`, `npm run benchmark:parameters`, and `docker compose config --quiet`.
- [ ] Review `git diff --check`, verify `.env` and generated images are not staged, and commit `feat: add FLUX parameter benchmark`.
