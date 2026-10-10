import { sanitizeText } from './watermark';

/**
 * Deletion-request letter generator.
 *
 * Builds a formal Japanese letter asking a business to erase and stop using
 * identity-document images it holds, and to disclose what it keeps, based
 * on the Act on the Protection of Personal Information (個人情報保護法):
 *
 *   - Art. 35(5): request to stop using / erase retained personal data when
 *     it is no longer needed, when a leak (Art. 26(1)) has occurred, or
 *     when the person's rights are otherwise at risk
 *   - Art. 33(1), 33(5): disclosure of retained data and third-party
 *     provision records
 *   - Art. 36: duty to explain when a request is refused
 *
 * Pure function. Nothing here touches the network or storage; the letter is
 * only ever shown, copied, printed or opened in the user's own mail client.
 * This is a template, not legal advice.
 */

export type DocumentKind = 'license' | 'mynumber' | 'passport' | 'insurance' | 'residence' | 'other';
export type DeletionReason = 'withdrawn' | 'leak' | 'purposeDone';

export interface DeletionRequestInput {
  company: string;
  /** Service or product name, optional. */
  service: string;
  /** Membership id / registered e-mail etc., optional. */
  memberId: string;
  /** Date of withdrawal or last use (free text), optional. */
  endedAt: string;
  documents: DocumentKind[];
  otherDocument: string;
  reasons: DeletionReason[];
  name: string;
  contact: string;
  /** Days the business is asked to answer within. */
  deadlineDays: number;
  /** ISO date for the letter head. */
  date: string;
}

export const documentLabels: Record<DocumentKind, string> = {
  license: '運転免許証の画像データ（表面・裏面）',
  mynumber: 'マイナンバーカードの画像データ',
  passport: '旅券（パスポート）の画像データ',
  insurance: '健康保険証の画像データ',
  residence: '在留カードの画像データ',
  other: 'その他',
};

export const reasonLabels: Record<DeletionReason, string> = {
  withdrawn: '退会・利用終了により、貴社が当該データを利用する必要がなくなったため',
  leak: '貴社において漏えい等の事態（法第26条第1項）が生じ、私の権利利益が害されるおそれがあるため',
  purposeDone: '本人確認という利用目的を既に達成しており、画像データを保有し続ける必要がないため',
};

export const DEFAULT_DEADLINE_DAYS = 14;

export function emptyDeletionRequest(date: string): DeletionRequestInput {
  return {
    company: '',
    service: '',
    memberId: '',
    endedAt: '',
    documents: ['license'],
    otherDocument: '',
    reasons: ['withdrawn', 'purposeDone'],
    name: '',
    contact: '',
    deadlineDays: DEFAULT_DEADLINE_DAYS,
    date,
  };
}

function formatJapaneseDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return sanitizeText(iso, 20);
  return `${m[1]}年${Number(m[2])}月${Number(m[3])}日`;
}

function clean(value: string, max = 80): string {
  return sanitizeText(value, max);
}

/** Build the letter as plain text. Empty optional fields are omitted. */
export function buildDeletionRequest(input: DeletionRequestInput): string {
  const company = clean(input.company, 60) || '（事業者名）';
  const service = clean(input.service, 60);
  const memberId = clean(input.memberId, 80);
  const endedAt = clean(input.endedAt, 40);
  const name = clean(input.name, 40) || '（氏名）';
  const contact = clean(input.contact, 120);
  const days = Number.isFinite(input.deadlineDays) && input.deadlineDays > 0 ? Math.round(input.deadlineDays) : DEFAULT_DEADLINE_DAYS;

  const docs = input.documents.map((d) => {
    if (d === 'other') {
      const other = clean(input.otherDocument, 60);
      return other ? `${other}の画像データ` : documentLabels.other;
    }
    return documentLabels[d];
  });
  if (docs.length === 0) docs.push('本人確認書類の画像データ');

  const reasons = input.reasons.length > 0 ? input.reasons : (['purposeDone'] as DeletionReason[]);

  const intro: string[] = [];
  intro.push(`私は、貴社${service ? `のサービス「${service}」` : ''}を利用していた者です。`);
  if (memberId) intro.push(`登録情報: ${memberId}`);
  if (endedAt) intro.push(`退会・利用終了: ${endedAt}`);

  const lines: string[] = [
    formatJapaneseDate(input.date),
    '',
    `${company} 御中`,
    '（個人情報保護担当者 様）',
    '',
    '保有個人データの消去・利用停止および開示の請求書',
    '',
    ...intro,
    '',
    '個人情報の保護に関する法律（以下「法」といいます）第35条第5項および第33条第1項に基づき、下記のとおり請求します。',
    '',
    '記',
    '',
    '1. 消去および利用停止の請求（法第35条第5項）',
    '貴社が保有する私の以下の保有個人データについて、消去および利用の停止を求めます。',
    ...docs.map((d) => `\u3000・${d}`),
    '理由:',
    ...reasons.map((r) => `\u3000・${reasonLabels[r]}`),
    '',
    '2. 開示の請求（法第33条第1項および第5項）',
    '\u3000(1) 上記データの保有の有無、保存期間、保存場所および保存方法',
    '\u3000(2) 上記データの第三者提供の有無、および第三者提供記録',
    '\u3000(3) 上記データを委託先に提供している場合、その委託先と委託内容',
    '\u3000(4) 漏えい等が生じている場合、その対象に私のデータが含まれるか否か',
    '',
    '3. 回答の方法と期限',
    `本書到達後${days}日以内に、消去を実施した旨および上記開示事項について、書面または電子メールで回答をお願いします。`,
    '請求に応じられない場合は、法第36条に基づき、その理由の説明を求めます。',
    ...(contact ? ['連絡先:', `\u3000${contact}`] : []),
    '',
    '4. 本人確認について',
    '本請求に関して本人確認が必要な場合は、運転免許証等の本人確認書類の画像の送付を伴わない方法（登録済みメールアドレスからの送信、会員IDおよび登録情報の照合等）をご指定ください。画像の再提出は、本請求の趣旨に反するため行いません。',
    '',
    '以上',
    '',
    name,
  ];

  return lines.join('\n');
}

export function buildMailto(to: string, subject: string, body: string): string {
  const addr = clean(to, 120);
  return `mailto:${encodeURIComponent(addr)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export const DELETION_REQUEST_SUBJECT = '保有個人データの消去・利用停止および開示の請求';
