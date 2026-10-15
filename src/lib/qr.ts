import qrcode from 'qrcode-generator';

/**
 * QR matrix generation. Thin wrapper so the rest of the code never touches
 * the library's API and tests can assert on a plain boolean grid.
 *
 * Error correction level M (~15% recovery) keeps the code readable after
 * JPEG re-encoding and the resizing that messaging apps apply.
 */
export type QrMatrix = boolean[][];

export const QR_QUIET_ZONE = 4;

export function qrMatrix(text: string): QrMatrix {
  const qr = qrcode(0, 'M');
  qr.addData(text, 'Byte');
  qr.make();
  const n = qr.getModuleCount();
  const rows: QrMatrix = [];
  for (let r = 0; r < n; r += 1) {
    const row: boolean[] = [];
    for (let c = 0; c < n; c += 1) row.push(qr.isDark(r, c));
    rows.push(row);
  }
  return rows;
}

/**
 * Rasterize a matrix into RGBA pixels (dark = black, light = white) with a
 * quiet zone. Used by tests to round-trip through the decoder without a
 * canvas; the app draws directly on its canvas instead.
 */
export function rasterize(matrix: QrMatrix, scale = 4, quiet = QR_QUIET_ZONE): { data: Uint8ClampedArray; width: number; height: number } {
  const n = matrix.length;
  const size = (n + quiet * 2) * scale;
  const data = new Uint8ClampedArray(size * size * 4).fill(255);
  for (let r = 0; r < n; r += 1) {
    for (let c = 0; c < n; c += 1) {
      if (!matrix[r]?.[c]) continue;
      for (let dy = 0; dy < scale; dy += 1) {
        for (let dx = 0; dx < scale; dx += 1) {
          const x = (quiet + c) * scale + dx;
          const y = (quiet + r) * scale + dy;
          const i = (y * size + x) * 4;
          data[i] = 0;
          data[i + 1] = 0;
          data[i + 2] = 0;
        }
      }
    }
  }
  return { data, width: size, height: size };
}
