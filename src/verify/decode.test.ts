import { describe, expect, it } from 'vitest';
import { qrMatrix, rasterize } from '../lib/qr';
import { buildPayloadLink, type Payload } from './payload';
import { decodeQr, payloadFromPixels } from './decode';

const payload: Payload = { v: 1, to: 'Sakura Guest House', purpose: 'lodging', date: '2026-09-09', retain: 7, nonce: 'K7Q2MZ4A' };

describe('QR round trip', () => {
  it('encodes the payload link and decodes it back from pixels', () => {
    const link = buildPayloadLink('https://app.example.test', payload);
    const matrix = qrMatrix(link);
    expect(matrix.length).toBeGreaterThanOrEqual(21);
    expect(matrix.every((row) => row.length === matrix.length)).toBe(true);
    // Finder pattern: top-left 7x7 ring is dark.
    expect(matrix[0]?.slice(0, 7).every(Boolean)).toBe(true);

    const pixels = rasterize(matrix, 4);
    expect(decodeQr(pixels)).toBe(link);
    expect(payloadFromPixels(pixels)).toEqual(payload);
  });

  it('still decodes at a small module size', () => {
    const link = buildPayloadLink('https://app.example.test', { ...payload, to: 'x'.repeat(60) });
    expect(decodeQr(rasterize(qrMatrix(link), 2))).toBe(link);
  });

  it('returns null for pixels without a code', () => {
    const blank = { data: new Uint8ClampedArray(64 * 64 * 4).fill(255), width: 64, height: 64 };
    expect(decodeQr(blank)).toBeNull();
    expect(payloadFromPixels(blank)).toBeNull();
  });
});
