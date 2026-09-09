import { describe, expect, it } from 'vitest';
import { MASK_COLOR, renderSafeCopy } from './render';
import { createRecordingContext } from '../test/setup';
import type { Mask } from './types';

const fakeSource = {} as CanvasImageSource;

function mask(id: string, x: number, y: number, w: number, h: number): Mask {
  return { id, x, y, w, h, source: 'pointer' };
}

describe('renderSafeCopy', () => {
  it('draws the image once, then an opaque black rect per mask', () => {
    const ctx = createRecordingContext();
    renderSafeCopy(ctx, {
      source: fakeSource,
      width: 1000,
      height: 500,
      masks: [mask('a', 0.1, 0.1, 0.2, 0.2), mask('b', 0.5, 0.5, 0.1, 0.1)],
      watermark: '',
    });

    const draws = ctx.calls.filter((c) => c.method === 'drawImage');
    expect(draws).toHaveLength(1);
    expect(draws[0]?.args).toEqual([fakeSource, 0, 0, 1000, 500]);

    // First fillRect is the background; the next two are the masks.
    const fills = ctx.calls.filter((c) => c.method === 'fillRect');
    expect(fills.slice(1, 3).map((c) => c.args)).toEqual([
      [100, 50, 200, 100],
      [500, 250, 100, 50],
    ]);
    // Masks are drawn after the image so they sit on top of it.
    const drawIndex = ctx.calls.findIndex((c) => c.method === 'drawImage');
    const maskIndex = ctx.calls.findIndex((c) => c.method === 'fillRect' && c.args[0] === 100);
    expect(maskIndex).toBeGreaterThan(drawIndex);
    expect(ctx.fillStyle).toBe(MASK_COLOR); // last style used for masks (no watermark)
  });

  it('writes the watermark text across the image and in the footer band', () => {
    const ctx = createRecordingContext();
    const watermark = 'Sakura Guest House / 宿泊本人確認専用 / 2026-09-09';
    renderSafeCopy(ctx, { source: fakeSource, width: 1200, height: 800, masks: [], watermark });

    const texts = ctx.calls.filter((c) => c.method === 'fillText');
    expect(texts.length).toBeGreaterThan(4); // tiled copies + footer
    expect(texts.every((c) => c.args[0] === watermark)).toBe(true);
    expect(ctx.calls.some((c) => c.method === 'rotate')).toBe(true);
  });

  it('does not draw any text when the watermark is empty', () => {
    const ctx = createRecordingContext();
    renderSafeCopy(ctx, { source: fakeSource, width: 100, height: 100, masks: [], watermark: '   ' });
    expect(ctx.calls.some((c) => c.method === 'fillText')).toBe(false);
  });
});
