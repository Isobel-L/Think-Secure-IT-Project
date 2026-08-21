# ComfyUI Local Model Selection Design

## Goal

Run image generation through the Windows-hosted ComfyUI service without an
OpenAI API key, while allowing users to select any compatible checkpoint
without rebuilding or restarting the Docker application.

## Architecture

- ComfyUI runs on Windows at `127.0.0.1:8188` and owns the GPU and model files.
- The Docker application reaches ComfyUI at
  `http://host.docker.internal:8188`.
- PostgreSQL remains in Docker and continues to persist accounts and generated
  images in the existing named volume.
- The application discovers checkpoints from ComfyUI's
  `CheckpointLoaderSimple` object metadata.

## Model Selection

- Add a backend endpoint that returns the checkpoints currently reported by
  ComfyUI, the configured default, and the resolved default.
- Add a checkpoint selector to the generation interface.
- Include the selected checkpoint in each generation request.
- Validate the requested checkpoint against ComfyUI immediately before queueing
  the workflow.
- Use the configured checkpoint when it is available. If it is unavailable and
  no explicit checkpoint was requested, fall back to the first available
  checkpoint.
- Reject an explicitly requested missing checkpoint with a clear error instead
  of silently generating with a different model.
- Record the actual checkpoint in the response and generation history.

## Compatibility Boundary

The generic workflow supports complete checkpoints exposed through
`CheckpointLoaderSimple`. Models that require separate UNet, CLIP, VAE,
ControlNet, LoRA, or custom-node workflows require a dedicated workflow adapter
and are outside this change.

## Configuration

The local `.env` uses:

```env
IMAGE_BACKEND=comfyui
COMFYUI_BASE_URL=http://host.docker.internal:8188
COMFY_CHECKPOINT_NAME=flux1-schnell-fp8.safetensors
```

`OPENAI_API_KEY` is not required in ComfyUI mode.

## Failure Handling

- Report ComfyUI connection failures separately from missing checkpoints.
- Disable generation model selection when no checkpoints are available.
- Refresh the checkpoint list when the page loads and when the user requests a
  refresh.
- Preserve the last selected checkpoint only while it remains available.

## Verification

- Unit-test checkpoint resolution, explicit-model validation, and workflow
  construction.
- Verify the Docker container can reach ComfyUI.
- Verify health and model-list endpoints report the detected checkpoint.
- Register or use a local test account and perform one real generation through
  ComfyUI.
- Confirm the saved generation records the actual checkpoint.
