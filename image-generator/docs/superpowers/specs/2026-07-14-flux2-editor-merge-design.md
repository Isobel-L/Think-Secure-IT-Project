# FLUX.2 Editor Merge Design

## Goal

Bring the complete local FLUX.2 image-editing implementation from
`origin/feature/flux2-local-image-editing` into the current
`WebFrontAndBackend` codebase while preserving the target branch's direct
Alipay checkout, editable downloads, locking, account, and billing changes.

## Baselines

- Target branch tip before integration: `4ebd9c0`.
- FLUX.2 feature tip: `955a5d7`.
- Shared merge base: `ca43a25`.
- Work is isolated on `codex/merge-flux2-image-editor`.

## Merge Rules

- Use a Git merge so both branches retain their history.
- Preserve target-branch payment and download behavior when conflicts overlap.
- Preserve feature-branch ComfyUI transport, FLUX.2 adapter, edit API, mask
  compositing, editor UI, Docker configuration, and documentation.
- Integrate both sets of behavior in `server/index.js`, `src/App.jsx`,
  `src/components/ResultPanel.jsx`, environment examples, Compose, and
  package metadata rather than choosing one side wholesale.
- Do not copy or replace a local `.env`; no secret values enter Git.
- Do not recreate or delete PostgreSQL volumes.

## Canvas Fix

The editor currently resets both canvases to `1x1` in a layout effect. A
cached data URL can fire `onLoad` before that reset, so the successful draw is
erased and no second load event occurs.

Use one idempotent draw routine for both the image `onLoad` handler and the
session-reset layout effect. After reset, the effect checks the hidden image's
`complete`, `naturalWidth`, and `naturalHeight`; when it is already loaded,
it redraws immediately. While the source is not ready, hide the canvas viewport
or show a loading state and disable drawing controls.

## Verification

- Add a focused regression test for recognizing a complete cached image and
  deriving normalized canvas dimensions.
- Run the merged Node test suite and ESLint/build checks.
- Validate Docker Compose configuration without deleting volumes.
- Rebuild only the application service and confirm application and FLUX.2
  health endpoints.

