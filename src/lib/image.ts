import type { LoadedImage } from './types';

/**
 * Longest side of the exported image. Keeps memory use inside the limits of
 * mobile Safari (canvas area is capped at roughly 16.7 megapixels there)
 * while leaving more than enough resolution for a legible document.
 */
export const MAX_EXPORT_DIMENSION = 3000;

/** Fit `width` x `height` inside `max`, preserving aspect ratio. */
export function fitDimensions(
  width: number,
  height: number,
  max = MAX_EXPORT_DIMENSION,
): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= max) return { width: Math.round(width), height: Math.round(height) };
  const ratio = max / longest;
  return { width: Math.max(1, Math.round(width * ratio)), height: Math.max(1, Math.round(height * ratio)) };
}

function decode(src: string, fileName: string, revoke: boolean): Promise<LoadedImage> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    const cleanup = () => {
      if (revoke) URL.revokeObjectURL(src);
    };
    img.onload = () => {
      cleanup();
      const width = img.naturalWidth;
      const height = img.naturalHeight;
      if (!width || !height) {
        reject(new Error('画像のサイズを取得できませんでした。'));
        return;
      }
      resolve({ source: img, width, height, fileName });
    };
    img.onerror = () => {
      cleanup();
      reject(new Error('この画像を読み込めませんでした。PNG または JPEG をお試しください。'));
    };
    img.src = src;
  });
}

/**
 * Decode a user-selected file entirely inside the browser.
 *
 * The file is turned into a temporary object URL (memory only — nothing is
 * written to disk or sent anywhere), decoded by an <img> element, and the
 * URL is revoked immediately afterwards. The decoded bitmap honours the
 * file's EXIF orientation; the EXIF block itself is never copied into the
 * output because the export always starts from a blank canvas.
 */
export function loadImageFromFile(file: File): Promise<LoadedImage> {
  if (!file.type.startsWith('image/')) {
    return Promise.reject(new Error('画像ファイルを選択してください。'));
  }
  return decode(URL.createObjectURL(file), file.name, true);
}

/** Load the bundled fictional sample (same-origin static asset, no API call). */
export function loadSampleImage(path: string): Promise<LoadedImage> {
  return decode(path, 'kakko-sample.png', false);
}
