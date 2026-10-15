import { describe, expect, it } from 'vitest';
import { compare, nameKey } from './verify';
import type { Payload } from './payload';

const payload: Payload = { v: 1, to: 'Sakura Guest House', purpose: 'lodging', date: '2026-09-09', retain: 7, nonce: 'K7Q2MZ4A' };

describe('compare', () => {
  it('accepts a copy addressed to us and reports the deadline', () => {
    const r = compare(payload, { to: 'sakura  guest house', purpose: 'lodging' });
    expect(r.status).toBe('ok');
    expect(r.deleteBy).toBe('2026-09-16');
    expect(r.summary).toBe('KAKKO の安全なコピーです: Sakura Guest House 宛 ・ 民泊・宿泊 ・ 2026-09-09 ・ 2026-09-16までに削除 ・ 照合番号 K7Q2MZ4A');
  });

  it('flags a copy made for someone else or another purpose', () => {
    const r = compare(payload, { to: 'ABC 不動産', purpose: 'rental' });
    expect(r.status).toBe('mismatch');
    expect(r.problems).toEqual(['recipient', 'purpose']);
    expect(r.summary).toContain('宛先が「Sakura Guest House」です（このフォームは「ABC 不動産」）');
    expect(r.deleteBy).toBe('2026-09-16');
  });

  it('does not require an expectation', () => {
    expect(compare(payload).status).toBe('ok');
    const noRetain: Payload = { v: 1, to: payload.to, purpose: payload.purpose, date: payload.date, nonce: payload.nonce };
    expect(compare(noRetain).summary).not.toContain('削除');
  });

  it('describes a plain image as not a KAKKO copy', () => {
    const r = compare(null, { to: 'X' });
    expect(r.status).toBe('none');
    expect(r.payload).toBeNull();
  });

  it('normalizes width, case and spacing in names', () => {
    expect(nameKey('ＳＡＫＵＲＡ　Guest  House ')).toBe('sakura guest house');
  });
});
