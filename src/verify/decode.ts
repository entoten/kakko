import jsQR from 'jsqr';
import { parsePayload, type Payload } from './payload';

/**
 * Reading the payload back out of an image, entirely in the browser that
 * received it. Nothing here touches the network: the recipient's own page
 * decodes the file it was handed.
 */

export interface Pixels {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

/** Decode the first QR code found in RGBA pixels, or null. */
export function decodeQr(pixels: Pixels): string | null {
  const found = jsQR(pixels.data, pixels.width, pixels.height, { inversionAttempts: 'dontInvert' });
  return found?.data ?? null;
}

export function payloadFromPixels(pixels: Pixels): Payload | null {
  const text = decodeQr(pixels);
  return text ? parsePayload(text) : null;
}

const MAX_DECODE_SIDE = 2400;

async function loadBitmap(file: Blob): Promise<{ source: CanvasImageSource; width: number; height: number; close: () => void }> {
  if (typeof createImageBitmap === 'function') {
    const bmp = await createImageBitmap(file);
    return { source: bmp, width: bmp.width, height: bmp.height, close: () => bmp.close() };
  }
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('image'));
      el.src = url;
    });
    return { source: img, width: img.naturalWidth, height: img.naturalHeight, close: () => undefined };
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Read the payload from an image file. Tries the full resolution (capped)
 * first and a half-size pass second, which helps with very large scans.
 */
export async function readPayloadFromFile(file: Blob, doc: Document = document): Promise<Payload | null> {
  const bmp = await loadBitmap(file);
  try {
    for (const factor of [1, 0.5]) {
      const scale = Math.min(1, MAX_DECODE_SIDE / Math.max(bmp.width, bmp.height)) * factor;
      const w = Math.max(1, Math.round(bmp.width * scale));
      const h = Math.max(1, Math.round(bmp.height * scale));
      const canvas = doc.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return null;
      ctx.drawImage(bmp.source, 0, 0, w, h);
      const pixels = ctx.getImageData(0, 0, w, h);
      canvas.width = 0;
      canvas.height = 0;
      const payload = payloadFromPixels(pixels);
      if (payload) return payload;
      if (factor === 0.5 || Math.max(w, h) < 800) break;
    }
    return null;
  } finally {
    bmp.close();
  }
}
