import assert from 'node:assert/strict';
import test from 'node:test';
import {
  extractComfyImages,
  requestComfyBuffer,
  requestComfyJson,
  runComfyWorkflow,
  uploadComfyImage,
} from '../server/comfyClient.js';

const config = {
  baseUrl: 'http://comfy.test',
  maxPollAttempts: 1,
  pollIntervalMs: 0,
  timeoutMs: 1000,
};

function pendingBodyResponse(method) {
  return (url, { signal }) => ({
    ok: true,
    [method]: () => new Promise((_, reject) => {
      signal.addEventListener('abort', () => reject(signal.reason || new DOMException('Aborted', 'AbortError')), { once: true });
    }),
  });
}

function settlesWithin(promise, timeoutMs = 100) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('body read did not abort before timeout')), timeoutMs);
    promise.then(
      (value) => {
        clearTimeout(timeout);
        resolve(value);
      },
      (error) => {
        clearTimeout(timeout);
        reject(error);
      },
    );
  });
}

test('extracts images from prompt-specific ComfyUI history', () => {
  const history = { abc: { outputs: { 12: { images: [{ filename: 'out.png', subfolder: '', type: 'output' }] } } } };
  assert.equal(extractComfyImages(history, 'abc')[0].filename, 'out.png');
});

test('uploads a source using the ComfyUI image multipart contract', async () => {
  let received;
  const fetchImpl = async (url, options) => {
    received = { url, options };
    return new Response(JSON.stringify({ name: 'source.png', subfolder: 'tmall_edits', type: 'input' }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };
  const result = await uploadComfyImage(
    { baseUrl: 'http://comfy.test', timeoutMs: 1000 },
    { buffer: Buffer.from('png'), filename: 'source.png', fetchImpl },
  );
  assert.equal(received.url, 'http://comfy.test/upload/image');
  assert.equal(received.options.method, 'POST');
  assert.match(received.options.body.get('image').name, /source\.png$/);
  assert.equal(result.imageName, 'tmall_edits/source.png');
});

test('preserves status for non-JSON ComfyUI errors', async () => {
  await assert.rejects(
    requestComfyJson(config, '/prompt', {
      fetchImpl: async () => new Response('<html>bad gateway</html>', { status: 502 }),
    }),
    (error) => error.status === 502 && /502: <html>bad gateway<\/html>/.test(error.message),
  );
});

test('aborts JSON body reads when the request timeout elapses', async () => {
  await assert.rejects(
    settlesWithin(requestComfyJson({ ...config, timeoutMs: 10 }, '/history/abc', {
      fetchImpl: pendingBodyResponse('text'),
    })),
    { name: 'AbortError' },
  );
});

test('aborts buffer body reads when the request timeout elapses', async () => {
  await assert.rejects(
    settlesWithin(requestComfyBuffer({ ...config, timeoutMs: 10 }, '/view?filename=out.png', {
      fetchImpl: pendingBodyResponse('arrayBuffer'),
    })),
    { name: 'AbortError' },
  );
});

test('rejects upload responses without a non-empty image name', async () => {
  await assert.rejects(
    uploadComfyImage(config, {
      buffer: Buffer.from('png'),
      filename: 'source.png',
      fetchImpl: async () => new Response(JSON.stringify({ name: '', subfolder: 'tmall_edits' }), { status: 200 }),
    }),
    /did not return an image name/i,
  );
});

test('aborts source uploads with the caller signal', async () => {
  const controller = new AbortController();
  const reason = new Error('client disconnected');
  const upload = uploadComfyImage(
    { ...config, timeoutMs: 50 },
    {
      buffer: Buffer.from('png'),
      filename: 'source.png',
      signal: controller.signal,
      fetchImpl: pendingBodyResponse('text'),
    },
  );
  controller.abort(reason);
  await assert.rejects(settlesWithin(upload), (error) => error === reason);
});

test('rejects ComfyUI workflow queue node errors', async () => {
  await assert.rejects(
    runComfyWorkflow(config, { 1: { class_type: 'BadNode' } }, {
      fetchImpl: async () => new Response(JSON.stringify({ node_errors: { 1: ['invalid node'] } }), { status: 200 }),
    }),
    /rejected workflow/i,
  );
});

test('returns the edit timeout when polling never yields an image', async () => {
  const fetchImpl = async (url) => {
    if (url.endsWith('/prompt')) return new Response(JSON.stringify({ prompt_id: 'abc' }), { status: 200 });
    return new Response(JSON.stringify({ abc: { outputs: {} } }), { status: 200 });
  };

  await assert.rejects(
    runComfyWorkflow(config, { 1: { class_type: 'SaveImage' } }, { fetchImpl }),
    (error) => error.code === 'COMFYUI_EDIT_TIMEOUT' && error.status === 503,
  );
});

test('fails immediately when ComfyUI history reports an error status', async () => {
  let historyRequests = 0;
  const fetchImpl = async (url) => {
    if (url.endsWith('/prompt')) return new Response(JSON.stringify({ prompt_id: 'abc' }), { status: 200 });
    historyRequests += 1;
    return new Response(JSON.stringify({
      abc: { status: { status_str: 'error', messages: [] }, outputs: {} },
    }), { status: 200 });
  };

  await assert.rejects(
    runComfyWorkflow({ ...config, maxPollAttempts: 3 }, { 1: { class_type: 'SaveImage' } }, { fetchImpl }),
    (error) => error.code === 'COMFYUI_EXECUTION_FAILED' && error.status === 502,
  );
  assert.equal(historyRequests, 1);
});

test('fails immediately when ComfyUI history contains an execution_error message', async () => {
  let historyRequests = 0;
  const fetchImpl = async (url) => {
    if (url.endsWith('/prompt')) return new Response(JSON.stringify({ prompt_id: 'abc' }), { status: 200 });
    historyRequests += 1;
    return new Response(JSON.stringify({
      abc: {
        status: { status_str: 'completed', messages: [['execution_error', { exception_message: 'sampler failed' }]] },
        outputs: {},
      },
    }), { status: 200 });
  };

  await assert.rejects(
    runComfyWorkflow({ ...config, maxPollAttempts: 3 }, { 1: { class_type: 'SaveImage' } }, { fetchImpl }),
    (error) => error.code === 'COMFYUI_EXECUTION_FAILED' && error.status === 502,
  );
  assert.equal(historyRequests, 1);
});

test('submits without the caller signal and confirms an aborted queued prompt is deleted', async () => {
  const controller = new AbortController();
  const reason = new Error('client disconnected');
  const requests = [];
  let queueReads = 0;
  const fetchImpl = async (url, options = {}) => {
    requests.push({ url, options });
    if (url.endsWith('/prompt')) {
      controller.abort(reason);
      assert.equal(options.signal.aborted, false);
      return new Response(JSON.stringify({ prompt_id: 'abc' }), { status: 200 });
    }
    if (url.endsWith('/queue') && options.method !== 'POST') {
      assert.notEqual(options.signal, controller.signal);
      assert.equal(options.signal.aborted, false);
      queueReads += 1;
      return new Response(JSON.stringify(queueReads === 1
        ? { queue_running: [], queue_pending: [[3, 'abc', {}]] }
        : { queue_running: [], queue_pending: [] }), { status: 200 });
    }
    if (url.endsWith('/queue') && options.method === 'POST') return new Response('{}', { status: 200 });
    throw new Error(`Unexpected request: ${url}`);
  };

  await assert.rejects(
    runComfyWorkflow({ ...config, pollIntervalMs: 50 }, { 1: { class_type: 'SaveImage' } }, { fetchImpl, signal: controller.signal }),
    (error) => error === reason,
  );
  const cancellationPosts = requests.filter(({ options }) => options.method === 'POST').slice(1);
  assert.equal(cancellationPosts.length, 1);
  assert.equal(cancellationPosts[0].url, 'http://comfy.test/queue');
  assert.deepEqual(JSON.parse(cancellationPosts[0].options.body), { delete: ['abc'] });
  assert.equal(queueReads, 2);
});

test('waits for an aborted running prompt to finish without using global interrupt', async () => {
  const controller = new AbortController();
  const reason = new Error('client disconnected');
  const requests = [];
  let historyReads = 0;
  const fetchImpl = async (url, options = {}) => {
    requests.push({ url, options });
    if (url.endsWith('/prompt')) return new Response(JSON.stringify({ prompt_id: 'abc' }), { status: 200 });
    if (url.endsWith('/history/abc')) {
      historyReads += 1;
      if (historyReads === 1) controller.abort(reason);
      return new Response(JSON.stringify({
        abc: {
          status: historyReads >= 3
            ? { status_str: 'success', completed: true, messages: [] }
            : { status_str: 'running', completed: false, messages: [] },
          outputs: {},
        },
      }), { status: 200 });
    }
    if (url.endsWith('/queue') && options.method !== 'POST') {
      assert.notEqual(options.signal, controller.signal);
      assert.equal(options.signal.aborted, false);
      return new Response(JSON.stringify({ queue_running: [[3, 'abc', {}]], queue_pending: [[4, 'other', {}]] }), { status: 200 });
    }
    throw new Error(`Unexpected request: ${url}`);
  };

  await assert.rejects(
    runComfyWorkflow({ ...config, pollIntervalMs: 50 }, { 1: { class_type: 'SaveImage' } }, { fetchImpl, signal: controller.signal }),
    (error) => error === reason,
  );
  const cancellationPosts = requests.filter(({ options }) => options.method === 'POST').slice(1);
  assert.equal(cancellationPosts.length, 0);
  assert.equal(historyReads, 3);
});

test('waits for terminal history when deleting an aborted prompt fails', async () => {
  const controller = new AbortController();
  const reason = new Error('client disconnected');
  let queueReads = 0;
  let historyReads = 0;
  const fetchImpl = async (url, options = {}) => {
    if (url.endsWith('/prompt')) return new Response(JSON.stringify({ prompt_id: 'abc' }), { status: 200 });
    if (url.endsWith('/history/abc')) {
      historyReads += 1;
      if (historyReads === 1) controller.abort(reason);
      return new Response(JSON.stringify({
        abc: {
          status: historyReads >= 2
            ? { status_str: 'success', completed: true, messages: [] }
            : { status_str: 'running', completed: false, messages: [] },
          outputs: {},
        },
      }), { status: 200 });
    }
    if (url.endsWith('/queue') && options.method !== 'POST') {
      queueReads += 1;
      return new Response(JSON.stringify(queueReads === 1
        ? { queue_running: [], queue_pending: [[3, 'abc', {}]] }
        : { queue_running: [[3, 'abc', {}]], queue_pending: [] }), { status: 200 });
    }
    if (url.endsWith('/queue') && options.method === 'POST') {
      return new Response('delete failed', { status: 503 });
    }
    throw new Error(`Unexpected request: ${url}`);
  };

  await assert.rejects(
    runComfyWorkflow({ ...config, pollIntervalMs: 0 }, { 1: { class_type: 'SaveImage' } }, { fetchImpl, signal: controller.signal }),
    (error) => error === reason,
  );
  assert.equal(historyReads, 2);
});

test('retrieves the first completed ComfyUI image from the view endpoint', async () => {
  const expectedBytes = Buffer.from([137, 80, 78, 71]);
  const requestedUrls = [];
  const fetchImpl = async (url) => {
    requestedUrls.push(url);
    if (url.endsWith('/prompt')) return new Response(JSON.stringify({ prompt_id: 'abc' }), { status: 200 });
    if (url.endsWith('/history/abc')) {
      return new Response(JSON.stringify({
        abc: { outputs: { 9: { images: [{ filename: 'out.png', subfolder: 'tmall_edits', type: 'output' }] } } },
      }), { status: 200 });
    }
    return new Response(expectedBytes, { status: 200 });
  };

  const result = await runComfyWorkflow(config, { 1: { class_type: 'SaveImage' } }, { fetchImpl });
  assert.deepEqual(result.bytes, expectedBytes);
  assert.equal(result.promptId, 'abc');
  assert.equal(result.image.filename, 'out.png');
  assert.match(requestedUrls[2], /\/view\?filename=out.png&subfolder=tmall_edits&type=output$/);
});
