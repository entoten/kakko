import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Payload } from '../verify/payload';

const read = vi.fn<(file: Blob) => Promise<Payload | null>>();
vi.mock('../verify/decode', () => ({ readPayloadFromFile: (file: Blob) => read(file) }));

const { enhance, install, readConfig, requestLinkFor } = await import('./lib');

const payload: Payload = { v: 1, to: 'Sakura Guest House', purpose: 'lodging', date: '2026-09-09', retain: 7, nonce: 'K7Q2MZ4A' };

function scriptTag(attrs: Record<string, string>): HTMLScriptElement {
  const s = document.createElement('script');
  s.src = 'https://app.example.test/kakko.js';
  for (const [k, v] of Object.entries(attrs)) s.dataset[k] = v;
  return s;
}

function pick(input: HTMLInputElement, file: File | null) {
  Object.defineProperty(input, 'files', { configurable: true, value: file ? [file] : [] });
  input.dispatchEvent(new Event('change'));
}

describe('kakko.js', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    read.mockReset();
  });

  it('reads its configuration from data attributes', () => {
    const cfg = readConfig(
      scriptTag({ to: 'Sakura Guest House', purpose: 'lodging', keep: 'photo,name,bogus', retain: '7', contact: 'privacy@example.jp', require: 'true' }),
    );
    expect(cfg).toMatchObject({
      origin: 'https://app.example.test',
      to: 'Sakura Guest House',
      purpose: 'lodging',
      keep: ['photo', 'name'],
      retain: 7,
      contact: 'privacy@example.jp',
      require: true,
      prefix: 'kakko_',
      lang: 'ja',
    });
    expect(requestLinkFor(cfg)).toBe(
      'https://app.example.test/#purpose=lodging&to=Sakura+Guest+House&keep=photo%2Cname&retain=7&contact=privacy%40example.jp',
    );
    expect(readConfig(scriptTag({ purpose: 'hack' })).purpose).toBeUndefined();
  });

  it('adds the request link, verifies the chosen file and fills hidden inputs', async () => {
    document.body.innerHTML = '<form><input type="file" name="id"></form>';
    const cfg = readConfig(scriptTag({ to: 'Sakura Guest House', purpose: 'lodging', retain: '7' }));
    expect(install(document, cfg)).toBe(1);

    const input = document.querySelector('input[type=file]') as HTMLInputElement;
    const link = document.querySelector('a.kakko-link') as HTMLAnchorElement;
    expect(link.textContent).toBe('KAKKO で安全なコピーを作る（7日以内に削除）');
    expect(link.href).toContain('#purpose=lodging&to=Sakura+Guest+House&retain=7');

    const events: CustomEvent[] = [];
    document.addEventListener('kakko:verify', (e) => events.push(e as CustomEvent));

    read.mockResolvedValueOnce(payload);
    pick(input, new File(['x'], 'copy.png', { type: 'image/png' }));
    await vi.waitFor(() => expect(document.querySelector('.kakko-status')?.getAttribute('data-status')).toBe('ok'));

    const form = document.querySelector('form') as HTMLFormElement;
    const hidden = (name: string) => (form.querySelector(`input[type=hidden][name="${name}"]`) as HTMLInputElement).value;
    expect(hidden('kakko_status')).toBe('ok');
    expect(hidden('kakko_to')).toBe('Sakura Guest House');
    expect(hidden('kakko_delete_by')).toBe('2026-09-16');
    expect(hidden('kakko_nonce')).toBe('K7Q2MZ4A');
    expect(events).toHaveLength(1);
    expect(events[0]?.detail.status).toBe('ok');
    expect(input.validationMessage).toBe('');
    expect(read).toHaveBeenCalledTimes(1);

    // Clearing the selection clears the outcome.
    pick(input, null);
    expect(hidden('kakko_status')).toBe('');
    expect(document.querySelector('.kakko-status')?.textContent).toBe('');
  });

  it('blocks submission with data-require when the copy is for someone else', async () => {
    document.body.innerHTML = '<form><input type="file" data-kakko><input type="file" id="other"></form>';
    const cfg = readConfig(scriptTag({ to: 'ABC 不動産', purpose: 'rental', require: 'true' }));
    expect(install(document, cfg)).toBe(1); // only the data-kakko input

    const input = document.querySelector('input[data-kakko]') as HTMLInputElement;
    read.mockResolvedValueOnce(payload);
    pick(input, new File(['x'], 'copy.png', { type: 'image/png' }));
    await vi.waitFor(() => expect(document.querySelector('.kakko-status')?.getAttribute('data-status')).toBe('mismatch'));
    expect(input.validationMessage).toContain('宛先が「Sakura Guest House」です');
    expect((document.querySelector('input[name="kakko_status"]') as HTMLInputElement).value).toBe('mismatch');

    read.mockResolvedValueOnce(null);
    pick(input, new File(['x'], 'photo.jpg', { type: 'image/jpeg' }));
    await vi.waitFor(() => expect(document.querySelector('.kakko-status')?.getAttribute('data-status')).toBe('none'));
    expect(input.validationMessage).toContain('KAKKO のコピーではありません');
  });

  it('is idempotent and survives decode errors', async () => {
    const input = document.createElement('input');
    input.type = 'file';
    document.body.appendChild(input);
    const cfg = readConfig(scriptTag({ to: 'X', purpose: 'lodging' }));
    enhance(input, cfg);
    enhance(input, cfg);
    expect(document.querySelectorAll('.kakko-ui')).toHaveLength(1);

    read.mockRejectedValueOnce(new Error('boom'));
    pick(input, new File(['x'], 'broken.png', { type: 'image/png' }));
    await vi.waitFor(() => expect(document.querySelector('.kakko-status')?.textContent).toBe('画像を読み取れませんでした。'));
  });
});
