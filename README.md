# AI Avatar Studio

> **Branch note — no database on this branch**
>
> This branch (`image-generating-system(WithoutDataBase)`) is **not connected to PostgreSQL**.
> Every section and every table row below marked **`[Not used on this branch]`** depends on the
> database — accounts, login, database-backed generation records, download quotas and payments.
> They are kept here as reference documentation only and are inactive right now.
>
> Everything else — prompt building, image generation, editing, local file storage and downloads —
> works without a database.

A React + Express AI avatar customization site aimed at IT Project1. The user writes an idea and
picks character/visual tags; the backend assembles an avatar-specific structured prompt and calls an
image model.

The default image backend is OpenAI `gpt-image-2`. It can also be switched to a local Stable
Diffusion v1.5 service, or a local ComfyUI / FLUX.1-schnell service. The frontend "generation model"
dropdown can switch per request between OpenAI cloud and any ComfyUI checkpoint (`/api/generate`
accepts a request-level `backend` parameter). The local SD1.5 protocol is compatible with the
`/api/generate` contract of the `front-and-back/sd1.5` branch.

OpenAI and ComfyUI generation requests are fixed at `1024×1024`, 1:1 square PNG, and the prompt
constrains a centered face, a fully visible head and a circular-crop safe area. Local SD1.5 mode
defaults to `512×512` and can be adjusted through environment variables.

## Feature overview

- **Generate**: one-sentence description + 100+ style tags (tags are marked stable/experimental, and
  conflicting tags are swapped automatically with a notice). The "Random inspiration" button picks a
  random set of styles and has an OpenAI text model (`OPENAI_TEXT_MODEL`, default `gpt-4.1-mini`,
  falling back to a local inspiration pool when unavailable) write a matching Chinese description.
  OpenAI mode can generate 4 candidates at once and let you pick one; local ComfyUI mode offers an
  optional Qwen3 Chinese enhancement (Chinese is rewritten into English before it reaches FLUX.1).
  The full prompt that will be sent to the model can be previewed before generating.
- **Edit**: quick semantic edits (OpenAI `images.edit`); a local touch-up editor (paint a mask,
  repaint only the selection) with built-in structured categories — color / hair / clothing /
  expression / background / lighting / picture style / object replacement — plus a 12-color swatch
  set, or your own custom prompt; magic erase (circle content and remove it in one click, background
  is filled in automatically, and a closed loop is understood as a filled region). The touch-up /
  erase backend follows `IMAGE_BACKEND` — `comfyui` uses local FLUX.2, everything else uses OpenAI.
- **History**: file-based storage + 256px WebP thumbnails; the main panel shows the 6 most recent
  images and the rest go into a "View all" dialog; deletion is supported; edited versions carry a
  version-chain marker and can jump back to the original; the hero disc shows the newest avatar of
  the account.
- **Download**: the first download consumes 1 free/paid credit and locks the image; the export panel
  offers sizes (1024/640/256) and shapes (square / transparent circle).
  **`[Not used on this branch]`** — the credit and locking behaviour is part of billing; without a
  database, downloads are unlimited and images are never locked.
- **Accounts** **`[Not used on this branch]`**: email registration + Google login; the account center
  can change the display name and the password (verifying the current password).
- **Experience**: a virtual progress bar throughout (expected duration adapts to backend / quality /
  image count), plus mobile touch support.
- **Billing** **`[Not used on this branch]`**: the first 5 downloads are free, after which you can buy
  single downloads (¥5 each) or subscribe to a plan (Go ¥30 for 3/day, Plus ¥50 for 15/day, Pro ¥100
  unlimited, all 30 days). Alipay direct integration, with Stripe as a fallback. Generating and
  editing never consume credits.

## Requirements

- **Node.js ≥ 20.9** (a hard requirement of `sharp` image processing; the Docker image uses node:22)
- Docker (PostgreSQL account database) **`[Not used on this branch]`** — no database is needed here,
  only a writable local directory for the generated images.

## Running locally

```bash
npm install
cp .env.example .env
# Start the account database  [Not used on this branch]
docker compose up -d db
# Edit .env and fill in OPENAI_API_KEY and JWT_SECRET; add the Alipay configuration if you need billing
# On this branch OPENAI_API_KEY alone is enough
npm run dev
```

Open <http://127.0.0.1:5173>. The API server listens on `127.0.0.1:8787` by default.

Lint and tests:

```bash
npm run check   # ESLint
npm test        # node --test, full suite
```

### Simulated local payments — **`[Not used on this branch]`**

When you want to test the paid download flow before Alipay is approved, enable this in your local
`.env`:

```bash
ENABLE_TEST_PAYMENTS=true
```

Restart `npm run dev` and log in; the avatar preview area then shows "Local test: simulate a
successful payment and add 1 download". Each click makes the backend create a paid `provider=test`
order and adds 1 paid download credit to the logged-in account.

This feature has multiple safeguards: it is force-disabled when `NODE_ENV=production`, and both
`FRONTEND_BASE_URL` and `PUBLIC_API_BASE_URL` must be `localhost`, `127.0.0.1` or `::1`. A production
`.env` must keep `ENABLE_TEST_PAYMENTS=false`.

## Running in production

```bash
npm run build
npm start
```

Open <http://127.0.0.1:8787>. In production mode Express serves both the frontend static files and
the API.

## Environment variables

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `IMAGE_BACKEND` | No | `openai` | Image backend: `openai`, `local-sd1.5` or `comfyui` |
| `OPENAI_API_KEY` | Required in OpenAI mode | — | API key, read on the backend only |
| `OPENAI_IMAGE_MODEL` | No | `gpt-image-2` | Image model name |
| `OPENAI_BASE_URL` | No | Official OpenAI endpoint | Custom gateway address compatible with the OpenAI protocol |
| `OPENAI_TEXT_MODEL` | No | `gpt-4.1-mini` | Text model used by "Random inspiration"; falls back to the local inspiration pool if the call fails |
| `DATABASE_URL` | Required for accounts/history | Docker Compose default | PostgreSQL connection string — **`[Not used on this branch]`** |
| `AVATAR_STORAGE_DIR` | No | `./data/avatars` | Directory where generated images and thumbnails land |
| `OPENAI_EDIT_MASK_FEATHER` | No | `8` | Feather radius of the OpenAI edit mask, range 0-64 |
| `OPENAI_EDIT_MAX_UPLOAD_MB` | No | `10` | Upload limit for the OpenAI edit source image, range 1-25 MiB |
| `JWT_SECRET` | Required for accounts/history | — | Login session signing key; use a long random string — **`[Not used on this branch]`** |
| `FRONTEND_BASE_URL` | Required for Google login | `http://127.0.0.1:5173` | Frontend redirect target after Google login — **`[Not used on this branch]`** |
| `PUBLIC_API_BASE_URL` | Required for Google login | `http://127.0.0.1:8787` | Backend address the Google OAuth callback points at — **`[Not used on this branch]`** |
| `COOKIE_SECURE` | No | `false` | Set to `true` for HTTPS deployments — **`[Not used on this branch]`** |
| `GOOGLE_CLIENT_ID` | Required for Google login | — | Google OAuth Client ID — **`[Not used on this branch]`** |
| `GOOGLE_CLIENT_SECRET` | Required for Google login | — | Google OAuth Client Secret — **`[Not used on this branch]`** |
| `PAYMENT_PROVIDER` | No | `auto` | `auto` prefers Alipay direct integration; can be pinned to `alipay` or `stripe` — **`[Not used on this branch]`** |
| `ENABLE_TEST_PAYMENTS` | No | `false` | Simulated payment button, local addresses and non-production environments only — **`[Not used on this branch]`** |
| `DEV_UNLIMITED_USAGE` | No | `false` | Local addresses and non-production environments only; removes the generate/edit/download limits and the download lock — **`[Not used on this branch]`** |
| `ALIPAY_APP_ID` | Required for Alipay | — | Alipay Open Platform application AppID — **`[Not used on this branch]`** |
| `ALIPAY_PRIVATE_KEY` | Required for Alipay | — | Application private key, read on the backend only; literal `\n` line breaks are supported — **`[Not used on this branch]`** |
| `ALIPAY_PUBLIC_KEY` | Required for Alipay | — | The Alipay public key, not the application public key — **`[Not used on this branch]`** |
| `ALIPAY_KEY_TYPE` | No | `PKCS8` | Application private key format: `PKCS8` or `PKCS1` — **`[Not used on this branch]`** |
| `ALIPAY_GATEWAY` | No | Production gateway | Alipay gateway; swap in the sandbox gateway for sandbox testing — **`[Not used on this branch]`** |
| `ALIPAY_NOTIFY_URL` | No | Derived from the API address | Public HTTPS address for Alipay async notifications — **`[Not used on this branch]`** |
| `ALIPAY_SELLER_ID` | No | — | Merchant PID; when set, the callback merchant identity is additionally verified — **`[Not used on this branch]`** |
| `STRIPE_SECRET_KEY` | Required for the Stripe fallback | — | Stripe server-side secret key; backend only — **`[Not used on this branch]`** |
| `STRIPE_WEBHOOK_SECRET` | Required for Stripe settlement | — | Stripe webhook signing secret, usually starting with `whsec_` — **`[Not used on this branch]`** |
| `LOCAL_MODEL_BASE_URL` | Required in local mode | `http://127.0.0.1:8000` | Local SD1.5 service address |
| `LOCAL_MODEL_WIDTH` | No | `512` | Width passed to the local model |
| `LOCAL_MODEL_HEIGHT` | No | `512` | Height passed to the local model |
| `LOCAL_MODEL_STEPS` | No | `20` | Sampling steps passed to the local model |
| `LOCAL_MODEL_CFG` | No | `7.5` | CFG passed to the local model |
| `LOCAL_MODEL_SEED` | No | `-1` | `-1` lets the local model service randomize |
| `LOCAL_MODEL_TIMEOUT_MS` | No | `240000` | Timeout while waiting for the local model to generate |
| `COMFYUI_BASE_URL` | Required in ComfyUI mode | `http://127.0.0.1:8188` | Local ComfyUI address |
| `COMFY_PROMPT_MODE` | No | `flux1-qwen` | `flux1-qwen` translates Chinese first, `flux1-raw` uses the original prompt directly; both generate with FLUX.1 |
| `COMFY_TRANSLATOR_CLIP_NAME` | Required for Chinese enhancement | `qwen_3_4b.safetensors` | Qwen3 text model used by ComfyUI `TextGenerate` |
| `COMFY_TRANSLATOR_CLIP_TYPE` | No | `flux2` | Model type of Qwen3 inside `CLIPLoader` |
| `COMFY_TRANSLATOR_MAX_LENGTH` | No | `384` | Output length cap for the Qwen3 translation |
| `COMFY_TRANSLATOR_RETRIES` | No | `1` | Retries after a failed translation; on repeated failure FLUX.1 receives the original prompt |
| `COMFY_CHECKPOINT_NAME` | Required in ComfyUI mode | `flux1-schnell-fp8.safetensors` | ComfyUI checkpoint file name |
| `COMFY_WIDTH` / `COMFY_HEIGHT` | No | `1024` | ComfyUI output size |
| `COMFY_STEPS` | No | `4` | FLUX schnell default fast step count |
| `COMFY_CFG` | No | `1` | FLUX schnell default CFG |
| `COMFY_SAMPLER_NAME` | No | `euler` | ComfyUI KSampler sampler |
| `COMFY_SCHEDULER` | No | `simple` | ComfyUI KSampler scheduler |
| `COMFY_SEED` | No | `-1` | `-1` means the backend randomizes |
| `COMFY_POLL_INTERVAL_MS` | No | `1500` | Polling interval for ComfyUI results |
| `COMFY_MAX_POLL_ATTEMPTS` | No | `120` | Maximum number of polls |
| `COMFY_FLUX2_UNET_NAME` | Required for FLUX.2 editing | `flux-2-klein-4b-fp8.safetensors` | FLUX.2 Klein diffusion model file name |
| `COMFY_FLUX2_CLIP_NAME` | Required for FLUX.2 editing | `qwen_3_4b.safetensors` | FLUX.2 text encoder file name |
| `COMFY_FLUX2_VAE_NAME` | Required for FLUX.2 editing | `flux2-vae.safetensors` | FLUX.2 VAE file name |
| `COMFY_FLUX2_STEPS` / `COMFY_FLUX2_CFG` | No | `4` / `1` | Sampling steps and CFG for FLUX.2 editing |
| `COMFY_FLUX2_SAMPLER_NAME` / `COMFY_FLUX2_SCHEDULER` | No | `euler` / `simple` | Sampler and scheduler for FLUX.2 editing |
| `COMFY_FLUX2_SEED` | No | `-1` | `-1` means the backend randomizes |
| `COMFY_FLUX2_MASK_FEATHER` | No | `8` | Feather radius of the mask edge, range 0-64 |
| `COMFY_EDIT_MAX_UPLOAD_MB` | No | `10` | Upload limit for the edit source image, range 1-25 MiB |
| `PORT` | No | `8787` | Backend port |

Never commit `.env` to Git, and never put a secret into a variable that starts with `VITE_`.

Unlimited local debugging requires setting both `NODE_ENV=development` and `DEV_UNLIMITED_USAGE=true`
in the real `.env`, with the frontend and backend addresses kept at `localhost` or `127.0.0.1`. After
changing them run `docker compose up -d --build --force-recreate app`; do not delete the database
volume. Production force-disables this mode. **`[Not used on this branch]`** — there are no usage
limits here to begin with.

## Accounts and generation records — **`[Not used on this branch]`**

> This whole section requires PostgreSQL and is inactive on this branch. Generated images are written
> to the local storage directory instead, and no account or login is involved.

The project ships with email registration/login, Google login and per-account generation records.
Data lives in the PostgreSQL instance started by Docker Compose; the default volume is
`tmall_avatar_pgdata`.

Start the database:

```bash
docker compose up -d db
```

The default connection string is already in `.env.example`:

```bash
DATABASE_URL=postgres://tmall_avatar:tmall_avatar_dev@127.0.0.1:5432/tmall_avatar
```

The first time the backend starts it creates the account, generation and billing tables:

- `users`: email accounts, Google account data, password hashes;
- `avatar_generations`: generation records of logged-in users — prompt, strategy, model, creation
  time, parent edit source and download lock state (images themselves live on disk, the row only
  records the file name);
- `payment_orders`: Alipay direct or Stripe orders — amount, currency and idempotent settlement state;
- `generation_reservations`: consumption records of free/paid download credits.

### Image storage

Generated images are stored as a PNG original plus a 256px WebP thumbnail in `AVATAR_STORAGE_DIR`
(default `./data/avatars`, already ignored in `.gitignore`; Docker deployments mount
`./data:/app/data`). The API serves images through `GET /api/generations/:id/image` and `/thumb`,
which check authentication and ownership and respond with an `immutable` long-cache header. The
history list only returns URLs, never base64. *(This part is still how images are stored on this
branch.)*

Early versions stored base64 images directly in the database; on startup the service automatically
and idempotently migrates such legacy records to disk (log line
`[image-migration] Migrated N legacy image(s).`), so no manual work is needed.

Generating and editing avatars requires being logged in but does not consume free credits. Every
successful generation or edit automatically saves the image data and prompt into the PostgreSQL
instance started by Docker Compose and shows it under "My generation records". Every account gets 5
free confirmed downloads; after that you can buy single downloads (¥5 each) or subscribe to a
download plan. An avatar is locked automatically after its first confirmed download; a locked image
can still be downloaded, but it can no longer be used as the base for edits.

Download plans (clicking "Buy credits" opens a submenu; every purchase lasts 30 days):

| Plan | Price | Credits |
| --- | --- | --- |
| Go | ¥30 | 3 downloads per day, unused credits do not carry over, resets on the natural day |
| Plus | ¥50 | 15 downloads per day, resets daily |
| Pro | ¥100 | Unlimited downloads, resets over 30 days |

Plan rules: buying the same tier again is a **renewal** that extends the current expiry by 30 days; a
lower tier can be **upgraded by paying the difference** to a higher one (e.g. Go→Plus costs only ¥20),
and an upgrade takes effect immediately without changing the expiry date; a higher plan **cannot be
downgraded**; a subscription can be **cancelled at any time** — after cancelling, the plan stays until
the current expiry date, credits remain usable in the meantime, and no renewal happens afterwards
(renewing/upgrading restores the subscription automatically). The deduction order is: plan credits for
the day → the 5 free downloads → single paid credits. Plan data lives in the `users` columns
`plan_id` / `plan_expires_at` / `plan_daily_used` / `plan_daily_date`; orders distinguish the cases
through `plan_id` + `plan_action` (activate/renew/upgrade) in `payment_orders`. Daily credits refresh
lazily on access, so no scheduled job is needed.

Account endpoints:

```text
POST  /api/auth/register
POST  /api/auth/login
POST  /api/auth/logout
GET   /api/auth/me
PATCH /api/auth/profile    # change the display name
POST  /api/auth/password   # change the password (requires the current one)
```

Generation record endpoints:

```text
GET    /api/generations
GET    /api/generations/:id/image       # original (auth + ownership check)
GET    /api/generations/:id/thumb       # 256px WebP thumbnail
GET    /api/generations/:id/download    # ?size=1024|640|256&shape=square|circle
POST   /api/generations/:id/edit
DELETE /api/generations/:id
```

### Google login configuration — **`[Not used on this branch]`**

Create an OAuth Client in the Google Cloud Console and set the authorized callback address to:

```text
http://127.0.0.1:8787/api/auth/google/callback
```

Then fill in `.env`:

```bash
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=...
PUBLIC_API_BASE_URL=http://127.0.0.1:8787
FRONTEND_BASE_URL=http://127.0.0.1:5173
```

In production, change the callback to your real HTTPS domain and set:

```bash
COOKIE_SECURE=true
```

## Alipay direct integration — **`[Not used on this branch]`**

> Payments depend on the order tables in the database and are inactive on this branch.

The project supports the Alipay Open Platform "computer website payment" product, and prefers Alipay
direct integration; when Alipay is not configured it falls back to Stripe Checkout. The unit price is
fixed on the backend at ¥5 (API amount `500` cents), and each successful payment adds 1 avatar
download credit. The AppID and keys are never sent to the frontend.

1. Create a web/mobile application on the Alipay Open Platform and apply for "computer website
   payment". Whether individual accounts may apply, and the fee rate, are whatever the Alipay review
   page shows.
2. Configure an RSA2 key pair for the application, keep the application private key, and copy the
   **Alipay public key** from the Open Platform. Be careful not to use the application public key by
   mistake.
3. Fill in `.env`:

```bash
PAYMENT_PROVIDER=alipay
ALIPAY_APP_ID=your-application-AppID
ALIPAY_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
ALIPAY_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----"
ALIPAY_KEY_TYPE=PKCS8
FRONTEND_BASE_URL=https://your-frontend-domain
PUBLIC_API_BASE_URL=https://your-backend-domain
ALIPAY_NOTIFY_URL=https://your-backend-domain/api/billing/alipay/notify
```

4. Alipay async notifications must be reachable from the public internet over HTTPS. `127.0.0.1` /
   `localhost` cannot receive real notifications; for local debugging use a trusted HTTPS tunnel or
   deploy to a test server.
5. Restart the backend and call `/api/health` to confirm that `paymentConfigured` is `true` and
   `paymentProvider` is `alipay`.

The page you return to after paying queries the order state once itself; the async notification is
still the final settlement guarantee. The backend verifies the RSA2 signature, the AppID, the optional
merchant PID, the order number, the RMB amount and the transaction state at the same time. A database
transaction guarantees that the same order only ever adds credit once, even if duplicate notifications
arrive.

### Stripe fallback — **`[Not used on this branch]`**

If Alipay direct integration has not been approved yet, set `PAYMENT_PROVIDER` to `stripe` and
configure `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`. Locally you can use:

```bash
stripe listen --forward-to http://127.0.0.1:8787/api/billing/webhook
```

In production, add `https://your-backend-domain/api/billing/webhook` to the Stripe webhooks and
subscribe to `checkout.session.completed` and `checkout.session.async_payment_succeeded`.

Whichever payment channel is used, billing is enforced on the backend; generating and editing never
consume credits, the first "confirm download and lock" consumes 1 free or paid credit, and further
downloads of the same image are never charged again.

## Using the local SD1.5 model

First start a local model service that is compatible with the `front-and-back/sd1.5` branch API, for
example:

```bash
python app/server.py --host 127.0.0.1 --port 8000
```

The local model service needs this in its own `.env`:

```bash
CHECKPOINT_PATH=/path/to/v1-5-pruned-emaonly.safetensors
```

Then switch this project's `.env`:

```bash
IMAGE_BACKEND=local-sd1.5
LOCAL_MODEL_BASE_URL=http://127.0.0.1:8000
LOCAL_MODEL_WIDTH=512
LOCAL_MODEL_HEIGHT=512
LOCAL_MODEL_STEPS=20
LOCAL_MODEL_CFG=7.5
LOCAL_MODEL_SEED=-1
```

The project converts the Chinese frontend options into the request body the local model service
expects:

```json
{
  "selected_options": ["style_japanese_moe", "hair_twin_tails"],
  "custom_prompt": "extra description from the user",
  "negative_prompt": "things the user does not want to see",
  "generation": {
    "width": 512,
    "height": 512,
    "steps": 20,
    "cfg": 7.5,
    "seed": -1
  }
}
```

## Using local ComfyUI / FLUX.1-schnell

Start ComfyUI first and confirm the browser can open:

```text
http://127.0.0.1:8188
```

Put the FLUX model into ComfyUI's checkpoint directory, for example:

```text
ComfyUI/models/checkpoints/flux1-schnell-fp8.safetensors
```

Then switch this project's `.env`:

```bash
IMAGE_BACKEND=comfyui
COMFYUI_BASE_URL=http://127.0.0.1:8188
COMFY_GENERATION_ENGINE=flux1
COMFY_PROMPT_MODE=flux1-qwen
COMFY_TRANSLATOR_CLIP_NAME=qwen_3_4b.safetensors
COMFY_TRANSLATOR_CLIP_TYPE=flux2
COMFY_TRANSLATOR_MAX_LENGTH=384
COMFY_TRANSLATOR_RETRIES=1
COMFY_CHECKPOINT_NAME=flux1-schnell-fp8.safetensors
COMFY_WIDTH=1024
COMFY_HEIGHT=1024
COMFY_STEPS=4
COMFY_CFG=1
COMFY_SAMPLER_NAME=euler
COMFY_SCHEDULER=simple
COMFY_SEED=-1
```

Chinese enhancement mode runs the text translation workflow first:

```text
CLIPLoader(qwen_3_4b.safetensors, type=flux2)
-> TextGenerate
-> PreviewAny
-> backend validates the English JSON
```

The translation result then enters the FLUX.1 image workflow:

```text
CheckpointLoaderSimple
-> CLIPTextEncode / negative CLIPTextEncode
-> EmptyLatentImage
-> KSampler
-> VAEDecode
-> SaveImage
```

Images generated in ComfyUI mode are also written to disk as files with a thumbnail, and the frontend
previews and downloads them through URLs.

The "Chinese instruction processing" switch on the page only toggles whether Qwen translation is
enabled; it does not switch the image generation model. The first generation always uses the selected
FLUX.1 checkpoint; FLUX.2 is only used once you enter the editor from an existing image. The Qwen
translation preserves characters, actions, objects, scene, counts, age, gender and exclusions; if
translation fails twice it falls back to `flux1-raw` automatically and never switches to FLUX.2.

### Editing images with local FLUX.2 Klein

The backend of the touch-up / magic-erase editor follows `IMAGE_BACKEND`: with `comfyui` it uses the
local FLUX.2 described in this section; otherwise (including the default `openai`) it uses OpenAI
`images.edit` and needs no local model at all. The configuration below is only required in ComfyUI
mode.

FLUX.2 editing reuses the same ComfyUI service but uses separate model files. The file names and
directories must be exactly:

```text
ComfyUI/models/diffusion_models/flux-2-klein-4b-fp8.safetensors
ComfyUI/models/text_encoders/qwen_3_4b.safetensors
ComfyUI/models/vae/flux2-vae.safetensors
```

Configure in `.env`:

```dotenv
COMFY_FLUX2_UNET_NAME=flux-2-klein-4b-fp8.safetensors
COMFY_FLUX2_CLIP_NAME=qwen_3_4b.safetensors
COMFY_FLUX2_VAE_NAME=flux2-vae.safetensors
COMFY_FLUX2_STEPS=4
COMFY_FLUX2_CFG=1
COMFY_FLUX2_SAMPLER_NAME=euler
COMFY_FLUX2_SCHEDULER=simple
COMFY_FLUX2_SEED=-1
COMFY_FLUX2_MASK_FEATHER=8
COMFY_EDIT_MAX_UPLOAD_MB=10
```

Use `http://127.0.0.1:8188` when checking ComfyUI from the host machine. When the app runs inside a
Docker container it must use:

```dotenv
IMAGE_BACKEND=comfyui
COMFYUI_BASE_URL=http://host.docker.internal:8188
```

`GET /api/comfyui/flux2/health` checks ComfyUI, the three model files, the `flux2` type and the nodes
the edit workflow needs; start editing only after it returns `200` with `ok: true`. The order for
installing or switching models is: stop ComfyUI, put the three files into the directories above,
update the exact file names in `.env`, restart ComfyUI, then rebuild only the app service with
`docker compose up -d --build --force-recreate app`, and finally check the FLUX.2 health endpoint. Do
not delete the PostgreSQL volume.

`POST /api/edits` accepts a PNG, JPEG or WebP source image, 10 MiB by default; the optional mask must
be a PNG of at most 4 MiB. Without a mask it performs a semantic edit and the whole image may change;
with a mask only the masked area is composited and the pixels outside the mask keep the normalized
original. With `operation=remove` (the frontend's "magic erase") no prompt is needed but a mask is
required: the inside of a closed loop is merged into the selection as a whole, the server repaints it
with a fixed removal instruction and fills it with background, and in OpenAI mode the mask is also
converted into a native inpaint mask. Every success saves a history draft that can be edited further,
without consuming download credits.

Temporary source images uploaded for editing are kept in `ComfyUI/input/tmall_edits`. The current
ComfyUI core upload API has no guaranteed delete operation, so you should periodically stop ComfyUI,
clean stale files out of that directory and restart it; never delete input files while ComfyUI is
handling requests.

## Prompt strategy

Beyond the plain Chinese options and the English visual anchors, the backend applies extra
avatar-specific rewrites:

- full-body, long-dress and big-skirt requests are rewritten into head-and-shoulders / bust framing;
- two-person, couple, best-friend and sibling avatars enter a safe multi-person avatar composition;
- multiple backgrounds or complex battle scenes are ordered by importance, with the background
  weakened to low contrast;
- multiple styles are split into a main style and a supporting texture;
- sports, magic and combat actions are downgraded into expressions, light effects and mood symbols;
- multiple headpieces keep the main one and downgrade the rest into small ornaments, avoiding
  circular-crop truncation.

## API

- `GET /api/health`: service state and model configuration state (including `backend`,
  `openaiConfigured`, `openaiModel`)
- `GET /api/auth/me`: the currently logged-in user — **`[Not used on this branch]`**
- `POST /api/auth/register`: email registration — **`[Not used on this branch]`**
- `POST /api/auth/login`: email login — **`[Not used on this branch]`**
- `POST /api/auth/logout`: log out — **`[Not used on this branch]`**
- `PATCH /api/auth/profile`: change the display name — **`[Not used on this branch]`**
- `POST /api/auth/password`: change the password (the correct current password is required; a
  Google-only account returns `PASSWORD_NOT_SET`) — **`[Not used on this branch]`**
- `GET /api/generations`: generation records of the current account (images are returned as URLs,
  `limit` max 60)
- `GET /api/generations/:id/image`: original; `GET /api/generations/:id/thumb`: thumbnail (login
  required, and only your own records are accessible — **`[Not used on this branch]`**)
- `GET /api/generations/:id/download`: confirm the avatar download; the first download consumes 1
  free/paid credit and locks the image, later downloads are free — **`[Not used on this branch]`**.
  Supports `?size=1024|640|256&shape=square|circle` (circle is a transparent-background PNG)
- `POST /api/generations/:id/edit`: quick semantic edit of an unlocked history avatar, producing a new
  editable version
- `DELETE /api/generations/:id`: delete a generation record and clean up the disk file (if the file is
  still referenced by another record, only the record is removed)
- `GET /api/billing/status`: free downloads left, paid credits and the active plan for the current
  account (including today's remaining credits) plus the purchasable plan catalogue —
  **`[Not used on this branch]`**
- `POST /api/billing/checkout`: when configured, creates an Alipay direct order or a Stripe Checkout
  session; passing `planId` (`go`/`plus`/`pro`) in the body buys a plan and the backend decides between
  activation / renewal / paid upgrade and prices it accordingly (downgrades return 400); without it,
  buys a single ¥5 credit — **`[Not used on this branch]`**
- `POST /api/billing/confirm`: after returning from payment, queries the order and settles it
  idempotently (single credit top-up, or plan activation/renewal/upgrade depending on the order) —
  **`[Not used on this branch]`**
- `POST /api/billing/test-purchase`: only when local development enables it; simulates settling 1
  download credit, or activates/renews/upgrades a plan in one click when `planId` is passed —
  **`[Not used on this branch]`**
- `POST /api/billing/plan/cancel`: cancel renewal of the current plan; the plan stays until its expiry
  date and then stops automatically — **`[Not used on this branch]`**
- `POST /api/billing/alipay/notify`: Alipay RSA2-signed async notification, the final settlement entry
  point for direct payments — **`[Not used on this branch]`**
- `POST /api/billing/webhook`: Stripe signed webhook, the settlement entry point of the Stripe
  fallback — **`[Not used on this branch]`**
- `GET /api/local-model/health`: check whether the local model service is reachable
- `GET /api/comfyui/health`: check whether local ComfyUI and the checkpoint are reachable
- `GET /api/comfyui/models`: list the available ComfyUI checkpoints (for the frontend model dropdown)
- `GET /api/comfyui/flux2/health`: check whether the current edit backend is ready (ComfyUI mode checks
  the FLUX.2 models and nodes, OpenAI mode checks the API key)
- `POST /api/prompt-preview`: preview only the full prompt assembled by the backend
- `POST /api/generate`: after login, calls the image model and saves a draft; supports `backend`
  (`openai`/`comfyui`), `checkpoint` and `count` (with OpenAI, `4` returns four `candidates`);
  generation itself does not consume download credits
- `POST /api/edits`: after login, performs a whole-image semantic edit, a masked local edit or a magic
  erase (`operation=remove`) and saves a new draft; editing itself does not consume download credits

The generate, edit and login endpoints all have in-memory sliding-window rate limits, and every
response carries basic security headers.

## FAQ and troubleshooting

### 5173 did not start, only 8787 is reachable

In local development `npm run dev` starts two services at once:

- `http://127.0.0.1:5173`: the Vite frontend dev server;
- `http://127.0.0.1:8787`: the Express backend API server.

If only `8787` works but `5173` does not open, the Vite process is usually stuck or has exited, or you
only started the backend with `node server/index.js`. Check the ports from the project directory
first:

```bash
cd /Users/gravidmac/Codex/image_generating
lsof -nP -iTCP:5173 -iTCP:8787 -sTCP:LISTEN
```

Normally you should see both listeners:

```text
TCP 127.0.0.1:5173 (LISTEN)
TCP 127.0.0.1:8787 (LISTEN)
```

If you only see `8787`, or you see leftover `npm run dev` / `vite` / `node server/index.js` processes
while `5173` does not respond, clean up and restart as follows.

1. Find the relevant processes:

```bash
ps aux | grep -E "vite|server/index|concurrently|npm run dev" | grep -v grep
```

2. Kill the stuck or leftover processes. Replace `<PID>` with the process IDs from the previous step:

```bash
kill <PID1> <PID2> <PID3>
```

If `npm run dev` is simply running in the current terminal, you can also press:

```text
Ctrl + C
```

3. Restart from the correct project directory:

```bash
cd /Users/gravidmac/Codex/image_generating
npm run dev
```

After a successful start the terminal should show:

```text
VITE ready
Local: http://127.0.0.1:5173/
Image Studio API running at http://127.0.0.1:8787
```

4. Then confirm the service state:

```bash
curl -I http://127.0.0.1:5173/
curl http://127.0.0.1:8787/api/health
```

If `configured` or `databaseConfigured` in `/api/health` is still `false`, check that `.env` is in the
`image_generating` directory and re-run `npm run dev` after editing `.env`. The Node backend does not
pick up new environment variables for an already running process. (`databaseConfigured` is expected to
be `false` on this branch — **`[Not used on this branch]`**.)

## FLUX parameter benchmark

The command below produces a deterministic JSON benchmark checklist; it does not call ComfyUI and does
not consume generation time:

```bash
npm run benchmark:parameters > parameter-benchmark.json
```

The checklist always uses the seeds `42`, `314159` and `20260714`, and covers every public creative
parameter of FLUX.1 plus the FLUX.2 color, hair, clothing, expression, background, lighting, style,
replacement and custom edits. Run the checklist manually in a fixed environment — same model files,
workflow and GPU — and record execution success, instruction adherence, character preservation,
composition stability, edge quality, artifacts and hard failures.

The category thresholds are percentages: at least `80%` success with no more than `5%` hard failures
is stable; `60%` to `79%` success is experimental; below `60%` success or above `15%` hard failures
should be removed from the page. Re-run the same checklist after a model or ComfyUI node update, so
that model changes are not mistaken for parameter changes.
