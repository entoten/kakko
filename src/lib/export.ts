import type { ExportFormat, LoadedImage, Mask } from './types';
import { fitDimensions } from './image';
import { renderSafeCopy } from './render';
import { sanitizeText } from './watermark';

export interface ExportOptions {
  image: LoadedImage;
  masks: readonly Mask[];
  watermark: string;
  format: ExportFormat;
  /** JPEG quality 0..1. Ignored for PNG. */
  quality?: number;
}

export interface ExportResult {
  blob: Blob;
  width: number;
  height: number;
  fileName: string;
}

export const DEFAULT_JPEG_QUALITY = 0.9;

/**
 * Render the safe copy on a brand-new canvas and encode it.
 *
 * A fresh canvas has no EXIF / XMP / GPS metadata, so `toBlob` produces a
 * clean file regardless of what the source contained.
 */
export async function exportSafeCopy(
  opts: ExportOptions,
  createCanvas: () => HTMLCanvasElement = () => document.createElement('canvas'),
): Promise<ExportResult> {
  const { width, height } = fitDimensions(opts.image.width, opts.image.height);
  const canvas = createCanvas();
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('この端末では Canvas を利用できません。');

  renderSafeCopy(ctx, {
    source: opts.image.source,
    width,
    height,
    masks: opts.masks,
    watermark: opts.watermark,
  });

  const blob = await canvasToBlob(canvas, opts.format, opts.quality ?? DEFAULT_JPEG_QUALITY);

  // Release the bitmap memory as soon as the encoded bytes exist.
  canvas.width = 0;
  canvas.height = 0;

  return { blob, width, height, fileName: buildFileName(opts.watermark, opts.format) };
}

export function canvasToBlob(canvas: HTMLCanvasElement, type: ExportFormat, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('画像の書き出しに失敗しました。'));
      },
      type,
      quality,
    );
  });
}

export function buildFileName(watermark: string, format: ExportFormat): string {
  const ext = format === 'image/png' ? 'png' : 'jpg';
  const slug = sanitizeText(watermark, 80)
    .replace(/\s*\/\s*/g, '-')
    .replace(/[\\:*?"<>|]/g, '-')
    .replace(/\s+/g, '_');
  return slug ? `kakko-${slug}.${ext}` : `kakko-safe-copy.${ext}`;
}

/**
 * Whether the device can hand the file to another app via the Web Share
 * API (iPhone Safari offers "Save Image" / "Save to Files" there).
 * Sharing is a local OS action; the browser never contacts KAKKO's origin,
 * and the CSP (connect-src 'none') would block it if it tried.
 */
export function canShareFile(result: ExportResult): boolean {
  const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean };
  if (typeof nav.share !== 'function' || typeof nav.canShare !== 'function') return false;
  try {
    return nav.canShare({ files: [toFile(result)] });
  } catch {
    return false;
  }
}

/** Resolves to false when the user dismissed the share sheet. */
export async function shareResult(result: ExportResult): Promise<boolean> {
  try {
    await navigator.share({ files: [toFile(result)], title: 'KAKKO 安全なコピー' });
    return true;
  } catch (err) {
    if ((err as DOMException).name === 'AbortError') return false;
    throw err;
  }
}

function toFile(result: ExportResult): File {
  return new File([result.blob], result.fileName, { type: result.blob.type });
}

export function triggerDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Give the browser a moment to start the download before revoking.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
