import type { SubmissionDetails } from './types';
import { getPurposeRule } from '../rules/purposeRules';

export const WATERMARK_SEPARATOR = ' / ';

/** Collapse whitespace and strip control characters from user text. */
export function sanitizeText(input: string, maxLength = 60): string {
  return input
    .replace(/\p{Cc}/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

/** The purpose phrase for the watermark, honouring the free-text "other" case. */
export function purposeLabelFor(details: Pick<SubmissionDetails, 'purpose' | 'customPurpose'>): string {
  const rule = getPurposeRule(details.purpose);
  if (details.purpose === 'other') {
    const custom = sanitizeText(details.customPurpose);
    return custom ? `${custom}専用` : rule.watermarkLabel;
  }
  return rule.watermarkLabel;
}

/**
 * Build the watermark string, e.g.
 * "Sakura Guest House / 宿泊本人確認専用 / 2026-09-09".
 * Empty parts are omitted so the output never contains " /  / ".
 */
export function buildWatermarkText(details: SubmissionDetails): string {
  const parts = [sanitizeText(details.recipient), purposeLabelFor(details), sanitizeText(details.date, 10)];
  return parts.filter((p) => p.length > 0).join(WATERMARK_SEPARATOR);
}

/** Today's date as YYYY-MM-DD in the user's local time zone. */
export function todayIso(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
