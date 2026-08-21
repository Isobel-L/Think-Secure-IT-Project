const defaultTimeoutMs = 30000;

function abortReason(signal) {
  return signal?.reason || new DOMException('Aborted', 'AbortError');
}

function throwIfAborted(signal) {
  if (signal?.aborted) throw abortReason(signal);
}

function delay(ms, signal) {
  throwIfAborted(signal);
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      signal?.removeEventListener('abort', abort);
      resolve();
    }, ms);
    const abort = () => {
      clearTimeout(timeout);
      reject(abortReason(signal));
    };
    signal?.addEventListener('abort', abort, { once: true });
  });
}

async function timedFetch(url, options, timeoutMs, fetchImpl, consumeResponse) {
  const { signal: externalSignal, ...fetchOptions } = options || {};
  const controller = new AbortController();
  const abort = () => controller.abort(abortReason(externalSignal));
  if (externalSignal?.aborted) abort();
  else externalSignal?.addEventListener('abort', abort, { once: true });
  const timeout = setTimeout(() => controller.abort(), timeoutMs || defaultTimeoutMs);
  try {
    throwIfAborted(controller.signal);
    const response = await fetchImpl(url, { ...fetchOptions, signal: controller.signal });
    throwIfAborted(controller.signal);
    return await consumeResponse(response);
  } finally {
    clearTimeout(timeout);
    externalSignal?.removeEventListener('abort', abort);
  }
}

export async function requestComfyJson(config, pathname, options = {}) {
  const { fetchImpl = fetch, timeoutMs, ...fetchOptions } = options;
  return timedFetch(`${config.baseUrl}${pathname}`, {
    ...fetchOptions,
    headers: {
      ...(fetchOptions.body && typeof fetchOptions.body === 'string' ? { 'content-type': 'application/json' } : {}),
      ...(fetchOptions.headers || {}),
    },
  }, timeoutMs || config.timeoutMs, fetchImpl, async (response) => {
    const text = await response.text();
    if (!response.ok) throw Object.assign(new Error(`ComfyUI ${response.status}: ${text}`), { status: response.status });
    return text ? JSON.parse(text) : {};
  });
}

export async function requestComfyBuffer(config, pathname, options = {}) {
  const { fetchImpl = fetch, timeoutMs, ...fetchOptions } = options;
  return timedFetch(`${config.baseUrl}${pathname}`, fetchOptions, timeoutMs || config.timeoutMs, fetchImpl, async (response) => {
    if (!response.ok) {
      throw Object.assign(new Error(`ComfyUI image ${response.status}: ${await response.text()}`), { status: response.status });
    }
    return Buffer.from(await response.arrayBuffer());
  });
}

export function extractComfyImages(history, promptId) {
  const outputs = (history[promptId] || history).outputs || {};
  return Object.values(outputs).flatMap((output) => output.images || []);
}

function historyHasExecutionFailure(history, promptId) {
  const status = (history[promptId] || history).status;
  if (status?.status_str === 'error') return true;
  return Array.isArray(status?.messages) && status.messages.some((message) => (
    Array.isArray(message) ? message[0] === 'execution_error' : message?.type === 'execution_error'
  ));
}

function historyIsTerminal(history, promptId) {
  const record = history[promptId] || history;
  const status = record.status;
  return status?.completed === true
    || status?.status_str === 'success'
    || status?.status_str === 'error'
    || extractComfyImages(history, promptId).length > 0;
}

function comfyExecutionFailure() {
  return Object.assign(new Error('ComfyUI workflow execution failed.'), {
    code: 'COMFYUI_EXECUTION_FAILED',
    status: 502,
  });
}

export async function uploadComfyImage(config, { buffer, filename, signal, fetchImpl = fetch }) {
  const form = new FormData();
  form.append('image', new Blob([buffer], { type: 'image/png' }), filename);
  form.append('type', 'input');
  form.append('subfolder', 'tmall_edits');
  form.append('overwrite', 'true');
  const upload = await requestComfyJson(config, '/upload/image', { method: 'POST', body: form, signal, fetchImpl });
  if (typeof upload?.name !== 'string' || !upload.name.trim()) {
    throw new Error('ComfyUI upload did not return an image name.');
  }
  const imageName = typeof upload.subfolder === 'string' && upload.subfolder
    ? `${upload.subfolder}/${upload.name}`
    : upload.name;
  return { imageName, upload };
}

function queueContainsPrompt(entries, promptId) {
  return Array.isArray(entries) && entries.some((entry) => (
    Array.isArray(entry) ? entry[1] === promptId : entry?.prompt_id === promptId
  ));
}

async function settleAbortedPrompt(config, promptId, fetchImpl) {
  let deleteSubmitted = false;
  while (true) {
    try {
      const queue = await requestComfyJson(config, '/queue', { fetchImpl });
      const pending = queueContainsPrompt(queue.queue_pending, promptId);
      const running = queueContainsPrompt(queue.queue_running, promptId);
      if (pending) {
        try {
          await requestComfyJson(config, '/queue', {
            method: 'POST',
            body: JSON.stringify({ delete: [promptId] }),
            fetchImpl,
          });
          deleteSubmitted = true;
        } catch {
          // Keep the reservation while the prompt state is still uncertain.
        }
      } else if (deleteSubmitted && !running) {
        return;
      }
    } catch {
      // History can still prove that a running prompt reached a terminal state.
    }

    try {
      const history = await requestComfyJson(config, `/history/${encodeURIComponent(promptId)}`, { fetchImpl });
      if (historyIsTerminal(history, promptId)) return;
    } catch {
      // Retry until ComfyUI confirms deletion or terminal history.
    }
    await delay(config.pollIntervalMs);
  }
}

export async function runComfyWorkflow(config, workflow, { fetchImpl = fetch, signal } = {}) {
  throwIfAborted(signal);
  const queue = await requestComfyJson(config, '/prompt', {
    method: 'POST',
    body: JSON.stringify({ prompt: workflow }),
    fetchImpl,
  });
  if (queue.node_errors && Object.keys(queue.node_errors).length) {
    throw new Error(`ComfyUI rejected workflow: ${JSON.stringify(queue.node_errors)}`);
  }
  const promptId = queue.prompt_id;
  if (!promptId) throw new Error('ComfyUI did not return prompt_id.');

  try {
    throwIfAborted(signal);
    let images = [];
    for (let attempt = 0; attempt < config.maxPollAttempts; attempt += 1) {
      const history = await requestComfyJson(config, `/history/${encodeURIComponent(promptId)}`, { signal, fetchImpl });
      if (historyHasExecutionFailure(history, promptId)) throw comfyExecutionFailure();
      images = extractComfyImages(history, promptId);
      if (images.length) break;
      await delay(config.pollIntervalMs, signal);
    }
    if (!images.length) {
      throw Object.assign(new Error('Timed out waiting for ComfyUI output image.'), {
        code: 'COMFYUI_EDIT_TIMEOUT',
        status: 503,
      });
    }

    const image = images[0];
    const query = new URLSearchParams({
      filename: image.filename,
      subfolder: image.subfolder || '',
      type: image.type || 'output',
    });
    const bytes = await requestComfyBuffer(config, `/view?${query}`, { signal, fetchImpl });
    return { bytes, promptId, image, workflow };
  } catch (error) {
    if (signal?.aborted) {
      await settleAbortedPrompt(config, promptId, fetchImpl);
      throw abortReason(signal);
    }
    throw error;
  }
}
