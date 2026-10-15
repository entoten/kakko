import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';
import type { LoadedImage } from './lib/types';
import type * as ImageModule from './lib/image';
import type * as ExportModule from './lib/export';

const fakeImage: LoadedImage = {
  source: {} as CanvasImageSource,
  width: 1200,
  height: 760,
  fileName: 'sample.png',
};

vi.mock('./lib/image', async (importOriginal) => {
  const original = await importOriginal<typeof ImageModule>();
  return {
    ...original,
    loadImageFromFile: vi.fn(async () => fakeImage),
    loadSampleImage: vi.fn(async () => fakeImage),
  };
});

const downloadSpy = vi.fn();
vi.mock('./lib/export', async (importOriginal) => {
  const original = await importOriginal<typeof ExportModule>();
  return {
    ...original,
    triggerDownload: (...args: unknown[]) => downloadSpy(...args),
    canShareFile: () => false,
  };
});

function mockCanvasGeometry(canvas: HTMLCanvasElement, width = 600, height = 380) {
  Object.defineProperty(canvas.parentElement, 'clientWidth', { configurable: true, value: width });
  canvas.getBoundingClientRect = () =>
    ({ left: 0, top: 0, width, height, right: width, bottom: height, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect;
}

async function openSample() {
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: '架空のサンプルで試す' }));
  const canvas = (await screen.findByRole('img', { name: /プレビュー/ })) as HTMLCanvasElement;
  mockCanvasGeometry(canvas);
  // Trigger the resize path so the display size becomes non-zero.
  await act(async () => {
    window.dispatchEvent(new Event('resize'));
  });
  return canvas;
}

function drag(canvas: HTMLCanvasElement, from: [number, number], to: [number, number]) {
  fireEvent.pointerDown(canvas, { pointerId: 1, pointerType: 'mouse', button: 0, clientX: from[0], clientY: from[1] });
  fireEvent.pointerMove(canvas, { pointerId: 1, clientX: to[0], clientY: to[1] });
  fireEvent.pointerUp(canvas, { pointerId: 1, clientX: to[0], clientY: to[1] });
}

describe('App', () => {
  beforeEach(() => {
    downloadSpy.mockReset();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows the brand copy and the privacy statement before any image is chosen', () => {
    render(<App />);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('必要な情報だけ、見せる。');
    expect(screen.getByText('身分証はあなたの端末内だけで処理されます。')).toBeTruthy();
    expect(
      screen.getAllByText('画像はこの端末内だけで処理されます。KAKKOのサーバーには送信されません。').length,
    ).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: '画像を選択' })).toBeTruthy();
  });

  it('adds a mask by dragging on the canvas and can undo it', async () => {
    const canvas = await openSample();

    drag(canvas, [60, 40], [300, 120]);
    expect(await screen.findByText('黒塗り 1 件')).toBeTruthy();
    const list = screen.getByRole('list', { name: '黒塗りの一覧' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(1);
    expect(within(list).getByText(/左から 10%、上から 11%、幅 40%、高さ 21%/)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: '元に戻す' }));
    expect(await screen.findByText('黒塗りはまだありません。')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'やり直す' }));
    expect(await screen.findByText('黒塗り 1 件')).toBeTruthy();
  });

  it('ignores accidental taps that do not form a rectangle', async () => {
    const canvas = await openSample();
    drag(canvas, [100, 100], [101, 101]);
    expect(screen.getByText('黒塗りはまだありません。')).toBeTruthy();
  });

  it('adds a mask from the keyboard-only numeric form', async () => {
    await openSample();
    fireEvent.click(screen.getByText('数値で黒塗りを追加（キーボード操作）'));
    fireEvent.change(screen.getByLabelText('左から'), { target: { value: '20' } });
    fireEvent.change(screen.getByLabelText('上から'), { target: { value: '30' } });
    fireEvent.change(screen.getByLabelText('幅'), { target: { value: '50' } });
    fireEvent.change(screen.getByLabelText('高さ'), { target: { value: '10' } });
    fireEvent.click(screen.getByRole('button', { name: 'この範囲を黒塗り' }));
    expect(await screen.findByText(/左から 20%、上から 30%、幅 50%、高さ 10%/)).toBeTruthy();
  });

  it('builds the watermark from the form and shows it in the summary', async () => {
    await openSample();
    fireEvent.change(screen.getByLabelText('提出先'), { target: { value: 'Sakura Guest House' } });
    fireEvent.change(screen.getByLabelText('日付'), { target: { value: '2026-09-09' } });
    expect(screen.getByText('Sakura Guest House / 宿泊本人確認専用 / 2026-09-09')).toBeTruthy();
  });

  it('warns about risky job offers and blocks export until acknowledged', async () => {
    await openSample();
    fireEvent.click(screen.getByLabelText('求人・アルバイト'));
    expect(screen.getByText('この求人、本当に安全ですか？')).toBeTruthy();
    expect(screen.getByText(/SNS やダイレクトメッセージ/)).toBeTruthy();

    const createButton = screen.getByRole('button', { name: '安全なコピーを作成' });
    expect(createButton).toHaveProperty('disabled', true);

    fireEvent.click(screen.getByLabelText('上記に当てはまらないことを確認しました'));
    expect(createButton).toHaveProperty('disabled', false);

    // Switching purpose resets the acknowledgement.
    fireEvent.click(screen.getByLabelText('賃貸'));
    fireEvent.click(screen.getByLabelText('求人・アルバイト'));
    expect(createButton).toHaveProperty('disabled', true);
  });

  it('exports a safe copy and hands it to the user as a file', async () => {
    const canvas = await openSample();
    drag(canvas, [60, 40], [300, 120]);
    fireEvent.change(screen.getByLabelText('提出先'), { target: { value: 'Sakura Guest House' } });

    fireEvent.click(screen.getByRole('button', { name: '安全なコピーを作成' }));
    expect(await screen.findByText(/安全なコピーができました/)).toBeTruthy();
    expect(screen.getByRole('img', { name: '生成された安全なコピーのプレビュー' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: '端末に保存' }));
    await waitFor(() => expect(downloadSpy).toHaveBeenCalledTimes(1));
    const [blob, fileName] = downloadSpy.mock.calls[0] as [Blob, string];
    expect(blob.type).toBe('image/png');
    expect(fileName).toMatch(/^kakko-Sakura_Guest_House-.*\.png$/);
  });

  it('pre-fills from a request link and shows the request', async () => {
    window.location.hash = '#purpose=rental&to=ABC%20%E4%B8%8D%E5%8B%95%E7%94%A3&keep=photo,name,address';
    try {
      await openSample();
      expect(screen.getByText('提出先からの依頼リンクで開いています')).toBeTruthy();
      expect((screen.getByLabelText('提出先') as HTMLInputElement).value).toBe('ABC 不動産');
      expect((screen.getByLabelText('賃貸') as HTMLInputElement).checked).toBe(true);
      const keep = screen.getByRole('list', { name: '残す項目' });
      expect(within(keep).getAllByRole('listitem').map((li) => li.textContent)).toEqual(['顔写真', '氏名', '住所']);
      expect(screen.getByText(/^ABC 不動産 \/ 賃貸契約本人確認専用 \/ \d{4}-\d{2}-\d{2}$/)).toBeTruthy();

      fireEvent.click(screen.getByRole('button', { name: '依頼内容を使わない' }));
      expect(screen.queryByText('提出先からの依頼リンクで開いています')).toBeNull();
      expect((screen.getByLabelText('提出先') as HTMLInputElement).value).toBe('');
    } finally {
      window.location.hash = '';
    }
  });

  it('takes the retention promise from a request link, stamps it into the watermark and the receipt', async () => {
    window.location.hash = '#purpose=lodging&to=Sakura%20Guest%20House&keep=photo,name&retain=7&contact=privacy%40example.jp';
    try {
      const canvas = await openSample();
      expect(screen.getByText(/7日以内に削除と宣言しています/)).toBeTruthy();
      expect(screen.getByText('privacy@example.jp')).toBeTruthy();
      expect((screen.getByLabelText('7日以内に削除') as HTMLInputElement).checked).toBe(true);

      fireEvent.change(screen.getByLabelText('日付'), { target: { value: '2026-09-09' } });
      expect(screen.getByText('Sakura Guest House / 宿泊本人確認専用 / 2026-09-09 / 2026-09-16までに削除')).toBeTruthy();

      // The user can still drop the condition.
      fireEvent.click(screen.getByLabelText('指定なし'));
      expect(screen.getByText('Sakura Guest House / 宿泊本人確認専用 / 2026-09-09')).toBeTruthy();
      fireEvent.click(screen.getByLabelText('7日以内に削除'));

      drag(canvas, [60, 40], [300, 120]);
      fireEvent.click(screen.getByRole('button', { name: '安全なコピーを作成' }));
      const receipt = (await screen.findByLabelText('確認レシート')).textContent ?? '';
      expect(receipt).toContain('KAKKO 確認レシート');
      expect(receipt).toContain('削除期限（提出条件）: 2026-09-16（7日以内に削除）');
      expect(receipt).toContain('黒塗り: 1 か所');
      expect(receipt).toContain('削除の窓口: privacy@example.jp');
      expect(receipt).toMatch(/照合番号: [A-Z2-9]{8}/);

      fireEvent.click(screen.getByRole('button', { name: 'テキストで保存' }));
      await waitFor(() => expect(downloadSpy).toHaveBeenCalledTimes(1));
      expect(downloadSpy.mock.calls[0]?.[1]).toBe('kakko-receipt.txt');

      // From the receipt straight into a deletion request for this recipient.
      fireEvent.click(screen.getByRole('button', { name: '削除請求文を用意する' }));
      expect(screen.getByRole('heading', { level: 1 }).textContent).toContain('消してもらう。');
      expect((screen.getByLabelText('宛先の事業者名') as HTMLInputElement).value).toBe('Sakura Guest House');
      expect((screen.getByLabelText('事業者の問い合わせ先メール（任意）') as HTMLInputElement).value).toBe('privacy@example.jp');
      expect(screen.getByLabelText('生成された請求文').textContent).toContain('Sakura Guest House 御中');
    } finally {
      window.location.hash = '';
    }
  });

  it('shows a scanned QR payload on the check view', () => {
    window.location.hash = '#v=1&to=Sakura+Guest+House&p=lodging&d=2026-09-09&r=7&n=K7Q2MZ4A';
    try {
      render(<App />);
      expect(screen.getByRole('heading', { level: 1 }).textContent).toContain('いつまでか。');
      expect(screen.getByText('この QR コードの内容')).toBeTruthy();
      expect(screen.getByText('2026-09-16（7日以内に削除）')).toBeTruthy();
      expect(screen.getByText('K7Q2MZ4A')).toBeTruthy();
      // The payload must not be mistaken for a request link.
      expect(screen.queryByText('提出先からの依頼リンクで開いています')).toBeNull();
      fireEvent.click(screen.getByRole('button', { name: /KAKKO に戻る/ }));
      expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('必要な情報だけ、見せる。');
    } finally {
      window.location.hash = '';
    }
  });

  it('opens the link builder for businesses and generates a fragment link', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: '事業者の方へ: 依頼リンクを作る' }));
    expect(screen.getByRole('heading', { level: 1 }).textContent).toContain('受け取る。');
    fireEvent.change(screen.getByLabelText('あなたの事業者名・施設名'), { target: { value: 'Sakura Guest House' } });
    const code = () => document.querySelector('.code')?.textContent ?? '';
    expect(code()).toContain('/#purpose=lodging&to=Sakura+Guest+House&keep=photo%2Cname');
    fireEvent.click(screen.getByLabelText('30日以内に削除'));
    fireEvent.change(screen.getByLabelText('削除請求の窓口（任意）'), { target: { value: 'privacy@example.jp' } });
    expect(code()).toContain('&retain=30&contact=privacy%40example.jp');
    const embed = screen.getByLabelText('埋め込みコード').textContent ?? '';
    expect(embed).toContain('/kakko.js"');
    expect(embed).toContain('data-to="Sakura Guest House" data-purpose="lodging"');
    expect(embed).toContain('data-retain="30"');
    expect(embed).toContain('data-contact="privacy@example.jp"');
    fireEvent.click(screen.getByRole('button', { name: /KAKKO に戻る/ }));
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('必要な情報だけ、見せる。');
  });

  it('opens the deletion request generator and builds a letter', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: '預けた画像の削除を請求する' }));
    expect(screen.getByRole('heading', { level: 1 }).textContent).toContain('消してもらう。');
    fireEvent.change(screen.getByLabelText('宛先の事業者名'), { target: { value: '架空カーシェア株式会社' } });
    fireEvent.change(screen.getByLabelText('あなたの氏名'), { target: { value: '架空 太郎' } });
    const letter = screen.getByLabelText('生成された請求文').textContent ?? '';
    expect(letter).toContain('架空カーシェア株式会社 御中');
    expect(letter).toContain('第35条第5項');
    expect(letter.trim().endsWith('架空 太郎')).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: /KAKKO で安全なコピーを作る/ }));
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('必要な情報だけ、見せる。');
  });

  it('opens present mode without creating a file, reveals on tap and closes', async () => {
    await openSample();
    fireEvent.change(screen.getByLabelText('提出先'), { target: { value: 'Sakura Guest House' } });
    fireEvent.click(screen.getByRole('button', { name: 'ファイルを作らずに画面で見せる' }));

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(/ファイルは生成されていません/)).toBeTruthy();
    expect(within(dialog).getByRole('heading', { level: 2 }).textContent).toBe('Sakura Guest House');
    expect(downloadSpy).not.toHaveBeenCalled();

    fireEvent.click(within(dialog).getByRole('button', { name: 'タップして表示' }));
    expect(within(dialog).getByRole('img', { name: /提示中の書類/ })).toBeTruthy();

    fireEvent.click(within(dialog).getByRole('button', { name: '提示を終了' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('discards the image and returns to the start screen', async () => {
    await openSample();
    fireEvent.click(screen.getByRole('button', { name: /別の画像を選ぶ/ }));
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('必要な情報だけ、見せる。');
  });
});
