import sharp from 'sharp';

const sourceFormats = new Set(['png', 'jpeg', 'webp']);

export function parseDataUrl(value) {
  const match = /^data:([^;,]+)?(;base64)?,(.*)$/s.exec(value || '');
  if (!match) return null;
  return {
    mimeType: match[1] || 'application/octet-stream',
    buffer: match[2] ? Buffer.from(match[3] || '', 'base64') : Buffer.from(decodeURIComponent(match[3] || '')),
  };
}

export async function fetchStoredImage(value, fetchImpl = fetch) {
  const parsed = parseDataUrl(value);
  if (parsed) return parsed.buffer;
  if (!/^https?:\/\//i.test(value || '')) throw Object.assign(new Error('Stored image is not readable.'), { code: 'EDIT_IMAGE_INVALID', status: 400 });
  const response = await fetchImpl(value);
  if (!response.ok) throw Object.assign(new Error(`Stored image HTTP ${response.status}.`), { code: 'EDIT_IMAGE_INVALID', status: 400 });
  return Buffer.from(await response.arrayBuffer());
}

export async function normalizeSourceImage(buffer, { maxEdge = 1024, maxPixels = 16_777_216 } = {}) {
  let metadata;
  try { metadata = await sharp(buffer, { animated: false, limitInputPixels: maxPixels * 4 }).metadata(); }
  catch { throw Object.assign(new Error('Source image is malformed.'), { code: 'EDIT_IMAGE_INVALID', status: 400 }); }
  if (!sourceFormats.has(metadata.format) || !metadata.width || !metadata.height || metadata.pages > 1) {
    throw Object.assign(new Error('Source must be a static PNG, JPEG, or WebP image.'), { code: 'EDIT_IMAGE_INVALID', status: 400 });
  }
  const swapsAxes = metadata.orientation >= 5 && metadata.orientation <= 8;
  const orientedWidth = swapsAxes ? metadata.height : metadata.width;
  const orientedHeight = swapsAxes ? metadata.width : metadata.height;
  const scale = Math.min(1, maxEdge / Math.max(orientedWidth, orientedHeight));
  const width = Math.max(16, Math.round((orientedWidth * scale) / 16) * 16);
  const height = Math.max(16, Math.round((orientedHeight * scale) / 16) * 16);
  const normalized = await sharp(buffer, { animated: false, limitInputPixels: maxPixels * 4 })
    .rotate().resize(width, height, { fit: 'fill' }).toColourspace('srgb').removeAlpha().png().toBuffer();
  return { buffer: normalized, width, height, mimeType: 'image/png' };
}

// Absorb whatever a stroke fully encircles: flood fill the background from the image border, and
// the unselected pixels the fill cannot reach are the interior of a closed loop.
function fillEnclosedRegions(binary, width, height) {
  const total = width * height;
  const reachable = new Uint8Array(total);
  const queue = new Int32Array(total);
  let head = 0;
  let tail = 0;
  const push = (index) => {
    if (!reachable[index] && binary[index] === 0) {
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

  const filled = Buffer.alloc(total);
  for (let index = 0; index < total; index += 1) {
    filled[index] = binary[index] || !reachable[index] ? 255 : 0;
  }
  return filled;
}

export async function normalizeMask(buffer, { width, height, featherRadius = 8, fillEnclosed = false }) {
  let binary;
  try {
    const metadata = await sharp(buffer, { animated: false, limitInputPixels: width * height * 4 }).metadata();
    if (metadata.format !== 'png' || metadata.pages > 1) throw new Error('Mask format is not PNG.');
    const resized = sharp(buffer, { animated: false, limitInputPixels: width * height * 4 })
      .rotate().resize(width, height, { fit: 'fill', kernel: sharp.kernel.nearest });
    if (metadata.hasAlpha) {
      const alpha = await resized.clone().ensureAlpha().extractChannel('alpha').raw().toBuffer();
      const hasTransparency = alpha.some((value) => value < 255);
      binary = hasTransparency
        ? await sharp(alpha, { raw: { width, height, channels: 1 } }).greyscale().threshold(1).greyscale().raw().toBuffer()
        : await resized.clone().greyscale().threshold(1).raw().toBuffer();
    } else {
      binary = await resized.greyscale().threshold(1).raw().toBuffer();
    }
  } catch {
    throw Object.assign(new Error('Mask must be a valid PNG image.'), { code: 'EDIT_IMAGE_INVALID', status: 400 });
  }
  if (fillEnclosed) binary = fillEnclosedRegions(binary, width, height);
  let painted = 0;
  for (const value of binary) if (value) painted += 1;
  if (painted === 0) return { buffer: await sharp(binary, { raw: { width, height, channels: 1 } }).toColourspace('b-w').png().toBuffer(), empty: true, full: false };
  const radius = Math.max(0, Math.min(64, Math.round(featherRadius)));
  let alpha = binary;
  if (radius > 0) {
    const blurred = await sharp(binary, { raw: { width, height, channels: 1 } })
      .greyscale().blur(Math.max(0.3, radius / 2)).greyscale().raw().toBuffer();
    alpha = Buffer.alloc(binary.length);
    for (let index = 0; index < binary.length; index += 1) alpha[index] = binary[index] === 0 ? 0 : Math.max(1, blurred[index]);
  }
  return {
    buffer: await sharp(alpha, { raw: { width, height, channels: 1 } }).toColourspace('b-w').png().toBuffer(),
    empty: false,
    full: painted === binary.length,
  };
}

export async function compositeMaskedEdit({ original, edited, mask, width, height }) {
  const alpha = await sharp(mask).resize(width, height, { kernel: sharp.kernel.nearest }).greyscale().raw().toBuffer();
  const editedPixels = await sharp(edited).resize(width, height, { fit: 'fill' }).toColourspace('srgb').removeAlpha().raw().toBuffer();
  const overlayPixels = Buffer.alloc(width * height * 4);
  for (let pixel = 0; pixel < width * height; pixel += 1) {
    editedPixels.copy(overlayPixels, pixel * 4, pixel * 3, (pixel * 3) + 3);
    overlayPixels[(pixel * 4) + 3] = alpha[pixel];
  }
  const overlay = await sharp(overlayPixels, { raw: { width, height, channels: 4 } }).png().toBuffer();
  return sharp(original).resize(width, height, { fit: 'fill' }).toColourspace('srgb')
    .composite([{ input: overlay, blend: 'over' }]).png().toBuffer();
}
