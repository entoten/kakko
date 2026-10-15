import { describe, expect, it } from 'vitest';
import { buildReceipt } from './receipt';
import { parseRequestLink } from './link';

const details = {
  purpose: 'lodging' as const,
  customPurpose: '',
  recipient: 'Sakura Guest House',
  date: '2026-09-09',
  retainDays: 7,
};
const createdAt = new Date(2026, 8, 9, 14, 3, 21);

describe('buildReceipt', () => {
  it('records what was handed over, the deadline and the recipient declaration', () => {
    const text = buildReceipt({
      details,
      link: parseRequestLink('#purpose=lodging&to=Sakura%20Guest%20House&keep=photo,name&retain=7&contact=privacy%40example.jp'),
      maskCount: 3,
      watermark: 'Sakura Guest House / 宿泊本人確認専用 / 2026-09-09 / 2026-09-16までに削除',
      delivery: { kind: 'file', fileName: 'kakko-x.png', width: 1200, height: 760 },
      createdAt,
    });
    expect(text).toContain('作成: 2026-09-09 14:03:21');
    expect(text).toContain('提出先: Sakura Guest House');
    expect(text).toContain('用途: 宿泊本人確認専用');
    expect(text).toContain('渡し方: 画像ファイル kakko-x.png（1200×760）');
    expect(text).toContain('黒塗り: 3 か所');
    expect(text).toContain('削除期限（提出条件）: 2026-09-16（7日以内に削除）');
    expect(text).toContain('見る項目: 顔写真、氏名');
    expect(text).toContain('保存期間: 7日以内に削除');
    expect(text).toContain('削除の窓口: privacy@example.jp');
    expect(text).toContain('第35条第5項');
  });

  it('says so when there was no request link and no deadline', () => {
    const text = buildReceipt({
      details: { ...details, retainDays: null, recipient: '' },
      link: parseRequestLink(''),
      maskCount: 0,
      watermark: '宿泊本人確認専用 / 2026-09-09',
      delivery: { kind: 'present' },
      createdAt,
    });
    expect(text).toContain('提出先: （提出先未入力）');
    expect(text).toContain('渡し方: 画面提示のみ（ファイルは作成していません）');
    expect(text).toContain('削除期限（提出条件）: 指定なし');
    expect(text).toContain('提出先の宣言: なし');
  });
});
