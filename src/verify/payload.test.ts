import { describe, expect, it } from 'vitest';
import { buildPayloadFragment, buildPayloadLink, deleteByOf, isNonce, newNonce, parsePayload, type Payload } from './payload';

const base: Payload = { v: 1, to: 'Sakura Guest House', purpose: 'lodging', date: '2026-09-09', retain: 7, nonce: 'K7Q2MZ4A' };

describe('payload', () => {
  it('round-trips through a KAKKO link', () => {
    const link = buildPayloadLink('https://example.test/', base);
    expect(link).toBe('https://example.test/#v=1&to=Sakura+Guest+House&p=lodging&d=2026-09-09&r=7&n=K7Q2MZ4A');
    expect(parsePayload(link)).toEqual(base);
    expect(parsePayload(buildPayloadFragment(base))).toEqual(base);
    expect(parsePayload(buildPayloadFragment(base).slice(1))).toEqual(base);
  });

  it('keeps the custom purpose and omits retention when unset', () => {
    const p: Payload = { v: 1, to: base.to, purpose: 'other', customPurpose: '会員登録', date: base.date, nonce: base.nonce };
    const parsed = parsePayload(buildPayloadFragment(p));
    expect(parsed).toEqual({ v: 1, to: base.to, purpose: 'other', customPurpose: '会員登録', date: base.date, nonce: base.nonce });
    expect(deleteByOf(parsed as Payload)).toBeNull();
    expect(deleteByOf(base)).toBe('2026-09-16');
  });

  it('rejects anything malformed instead of returning a partial payload', () => {
    expect(parsePayload('')).toBeNull();
    expect(parsePayload('#v=2&to=X&p=lodging&d=2026-09-09&n=K7Q2MZ4A')).toBeNull();
    expect(parsePayload('#v=1&to=X&p=hack&d=2026-09-09&n=K7Q2MZ4A')).toBeNull();
    expect(parsePayload('#v=1&to=X&p=lodging&d=9/9/2026&n=K7Q2MZ4A')).toBeNull();
    expect(parsePayload('#v=1&to=X&p=lodging&d=2026-09-09&n=short')).toBeNull();
    expect(parsePayload('#v=1&to=X&p=lodging&d=2026-09-09&n=K7Q2MZ4A&r=-3')?.retain).toBeUndefined();
    expect(parsePayload('#purpose=lodging&to=X')).toBeNull(); // a request link is not a payload
  });

  it('generates reference numbers from the unambiguous alphabet', () => {
    const n = newNonce();
    expect(n).toHaveLength(8);
    expect(isNonce(n)).toBe(true);
    expect(newNonce()).not.toBe(n);
    expect(newNonce((b) => b.fill(0))).toBe('AAAAAAAA');
    expect(isNonce('K7Q2MZ4O')).toBe(false); // O is excluded
  });
});
