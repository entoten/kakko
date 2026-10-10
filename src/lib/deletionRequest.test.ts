import { describe, expect, it } from 'vitest';
import { buildDeletionRequest, buildMailto, emptyDeletionRequest } from './deletionRequest';

describe('buildDeletionRequest', () => {
  it('produces a formal letter citing the relevant articles', () => {
    const letter = buildDeletionRequest({
      ...emptyDeletionRequest('2026-10-07'),
      company: '架空カーシェア株式会社',
      service: '架空カー',
      memberId: '会員番号 000000',
      endedAt: '2024年3月',
      documents: ['license', 'other'],
      otherDocument: '学生証',
      reasons: ['withdrawn', 'leak'],
      name: '架空 太郎',
      contact: 'kakko-sample@example.test',
      deadlineDays: 14,
    });

    expect(letter.startsWith('2026年10月7日')).toBe(true);
    expect(letter).toContain('架空カーシェア株式会社 御中');
    expect(letter).toContain('「架空カー」');
    expect(letter).toContain('登録情報: 会員番号 000000');
    expect(letter).toContain('退会・利用終了: 2024年3月');
    expect(letter).toContain('第35条第5項');
    expect(letter).toContain('第33条第1項');
    expect(letter).toContain('第36条');
    expect(letter).toContain('運転免許証の画像データ');
    expect(letter).toContain('学生証の画像データ');
    expect(letter).toContain('漏えい等の事態');
    expect(letter).toContain('14日以内');
    expect(letter).toContain('kakko-sample@example.test');
    expect(letter.trim().endsWith('架空 太郎')).toBe(true);
  });

  it('never asks the user to resend an ID image', () => {
    const letter = buildDeletionRequest(emptyDeletionRequest('2026-10-07'));
    expect(letter).toContain('本人確認書類の画像の送付を伴わない方法');
    expect(letter).toContain('画像の再提出は、本請求の趣旨に反するため行いません');
  });

  it('omits empty optional fields and falls back to placeholders', () => {
    const letter = buildDeletionRequest(emptyDeletionRequest('2026-10-07'));
    expect(letter).toContain('（事業者名） 御中');
    expect(letter).not.toContain('登録情報:');
    expect(letter).not.toContain('退会・利用終了:');
    expect(letter).not.toContain('連絡先:');
    expect(letter).toContain('（氏名）');
  });

  it('sanitizes control characters and caps lengths', () => {
    const letter = buildDeletionRequest({
      ...emptyDeletionRequest('2026-10-07'),
      company: 'A\u0000B\tC',
      name: 'x'.repeat(100),
    });
    expect(letter).toContain('A B C 御中');
    expect(letter).not.toContain('x'.repeat(41));
  });

  it('uses a sane deadline when the input is invalid', () => {
    const letter = buildDeletionRequest({ ...emptyDeletionRequest('2026-10-07'), deadlineDays: Number.NaN });
    expect(letter).toContain('14日以内');
  });
});

describe('buildMailto', () => {
  it('encodes address, subject and body', () => {
    const url = buildMailto('privacy@example.test', '件名', '本文\n2行目');
    expect(url.startsWith('mailto:privacy%40example.test?subject=')).toBe(true);
    expect(url).toContain(encodeURIComponent('件名'));
    expect(url).toContain(encodeURIComponent('本文\n2行目'));
  });
});
