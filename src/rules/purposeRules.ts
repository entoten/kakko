import type { PurposeId } from '../lib/types';

/**
 * purposeRules — a data-only description of each submission purpose.
 *
 * This file is intentionally *declarative*. The UI reads it, it never
 * reads the UI. That keeps the door open for a future rule engine
 * ("for this purpose, these fields are usually not required") without
 * touching components.
 *
 * IMPORTANT: In the MVP no rule makes a legal judgement. `maskHints` are
 * left empty on purpose. When they are filled in later they must be phrased
 * as suggestions the user can ignore, never as compliance guarantees.
 */

export interface WarningNotice {
  title: string;
  body: string;
  /** Concrete red flags shown as a list. */
  redFlags?: string[];
}

/**
 * Future extension point. A hint describes a *category* of information
 * (e.g. "address", "document number") and why masking it is commonly
 * acceptable for the purpose. Coordinates are never assumed; the user
 * still draws every mask by hand.
 */
export interface MaskHint {
  field: string;
  reason: string;
}

export interface PurposeRule {
  id: PurposeId;
  /** Label shown in the selector. */
  label: string;
  /** Short phrase embedded in the watermark, e.g. "宿泊本人確認専用". */
  watermarkLabel: string;
  /** One-line description shown under the selector. */
  description: string;
  /** Shown before the user is allowed to proceed for this purpose. */
  warning?: WarningNotice;
  /** Reserved for a later rule engine. Empty in the MVP. */
  maskHints: MaskHint[];
}

export const purposeRules: readonly PurposeRule[] = [
  {
    id: 'lodging',
    label: '民泊・宿泊',
    watermarkLabel: '宿泊本人確認専用',
    description: '宿泊施設や民泊ホストへの本人確認。',
    maskHints: [],
  },
  {
    id: 'job',
    label: '求人・アルバイト',
    watermarkLabel: '採用手続き本人確認専用',
    description: '採用・アルバイト応募時の本人確認。提出前に必ず下の注意を確認してください。',
    warning: {
      title: 'この求人、本当に安全ですか？',
      body:
        '次のような特徴がある求人には、加工した身分証であっても提出しないでください。身分証の画像は、犯罪グループが「もう逃げられない」と脅すための材料に使われることがあります。',
      redFlags: [
        'SNS やダイレクトメッセージ経由でしか連絡が取れない',
        '会社名・所在地・事業内容を確認できない',
        '匿名性の高い通信アプリ（消えるメッセージなど）への誘導がある',
        '家族の名前・住所・勤務先など、本人以外の情報を求められる',
        '「高収入」「即日」「簡単」を強調し、仕事内容が曖昧',
        '面接前に身分証・口座情報・顔写真の送信を急かされる',
      ],
    },
    maskHints: [],
  },
  {
    id: 'rental',
    label: '賃貸',
    watermarkLabel: '賃貸契約本人確認専用',
    description: '不動産会社・大家への本人確認。',
    maskHints: [],
  },
  {
    id: 'resale',
    label: '中古品買取',
    watermarkLabel: '買取本人確認専用',
    description: '買取業者・フリマ事業者への本人確認。',
    maskHints: [],
  },
  {
    id: 'other',
    label: 'その他',
    watermarkLabel: '本人確認専用',
    description: '用途を自分で入力します。',
    maskHints: [],
  },
];

export function getPurposeRule(id: PurposeId): PurposeRule {
  const rule = purposeRules.find((r) => r.id === id);
  if (!rule) throw new Error(`Unknown purpose: ${id}`);
  return rule;
}

export const DEFAULT_PURPOSE: PurposeId = 'lodging';
