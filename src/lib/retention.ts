/**
 * Retention promises ("削除期限").
 *
 * A recipient can declare, in a request link, how long it will keep the
 * copy; the user can also set the deadline themselves as a condition of
 * submission. The deadline is stamped into the watermark and recorded on
 * the user's receipt, so a copy that outlives its promise carries the
 * evidence on its face.
 *
 * Pure helpers. Days are integers; 0 means "delete right after checking".
 */

export const MAX_RETAIN_DAYS = 3650;

/** Choices offered in the form and the link builder. */
export const RETENTION_OPTIONS: readonly number[] = [0, 7, 30, 90, 365];

export function isRetainDays(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= MAX_RETAIN_DAYS;
}

/** Strict parse of a link parameter; anything but a small non-negative integer is dropped. */
export function parseRetainDays(raw: string | null): number | null {
  if (raw === null || !/^\d{1,4}$/.test(raw)) return null;
  const n = Number(raw);
  return isRetainDays(n) ? n : null;
}

const pad = (n: number): string => String(n).padStart(2, '0');

/** The date `days` after `dateIso` (local calendar), or null when `dateIso` is not YYYY-MM-DD. */
export function deleteByIso(dateIso: string, days: number): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateIso);
  if (!m || !isRetainDays(days)) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]) + days);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Short relative label: "確認後すぐ削除", "7日以内に削除", "1年以内に削除". */
export function retentionLabel(days: number): string {
  if (days === 0) return '確認後すぐ削除';
  if (days % 365 === 0) return `${days / 365}年以内に削除`;
  return `${days}日以内に削除`;
}

/**
 * Watermark phrase. Absolute when the submission date is known
 * ("2026-10-22までに削除") so the deadline can be read without arithmetic;
 * relative otherwise.
 */
export function retentionWatermark(days: number, dateIso: string): string {
  if (days === 0) return '確認後に削除';
  const by = deleteByIso(dateIso, days);
  return by ? `${by}までに削除` : retentionLabel(days);
}
