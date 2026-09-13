import { describe, expect, it } from 'vitest';
import { isUsableRect, normalizeRect, rectFromPoints, toPixelRect } from './geometry';

describe('rectFromPoints', () => {
  it('normalizes two arbitrary corners into a positive rect', () => {
    const r = rectFromPoints({ x: 80, y: 60 }, { x: 20, y: 10 }, 200, 100);
    expect(r.x).toBeCloseTo(0.1);
    expect(r.y).toBeCloseTo(0.1);
    expect(r.w).toBeCloseTo(0.3);
    expect(r.h).toBeCloseTo(0.5);
  });

  it('clamps points that leave the element', () => {
    const r = rectFromPoints({ x: -50, y: -50 }, { x: 400, y: 400 }, 200, 100);
    expect(r).toEqual({ x: 0, y: 0, w: 1, h: 1 });
  });

  it('returns an empty rect for a zero-size element', () => {
    expect(rectFromPoints({ x: 1, y: 1 }, { x: 5, y: 5 }, 0, 0)).toEqual({ x: 0, y: 0, w: 0, h: 0 });
  });
});

describe('normalizeRect / isUsableRect', () => {
  it('clamps width and height so the rect stays inside the image', () => {
    const r = normalizeRect({ x: 0.8, y: 0.8, w: 0.5, h: 0.5 });
    expect(r.x).toBe(0.8);
    expect(r.w).toBeCloseTo(0.2);
    expect(r.h).toBeCloseTo(0.2);
    expect(r.x + r.w).toBeLessThanOrEqual(1);
  });
  it('rejects hairline rects', () => {
    expect(isUsableRect({ x: 0, y: 0, w: 0.005, h: 0.2 })).toBe(false);
    expect(isUsableRect({ x: 0, y: 0, w: 0.2, h: 0.2 })).toBe(true);
  });
});

describe('toPixelRect', () => {
  it('rounds outward so the mask never leaves a sliver uncovered', () => {
    expect(toPixelRect({ x: 0.1, y: 0.1, w: 0.25, h: 0.25 }, 333, 333)).toEqual({ x: 33, y: 33, w: 84, h: 84 });
  });
});
