import assert from 'node:assert/strict';
import test from 'node:test';
import * as imageEditor from '../src/imageEditor.js';
import {
  canvasToPngBlob,
  drawEditorImage,
  fillEnclosedMask,
  getErrorMessage,
  hasPaintedMask,
  isSupportedImageMimeType,
  mapPointerToImage,
} from '../src/imageEditor.js';

test('normalizes editor canvases to the backend image dimensions', () => {
  assert.deepEqual(imageEditor.normalizeEditorCanvasSize(4000, 3000), { width: 1024, height: 768 });
  assert.deepEqual(imageEditor.normalizeEditorCanvasSize(3000, 4000), { width: 768, height: 1024 });
  assert.deepEqual(imageEditor.normalizeEditorCanvasSize(1001, 501), { width: 1008, height: 496 });
  assert.deepEqual(imageEditor.normalizeEditorCanvasSize(4000, 1), { width: 1024, height: 16 });
});

test('redraws a cached image after editor canvases are reset', () => {
  const calls = [];
  const baseContext = { drawImage: (...args) => calls.push(['draw', ...args]) };
  const maskContext = { clearRect: (...args) => calls.push(['clear', ...args]) };
  const baseCanvas = { width: 1, height: 1, getContext: () => baseContext };
  const maskCanvas = { width: 1, height: 1, getContext: () => maskContext };
  const image = { complete: true, naturalWidth: 640, naturalHeight: 480 };

  assert.deepEqual(drawEditorImage({ image, baseCanvas, maskCanvas }), { width: 640, height: 480 });
  baseCanvas.width = 1;
  baseCanvas.height = 1;
  maskCanvas.width = 1;
  maskCanvas.height = 1;
  assert.deepEqual(drawEditorImage({ image, baseCanvas, maskCanvas }), { width: 640, height: 480 });
  assert.equal(calls.filter(([type]) => type === 'draw').length, 2);
  assert.equal(calls.filter(([type]) => type === 'clear').length, 2);
});

test('maps pointer coordinates into source pixels and clamps edges', () => {
  assert.deepEqual(mapPointerToImage({ clientX: 60, clientY: 45, rect: { left: 10, top: 20, width: 100, height: 50 }, width: 1000, height: 500 }), { x: 500, y: 250 });
  assert.deepEqual(mapPointerToImage({ clientX: -5, clientY: 200, rect: { left: 0, top: 0, width: 100, height: 100 }, width: 512, height: 512 }), { x: 0, y: 511 });
});

test('detects painted alpha pixels', () => {
  assert.equal(hasPaintedMask({ data: Uint8ClampedArray.from([0, 0, 0, 0, 255, 255, 255, 0]) }), false);
  assert.equal(hasPaintedMask({ data: Uint8ClampedArray.from([255, 255, 255, 1]) }), true);
});

function maskCanvas(width, height, paintedPixels) {
  const imageData = { data: new Uint8ClampedArray(width * height * 4), width, height };
  for (const [x, y] of paintedPixels) imageData.data[((y * width) + x) * 4 + 3] = 133;
  let putCount = 0;
  return {
    canvas: {
      width,
      height,
      getContext: () => ({
        getImageData: () => imageData,
        putImageData: () => { putCount += 1; },
      }),
    },
    imageData,
    putCount: () => putCount,
  };
}

test('fills and renders the interior of a closed magic erase outline', () => {
  const outline = [];
  for (let y = 1; y <= 3; y += 1) {
    for (let x = 1; x <= 3; x += 1) {
      if (x === 1 || x === 3 || y === 1 || y === 3) outline.push([x, y]);
    }
  }
  const { canvas, imageData, putCount } = maskCanvas(5, 5, outline);

  assert.equal(fillEnclosedMask(canvas), true);
  const center = ((2 * 5) + 2) * 4;
  assert.deepEqual([...imageData.data.slice(center, center + 4)], [254, 2, 55, 133]);
  assert.equal(imageData.data[((0 * 5) + 0) * 4 + 3], 0);
  assert.equal(putCount(), 1);
});

test('leaves an open magic erase outline unfilled', () => {
  const outline = [[1, 1], [1, 2], [1, 3], [2, 3], [3, 3], [3, 2], [3, 1]];
  const { canvas, imageData, putCount } = maskCanvas(5, 5, outline);

  assert.equal(fillEnclosedMask(canvas), false);
  assert.equal(imageData.data[((2 * 5) + 2) * 4 + 3], 0);
  assert.equal(putCount(), 0);
});

test('accepts only supported image MIME types', () => {
  assert.equal(isSupportedImageMimeType('image/png'), true);
  assert.equal(isSupportedImageMimeType('image/jpeg'), true);
  assert.equal(isSupportedImageMimeType('image/webp'), true);
  assert.equal(isSupportedImageMimeType('image/gif'), false);
  assert.equal(isSupportedImageMimeType(''), false);
});

test('rejects PNG export when canvas toBlob yields null', async () => {
  await assert.rejects(
    canvasToPngBlob({ toBlob: (callback, type) => { assert.equal(type, 'image/png'); callback(null); } }),
    /导出蒙版失败/,
  );
});

test('extracts a fallback message from null or non-Error values', () => {
  assert.equal(getErrorMessage(null, '默认错误'), '默认错误');
  assert.equal(getErrorMessage({}, '默认错误'), '默认错误');
  assert.equal(getErrorMessage({ message: '请求失败' }, '默认错误'), '请求失败');
});
