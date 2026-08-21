# FLUX.2 Editor Merge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Merge the complete local FLUX.2 editor into the current payment-enabled application and fix cached source images disappearing from the editor canvas.

**Architecture:** Merge the two branches at their shared Git base and resolve only overlapping integration files by preserving both domains. The editor uses one shared image-to-canvas readiness helper from both the layout reset path and the image load event, eliminating event-order dependence.

**Tech Stack:** Git, React 19, Node.js 22, Express 5, Vite 6, Node test runner, Docker Compose, PostgreSQL, ComfyUI.

## Global Constraints

- Preserve direct Alipay checkout, local payment testing, downloads, locking, authentication, billing, and database behavior from `WebFrontAndBackend`.
- Preserve all FLUX.2 edit API, UI, ComfyUI, Docker, and documentation behavior through commit `955a5d7`.
- Never overwrite `.env`, commit secrets, or delete/recreate database volumes.
- Use focused TDD for the canvas bug.

---

### Task 1: Merge FLUX.2 Feature History

**Files:**
- Merge: `origin/feature/flux2-local-image-editing`
- Resolve: `.env.example`, `.gitignore`, `README.md`, `docker-compose.yml`, `package.json`, `package-lock.json`, `server/index.js`, `src/App.jsx`, `src/components/ResultPanel.jsx`, `src/styles.css`

**Interfaces:**
- Consumes: target tip `4ebd9c0`, feature tip `955a5d7`.
- Produces: one merge result containing payment and FLUX.2 editing behavior.

- [ ] **Step 1: Start a no-commit merge**

```powershell
git merge --no-ff --no-commit origin/feature/flux2-local-image-editing
```

- [ ] **Step 2: Resolve conflicts by responsibility**

Keep target payment routes and state while adding the feature branch's
`createEditRouter`, `getFlux2EditConfig`, FLUX.2 health route, editor state,
edit submission, result/history merging, and Docker variables.

- [ ] **Step 3: Verify the merged tree**

```powershell
git diff --check
npm install
node --test
npm run check
npm run build
```

- [ ] **Step 4: Commit the merge**

```powershell
git add -A
git commit
```

### Task 2: Fix Cached Image Canvas Reset

**Files:**
- Modify: `src/imageEditor.js`
- Modify: `src/components/ImageEditor.jsx`
- Test: `test/imageEditor.test.js`

**Interfaces:**
- Produces: `getLoadedImageCanvasSize(image, options?) -> { width, height } | null`.
- Consumes: existing `normalizeEditorCanvasSize(width, height, options?)`.

- [ ] **Step 1: Write the failing cached-image test**

```js
test('recognizes a complete cached image for immediate canvas redraw', () => {
  assert.deepEqual(
    getLoadedImageCanvasSize({ complete: true, naturalWidth: 1600, naturalHeight: 1200 }),
    { width: 1024, height: 768 },
  );
  assert.equal(
    getLoadedImageCanvasSize({ complete: false, naturalWidth: 1600, naturalHeight: 1200 }),
    null,
  );
});
```

- [ ] **Step 2: Run the test and confirm RED**

```powershell
node --test test/imageEditor.test.js
```

Expected: import/export failure for `getLoadedImageCanvasSize`.

- [ ] **Step 3: Implement the helper and shared draw path**

```js
export function getLoadedImageCanvasSize(image, options) {
  if (!image?.complete || !image.naturalWidth || !image.naturalHeight) return null;
  return normalizeEditorCanvasSize(image.naturalWidth, image.naturalHeight, options);
}
```

Use a single `drawSourceImage(image, sessionKey)` callback from both
`onLoad` and the session-reset layout effect. Disable brush and eraser while
`imageReady` is false.

- [ ] **Step 4: Run focused tests and confirm GREEN**

```powershell
node --test test/imageEditor.test.js test/editIntegration.test.js
```

- [ ] **Step 5: Commit the canvas fix**

```powershell
git add src/imageEditor.js src/components/ImageEditor.jsx test/imageEditor.test.js
git commit -m "fix: redraw cached editor source images"
```

### Task 3: Docker Runtime Verification

**Files:**
- Verify: `docker-compose.yml`, `.env.example`, `README.md`

**Interfaces:**
- Consumes: merged application image and existing PostgreSQL volume.
- Produces: healthy app and FLUX.2 health endpoints at port 8787.

- [ ] **Step 1: Validate Compose**

```powershell
docker compose config --quiet
```

- [ ] **Step 2: Rebuild only the app service**

```powershell
docker compose up -d --build app
```

- [ ] **Step 3: Verify runtime health**

```powershell
Invoke-RestMethod http://127.0.0.1:8787/api/health
Invoke-RestMethod http://127.0.0.1:8787/api/comfyui/flux2/health
docker compose ps
```

- [ ] **Step 4: Confirm final Git state**

```powershell
git diff --check
git status --short --branch
```

