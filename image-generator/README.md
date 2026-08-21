# 天猫 AI 头像馆

一个面向天猫商城消费者的 React + Express AI 头像定制网站。用户填写创意、选择角色视觉标签，后端会整理头像专用结构化提示词并调用图片模型。

默认图片后端是 OpenAI `gpt-image-2`，也可以切换为本地 Stable Diffusion v1.5 服务或本地 ComfyUI / FLUX.1-schnell 服务。前端「生成模型」下拉可以在 OpenAI 云端与各 ComfyUI checkpoint 之间按次切换（`/api/generate` 支持请求级 `backend` 参数）。本地 SD1.5 通信接口兼容 `front-and-back/sd1.5` 分支的 `/api/generate` 范式。

OpenAI 和 ComfyUI 生成请求默认固定为 `1024×1024`、1:1 方形 PNG，并在提示词中约束面部居中、头部完整和圆形裁剪安全区。本地 SD1.5 模式默认使用 `512×512`，可通过环境变量调整。

## 功能一览

- **生成**：一句话描述 + 100+ 风格标签（标签带稳定/实验标注，冲突标签自动替换并提示）；「随机灵感」按钮一键随机勾选风格并由 OpenAI 文本模型（`OPENAI_TEXT_MODEL`，默认 `gpt-4.1-mini`，不可用时回退本地灵感池）生成匹配的中文描述；OpenAI 模式支持一次生成 4 张候选并挑选；本地 ComfyUI 模式可选 Qwen3 中文增强（先把中文整理成英文再交给 FLUX.1）；生成前可预览将发送给模型的完整提示词
- **修改**：快速语义修改（OpenAI `images.edit`）；局部微调编辑器（画蒙版，仅重绘选区），内置颜色/发型/服装/表情/背景/光线/画面风格/替换物体等结构化分类和 12 色色卡，也可自定义提示词；魔法消除（圈选内容一键移除、背景自动填充，圈选按封闭区域理解）。微调/消除的后端跟随 `IMAGE_BACKEND`——`comfyui` 时走本地 FLUX.2，其他情况走 OpenAI
- **历史**：文件化存储 + 256px WebP 缩略图；主面板显示最近 6 张，其余收进「查看全部」弹窗；支持删除；修改版带版本链标记并可跳回原版；Hero 圆盘会展示账号最新的三张头像
- **下载**：首次下载扣 1 次免费/付费额度并锁定图片；导出面板可选尺寸（1024/640/256）和形状（方形/圆形透明）
- **账号**：邮箱注册 + Google 登录；账号中心可改昵称、改密码（校验当前密码）
- **体验**：全程虚拟进度条（按后端/精度/张数自适应预期时长）、移动端触屏适配
- **计费**：前 5 次下载免费，之后可单次购买（¥5/张）或订阅套餐（Go ¥30 每天 3 次 / Plus ¥50 每天 15 次 / Pro ¥100 无限，均 30 天），支付宝直连（Stripe 备用）；生成和修改不扣额度

## 运行要求

- **Node.js ≥ 20.9**（`sharp` 图像处理的硬性要求；Docker 镜像使用 node:22）
- Docker（PostgreSQL 账号数据库）

## 本地运行

```bash
npm install
cp .env.example .env
# 启动账号数据库
docker compose up -d db
# 编辑 .env，填写 OPENAI_API_KEY、JWT_SECRET；需要收费时再填写支付宝支付配置
npm run dev
```

打开 <http://127.0.0.1:5173>。API 服务默认监听 `127.0.0.1:8787`。

代码检查与测试：

```bash
npm run check   # ESLint
npm test        # node --test 全量测试
```

### 本地模拟支付

需要测试付费下载流程、但尚未取得真实支付宝参数时，在本机 `.env` 开启：

```bash
ENABLE_TEST_PAYMENTS=true
```

重启 `npm run dev` 并登录账号后，头像预览区域会显示“本地测试：模拟支付成功并增加 1 次下载”。每点击一次，后端都会创建一条 `provider=test` 的已支付测试订单，并给当前账号增加 1 次付费下载额度。

此功能有多重限制：`NODE_ENV=production` 时强制关闭，并且 `FRONTEND_BASE_URL` 和 `PUBLIC_API_BASE_URL` 必须同时是 `localhost`、`127.0.0.1` 或 `::1`。正式部署的 `.env` 必须保持 `ENABLE_TEST_PAYMENTS=false`。

## 生产运行

```bash
npm run build
npm start
```

打开 <http://127.0.0.1:8787>。生产模式由 Express 同时提供前端静态文件和 API。

## 环境变量

| 变量 | 必需 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `IMAGE_BACKEND` | 否 | `openai` | 图片后端：`openai`、`local-sd1.5` 或 `comfyui` |
| `OPENAI_API_KEY` | OpenAI 模式必需 | — | 只在后端读取的 API 密钥 |
| `OPENAI_IMAGE_MODEL` | 否 | `gpt-image-2` | 图片模型名称 |
| `OPENAI_BASE_URL` | 否 | OpenAI 官方地址 | 兼容 OpenAI 协议的自定义网关地址 |
| `OPENAI_TEXT_MODEL` | 否 | `gpt-4.1-mini` | 「随机灵感」使用的文本模型；调用失败时回退本地灵感池 |
| `DATABASE_URL` | 账号/历史必需 | Docker Compose 默认值 | PostgreSQL 连接串 |
| `AVATAR_STORAGE_DIR` | 否 | `./data/avatars` | 生成图片与缩略图的落盘目录 |
| `OPENAI_EDIT_MASK_FEATHER` | 否 | `8` | OpenAI 编辑蒙版羽化半径，范围 0-64 |
| `OPENAI_EDIT_MAX_UPLOAD_MB` | 否 | `10` | OpenAI 编辑原图上传上限，范围 1-25 MiB |
| `JWT_SECRET` | 账号/历史必需 | — | 登录 session 签名密钥，请使用长随机字符串 |
| `FRONTEND_BASE_URL` | Google 登录必需 | `http://127.0.0.1:5173` | Google 登录完成后的前端跳转地址 |
| `PUBLIC_API_BASE_URL` | Google 登录必需 | `http://127.0.0.1:8787` | Google OAuth callback 所在后端地址 |
| `COOKIE_SECURE` | 否 | `false` | HTTPS 部署时设为 `true` |
| `GOOGLE_CLIENT_ID` | Google 登录必需 | — | Google OAuth Client ID |
| `GOOGLE_CLIENT_SECRET` | Google 登录必需 | — | Google OAuth Client Secret |
| `PAYMENT_PROVIDER` | 否 | `auto` | `auto` 优先支付宝直连，也可固定为 `alipay` 或 `stripe` |
| `ENABLE_TEST_PAYMENTS` | 否 | `false` | 仅回环地址、非生产环境可启用的模拟支付按钮 |
| `DEV_UNLIMITED_USAGE` | 否 | `false` | 仅回环地址、非生产环境可启用；生成、修改和下载不限次数，下载不锁图 |
| `ALIPAY_APP_ID` | 支付宝直连必需 | — | 支付宝开放平台应用 AppID |
| `ALIPAY_PRIVATE_KEY` | 支付宝直连必需 | — | 应用私钥，仅后端读取，支持把换行写成 `\n` |
| `ALIPAY_PUBLIC_KEY` | 支付宝直连必需 | — | 支付宝公钥，不是应用公钥 |
| `ALIPAY_KEY_TYPE` | 否 | `PKCS8` | 应用私钥格式：`PKCS8` 或 `PKCS1` |
| `ALIPAY_GATEWAY` | 否 | 正式网关 | 支付宝网关；沙箱测试时可替换为沙箱网关 |
| `ALIPAY_NOTIFY_URL` | 否 | 由 API 地址推导 | 支付宝异步通知的公网 HTTPS 地址 |
| `ALIPAY_SELLER_ID` | 否 | — | 商户 PID；填写后额外核对回调商户身份 |
| `STRIPE_SECRET_KEY` | Stripe 备用方案必需 | — | Stripe 服务端 Secret Key，只能保存在后端 |
| `STRIPE_WEBHOOK_SECRET` | Stripe 入账必需 | — | Stripe Webhook 签名密钥，通常以 `whsec_` 开头 |
| `LOCAL_MODEL_BASE_URL` | 本地模式必需 | `http://127.0.0.1:8000` | 本地 SD1.5 服务地址 |
| `LOCAL_MODEL_WIDTH` | 否 | `512` | 传给本地模型的宽度 |
| `LOCAL_MODEL_HEIGHT` | 否 | `512` | 传给本地模型的高度 |
| `LOCAL_MODEL_STEPS` | 否 | `20` | 传给本地模型的采样步数 |
| `LOCAL_MODEL_CFG` | 否 | `7.5` | 传给本地模型的 CFG |
| `LOCAL_MODEL_SEED` | 否 | `-1` | `-1` 表示由本地模型服务随机 |
| `LOCAL_MODEL_TIMEOUT_MS` | 否 | `240000` | 等待本地模型生成的超时时间 |
| `COMFYUI_BASE_URL` | ComfyUI 模式必需 | `http://127.0.0.1:8188` | 本地 ComfyUI 地址 |
| `COMFY_PROMPT_MODE` | 否 | `flux1-qwen` | `flux1-qwen` 先翻译中文，`flux1-raw` 直接使用原提示词；两者都由 FLUX.1 生图 |
| `COMFY_TRANSLATOR_CLIP_NAME` | 中文增强必需 | `qwen_3_4b.safetensors` | ComfyUI `TextGenerate` 使用的 Qwen3 文本模型 |
| `COMFY_TRANSLATOR_CLIP_TYPE` | 否 | `flux2` | Qwen3 在 `CLIPLoader` 中的模型类型 |
| `COMFY_TRANSLATOR_MAX_LENGTH` | 否 | `384` | Qwen3 翻译输出长度上限 |
| `COMFY_TRANSLATOR_RETRIES` | 否 | `1` | 翻译失败后的重试次数；仍失败时回退 FLUX.1 原始提示词 |
| `COMFY_CHECKPOINT_NAME` | ComfyUI 模式必需 | `flux1-schnell-fp8.safetensors` | ComfyUI checkpoint 文件名 |
| `COMFY_WIDTH` / `COMFY_HEIGHT` | 否 | `1024` | ComfyUI 出图尺寸 |
| `COMFY_STEPS` | 否 | `4` | FLUX schnell 默认快速步数 |
| `COMFY_CFG` | 否 | `1` | FLUX schnell 默认 CFG |
| `COMFY_SAMPLER_NAME` | 否 | `euler` | ComfyUI KSampler sampler |
| `COMFY_SCHEDULER` | 否 | `simple` | ComfyUI KSampler scheduler |
| `COMFY_SEED` | 否 | `-1` | `-1` 表示后端随机 |
| `COMFY_POLL_INTERVAL_MS` | 否 | `1500` | 轮询 ComfyUI 结果间隔 |
| `COMFY_MAX_POLL_ATTEMPTS` | 否 | `120` | 最大轮询次数 |
| `COMFY_FLUX2_UNET_NAME` | FLUX.2 编辑必需 | `flux-2-klein-4b-fp8.safetensors` | FLUX.2 Klein diffusion model 文件名 |
| `COMFY_FLUX2_CLIP_NAME` | FLUX.2 编辑必需 | `qwen_3_4b.safetensors` | FLUX.2 文本编码器文件名 |
| `COMFY_FLUX2_VAE_NAME` | FLUX.2 编辑必需 | `flux2-vae.safetensors` | FLUX.2 VAE 文件名 |
| `COMFY_FLUX2_STEPS` / `COMFY_FLUX2_CFG` | 否 | `4` / `1` | FLUX.2 编辑采样步数与 CFG |
| `COMFY_FLUX2_SAMPLER_NAME` / `COMFY_FLUX2_SCHEDULER` | 否 | `euler` / `simple` | FLUX.2 编辑采样器与调度器 |
| `COMFY_FLUX2_SEED` | 否 | `-1` | `-1` 表示后端随机 |
| `COMFY_FLUX2_MASK_FEATHER` | 否 | `8` | 蒙版边缘羽化半径，范围 0-64 |
| `COMFY_EDIT_MAX_UPLOAD_MB` | 否 | `10` | 编辑原图上传上限，范围 1-25 MiB |
| `PORT` | 否 | `8787` | 后端端口 |

不要把 `.env` 提交到 Git，也不要把密钥写入任何 `VITE_` 开头的变量。

本机无限调试需要在实际 `.env` 中同时设置 `NODE_ENV=development`、`DEV_UNLIMITED_USAGE=true`，并保持前后端地址为 `localhost` 或 `127.0.0.1`。修改后执行 `docker compose up -d --build --force-recreate app`；不要删除数据库 volume。生产环境会强制关闭该模式。

## 账号系统与生成记录

项目内置邮箱注册/登录、Google 登录和账号生成记录。数据存储在 Docker Compose 启动的 PostgreSQL 中，默认 volume 是 `tmall_avatar_pgdata`。

启动数据库：

```bash
docker compose up -d db
```

默认连接串已经写在 `.env.example`：

```bash
DATABASE_URL=postgres://tmall_avatar:tmall_avatar_dev@127.0.0.1:5432/tmall_avatar
```

首次启动后端时会自动创建账号、生成和计费相关数据表：

- `users`：邮箱账号、Google 账号资料、密码哈希；
- `avatar_generations`：登录用户的生成记录、prompt、策略、模型、生成时间、父级修改来源和下载锁定状态；图片本体存磁盘，行内只记录文件名；
- `payment_orders`：支付宝直连或 Stripe 订单、金额、币种和幂等入账状态；
- `generation_reservations`：免费/付费下载额度的消费记录。

### 图片存储

生成的图片以 PNG 原图 + 256px WebP 缩略图成对存放在 `AVATAR_STORAGE_DIR`（默认 `./data/avatars`，已在 `.gitignore` 中忽略，Docker 部署时挂载 `./data:/app/data`）。API 通过带鉴权和归属校验的 `GET /api/generations/:id/image` 和 `/thumb` 提供图片，响应带 `immutable` 长缓存头。历史列表只返回 URL，不再返回 base64。

早期版本把 base64 图片直接存在数据库里；服务启动时会自动、幂等地把这类旧记录迁移到磁盘（日志 `[image-migration] Migrated N legacy image(s).`），无需手动处理。

生成和修改头像需要先登录，但不会消耗免费额度。每次成功生成或修改都会自动把图片数据和提示词保存到 Docker Compose 启动的 PostgreSQL 中，并显示在“我的生成记录”。每个账号前 5 次确认下载免费；之后可以单次购买（每张 ¥5）或订阅下载套餐。头像首次确认下载后会自动锁定，锁定后的图片可以继续下载，但不能再基于该图修改。

下载套餐（点击“购买额度”打开二级菜单选购，有效期均为 30 天）：

| 套餐 | 价格 | 额度 |
| --- | --- | --- |
| Go | ¥30 | 每天 3 次下载额度，按东八区自然日次日刷新 |
| Plus | ¥50 | 每天 15 次下载额度，次日刷新 |
| Pro | ¥100 | 无限下载，30 天刷新 |

套餐规则：同级再购为**续订**，在现有到期日基础上顺延 30 天；持有低级套餐可**补差价升级**到更高级别（如 Go→Plus 付 ¥20），升级立即生效且有效期不变；高级套餐**不可降级购买**；随时可**取消订阅**——取消后套餐保留到当前到期日，期间额度照常使用，到期后不再续期（续订/升级会自动恢复订阅）。扣费优先级为：套餐当日额度 → 免费 5 次 → 单次付费额度。套餐信息存放在 `users` 表的 `plan_id` / `plan_expires_at` / `plan_daily_used` / `plan_daily_date` 列，订单在 `payment_orders` 中通过 `plan_id` + `plan_action`（activate/renew/upgrade）区分动作，每日额度为懒刷新，无需定时任务。

账号接口：

```text
POST  /api/auth/register
POST  /api/auth/login
POST  /api/auth/logout
GET   /api/auth/me
PATCH /api/auth/profile    # 修改昵称
POST  /api/auth/password   # 修改密码（需当前密码）
```

生成记录接口：

```text
GET    /api/generations
GET    /api/generations/:id/image       # 原图（鉴权 + 归属校验）
GET    /api/generations/:id/thumb       # 256px WebP 缩略图
GET    /api/generations/:id/download    # ?size=1024|640|256&shape=square|circle
POST   /api/generations/:id/edit
DELETE /api/generations/:id
```

### Google 登录配置

在 Google Cloud Console 创建 OAuth Client，授权回调地址填写：

```text
http://127.0.0.1:8787/api/auth/google/callback
```

然后在 `.env` 中填写：

```bash
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=...
PUBLIC_API_BASE_URL=http://127.0.0.1:8787
FRONTEND_BASE_URL=http://127.0.0.1:5173
```

生产环境请把 callback 改成你的正式 HTTPS 域名，并设置：

```bash
COOKIE_SECURE=true
```

## 支付宝直连配置

项目现已支持支付宝开放平台“电脑网站支付”，默认优先走支付宝直连；没有配置支付宝时才回退到原有 Stripe Checkout。商品价格由后端固定为人民币 ¥5（API 金额 `500` 分），每笔成功支付增加 1 次头像下载额度。AppID 和密钥不会发送到前端。

1. 在支付宝开放平台创建网页/移动应用，并申请开通“电脑网站支付”。是否允许个人身份申请、限额和费率以支付宝审核页面显示为准。
2. 给应用配置 RSA2 密钥，保存应用私钥，并从支付宝开放平台复制“支付宝公钥”。注意不要误填应用公钥。
3. 在 `.env` 中填写：

```bash
PAYMENT_PROVIDER=alipay
ALIPAY_APP_ID=你的应用AppID
ALIPAY_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
ALIPAY_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----"
ALIPAY_KEY_TYPE=PKCS8
FRONTEND_BASE_URL=https://你的前端域名
PUBLIC_API_BASE_URL=https://你的后端域名
ALIPAY_NOTIFY_URL=https://你的后端域名/api/billing/alipay/notify
```

4. 支付宝异步通知必须能从公网通过 HTTPS 访问。`127.0.0.1`/`localhost` 不能接收正式通知；本地联调需使用可信 HTTPS 隧道，或部署到测试服务器。
5. 重启前后端后访问 `/api/health`，确认 `paymentConfigured` 为 `true` 且 `paymentProvider` 为 `alipay`。

支付宝回跳页面会主动查询一次订单状态，异步通知仍是最终到账保障。后端会同时验证 RSA2 签名、AppID、可选商户 PID、订单号、人民币金额和交易状态。数据库事务保证同一订单即使收到重复通知也只增加一次额度。

### Stripe 备用方案

如支付宝直连暂未获批，可把 `PAYMENT_PROVIDER` 改为 `stripe`，配置 `STRIPE_SECRET_KEY` 和 `STRIPE_WEBHOOK_SECRET`。本地可使用：

```bash
stripe listen --forward-to http://127.0.0.1:8787/api/billing/webhook
```

正式环境在 Stripe Webhooks 中添加 `https://你的后端域名/api/billing/webhook`，订阅 `checkout.session.completed` 和 `checkout.session.async_payment_succeeded`。

无论采用哪种支付渠道，计费都由后端强制执行：生成和修改不扣额度，首次“确认下载并锁定”才消耗 1 次免费或付费额度；同一图片再次下载不重复扣费。

## 使用本地 SD1.5 模型

先启动兼容 `front-and-back/sd1.5` 分支接口的本地模型服务，例如：

```bash
python app/server.py --host 127.0.0.1 --port 8000
```

本地模型服务自己的 `.env` 中需要配置：

```bash
CHECKPOINT_PATH=/path/to/v1-5-pruned-emaonly.safetensors
```

然后在本项目 `.env` 中切换：

```bash
IMAGE_BACKEND=local-sd1.5
LOCAL_MODEL_BASE_URL=http://127.0.0.1:8000
LOCAL_MODEL_WIDTH=512
LOCAL_MODEL_HEIGHT=512
LOCAL_MODEL_STEPS=20
LOCAL_MODEL_CFG=7.5
LOCAL_MODEL_SEED=-1
```

本项目会把前端中文选项转换为本地模型服务需要的请求体：

```json
{
  "selected_options": ["style_japanese_moe", "hair_twin_tails"],
  "custom_prompt": "用户补充描述",
  "negative_prompt": "用户不希望出现的内容",
  "generation": {
    "width": 512,
    "height": 512,
    "steps": 20,
    "cfg": 7.5,
    "seed": -1
  }
}
```

## 使用本地 ComfyUI / FLUX.1-schnell

先启动 ComfyUI，并确认浏览器能打开：

```text
http://127.0.0.1:8188
```

把 FLUX 模型放到 ComfyUI 的 checkpoint 目录，例如：

```text
ComfyUI/models/checkpoints/flux1-schnell-fp8.safetensors
```

然后在本项目 `.env` 中切换：

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

中文增强模式首先执行文本翻译 workflow：

```text
CLIPLoader(qwen_3_4b.safetensors, type=flux2)
-> TextGenerate
-> PreviewAny
-> 后端校验英文 JSON
```

翻译结果随后进入 FLUX.1 生图 workflow：

```text
CheckpointLoaderSimple
-> CLIPTextEncode / negative CLIPTextEncode
-> EmptyLatentImage
-> KSampler
-> VAEDecode
-> SaveImage
```

ComfyUI 模式生成的图片同样落盘为文件并生成缩略图，前端通过 URL 预览和下载。

网页中的“中文指令处理”只切换 Qwen 翻译是否启用，不会切换图片生成模型。首次生成始终使用所选 FLUX.1 checkpoint；只有从已有图片进入编辑器后才使用 FLUX.2。Qwen 翻译会保留人物、动作、物体、场景、数量、年龄、性别和排除项；两次翻译均失败时自动回退 `flux1-raw`，不会转用 FLUX.2。

### 使用本地 FLUX.2 Klein 编辑图片

微调/魔法消除编辑器的后端跟随 `IMAGE_BACKEND`：`comfyui` 时走本节的本地 FLUX.2；其他情况（含默认的 `openai`）走 OpenAI `images.edit`，无需任何本地模型。以下配置仅在 ComfyUI 模式下需要。

FLUX.2 编辑复用同一个 ComfyUI 服务，但使用独立的模型文件。文件名和目录必须如下：

```text
ComfyUI/models/diffusion_models/flux-2-klein-4b-fp8.safetensors
ComfyUI/models/text_encoders/qwen_3_4b.safetensors
ComfyUI/models/vae/flux2-vae.safetensors
```

在 `.env` 中配置：

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

宿主机检查 ComfyUI 时使用 `http://127.0.0.1:8188`。应用在 Docker 容器中运行时必须使用：

```dotenv
IMAGE_BACKEND=comfyui
COMFYUI_BASE_URL=http://host.docker.internal:8188
```

`GET /api/comfyui/flux2/health` 会检查 ComfyUI、三个模型文件、`flux2` 类型以及编辑 workflow 所需节点；返回 `200` 和 `ok: true` 后再开始编辑。模型安装或切换顺序是：停止 ComfyUI，将三个文件放入上述目录，更新 `.env` 中的精确文件名，重新启动 ComfyUI，再仅重建应用服务 `docker compose up -d --build --force-recreate app`，最后检查 FLUX.2 health。不要删除 PostgreSQL volume。

`POST /api/edits` 接受 PNG、JPEG 或 WebP 原图，默认最大 10 MiB；可选蒙版必须是 PNG，最大 4 MiB。未提交蒙版时执行语义编辑，整张图都可能改变；提交蒙版时仅合成蒙版覆盖区域，蒙版外保留规范化后的原图像素。附加 `operation=remove`（前端的「魔法消除」）时不需要提示词，但必须提交蒙版：封闭圈选的内部会整块并入选区，服务端用固定的移除指令重绘并以背景填充；OpenAI 模式下蒙版还会转换为原生 inpaint mask。每次成功都会保存一条可继续编辑的历史草稿，但不会消耗下载额度。

编辑上传的临时源图保存在 `ComfyUI/input/tmall_edits`。当前 ComfyUI 核心上传 API 没有保证可用的删除操作，因此应定期停止 ComfyUI 后清理该目录中的陈旧文件，再重新启动；不要在 ComfyUI 处理请求时删除输入文件。

## Prompt 策略

后端会在普通中文选项和英文视觉锚点之外，额外做头像策略改写：

- 全身、长裙、大裙摆需求自动改写为头肩像/胸像；
- 双人、情侣、闺蜜、兄弟头像进入多人头像安全构图；
- 多背景或复杂战斗场景会主次处理，背景低对比度弱化；
- 多风格会拆成主风格和辅助质感；
- 运动、魔法、战斗动作会降级成表情、光效和氛围符号；
- 多头饰会保留主头饰，其余降级为小型装饰，避免圆形裁剪截断。

## API

- `GET /api/health`：服务状态与模型配置状态（含 `backend`、`openaiConfigured`、`openaiModel`）
- `GET /api/auth/me`：当前登录用户
- `POST /api/auth/register`：邮箱注册
- `POST /api/auth/login`：邮箱登录
- `POST /api/auth/logout`：退出登录
- `PATCH /api/auth/profile`：修改昵称
- `POST /api/auth/password`：修改密码；必须提供正确的当前密码，纯 Google 账号返回 `PASSWORD_NOT_SET`
- `GET /api/generations`：当前账号生成记录（图片以 URL 形式返回，`limit` 最大 60）
- `GET /api/generations/:id/image`：原图；`GET /api/generations/:id/thumb`：缩略图（均需登录且只能访问本人记录）
- `GET /api/generations/:id/download`：确认下载头像；首次下载消耗 1 次免费/付费额度并锁定图片，之后可重复下载。支持 `?size=1024|640|256&shape=square|circle`（圆形为透明背景 PNG）
- `POST /api/generations/:id/edit`：基于未锁定的历史头像快速语义修改，生成一个新的可编辑版本
- `DELETE /api/generations/:id`：删除生成记录并清理磁盘文件（文件仍被其他记录引用时只删记录）
- `GET /api/billing/status`：当前账号免费次数、付费额度、生效套餐（含当日剩余）和可购套餐目录
- `POST /api/billing/checkout`：按配置创建支付宝直连订单或 Stripe Checkout Session；body 传 `planId`（`go`/`plus`/`pro`）购买套餐，后端自动判定开通/续订/补差价升级并定价，降级返回 400；不传则购买 ¥5 单次额度
- `POST /api/billing/confirm`：支付回跳后查询订单并幂等入账（单次加额度，套餐按订单动作开通/续订/升级）
- `POST /api/billing/test-purchase`：仅本地开发开启；模拟入账 1 次下载额度，或传 `planId` 一键开通/续订/升级套餐
- `POST /api/billing/plan/cancel`：取消当前套餐的续期；套餐保留至到期日，到期后自动停止
- `POST /api/billing/alipay/notify`：支付宝 RSA2 签名异步通知，直连支付最终入账入口
- `POST /api/billing/webhook`：Stripe 签名 Webhook，Stripe 备用方案入账入口
- `GET /api/local-model/health`：检查本地模型服务是否可访问
- `GET /api/comfyui/health`：检查本地 ComfyUI 与 checkpoint 是否可访问
- `GET /api/comfyui/models`：列出可用的 ComfyUI checkpoint（供前端模型下拉）
- `GET /api/comfyui/flux2/health`：检查当前编辑后端是否就绪（ComfyUI 模式检查 FLUX.2 模型与节点，OpenAI 模式检查 API Key）
- `POST /api/prompt-preview`：仅预览后端整理后的完整提示词
- `POST /api/generate`：登录后调用图片模型并保存草稿；支持 `backend`（`openai`/`comfyui`）、`checkpoint`、`count`（OpenAI 下 `4` 返回四张候选 `candidates`）；生成本身不消耗下载额度
- `POST /api/edits`：登录后执行整图语义、蒙版局部编辑或魔法消除（`operation=remove`）并保存新草稿；编辑本身不消耗下载额度

生成、编辑、登录和下单接口均有基于内存的滑动窗口限流；所有响应带基础安全头。

## 常见问题与排查

### 5173 没启动，只有 8787 能访问

本地开发时，`npm run dev` 会同时启动两个服务：

- `http://127.0.0.1:5173`：Vite 前端开发服务；
- `http://127.0.0.1:8787`：Express 后端 API 服务。

如果只看到 `8787` 正常，但 `5173` 打不开，通常说明前端 Vite 进程卡住、退出，或者当前只单独启动了 `node server/index.js` 后端。先在项目目录检查端口：

```bash
cd /Users/gravidmac/Codex/image_generating
lsof -nP -iTCP:5173 -iTCP:8787 -sTCP:LISTEN
```

正常情况下应该同时看到两个监听进程：

```text
TCP 127.0.0.1:5173 (LISTEN)
TCP 127.0.0.1:8787 (LISTEN)
```

如果只看到 `8787`，或者看到旧的 `npm run dev` / `vite` / `node server/index.js` 残留进程但 `5173` 不响应，可以按下面步骤清理后重启。

1. 找出相关进程：

```bash
ps aux | grep -E "vite|server/index|concurrently|npm run dev" | grep -v grep
```

2. 停掉卡住或残留的进程。把下面的 `<PID>` 换成上一步看到的进程号：

```bash
kill <PID1> <PID2> <PID3>
```

如果只是当前终端里正在运行 `npm run dev`，也可以直接按：

```text
Ctrl + C
```

3. 从正确项目目录重新启动：

```bash
cd /Users/gravidmac/Codex/image_generating
npm run dev
```

启动成功后终端应该显示：

```text
VITE ready
Local: http://127.0.0.1:5173/
Image Studio API running at http://127.0.0.1:8787
```

4. 再确认服务状态：

```bash
curl -I http://127.0.0.1:5173/
curl http://127.0.0.1:8787/api/health
```

如果 `/api/health` 里的 `configured` 或 `databaseConfigured` 还是 `false`，检查 `.env` 是否在 `image_generating` 目录下，并在修改 `.env` 后重新执行 `npm run dev`。Node 后端不会自动读取已经运行进程之外的新环境变量。

## FLUX 参数评测

执行下面的命令可生成确定性的 JSON 评测清单，不会调用 ComfyUI，也不会消耗生成时间：

```bash
npm run benchmark:parameters > parameter-benchmark.json
```

清单固定使用种子 `42`、`314159`、`20260714`，覆盖 FLUX.1 的每个公开创意参数以及 FLUX.2 的颜色、发型、服装、表情、背景、光线、风格、替换和自定义编辑。建议在相同模型文件、工作流和显卡环境中手动运行清单，再记录执行成功、指令遵循、人物保持、构图稳定、边缘质量、伪影和硬失败。

分类阈值使用百分比：成功率至少 `80%` 且硬失败率不超过 `5%` 为稳定；成功率 `60%` 到 `79%` 为实验；成功率低于 `60%` 或硬失败率超过 `15%` 应从网页中移除。模型或 ComfyUI 节点更新后应重新执行同一批清单，避免把模型变化误判成参数变化。
