import type { PurposeId } from './types';
import { purposeRules } from '../rules/purposeRules';
import { isFieldId, type FieldId } from '../rules/fields';
import { sanitizeText } from './watermark';

/**
 * Request links.
 *
 * A recipient (guest house, agency, buyer) can hand the user a link such as
 *
  *   <kakko origin>/#purpose=lodging&to=Sakura%20Guest%20House&keep=photo,name
 *
 * and KAKKO opens pre-filled. Everything lives in the URL *fragment* on
 * purpose: fragments are never sent to the server, so recipient names do
 * not appear in any request log. Parsing is strict; unknown values are
 * dropped rather than trusted.
 */
export interface RequestLink {
  purpose?: PurposeId;
  customPurpose?: string;
  recipient?: string;
  /** Fields the recipient says they need to see. Advisory only. */
  keep: FieldId[];
  view?: 'business' | 'delete';
}

export const EMPTY_LINK: RequestLink = { keep: [] };

const purposeIds = new Set<string>(purposeRules.map((p) => p.id));

export function parseRequestLink(hash: string): RequestLink {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash;
  if (!raw) return EMPTY_LINK;
  let params: URLSearchParams;
  try {
    params = new URLSearchParams(raw);
  } catch {
    return EMPTY_LINK;
  }

  const link: RequestLink = { keep: [] };

  const purpose = params.get('purpose');
  if (purpose && purposeIds.has(purpose)) link.purpose = purpose as PurposeId;

  const custom = sanitizeText(params.get('custom') ?? '', 40);
  if (custom) link.customPurpose = custom;

  const recipient = sanitizeText(params.get('to') ?? '', 60);
  if (recipient) link.recipient = recipient;

  const keep = (params.get('keep') ?? '')
    .split(',')
    .map((v) => v.trim())
    .filter(isFieldId);
  link.keep = [...new Set(keep)];

  const view = params.get('view');
  if (view === 'business' || view === 'delete') link.view = view;

  return link;
}

/** True when the link carries a request from a recipient (not just a view). */
export function isRequestLink(link: RequestLink): boolean {
  return link.purpose !== undefined || link.recipient !== undefined || link.keep.length > 0;
}

export interface RequestLinkInput {
  purpose: PurposeId;
  customPurpose?: string;
  recipient: string;
  keep: readonly FieldId[];
}

/** Build the fragment part (including '#'). */
export function buildRequestFragment(input: RequestLinkInput): string {
  const params = new URLSearchParams();
  params.set('purpose', input.purpose);
  const recipient = sanitizeText(input.recipient, 60);
  if (recipient) params.set('to', recipient);
  const custom = sanitizeText(input.customPurpose ?? '', 40);
  if (input.purpose === 'other' && custom) params.set('custom', custom);
  if (input.keep.length > 0) params.set('keep', [...new Set(input.keep)].join(','));
  return `#${params.toString()}`;
}

export function buildRequestLink(origin: string, input: RequestLinkInput): string {
  return `${origin.replace(/\/$/, '')}/${buildRequestFragment(input)}`;
}
