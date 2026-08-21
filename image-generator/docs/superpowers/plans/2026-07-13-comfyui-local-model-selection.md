# ComfyUI Local Model Selection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Use the Windows-hosted ComfyUI service for image generation and let the web application select any compatible checkpoint without rebuilding Docker.

**Architecture:** `server/comfyModel.js` discovers and validates checkpoints directly from ComfyUI and builds each workflow with the resolved checkpoint. Express exposes the model list and passes an optional requested checkpoint into generation, while React displays and refreshes the available choices. Docker reaches the Windows service through `host.docker.internal` and keeps the existing PostgreSQL volume unchanged.

**Tech Stack:** Node.js 22, Express 5, React 19, Vite 6, Node test runner, Docker Compose, ComfyUI HTTP API

## Global Constraints

- ComfyUI runs on Windows at `127.0.0.1:8188`.
- Docker connects to ComfyUI at `http://host.docker.internal:8188`.
- The default checkpoint is `flux1-schnell-fp8.safetensors`.
- Only complete checkpoints exposed by `CheckpointLoaderSimple` are supported.
- PostgreSQL account and generation data must remain in the existing named volume.
- OpenAI API credentials are not required in ComfyUI mode.

---

### Task 1: Checkpoint Discovery And Resolution

**Files:**
- Modify: `server/comfyModel.js`
- Create: `test/comfyModel.test.js`

**Interfaces:**
- Produces: `listComfyCheckpoints(config?) -> Promise<string[]>`
- Produces: `resolveComfyCheckpoint({ requestedCheckpoint, config?, availableCheckpoints? }) -> Promise<{ checkpoint: string, availableCheckpoints: string[], usedFallback: boolean }>`
- Changes: `generateWithComfy({ prompt, negativePrompt, checkpointName? })`

- [ ] **Step 1: Write failing checkpoint resolution tests**

```js
import assert from 'node:assert/strict';
import test from 'node:test';
import { buildComfyWorkflow, resolveComfyCheckpoint } from '../server/comfyModel.js';

test('uses an explicitly requested available checkpoint', async () => {
  const result = await resolveComfyCheckpoint({
    requestedCheckpoint: 'portrait.safetensors',
    config: { checkpointName: 'default.safetensors' },
    availableCheckpoints: ['default.safetensors', 'portrait.safetensors'],
  });
  assert.equal(result.checkpoint, 'portrait.safetensors');
  assert.equal(result.usedFallback, false);
});

test('falls back to the first checkpoint when the configured default is missing', async () => {
  const result = await resolveComfyCheckpoint({
    config: { checkpointName: 'missing.safetensors' },
    availableCheckpoints: ['available.safetensors'],
  });
  assert.equal(result.checkpoint, 'available.safetensors');
  assert.equal(result.usedFallback, true);
});

test('rejects an explicitly requested missing checkpoint', async () => {
  await assert.rejects(
    resolveComfyCheckpoint({
      requestedCheckpoint: 'missing.safetensors',
      config: { checkpointName: 'default.safetensors' },
      availableCheckpoints: ['default.safetensors'],
    }),
    /not available/i,
  );
});

test('builds the workflow with the resolved checkpoint', () => {
  const workflow = buildComfyWorkflow({
    prompt: 'portrait',
    negativePrompt: '',
    config: {
      checkpointName: 'portrait.safetensors', width: 512, height: 512,
      steps: 4, cfg: 1, samplerName: 'euler', scheduler: 'simple', seed: 1,
    },
  });
  assert.equal(workflow['1'].inputs.ckpt_name, 'portrait.safetensors');
});
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `node --test test/comfyModel.test.js`

Expected: FAIL because `resolveComfyCheckpoint` is not exported.

- [ ] **Step 3: Implement discovery and deterministic resolution**

```js
export async function listComfyCheckpoints(config = getComfyConfig()) {
  const info = await requestJson(`${config.baseUrl}/object_info/CheckpointLoaderSimple`, {
    timeoutMs: Math.min(config.timeoutMs, 15000),
  });
  const choices = info.CheckpointLoaderSimple?.input?.required?.ckpt_name?.[0] || [];
  return Array.isArray(choices) ? choices.filter((value) => typeof value === 'string' && value) : [];
}

export async function resolveComfyCheckpoint({
  requestedCheckpoint = '',
  config = getComfyConfig(),
  availableCheckpoints,
} = {}) {
  const available = availableCheckpoints || await listComfyCheckpoints(config);
  if (!available.length) throw new Error('ComfyUI has no compatible checkpoints available.');
  if (requestedCheckpoint) {
    if (!available.includes(requestedCheckpoint)) {
      throw new Error(`Requested ComfyUI checkpoint is not available: ${requestedCheckpoint}`);
    }
    return { checkpoint: requestedCheckpoint, availableCheckpoints: available, usedFallback: false };
  }
  const configuredAvailable = available.includes(config.checkpointName);
  return {
    checkpoint: configuredAvailable ? config.checkpointName : available[0],
    availableCheckpoints: available,
    usedFallback: !configuredAvailable,
  };
}
```

Update `getComfyHealth()` to use `listComfyCheckpoints()` and report `resolvedCheckpoint`. Update `generateWithComfy()` to resolve the checkpoint immediately before building the workflow and return the resolved name in `model` and `comfy.checkpoint`.

- [ ] **Step 4: Run focused and full tests**

Run: `node --test test/comfyModel.test.js`

Expected: all checkpoint tests PASS.

Run: `npm test`

Expected: all tests PASS.

- [ ] **Step 5: Commit the backend model resolver**

```powershell
git add server/comfyModel.js test/comfyModel.test.js
git commit -m "feat: resolve ComfyUI checkpoints dynamically"
```

### Task 2: Model API And Generation Request

**Files:**
- Modify: `server/index.js`
- Modify: `test/comfyModel.test.js`

**Interfaces:**
- Consumes: `listComfyCheckpoints`, `resolveComfyCheckpoint`, and `generateWithComfy({ checkpointName })`
- Produces: `GET /api/comfyui/models` returning `{ ok, checkpoints, configuredCheckpoint, selectedCheckpoint, usedFallback }`
- Changes: `POST /api/generate` accepts optional JSON field `checkpoint`

- [ ] **Step 1: Add a failing validation test for unsafe request values**

Add and export a small normalizer from `server/comfyModel.js`:

```js
test('normalizes checkpoint request values without accepting non-strings', () => {
  assert.equal(normalizeCheckpointName(' portrait.safetensors '), 'portrait.safetensors');
  assert.equal(normalizeCheckpointName({ name: 'bad' }), '');
});
```

Run: `node --test test/comfyModel.test.js`

Expected: FAIL because `normalizeCheckpointName` is not exported.

- [ ] **Step 2: Implement the model-list endpoint and request plumbing**

```js
app.get('/api/comfyui/models', async (_request, response) => {
  try {
    const config = getComfyConfig();
    const resolved = await resolveComfyCheckpoint({ config });
    return response.json({
      ok: true,
      checkpoints: resolved.availableCheckpoints,
      configuredCheckpoint: config.checkpointName,
      selectedCheckpoint: resolved.checkpoint,
      usedFallback: resolved.usedFallback,
    });
  } catch (error) {
    return response.status(503).json({ ok: false, checkpoints: [], error: error.message });
  }
});
```

Normalize `request.body?.checkpoint`, pass it as `checkpointName` to `generateWithComfy`, and preserve the resolved checkpoint already returned by the provider.

- [ ] **Step 3: Run server tests and static checks**

Run: `npm test`

Expected: all tests PASS.

Run: `npm run check`

Expected: ESLint exits 0.

- [ ] **Step 4: Commit the API change**

```powershell
git add server/index.js server/comfyModel.js test/comfyModel.test.js
git commit -m "feat: expose ComfyUI checkpoint selection"
```

### Task 3: Web Checkpoint Selector

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/styles.css`

**Interfaces:**
- Consumes: `GET /api/comfyui/models`
- Produces: `checkpoint` in the `POST /api/generate` JSON body

- [ ] **Step 1: Add model state and loading behavior**

Add state for `checkpoints`, `checkpoint`, `modelsLoading`, and `modelsError`. Implement `loadComfyModels()` to fetch the endpoint, select the returned `selectedCheckpoint` when the current selection is absent, and retain a current selection while it remains available. Call it once from the mount effect.

```jsx
const [checkpoints, setCheckpoints] = useState([]);
const [checkpoint, setCheckpoint] = useState('');
const [modelsLoading, setModelsLoading] = useState(false);
const [modelsError, setModelsError] = useState('');
```

- [ ] **Step 2: Render the selector in output settings**

```jsx
<label className="model-setting">本地生成模型
  <span className="model-control">
    <select
      value={checkpoint}
      onChange={(event) => setCheckpoint(event.target.value)}
      disabled={modelsLoading || checkpoints.length === 0}
    >
      {checkpoints.map((name) => <option key={name} value={name}>{name}</option>)}
    </select>
    <button type="button" onClick={loadComfyModels} disabled={modelsLoading}>刷新</button>
  </span>
  {modelsError && <small className="model-error">{modelsError}</small>}
</label>
```

Include `checkpoint` in the generation body:

```js
body: JSON.stringify({ brief, avoid, selections, size: avatarSize, quality, checkpoint }),
```

- [ ] **Step 3: Add compact responsive styles**

Add styles for `.model-setting`, `.model-control`, `.model-control button`, and `.model-error`; keep the existing one-column mobile breakpoint and prevent long checkpoint names from overflowing the select.

- [ ] **Step 4: Verify frontend quality gates**

Run: `npm run check`

Expected: ESLint exits 0.

Run: `npm run build`

Expected: Vite production build succeeds.

- [ ] **Step 5: Commit the selector**

```powershell
git add src/App.jsx src/styles.css
git commit -m "feat: select ComfyUI models in the web app"
```

### Task 4: Docker Configuration And End-To-End Verification

**Files:**
- Modify: `.env` (ignored local configuration; do not commit)
- Verify: `docker-compose.yml`

**Interfaces:**
- Consumes: Windows ComfyUI at `http://127.0.0.1:8188`
- Produces: Docker application at `http://localhost:8787`

- [ ] **Step 1: Set local ComfyUI environment values**

Ensure `.env` contains exactly these backend values while preserving unrelated secrets:

```env
IMAGE_BACKEND=comfyui
COMFYUI_BASE_URL=http://host.docker.internal:8188
COMFY_CHECKPOINT_NAME=flux1-schnell-fp8.safetensors
```

- [ ] **Step 2: Verify ComfyUI and container networking**

Run: `Invoke-RestMethod http://127.0.0.1:8188/system_stats`

Expected: ComfyUI system information with a CUDA device.

Run: `docker exec tmall-avatar-app node -e "fetch('http://host.docker.internal:8188/system_stats').then(r=>console.log(r.status))"`

Expected: `200`.

- [ ] **Step 3: Rebuild and start without removing the database volume**

Run: `docker compose up -d --build --force-recreate app`

Expected: `tmall-avatar-app` is running and `tmall-avatar-postgres` remains healthy. Do not run `docker compose down -v`.

- [ ] **Step 4: Verify health and model discovery**

Run: `Invoke-RestMethod http://localhost:8787/api/health | ConvertTo-Json -Depth 5`

Expected: `backend` is `comfyui` and `configured` is `true`.

Run: `Invoke-RestMethod http://localhost:8787/api/comfyui/models | ConvertTo-Json -Depth 5`

Expected: `flux1-schnell-fp8.safetensors` appears and is selected.

- [ ] **Step 5: Perform a real authenticated generation**

Use a unique local test account and a PowerShell web session to call registration and generation with `checkpoint: "flux1-schnell-fp8.safetensors"`. Allow up to ten minutes for the first model load. Verify the response has `provider: "comfyui"`, a PNG data URL, and the selected checkpoint in both `model` and `generation.model`. Delete only the temporary test user afterward so PostgreSQL cascades its temporary generation record; do not alter existing users.

- [ ] **Step 6: Run final regression checks**

Run: `npm test`

Expected: all tests PASS.

Run: `npm run check`

Expected: ESLint exits 0.

Run: `npm run build`

Expected: Vite production build succeeds.

Run: `docker compose ps`

Expected: application is Up and PostgreSQL is Up (healthy).

- [ ] **Step 7: Inspect the scoped diff**

Run: `git diff --check`

Expected: no whitespace errors. Preserve all unrelated pre-existing changes and staged files.
