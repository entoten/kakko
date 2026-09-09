import type { Mask } from './types';
import { toPixelRect } from './geometry';

/**
 * The subset of CanvasRenderingContext2D that the render pipeline uses.
 * Declared explicitly so the pipeline can be unit-tested with a recording
 * stub (jsdom does not implement canvas drawing).
 */
export interface DrawingContext {
  save(): void;
  restore(): void;
  translate(x: number, y: number): void;
  rotate(angle: number): void;
  fillRect(x: number, y: number, w: number, h: number): void;
  fillText(text: string, x: number, y: number): void;
  drawImage(image: CanvasImageSource, dx: number, dy: number, dw: number, dh: number): void;
  measureText(text: string): { width: number };
  fillStyle: string | CanvasGradient | CanvasPattern;
  font: string;
  textAlign: CanvasTextAlign;
  textBaseline: CanvasTextBaseline;
  globalAlpha: number;
}

export interface RenderOptions {
  source: CanvasImageSource;
  /** Target size in pixels. */
  width: number;
  height: number;
  masks: readonly Mask[];
  watermark: string;
}

export const MASK_COLOR = '#000000';
export const WATERMARK_COLOR = '#ffffff';
export const WATERMARK_SHADOW = '#000000';
export const WATERMARK_ANGLE = -Math.PI / 7; // about -25°
export const WATERMARK_ALPHA = 0.28;

export const FONT_STACK = 'system-ui, -apple-system, "Hiragino Sans", "Noto Sans JP", sans-serif';

/**
 * Draw the full "safe copy" onto a fresh context:
 *   1. the decoded image (no metadata survives this step)
 *   2. opaque black rectangles for every mask
 *   3. a tiled, semi-transparent watermark across the whole image
 *   4. a readable footer band with the same text
 */
export function renderSafeCopy(ctx: DrawingContext, opts: RenderOptions): void {
  const { width, height, masks, watermark } = opts;

  ctx.save();
  ctx.globalAlpha = 1;
  ctx.fillStyle = MASK_COLOR;
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(opts.source, 0, 0, width, height);
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 1;
  ctx.fillStyle = MASK_COLOR;
  for (const mask of masks) {
    const px = toPixelRect(mask, width, height);
    if (px.w > 0 && px.h > 0) ctx.fillRect(px.x, px.y, px.w, px.h);
  }
  ctx.restore();

  if (watermark.trim().length > 0) {
    drawTiledWatermark(ctx, watermark, width, height);
    drawFooterBand(ctx, watermark, width, height);
  }
}

export function watermarkFontSize(width: number, height: number): number {
  const base = Math.min(width, height);
  return Math.max(12, Math.round(base * 0.045));
}

function drawTiledWatermark(ctx: DrawingContext, text: string, width: number, height: number): void {
  const fontSize = watermarkFontSize(width, height);
  ctx.save();
  ctx.font = `600 ${fontSize}px ${FONT_STACK}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.globalAlpha = WATERMARK_ALPHA;

  const textWidth = Math.max(ctx.measureText(text).width, fontSize * 4);
  const stepX = textWidth + fontSize * 2.5;
  const stepY = fontSize * 4;
  const diag = Math.hypot(width, height);

  ctx.translate(width / 2, height / 2);
  ctx.rotate(WATERMARK_ANGLE);

  let row = 0;
  for (let y = -diag / 2; y <= diag / 2; y += stepY, row += 1) {
    const offset = row % 2 === 0 ? 0 : stepX / 2;
    for (let x = -diag / 2 - stepX + offset; x <= diag / 2 + stepX; x += stepX) {
      ctx.fillStyle = WATERMARK_SHADOW;
      ctx.fillText(text, x + fontSize * 0.06, y + fontSize * 0.06);
      ctx.fillStyle = WATERMARK_COLOR;
      ctx.fillText(text, x, y);
    }
  }
  ctx.restore();
}

function drawFooterBand(ctx: DrawingContext, text: string, width: number, height: number): void {
  const fontSize = Math.max(11, Math.round(watermarkFontSize(width, height) * 0.75));
  const bandHeight = Math.round(fontSize * 2.2);
  ctx.save();
  ctx.globalAlpha = 0.82;
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, height - bandHeight, width, bandHeight);
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#ffffff';
  ctx.font = `600 ${fontSize}px ${FONT_STACK}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, width / 2, height - bandHeight / 2);
  ctx.restore();
}
