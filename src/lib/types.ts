/**
 * Core domain types for KAKKO.
 *
 * Everything here is plain data. No type references a network resource,
 * a storage API, or anything outside the browser's memory.
 */

/**
 * A rectangle expressed as fractions (0..1) of the source image's width and
 * height. Storing masks in normalized coordinates keeps them independent of
 * the on-screen zoom level and allows exporting at the image's full
 * resolution.
 */
export interface NormalizedRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Mask extends NormalizedRect {
  id: string;
  /** How the mask was created (for accessible descriptions). */
  source: 'pointer' | 'keyboard';
}

export type PurposeId = 'lodging' | 'job' | 'rental' | 'resale' | 'other';

export interface SubmissionDetails {
  purpose: PurposeId;
  /** Free-text purpose, used when purpose === 'other'. */
  customPurpose: string;
  recipient: string;
  /** ISO date (YYYY-MM-DD). */
  date: string;
}

export type ExportFormat = 'image/png' | 'image/jpeg';

export interface LoadedImage {
  /** Decoded bitmap source; drawing it onto a fresh canvas drops all metadata. */
  source: CanvasImageSource;
  width: number;
  height: number;
  fileName: string;
}
