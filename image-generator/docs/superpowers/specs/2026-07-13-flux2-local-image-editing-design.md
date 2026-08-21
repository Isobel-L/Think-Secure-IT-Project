# FLUX.2 Klein Local Image Editing Design

Date: 2026-07-13
Status: Approved for implementation planning

## 1. Goal

Add a web image-editing workflow to `Tmall-FRONT-ComfyUI` that uses the local ComfyUI installation and the installed `flux-2-klein-4b-fp8.safetensors` model.

The feature must:

- edit the current generated image, an owned history image, or a local upload;
- support prompt-only semantic editing;
- support brush-mask local editing while keeping pixels outside the mask unchanged;
- consume one generation entitlement only after a valid request reaches the generation phase;
- save every successful edit as a new history record;
- avoid OpenAI API calls and third-party ComfyUI custom-node dependencies;
- remain stable when the configured FLUX.2 model files are changed later.

This is image editing, not model training or fine-tuning.

## 2. Confirmed Decisions

- Use a dedicated authenticated edit endpoint instead of changing `/api/generate`.
- Accept current results, history records, and local uploads as source images.
- Treat an omitted or empty mask as full-image semantic editing.
- Treat a non-empty mask as exact local editing.
- Charge one normal generation entitlement for each successful edit attempt, using the existing reservation and release mechanism.
- Save the output as a new `avatar_generations` row and keep the source record unchanged.
- Use only ComfyUI core nodes for FLUX.2 inference.
- Use server-side compositing for masked edits so pixels outside the selected region are copied from the original image.

## 3. Why This Architecture

FLUX.2 supports reference-image editing, and the Klein 4B distilled variant is designed for interactive local use. The installed model layout also matches the ComfyUI FLUX.2 Klein workflow: a diffusion model, a Qwen text encoder, and a VAE loaded separately.

References:

- [Black Forest Labs FLUX.2 repository](https://github.com/black-forest-labs/flux2)
- [ComfyUI FLUX.2 Klein guide](https://docs.comfy.org/tutorials/flux/flux-2-klein)
- [Official ComfyUI FLUX.2 examples](https://comfyanonymous.github.io/ComfyUI_examples/flux2/)
- [BFL single-reference editing guide](https://docs.bfl.ai/guides/prompting_editing_single_reference)

The current application already owns authentication, PostgreSQL history storage, entitlement reservation, ComfyUI polling, and generated-image persistence. A separate adapter and endpoint can reuse those systems without risking regressions in text-to-image generation.

## 4. User Experience

### 4.1 Entry points

Show a `局部微调` action when a user has a current result or selects a history result. The editing workspace also provides `上传本地图片`.

Opening the editor sets the selected result as the source when one exists. Closing the editor does not modify or delete the source image.

### 4.2 Editing workspace

The workspace contains:

- source-image canvas;
- translucent mask overlay;
- brush size control;
- draw and erase controls;
- undo, clear-mask, and reset-view controls;
- prompt input;
- source replacement control;
- edit submission button;
- busy, error, and model-unavailable states.

The canvas preserves the image aspect ratio and maps pointer coordinates to source-image pixels. Mouse, pen, and touch input use Pointer Events. The browser exports the mask as a grayscale or alpha PNG at the normalized source dimensions.

The UI determines the mode automatically:

- no painted pixels: semantic edit;
- one or more painted pixels: masked local edit.

The edit result becomes the current result and appears as a separate history item. The original remains available for further edits.

### 4.3 Responsive behavior

Desktop uses a wide canvas with a compact adjacent control area. Mobile stacks the canvas above the controls. Tool buttons remain reachable without covering the canvas, and the canvas uses a stable aspect-ratio container to avoid layout shifts.

## 5. API Contract

### 5.1 Create an edit

`POST /api/edits`

Authentication: existing session cookie.

Content type: `multipart/form-data`.

Fields:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `prompt` | string | yes | Requested visual change |
| `sourceGenerationId` | UUID string | conditional | Existing history record owned by the user |
| `sourceImage` | PNG/JPEG/WebP file | conditional | Local source upload |
| `mask` | PNG file | no | White/opaque pixels identify editable areas |

Exactly one of `sourceGenerationId` and `sourceImage` is required.

Successful response follows the existing generation response shape and adds edit metadata:

```json
{
  "image": "data:image/png;base64,...",
  "provider": "comfyui",
  "model": "flux-2-klein-4b-fp8.safetensors",
  "createdAt": "2026-07-13T00:00:00.000Z",
  "operation": "edit",
  "masked": true,
  "generation": {},
  "billing": {}
}
```

### 5.2 FLUX.2 health

`GET /api/comfyui/flux2/health`

The response reports:

- ComfyUI connectivity;
- configured and resolved diffusion model;
- configured and resolved text encoder;
- configured and resolved VAE;
- required core-node availability;
- a single `ok` readiness value;
- actionable missing-file or missing-node details.

This endpoint does not load the model into VRAM or consume an entitlement.

## 6. Validation and Limits

- Prompt: trimmed, required, maximum 1,200 characters.
- Source formats: PNG, JPEG, or WebP only.
- Mask format: PNG only.
- Uploaded source maximum: 10 MiB.
- Mask maximum: 4 MiB.
- Decode every upload with an image library; do not trust MIME type or filename alone.
- Reject animated and malformed files.
- Limit source dimensions and total pixels before normalization.
- History sources must be queried by both generation ID and authenticated user ID.
- Normalize EXIF orientation and convert sources to sRGB PNG.
- Resize according to configured limits while preserving aspect ratio.
- Resize the mask to the exact normalized source dimensions with nearest-neighbor sampling before optional edge feathering.

The initial output target is the normalized source aspect ratio with a maximum long edge of 1024 pixels. Dimensions are rounded to values accepted by the FLUX.2 latent node.

## 7. Backend Components

### 7.1 Upload parsing

Add `multer` for bounded in-memory multipart parsing. Keep the existing global 1 MiB JSON limit unchanged because the edit endpoint has its own file limits.

Add `sharp` for source normalization, mask inspection, resizing, feathering, and deterministic compositing.

The endpoint accepts only expected field names and one file per field. Buffers are released after the request completes and are never written to the repository.

### 7.2 FLUX.2 adapter

Create a separate `server/flux2Edit.js` module rather than extending the existing checkpoint text-to-image workflow in `server/comfyModel.js`.

Responsibilities:

- parse and clamp FLUX.2 edit configuration;
- query `/object_info` and validate model/node availability;
- upload the normalized source to ComfyUI `/upload/image` with a collision-resistant temporary name;
- construct the core-node workflow;
- queue, poll, and retrieve the output using shared ComfyUI request helpers;
- return the generated image buffer and workflow metadata;
- request cleanup when supported, while tolerating old ComfyUI versions that require manual input cleanup.

Shared HTTP, polling, image-fetching, and model-list helpers should be extracted from `comfyModel.js` only where this removes real duplication. Existing exports and behavior must remain compatible.

### 7.3 Core-node workflow

The workflow uses the installed files:

```text
Diffusion model: flux-2-klein-4b-fp8.safetensors
Text encoder:    qwen_3_4b.safetensors
VAE:             flux2-vae.safetensors
```

Required core nodes:

```text
UNETLoader
CLIPLoader
VAELoader
LoadImage
VAEEncode
ReferenceLatent
CLIPTextEncode
EmptyFlux2LatentImage
KSampler
VAEDecode
SaveImage
```

Data flow:

```text
UNETLoader ------------------------------------------> KSampler model
CLIPLoader -> CLIPTextEncode -> ReferenceLatent ----> KSampler positive
VAELoader -> VAEEncode(source) -> ReferenceLatent ---^ reference latent
EmptyFlux2LatentImage -------------------------------> KSampler latent
KSampler -> VAEDecode -> SaveImage
```

The exact `ReferenceLatent` input/output wiring is generated from the installed ComfyUI node schema and covered by a workflow-shape test. No fixed third-party node IDs are stored.

Default sampling configuration:

```text
steps=4
cfg=1
sampler=euler
scheduler=simple
seed=-1
```

### 7.4 Masked compositing

FLUX.2 first produces a semantic edit from the source and prompt. For masked mode, the server then composites that result over the normalized original:

```text
final = edited * featheredMask + original * (1 - featheredMask)
```

The implementation must preserve original pixels exactly where the original mask is zero. Feathering applies only within a small configurable boundary around painted pixels. Fully transparent or fully black masks are treated as semantic-edit mode; a fully white mask is accepted as a full-image edit.

Compositing is performed with `sharp`, independently of optional ComfyUI image utility nodes. This makes local-edit behavior stable across ComfyUI updates.

## 8. Entitlement and Persistence Flow

The route follows this sequence:

1. Authenticate.
2. Validate text fields and file structure.
3. Resolve the owned history source or decode the upload.
4. Normalize the source and mask.
5. Check FLUX.2 readiness.
6. Reserve one generation entitlement.
7. Run the ComfyUI edit.
8. Composite masked output when needed.
9. Save the final image and metadata through `saveAvatarGeneration` using the reservation ID.
10. Return the result, new history record, and refreshed billing status.

If any step after reservation fails, call `releaseGenerationReservation`. Database persistence consumes the reservation using the existing transaction. A client disconnect should abort local work when practical and must not leave a reservation permanently reserved.

No database migration is required. Store the edit relationship in existing `metadata JSONB`:

```json
{
  "operation": "edit",
  "sourceGenerationId": "uuid-or-null",
  "masked": true,
  "source": "history",
  "backend": "comfyui",
  "workflow": "flux2-reference-edit-v1",
  "comfy": {
    "endpoint": "http://127.0.0.1:8188",
    "promptId": "...",
    "diffusionModel": "flux-2-klein-4b-fp8.safetensors",
    "textEncoder": "qwen_3_4b.safetensors",
    "vae": "flux2-vae.safetensors"
  }
}
```

Do not store the uploaded source as a separate history row. Store only the successful final result.

## 9. Configuration and Model Switching

Add explicit edit-model settings:

```dotenv
COMFY_FLUX2_UNET_NAME=flux-2-klein-4b-fp8.safetensors
COMFY_FLUX2_CLIP_NAME=qwen_3_4b.safetensors
COMFY_FLUX2_VAE_NAME=flux2-vae.safetensors
COMFY_FLUX2_WIDTH=1024
COMFY_FLUX2_HEIGHT=1024
COMFY_FLUX2_STEPS=4
COMFY_FLUX2_CFG=1
COMFY_FLUX2_SAMPLER_NAME=euler
COMFY_FLUX2_SCHEDULER=simple
COMFY_FLUX2_MASK_FEATHER=8
COMFY_EDIT_MAX_UPLOAD_MB=10
```

These variables are separate from `COMFY_CHECKPOINT_NAME`, allowing the existing text-to-image model selector and the FLUX.2 edit model to evolve independently.

When a new compatible FLUX.2 model is downloaded in ComfyUI:

1. place each file in its ComfyUI model directory;
2. refresh ComfyUI model paths or restart ComfyUI;
3. update only the matching `COMFY_FLUX2_*_NAME` values;
4. restart the application container;
5. check `/api/comfyui/flux2/health` before editing.

The server validates exact names against `/object_info`; it must not silently select an unrelated model. A fallback may be reported but not used for edit requests unless explicitly configured.

## 10. Error Handling

Use stable error codes and Chinese user-facing messages:

| Status | Code | Situation |
| --- | --- | --- |
| 400 | `EDIT_PROMPT_REQUIRED` | Missing prompt |
| 400 | `EDIT_SOURCE_REQUIRED` | Missing or conflicting source |
| 400 | `EDIT_IMAGE_INVALID` | Unsupported or malformed image |
| 404 | `EDIT_SOURCE_NOT_FOUND` | History source missing or not owned |
| 413 | `EDIT_IMAGE_TOO_LARGE` | File or decoded image exceeds limits |
| 402 | `PAYMENT_REQUIRED` | No generation entitlement |
| 503 | `FLUX2_NOT_READY` | ComfyUI, model, VAE, encoder, or node unavailable |
| 503 | `COMFYUI_EDIT_TIMEOUT` | Queue or generation timeout |
| 502 | `IMAGE_EDIT_FAILED` | Other generation/compositing failure |

Server logs include the authenticated user ID, reservation ID, ComfyUI prompt ID, and internal error message, but never raw image data, cookies, or secrets.

## 11. Planned File Boundaries

Expected new files:

- `server/flux2Edit.js`: configuration, health check, workflow construction, upload, execution.
- `server/imageEdit.js`: source normalization, mask normalization, compositing.
- `src/components/ImageEditor.jsx`: editor UI and canvas interactions.
- focused unit and API tests under `test/`.

Expected modified files:

- `server/index.js`: health and edit routes, entitlement orchestration.
- `server/comfyModel.js`: export reusable ComfyUI transport helpers if needed.
- `src/App.jsx`: editor state, source selection, edit request, history refresh.
- `src/components/ResultPanel.jsx`: edit entry action.
- existing stylesheet files: responsive editor layout and states.
- `.env.example`, `README.md`, `package.json`, and lockfile.

The implementation should not modify the schema in `server/db.js` unless testing reveals an unavoidable persistence gap.

## 12. Testing Strategy

### 12.1 Unit tests

- configuration parsing and bounds;
- exact model dependency detection;
- core-node workflow shape and model filenames;
- source-image format and size validation;
- mask resize and empty-mask detection;
- compositing proves pixels outside the mask are byte-identical to the normalized original;
- feathered boundary behavior;
- metadata construction.

### 12.2 API tests

- unauthenticated request rejection;
- owned and unowned history source handling;
- conflicting/missing source rejection;
- multipart size and MIME validation;
- entitlement reservation, consumption, and release on every failure path;
- successful edit creates a new record without changing the source record;
- semantic edit without mask;
- masked edit with mask.

### 12.3 Integration verification

- run `npm test`, `npm run check`, and `npm run build`;
- call the FLUX.2 health endpoint against the local ComfyUI instance;
- generate or select a source image and perform one semantic edit;
- perform one masked edit and compare pixels outside the mask;
- switch the configured FLUX.2 filenames and verify readiness reporting;
- confirm existing text-to-image generation still works;
- verify Docker startup, PostgreSQL history persistence, and entitlement behavior;
- inspect desktop and mobile screenshots for canvas sizing, clipping, and controls.

Temporary test accounts and temporary ComfyUI inputs should be removed after verification where the relevant service supports cleanup.

## 13. Acceptance Criteria

- The application never requires `OPENAI_API_KEY` for FLUX.2 editing.
- The installed `flux-2-klein-4b-fp8.safetensors`, `qwen_3_4b.safetensors`, and `flux2-vae.safetensors` files are detected before submission.
- Users can edit the current result, an owned history result, or an uploaded image.
- Prompt-only edits produce a full semantic edit.
- Brush-mask edits leave all pixels outside the editable mask unchanged after source normalization.
- Each successful edit consumes one entitlement and creates one new history record.
- Failed edits release their reservations.
- Existing generation, login, history, download, payment, and model-selection flows continue to pass their tests.
- A compatible future FLUX.2 model can be selected through environment variables and a restart, without changing frontend code or workflow node IDs.
