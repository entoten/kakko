import type { PurposeId } from '../lib/types';
import { purposeRules } from '../rules/purposeRules';
import { sanitizeText } from '../lib/watermark';
import { deleteByIso, isRetainDays, parseRetainDays } from '../lib/retention';

/**
 * The machine-readable payload stamped into every safe copy as a QR code.
 *
 * It is a KAKKO link: `<origin>/#v=1&to=…&p=…&d=…&r=…&n=…`. Scanning it
 * with a phone opens KAKKO, which only *displays* the fragment (fragments
 * never reach the server). A recipient's embed script parses the same
 * fragment locally. The payload repeats what the watermark already says
 * in human-readable form, plus a random reference number that the user
 * also gets on the receipt, so the two can be matched later.
 */
export interface Payload {
  v: 1;
  to: string;
  purpose: PurposeId;
  customPurpose?: string;
  /** ISO date (YYYY-MM-DD) of the submission. */
  date: string;
  /** Days after `date` by which the copy must be deleted (0 = right away). */
  retain?: number;
  /** Reference number ("照合番号"); also printed on the receipt. */
  nonce: string;
}

export const PAYLOAD_VERSION = 1;

/** Unambiguous alphabet (no 0/O/1/I) so the number can be read aloud. */
const NONCE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const NONCE_LENGTH = 8;
const NONCE_RE = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const purposeIds = new Set<string>(purposeRules.map((p) => p.id));

/** 40 random bits from the platform CSPRNG, rendered in the nonce alphabet. */
export function newNonce(random: (bytes: Uint8Array) => Uint8Array = (b) => crypto.getRandomValues(b)): string {
  const bytes = random(new Uint8Array(NONCE_LENGTH));
  let out = '';
  for (let i = 0; i < NONCE_LENGTH; i += 1) out += NONCE_ALPHABET[(bytes[i] ?? 0) % NONCE_ALPHABET.length];
  return out;
}

export function isNonce(value: string): boolean {
  return NONCE_RE.test(value);
}

export function buildPayloadFragment(p: Payload): string {
  const params = new URLSearchParams();
  params.set('v', String(p.v));
  params.set('to', sanitizeText(p.to, 60));
  params.set('p', p.purpose);
  const custom = sanitizeText(p.customPurpose ?? '', 40);
  if (p.purpose === 'other' && custom) params.set('c', custom);
  params.set('d', p.date);
  if (isRetainDays(p.retain)) params.set('r', String(p.retain));
  params.set('n', p.nonce);
  return `#${params.toString()}`;
}

export function buildPayloadLink(origin: string, p: Payload): string {
  return `${origin.replace(/\/$/, '')}/${buildPayloadFragment(p)}`;
}

/**
 * Strict parse. Accepts a full link, a bare fragment or the fragment
 * without '#'. Anything malformed yields null rather than a partial object.
 */
export function parsePayload(text: string): Payload | null {
  const hashAt = text.indexOf('#');
  const raw = hashAt >= 0 ? text.slice(hashAt + 1) : text;
  if (!raw) return null;
  let params: URLSearchParams;
  try {
    params = new URLSearchParams(raw);
  } catch {
    return null;
  }
  if (params.get('v') !== String(PAYLOAD_VERSION)) return null;

  const purpose = params.get('p') ?? '';
  if (!purposeIds.has(purpose)) return null;
  const date = params.get('d') ?? '';
  if (!DATE_RE.test(date)) return null;
  const nonce = params.get('n') ?? '';
  if (!isNonce(nonce)) return null;

  const payload: Payload = {
    v: 1,
    to: sanitizeText(params.get('to') ?? '', 60),
    purpose: purpose as PurposeId,
    date,
    nonce,
  };
  const custom = sanitizeText(params.get('c') ?? '', 40);
  if (purpose === 'other' && custom) payload.customPurpose = custom;
  const retain = parseRetainDays(params.get('r'));
  if (retain !== null) payload.retain = retain;
  return payload;
}

/** The deletion deadline the payload commits to, or null when none was set. */
export function deleteByOf(p: Payload): string | null {
  return p.retain === undefined ? null : deleteByIso(p.date, p.retain);
}
