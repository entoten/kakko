import { afterEach, beforeAll, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

/**
 * jsdom does not implement canvas drawing. Install a recording 2D context so
 * the render pipeline and the export flow can run end-to-end in tests.
 */
export interface RecordedCall {
  method: string;
  args: unknown[];
}

export function createRecordingContext(): CanvasRenderingContext2D & { calls: RecordedCall[] } {
  const calls: RecordedCall[] = [];
  const record =
    (method: string) =>
    (...args: unknown[]) => {
      calls.push({ method, args });
      if (method === 'measureText') return { width: String(args[0]).length * 8 };
      return undefined;
    };
  const ctx = {
    calls,
    fillStyle: '#000',
    strokeStyle: '#000',
    font: '',
    textAlign: 'left',
    textBaseline: 'alphabetic',
    globalAlpha: 1,
    lineWidth: 1,
    save: record('save'),
    restore: record('restore'),
    translate: record('translate'),
    rotate: record('rotate'),
    setTransform: record('setTransform'),
    fillRect: record('fillRect'),
    strokeRect: record('strokeRect'),
    fillText: record('fillText'),
    drawImage: record('drawImage'),
    measureText: record('measureText'),
    setLineDash: record('setLineDash'),
  };
  return ctx as unknown as CanvasRenderingContext2D & { calls: RecordedCall[] };
}

beforeAll(() => {
  Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
    configurable: true,
    value: function getContext(this: HTMLCanvasElement) {
      const existing = (this as HTMLCanvasElement & { __ctx?: CanvasRenderingContext2D }).__ctx;
      if (existing) return existing;
      const ctx = createRecordingContext();
      (this as HTMLCanvasElement & { __ctx?: CanvasRenderingContext2D }).__ctx = ctx;
      return ctx;
    },
  });
  Object.defineProperty(HTMLCanvasElement.prototype, 'toBlob', {
    configurable: true,
    value: function toBlob(this: HTMLCanvasElement, cb: BlobCallback, type = 'image/png') {
      // Encode a tiny deterministic payload; the important part is the MIME type.
      const payload = new Uint8Array([0x89, 0x50, 0x4e, 0x47, this.width & 0xff, this.height & 0xff]);
      setTimeout(() => cb(new Blob([payload], { type })), 0);
    },
  });
  if (typeof URL.createObjectURL !== 'function') {
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:mock') });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
  }
});

afterEach(() => {
  cleanup();
});
