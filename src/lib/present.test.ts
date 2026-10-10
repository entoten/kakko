import { describe, expect, it } from 'vitest';
import { buildPresentWatermark, formatClock, formatRemaining, formatTime } from './present';

describe('present mode helpers', () => {
  const at = new Date(2026, 9, 7, 14, 3, 21);

  it('formats the clock with seconds in local time', () => {
    expect(formatClock(at)).toBe('2026-10-07 14:03:21');
    expect(formatTime(at)).toBe('14:03:21');
  });

  it('builds a watermark that changes every second and is marked as presentation-only', () => {
    const a = buildPresentWatermark({ purpose: 'lodging', customPurpose: '', recipient: 'Sakura Guest House' }, at);
    const b = buildPresentWatermark(
      { purpose: 'lodging', customPurpose: '', recipient: 'Sakura Guest House' },
      new Date(at.getTime() + 1000),
    );
    expect(a).toBe('Sakura Guest House / 宿泊本人確認専用 / 2026-10-07 14:03:21 / 提示専用');
    expect(b).not.toBe(a);
    expect(b.endsWith('14:03:22 / 提示専用')).toBe(true);
  });

  it('omits an empty recipient', () => {
    expect(buildPresentWatermark({ purpose: 'rental', customPurpose: '', recipient: '  ' }, at)).toBe(
      '賃貸契約本人確認専用 / 2026-10-07 14:03:21 / 提示専用',
    );
  });

  it('formats remaining time as m:ss and never goes negative', () => {
    expect(formatRemaining(10 * 60 * 1000)).toBe('10:00');
    expect(formatRemaining(61 * 1000)).toBe('1:01');
    expect(formatRemaining(-5)).toBe('0:00');
  });
});
