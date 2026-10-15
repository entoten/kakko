import { describe, expect, it } from 'vitest';
import { deleteByIso, parseRetainDays, retentionLabel, retentionWatermark } from './retention';

describe('parseRetainDays', () => {
  it('accepts 0..3650 and nothing else', () => {
    expect(parseRetainDays('0')).toBe(0);
    expect(parseRetainDays('365')).toBe(365);
    expect(parseRetainDays('3650')).toBe(3650);
    expect(parseRetainDays('3651')).toBeNull();
    expect(parseRetainDays('-1')).toBeNull();
    expect(parseRetainDays('7.5')).toBeNull();
    expect(parseRetainDays('1e3')).toBeNull();
    expect(parseRetainDays(null)).toBeNull();
  });
});

describe('deleteByIso', () => {
  it('adds days on the local calendar, across month and year ends', () => {
    expect(deleteByIso('2026-09-09', 7)).toBe('2026-09-16');
    expect(deleteByIso('2026-12-30', 7)).toBe('2027-01-06');
    expect(deleteByIso('2026-01-31', 30)).toBe('2026-03-02');
    expect(deleteByIso('2026-09-09', 0)).toBe('2026-09-09');
  });
  it('returns null for dates that are not YYYY-MM-DD', () => {
    expect(deleteByIso('', 7)).toBeNull();
    expect(deleteByIso('9/9/2026', 7)).toBeNull();
  });
});

describe('labels', () => {
  it('reads naturally for the common choices', () => {
    expect(retentionLabel(0)).toBe('確認後すぐ削除');
    expect(retentionLabel(7)).toBe('7日以内に削除');
    expect(retentionLabel(365)).toBe('1年以内に削除');
    expect(retentionLabel(730)).toBe('2年以内に削除');
  });
  it('stamps an absolute deadline into the watermark when the date is known', () => {
    expect(retentionWatermark(7, '2026-09-09')).toBe('2026-09-16までに削除');
    expect(retentionWatermark(0, '2026-09-09')).toBe('確認後に削除');
    expect(retentionWatermark(7, '')).toBe('7日以内に削除');
  });
});
