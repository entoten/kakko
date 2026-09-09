/**
 * Privacy-invariant tests.
 *
 * KAKKO's whole value is "the service that protects your ID never collects
 * it". These tests fail the build if anyone adds network transmission,
 * persistent storage, or a server-side entry point.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PRODUCTION_CSP } from '../../scripts/csp';
import { exportSafeCopy } from './export';
import { maskReducer, initialMaskState } from './masks';
import { buildWatermarkText } from './watermark';
import type { LoadedImage } from './types';

const ROOT = join(__dirname, '..', '..');

function listSourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return listSourceFiles(full);
    if (!/\.(ts|tsx|css)$/.test(name) || /\.test\.tsx?$/.test(name) || full.includes(`${join('src', 'test')}`)) {
      return [];
    }
    return [full];
  });
}

describe('no network transmission (static analysis)', () => {
  const files = listSourceFiles(join(ROOT, 'src'));

  it('application source never references network or persistence APIs', () => {
    const forbidden = [
      /\bfetch\s*\(/,
      /\bXMLHttpRequest\b/,
      /\bWebSocket\b/,
      /\bEventSource\b/,
      /\bsendBeacon\b/,
      /\bnavigator\.serviceWorker\b/,
      /\blocalStorage\b/,
      /\bsessionStorage\b/,
      /\bindexedDB\b/,
      /\bdocument\.cookie\b/,
      /\beval\s*\(/,
      /new\s+Function\s*\(/,
      /https?:\/\/(?!github\.com\/)/, // the only outbound link is the repository
    ];
    const offenders: string[] = [];
    for (const file of files) {
      const text = readFileSync(file, 'utf8');
      for (const re of forbidden) {
        if (re.test(text)) offenders.push(`${file.replace(ROOT, '')}: ${re}`);
      }
    }
    expect(files.length).toBeGreaterThan(5);
    expect(offenders).toEqual([]);
  });

  it('index.html loads nothing from a third party', () => {
    const html = readFileSync(join(ROOT, 'index.html'), 'utf8');
    expect(html).not.toMatch(/https?:\/\//);
  });

  it('the production CSP forbids all outbound connections', () => {
    expect(PRODUCTION_CSP).toContain("connect-src 'none'");
    expect(PRODUCTION_CSP).toContain("form-action 'none'");
    expect(PRODUCTION_CSP).toContain("default-src 'none'");
    expect(PRODUCTION_CSP).toContain("script-src 'self'");
    expect(PRODUCTION_CSP).not.toContain('unsafe-inline');
    expect(PRODUCTION_CSP).not.toContain('unsafe-eval');
  });

  it('public/_headers ships the same CSP as scripts/csp.ts', () => {
    const headers = readFileSync(join(ROOT, 'public', '_headers'), 'utf8');
    const line = headers
      .split('\n')
      .map((l) => l.trim())
      .find((l) => l.startsWith('Content-Security-Policy:'));
    expect(line).toBeDefined();
    expect(line?.replace('Content-Security-Policy:', '').trim()).toBe(PRODUCTION_CSP);
  });

  it('wrangler.jsonc has no Worker script, so no server code can receive an image', () => {
    const raw = readFileSync(join(ROOT, 'wrangler.jsonc'), 'utf8');
    const withoutComments = raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    const config = JSON.parse(withoutComments) as Record<string, unknown>;
    expect(config.main).toBeUndefined();
    expect(config.assets).toBeDefined();
    for (const binding of ['r2_buckets', 'd1_databases', 'kv_namespaces', 'ai', 'durable_objects', 'queues']) {
      expect(config[binding]).toBeUndefined();
    }
  });
});

describe('no network transmission (runtime)', () => {
  const spies: Array<ReturnType<typeof vi.fn>> = [];

  beforeEach(() => {
    const trap = (name: string) =>
      vi.fn(() => {
        throw new Error(`${name} must never be called by KAKKO`);
      });
    const fetchSpy = trap('fetch');
    const xhrSpy = trap('XMLHttpRequest');
    const wsSpy = trap('WebSocket');
    const beaconSpy = trap('navigator.sendBeacon');
    vi.stubGlobal('fetch', fetchSpy);
    vi.stubGlobal('XMLHttpRequest', xhrSpy);
    vi.stubGlobal('WebSocket', wsSpy);
    Object.defineProperty(navigator, 'sendBeacon', { configurable: true, value: beaconSpy });
    spies.push(fetchSpy, xhrSpy, wsSpy, beaconSpy);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    spies.length = 0;
  });

  it('the whole mask → watermark → export pipeline completes without touching the network', async () => {
    const image: LoadedImage = { source: {} as CanvasImageSource, width: 1200, height: 760, fileName: 'id.png' };
    let state = maskReducer(initialMaskState, { type: 'add', rect: { x: 0.3, y: 0.4, w: 0.5, h: 0.1 }, source: 'pointer' });
    state = maskReducer(state, { type: 'add', rect: { x: 0.3, y: 0.55, w: 0.5, h: 0.1 }, source: 'pointer' });
    state = maskReducer(state, { type: 'undo' });
    const watermark = buildWatermarkText({
      purpose: 'lodging',
      customPurpose: '',
      recipient: 'Sakura Guest House',
      date: '2026-09-09',
    });

    const result = await exportSafeCopy({ image, masks: state.masks, watermark, format: 'image/png' });

    expect(result.blob.size).toBeGreaterThan(0);
    for (const spy of spies) expect(spy).not.toHaveBeenCalled();
  });
});
