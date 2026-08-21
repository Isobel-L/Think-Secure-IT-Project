export function normalizeEditorCanvasSize(width, height, { maxEdge = 1024 } = {}) {
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  return {
    width: Math.max(16, Math.round((width * scale) / 16) * 16),
    height: Math.max(16, Math.round((height * scale) / 16) * 16),
  };
}

export function drawEditorImage({ image, baseCanvas, maskCanvas }) {
  if (!image?.naturalWidth || !image?.naturalHeight || !baseCanvas || !maskCanvas) return null;
  const { width, height } = normalizeEditorCanvasSize(image.naturalWidth, image.naturalHeight);
  baseCanvas.width = width;
  baseCanvas.height = height;
  maskCanvas.width = width;
  maskCanvas.height = height;
  baseCanvas.getContext('2d').drawImage(image, 0, 0, width, height);
  maskCanvas.getContext('2d').clearRect(0, 0, width, height);
  return { width, height };
}

export function mapPointerToImage({ clientX, clientY, rect, width, height }) {
  const x = Math.round(((clientX - rect.left) / rect.width) * width);
  const y = Math.round(((clientY - rect.top) / rect.height) * height);
  return { x: Math.max(0, Math.min(width - 1, x)), y: Math.max(0, Math.min(height - 1, y)) };
}

export function hasPaintedMask(imageData) {
  for (let index = 3; index < imageData.data.length; index += 4) if (imageData.data[index] > 0) return true;
  return false;
}

// 魔法消除的“圈选”预览：把被笔迹完全圈住的透明内部填成笔刷色，
// 与服务端 fillEnclosed 行为一致，让用户所见即所得。
export function fillEnclosedMask(canvas, { r = 254, g = 2, b = 55, alpha = 133 } = {}) {
  const width = canvas?.width || 0;
  const height = canvas?.height || 0;
  if (!width || !height) return false;

  const context = canvas.getContext('2d');
  const imageData = context.getImageData(0, 0, width, height);
  const { data } = imageData;
  const total = width * height;
  const reachable = new Uint8Array(total);
  const queue = new Int32Array(total);
  let head = 0;
  let tail = 0;
  const push = (index) => {
    if (!reachable[index] && data[(index * 4) + 3] === 0) {
      reachable[index] = 1;
      queue[tail] = index;
      tail += 1;
    }
  };
  for (let x = 0; x < width; x += 1) {
    push(x);
    push(((height - 1) * width) + x);
  }
  for (let y = 0; y < height; y += 1) {
    push(y * width);
    push((y * width) + width - 1);
  }
  while (head < tail) {
    const index = queue[head];
    head += 1;
    const x = index % width;
    if (x > 0) push(index - 1);
    if (x < width - 1) push(index + 1);
    if (index >= width) push(index - width);
    if (index < total - width) push(index + width);
  }

  let changed = false;
  for (let index = 0; index < total; index += 1) {
    const offset = index * 4;
    if (!reachable[index] && data[offset + 3] === 0) {
      data[offset] = r;
      data[offset + 1] = g;
      data[offset + 2] = b;
      data[offset + 3] = alpha;
      changed = true;
    }
  }
  if (changed) context.putImageData(imageData, 0, 0);
  return changed;
}

export function isSupportedImageMimeType(mimeType) {
  return ['image/png', 'image/jpeg', 'image/webp'].includes(mimeType);
}

export function canvasToPngBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('导出蒙版失败。'));
        return;
      }
      resolve(blob);
    }, 'image/png');
  });
}

export function getErrorMessage(error, fallback) {
  return typeof error?.message === 'string' && error.message ? error.message : fallback;
}
