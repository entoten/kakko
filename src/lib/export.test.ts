import { describe, expect, it } from 'vitest';
import { buildFileName, exportSafeCopy } from './export';
import type { LoadedImage } from './types';

const image: LoadedImage = { source: {} as CanvasImageSource, width: 4000, height: 3000, fileName: 'x.jpg' };

describe('exportSafeCopy', () => {
  it('produces a PNG blob from a fresh canvas, scaled inside the export limit', async () => {
    let created: HTMLCanvasElement | null = null;
    const result = await exportSafeCopy(
      { image, masks: [], watermark: 'A / B / 2026-09-09', format: 'image/png' },
      () => {
        created = document.createElement('canvas');
        return created;
      },
    );
    expect(result.blob).toBeInstanceOf(Blob);
    expect(result.blob.type).toBe('image/png');
    expect(result.blob.size).toBeGreaterThan(0);
    // 4000x3000 is scaled to fit 3000 on the longest side.
    expect(result).toMatchObject({ width: 3000, height: 2250 });
    expect(result.fileName).toMatch(/^kakko-.*\.png$/);
    // A brand-new canvas was used (never the on-screen one) and released afterwards.
    expect(created).not.toBeNull();
    expect((created as unknown as HTMLCanvasElement).width).toBe(0);
  });

  it('produces JPEG when asked', async () => {
    const result = await exportSafeCopy({ image, masks: [], watermark: '', format: 'image/jpeg' });
    expect(result.blob.type).toBe('image/jpeg');
    expect(result.fileName).toBe('kakko-safe-copy.jpg');
  });
});

describe('buildFileName', () => {
  it('turns the watermark into a safe file name', () => {
    expect(buildFileName('Sakura Guest House / 宿泊本人確認専用 / 2026-09-09', 'image/png')).toBe(
      'kakko-Sakura_Guest_House-宿泊本人確認専用-2026-09-09.png',
    );
    expect(buildFileName('a:b*c?"<>|\\', 'image/jpeg')).toBe('kakko-a-b-c------.jpg');
  });
});
