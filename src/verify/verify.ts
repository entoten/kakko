import type { PurposeId } from '../lib/types';
import { getPurposeRule } from '../rules/purposeRules';
import { retentionLabel } from '../lib/retention';
import { deleteByOf, type Payload } from './payload';

/**
 * Recipient-side comparison of a decoded payload against what this
 * recipient expects. Pure; used by the embed script and the check view.
 */
export interface Expectation {
  to?: string | undefined;
  purpose?: PurposeId | undefined;
}

export type VerifyStatus = 'ok' | 'mismatch' | 'none';
export type Problem = 'recipient' | 'purpose';

export interface VerifyResult {
  status: VerifyStatus;
  payload: Payload | null;
  problems: Problem[];
  /** ISO date by which the copy must be deleted, when the payload commits to one. */
  deleteBy: string | null;
  /** Human-readable one-liner (Japanese). */
  summary: string;
}

/** Case-, width- and whitespace-insensitive comparison key for names. */
export function nameKey(value: string): string {
  return value.normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim();
}

export function purposeLabel(p: Payload): string {
  const rule = getPurposeRule(p.purpose);
  return p.purpose === 'other' && p.customPurpose ? p.customPurpose : rule.label;
}

export function compare(payload: Payload | null, expect: Expectation = {}): VerifyResult {
  if (!payload) {
    return { status: 'none', payload: null, problems: [], deleteBy: null, summary: 'KAKKO のコピーではありません（通常の画像です）。' };
  }
  const problems: Problem[] = [];
  const wantTo = expect.to ? nameKey(expect.to) : '';
  if (wantTo && nameKey(payload.to) !== wantTo) problems.push('recipient');
  if (expect.purpose && payload.purpose !== expect.purpose) problems.push('purpose');
  const deleteBy = deleteByOf(payload);

  const parts = [
    `${payload.to || '（宛先なし）'} 宛`,
    purposeLabel(payload),
    payload.date,
    payload.retain === undefined ? null : deleteBy ? `${deleteBy}までに削除` : retentionLabel(payload.retain),
    `照合番号 ${payload.nonce}`,
  ].filter((p): p is string => p !== null);

  if (problems.length === 0) {
    return { status: 'ok', payload, problems, deleteBy, summary: `KAKKO の安全なコピーです: ${parts.join(' ・ ')}` };
  }
  const why: string[] = [];
  if (problems.includes('recipient')) why.push(`宛先が「${payload.to || '（なし）'}」です（このフォームは「${expect.to}」）`);
  if (problems.includes('purpose')) why.push(`用途が「${purposeLabel(payload)}」です`);
  return { status: 'mismatch', payload, problems, deleteBy, summary: `KAKKO のコピーですが、${why.join('、')}。` };
}
