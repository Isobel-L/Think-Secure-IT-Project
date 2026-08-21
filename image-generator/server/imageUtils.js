import sharp from 'sharp';

export const downloadSizes = [1024, 640, 256];

// Download transform: target size plus an optional transparent circular crop. null means serve the original.
export async function transformDownloadImage(buffer, { size = 1024, shape = 'square' } = {}) {
  const target = downloadSizes.includes(size) ? size : 1024;
  const circle = shape === 'circle';
  if (target === 1024 && !circle) return null;

  let pipeline = sharp(buffer).resize(target, target, { fit: 'cover' });
  if (circle) {
    const mask = Buffer.from(
      `<svg width="${target}" height="${target}"><circle cx="${target / 2}" cy="${target / 2}" r="${target / 2}" fill="#fff"/></svg>`,
    );
    pipeline = pipeline.composite([{ input: mask, blend: 'dest-in' }]);
  }
  return pipeline.png().toBuffer();
}

export function parseDataUrl(value) {
  const match = /^data:([^;,]+)?(;base64)?,(.*)$/s.exec(value || '');
  if (!match) return null;

  const mimeType = match[1] || 'application/octet-stream';
  const isBase64 = Boolean(match[2]);
  const payload = match[3] || '';
  const buffer = isBase64 ? Buffer.from(payload, 'base64') : Buffer.from(decodeURIComponent(payload));
  return { buffer, mimeType };
}

export function extensionForMimeType(mimeType = '') {
  if (mimeType.includes('jpeg')) return 'jpg';
  if (mimeType.includes('webp')) return 'webp';
  return 'png';
}

export async function imageToStoredDataUrl(image) {
  if (!image) return '';
  if (image.startsWith('data:')) return image;
  if (!/^https?:\/\//i.test(image)) return image;

  const response = await fetch(image);
  if (!response.ok) throw new Error(`Unable to fetch generated image for storage: HTTP ${response.status}.`);

  const mimeType = response.headers.get('content-type')?.split(';')[0] || 'image/png';
  const buffer = Buffer.from(await response.arrayBuffer());
  return `data:${mimeType};base64,${buffer.toString('base64')}`;
}

export async function imageToDownloadBuffer(image) {
  const data = parseDataUrl(image);
  if (data) return data;

  if (/^https?:\/\//i.test(image || '')) {
    const response = await fetch(image);
    if (!response.ok) throw new Error(`Unable to fetch stored image URL: HTTP ${response.status}.`);
    return {
      buffer: Buffer.from(await response.arrayBuffer()),
      mimeType: response.headers.get('content-type')?.split(';')[0] || 'image/png',
    };
  }

  return null;
}
