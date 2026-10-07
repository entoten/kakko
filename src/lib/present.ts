import type { SubmissionDetails } from './types';
import { purposeLabelFor, sanitizeText, WATERMARK_SEPARATOR } from './watermark';

/**
 * Present mode ("提示モード").
 *
 * Instead of producing a file, the masked document is shown on the user's
 * own screen with a watermark that changes every second. A screenshot taken
 * by the viewer therefore carries the recipient's name and the exact
 * second it was taken. Nothing is encoded, saved or sent.
 */

export const PRESENT_LABEL = '提示専用';

/** Auto-close after this long so a phone left on a counter does not keep showing the card. */
export const PRESENT_TIMEOUT_MS = 10 * 60 * 1000;

const pad = (n: number): string => String(n).padStart(2, '0');

/** "2026-10-07 14:03:21" in local time. */
export function formatClock(now: Date): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(
    now.getMinutes(),
  )}:${pad(now.getSeconds())}`;
}

/** "14:03:21" for the on-screen clock. */
export function formatTime(now: Date): string {
  return `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}

/**
 * Watermark text for present mode. Unlike the export watermark it carries a
 * live timestamp with seconds and the "提示専用" label, e.g.
 * "Sakura Guest House / 宿泊本人確認専用 / 2026-10-07 14:03:21 / 提示専用".
 */
export function buildPresentWatermark(
  details: Pick<SubmissionDetails, 'purpose' | 'customPurpose' | 'recipient'>,
  now: Date,
): string {
  const parts = [sanitizeText(details.recipient), purposeLabelFor(details), formatClock(now), PRESENT_LABEL];
  return parts.filter((p) => p.length > 0).join(WATERMARK_SEPARATOR);
}

/** Remaining time as "m:ss". */
export function formatRemaining(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(total / 60)}:${pad(total % 60)}`;
}
