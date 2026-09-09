/**
 * Common fields found on identity documents.
 *
 * Used by "request links": a recipient can say which fields they need to
 * see, and KAKKO shows that to the user. These are *labels for a
 * conversation*, never coordinates and never an instruction the user must
 * follow. What ends up masked is always the user's own choice.
 */
export type FieldId =
  | 'photo'
  | 'name'
  | 'birthdate'
  | 'address'
  | 'number'
  | 'expiry'
  | 'domicile'
  | 'issuer'
  | 'nationality';

export interface DocumentField {
  id: FieldId;
  label: string;
  /** Short reason a recipient might need it; shown in the link builder. */
  note: string;
}

export const documentFields: readonly DocumentField[] = [
  { id: 'photo', label: '顔写真', note: '本人との照合に使われます' },
  { id: 'name', label: '氏名', note: '予約・契約名義との一致確認' },
  { id: 'birthdate', label: '生年月日', note: '年齢確認が必要な場合のみ' },
  { id: 'address', label: '住所', note: '法令で住所確認が必要な業種（買取など）' },
  { id: 'number', label: '書類番号', note: '通常は不要。旅券は法令で必要な場合あり' },
  { id: 'expiry', label: '有効期限', note: '書類が有効かの確認' },
  { id: 'domicile', label: '本籍', note: 'ほぼすべての用途で不要' },
  { id: 'issuer', label: '交付者・発行者', note: '通常は不要' },
  { id: 'nationality', label: '国籍', note: '海外からの旅行者の宿泊など' },
];

const byId = new Map(documentFields.map((f) => [f.id, f]));

export function isFieldId(value: string): value is FieldId {
  return byId.has(value as FieldId);
}

export function getField(id: FieldId): DocumentField {
  const field = byId.get(id);
  if (!field) throw new Error(`Unknown field: ${id}`);
  return field;
}
