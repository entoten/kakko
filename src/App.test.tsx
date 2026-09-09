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

  it('discards the image and returns to the start screen', async () => {
    await openSample();
    fireEvent.click(screen.getByRole('button', { name: /別の画像を選ぶ/ }));
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('必要な情報だけ、見せる。');
  });
});
