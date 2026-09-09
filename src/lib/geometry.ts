import type { NormalizedRect } from './types';

const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));

/** Minimum mask size (fraction of the image) to avoid accidental tap-masks. */
export const MIN_MASK_SIZE = 0.01;

/**
 * Build a normalized rectangle from two corner points given in pixels
 * relative to an element of `width` x `height`. The points may be in any
 * order and may fall outside the element; the result is clamped to 0..1.
 */
export function rectFromPoints(
  a: { x: number; y: number },
  b: { x: number; y: number },
  width: number,
  height: number,
): NormalizedRect {
  if (width <= 0 || height <= 0) return { x: 0, y: 0, w: 0, h: 0 };
  const x1 = clamp01(Math.min(a.x, b.x) / width);
  const y1 = clamp01(Math.min(a.y, b.y) / height);
  const x2 = clamp01(Math.max(a.x, b.x) / width);
  const y2 = clamp01(Math.max(a.y, b.y) / height);
  return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
}

export function normalizeRect(rect: NormalizedRect): NormalizedRect {
  const x = clamp01(rect.x);
  const y = clamp01(rect.y);
  const w = clamp01(Math.min(rect.w, 1 - x));
  const h = clamp01(Math.min(rect.h, 1 - y));
  return { x, y, w, h };
}

export function isUsableRect(rect: NormalizedRect): boolean {
  return rect.w >= MIN_MASK_SIZE && rect.h >= MIN_MASK_SIZE;
}

/** Convert a normalized rect to integer pixel bounds on a target of the given size. */
export function toPixelRect(
  rect: NormalizedRect,
  width: number,
  height: number,
): { x: number; y: number; w: number; h: number } {
  // Tolerate float noise (0.1 + 0.2 !== 0.3) so masks round outward only
  // when they genuinely cross a pixel boundary.
  const EPS = 1e-6;
  const x = Math.floor(rect.x * width + EPS);
  const y = Math.floor(rect.y * height + EPS);
  const x2 = Math.ceil((rect.x + rect.w) * width - EPS);
  const y2 = Math.ceil((rect.y + rect.h) * height - EPS);
  return { x, y, w: Math.max(0, x2 - x), h: Math.max(0, y2 - y) };
}

export function formatPercent(v: number): string {
  return `${Math.round(v * 100)}%`;
}
