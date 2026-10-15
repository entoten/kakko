import type { RequestLink } from './link';
import { isRequestLink } from './link';
import type { SubmissionDetails } from './types';
import { purposeLabelFor, sanitizeText } from './watermark';
import { formatClock } from './present';
import { deleteByIso, retentionLabel } from './retention';
import { getField } from '../rules/fields';

/**
 * Receipt ("確認レシート").
 *
 * A plain-text record of what was handed over, to whom, under which
 * conditions, and what the recipient declared in its request link. It is
 * the user's own copy: built on the device, never sent, never stored by
 * KAKKO. Paired with the deletion-request generator it lets the user say
 * "you promised" later.
 */

export type ReceiptDelivery = { kind: 'file'; fileName: string; width: number; height: number } | { kind: 'present' };

export interface ReceiptInput {
  details: SubmissionDetails;
  link: RequestLink;
  maskCount: number;
  watermark: string;
  delivery: ReceiptDelivery;
  createdAt: Date;
  /** Reference number stamped into the QR code of the copy. */
  nonce?: string | undefined;
}

export const RECEIPT_FILE_NAME = 'kakko-receipt.txt';

export function buildReceipt(input: ReceiptInput): string {
  const { details, link } = input;
  const recipient = sanitizeText(details.recipient) || '（提出先未入力）';
  const date = sanitizeText(details.date, 10) || '（日付未入力）';

  const delivery =
    input.delivery.kind === 'file'
      ? `画像ファイル ${input.delivery.fileName}（${input.delivery.width}×${input.delivery.height}）`
      : '画面提示のみ（ファイルは作成していません）';

  let deadline = '指定なし';
  if (details.retainDays !== null) {
    const by = deleteByIso(details.date, details.retainDays);
    deadline =
      details.retainDays === 0 ? retentionLabel(0) : by ? `${by}（${retentionLabel(details.retainDays)}）` : retentionLabel(details.retainDays);
  }

  const lines: string[] = [
    'KAKKO 確認レシート',
    `作成: ${formatClock(input.createdAt)}`,
    '',
    `提出先: ${recipient}`,
    `用途: ${purposeLabelFor(details)}`,
    `提出日: ${date}`,
    `渡し方: ${delivery}`,
    `黒塗り: ${input.maskCount} か所`,
    `透かし: ${input.watermark || '（なし）'}`,
    ...(input.nonce ? [`照合番号: ${input.nonce}（画像の QR コードに同じ番号が入っています）`] : []),
    `削除期限（提出条件）: ${deadline}`,
    '',
  ];

  if (isRequestLink(link)) {
    const keep = link.keep.map((id) => getField(id).label);
    lines.push(
      '提出先の宣言（依頼リンクより）',
      `\u3000・見る項目: ${keep.length > 0 ? keep.join('、') : '指定なし'}`,
      `\u3000・保存期間: ${link.retain !== undefined ? retentionLabel(link.retain) : '宣言なし'}`,
      `\u3000・削除の窓口: ${link.contact ?? '記載なし'}`,
    );
  } else {
    lines.push('提出先の宣言: なし（依頼リンクを使っていません）');
  }

  lines.push(
    '',
    'このレシートは提出者の端末内で作成されました。KAKKO には何も記録されていません。',
    '期限を過ぎても消去されない場合は、個人情報保護法第35条第5項に基づいて消去を請求できます（KAKKO の「預けた画像の削除を請求する」で請求文を作れます）。',
  );

  return lines.join('\n');
}
