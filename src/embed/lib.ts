import type { PurposeId } from '../lib/types';
import { buildRequestLink } from '../lib/link';
import { isFieldId, type FieldId } from '../rules/fields';
import { purposeRules } from '../rules/purposeRules';
import { parseRetainDays, retentionLabel } from '../lib/retention';
import { readPayloadFromFile } from '../verify/decode';
import { compare, type VerifyResult } from '../verify/verify';

/**
 * kakko.js: the one line a recipient adds to an existing upload form.
 *
 *   <script src="<KAKKO origin>/kakko.js" data-to="Sakura Guest House"
 *           data-purpose="lodging" data-keep="photo,name" data-retain="7"
 *           data-contact="privacy@example.jp" defer></script>
 *
 * For every file input on the page (or those marked `data-kakko`), it
 *   1. adds a "KAKKO で安全なコピーを作る" request link built from the
 *      attributes above,
 *   2. when a file is chosen, reads the QR payload *in this browser* and
 *      checks it against the attributes,
 *   3. writes the outcome into hidden inputs of the same form
 *      (`kakko_status`, `kakko_to`, `kakko_purpose`, `kakko_date`,
 *      `kakko_retain`, `kakko_delete_by`, `kakko_nonce`) so an unchanged
 *      backend receives the deletion deadline, and
 *   4. dispatches a bubbling `kakko:verify` CustomEvent with the result.
 *
 * It never contacts KAKKO. Nothing is uploaded anywhere by this script.
 */

export interface EmbedConfig {
  origin: string;
  to: string | undefined;
  purpose: PurposeId | undefined;
  keep: FieldId[];
  retain: number | null;
  contact: string | undefined;
  /** Block form submission unless the file verifies as addressed to us. */
  require: boolean;
  /** Prefix for the hidden input names. */
  prefix: string;
  /** CSS selector for the inputs to enhance. */
  selector: string | undefined;
  /** Whether to insert the request link under each input. */
  link: boolean;
  lang: 'ja' | 'en';
}

const purposeIds = new Set<string>(purposeRules.map((p) => p.id));

export function readConfig(script: HTMLScriptElement): EmbedConfig {
  const d = script.dataset;
  let origin: string;
  try {
    origin = new URL(script.src, document.baseURI).origin;
  } catch {
    origin = '';
  }
  const purpose = d['purpose'] && purposeIds.has(d['purpose']) ? (d['purpose'] as PurposeId) : undefined;
  return {
    origin,
    to: d['to']?.trim() || undefined,
    purpose,
    keep: (d['keep'] ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(isFieldId),
    retain: parseRetainDays(d['retain'] ?? null),
    contact: d['contact']?.trim() || undefined,
    require: d['require'] === 'true' || d['require'] === '',
    prefix: d['prefix'] ?? 'kakko_',
    selector: d['input'] || undefined,
    link: d['link'] !== 'false',
    lang: d['lang'] === 'en' ? 'en' : 'ja',
  };
}

const T = {
  ja: {
    link: 'KAKKO で安全なコピーを作る',
    checking: '確認中…',
    error: '画像を読み取れませんでした。',
  },
  en: {
    link: 'Make a safe copy with KAKKO',
    checking: 'Checking…',
    error: 'Could not read the image.',
  },
} as const;

export function requestLinkFor(cfg: EmbedConfig): string | null {
  if (!cfg.origin || !cfg.purpose) return null;
  return buildRequestLink(cfg.origin, {
    purpose: cfg.purpose,
    recipient: cfg.to ?? '',
    keep: cfg.keep,
    retain: cfg.retain,
    contact: cfg.contact ?? '',
  });
}

type HiddenField = 'status' | 'to' | 'purpose' | 'date' | 'retain' | 'delete_by' | 'nonce';

function hiddenValues(result: VerifyResult | null): Record<HiddenField, string> {
  const p = result?.payload;
  return {
    status: result?.status ?? '',
    to: p?.to ?? '',
    purpose: p?.purpose ?? '',
    date: p?.date ?? '',
    retain: p?.retain === undefined ? '' : String(p.retain),
    delete_by: result?.deleteBy ?? '',
    nonce: p?.nonce ?? '',
  };
}

function setHidden(form: HTMLFormElement, prefix: string, values: Record<string, string>): void {
  for (const [key, value] of Object.entries(values)) {
    const name = `${prefix}${key}`;
    let el = form.querySelector<HTMLInputElement>(`input[type="hidden"][name="${name}"]`);
    if (!el) {
      el = form.ownerDocument.createElement('input');
      el.type = 'hidden';
      el.name = name;
      form.appendChild(el);
    }
    el.value = value;
  }
}

function ensureStyle(doc: Document): void {
  if (doc.getElementById('kakko-style')) return;
  const style = doc.createElement('style');
  style.id = 'kakko-style';
  style.textContent = [
    '.kakko-ui{display:block;margin-top:.5em;font:14px/1.5 system-ui,sans-serif}',
    '.kakko-link{display:inline-block;margin-right:1em;text-decoration:underline;color:inherit}',
    '.kakko-status{display:block;margin-top:.25em}',
    '.kakko-status[data-status="ok"]{color:#1a7f37}',
    '.kakko-status[data-status="mismatch"]{color:#b35900}',
    '.kakko-status[data-status="none"]{color:#666}',
  ].join('');
  doc.head.appendChild(style);
}

export function enhance(input: HTMLInputElement, cfg: EmbedConfig): void {
  const doc = input.ownerDocument;
  if (input.dataset['kakkoReady']) return;
  input.dataset['kakkoReady'] = '1';
  ensureStyle(doc);

  const ui = doc.createElement('span');
  ui.className = 'kakko-ui';
  const link = requestLinkFor(cfg);
  if (cfg.link && link) {
    const a = doc.createElement('a');
    a.className = 'kakko-link';
    a.href = link;
    a.target = '_blank';
    a.rel = 'noopener';
    const extra = cfg.retain === null ? '' : `（${retentionLabel(cfg.retain)}）`;
    a.textContent = `${T[cfg.lang].link}${extra}`;
    ui.appendChild(a);
  }
  const status = doc.createElement('span');
  status.className = 'kakko-status';
  status.setAttribute('role', 'status');
  ui.appendChild(status);
  input.insertAdjacentElement('afterend', ui);

  const apply = (result: VerifyResult | null, text: string) => {
    status.textContent = text;
    if (result) status.dataset['status'] = result.status;
    else delete status.dataset['status'];
    if (input.form) setHidden(input.form, cfg.prefix, hiddenValues(result));
    input.setCustomValidity(cfg.require && result && result.status !== 'ok' ? result.summary : '');
    if (result) input.dispatchEvent(new CustomEvent('kakko:verify', { bubbles: true, detail: result }));
  };

  let seq = 0;
  input.addEventListener('change', () => {
    const file = input.files?.[0];
    seq += 1;
    const mine = seq;
    if (!file) {
      apply(null, '');
      return;
    }
    status.textContent = T[cfg.lang].checking;
    void verify(file, cfg)
      .then((result) => {
        if (mine === seq) apply(result, result.summary);
      })
      .catch(() => {
        if (mine === seq) apply(compare(null), T[cfg.lang].error);
      });
  });
}

export async function verify(file: Blob, cfg: Pick<EmbedConfig, 'to' | 'purpose'>): Promise<VerifyResult> {
  const payload = await readPayloadFromFile(file);
  return compare(payload, { to: cfg.to, purpose: cfg.purpose });
}

export function install(root: ParentNode, cfg: EmbedConfig): number {
  const selector = cfg.selector ?? (root.querySelector('input[type="file"][data-kakko]') ? 'input[type="file"][data-kakko]' : 'input[type="file"]');
  const inputs = Array.from(root.querySelectorAll<HTMLInputElement>(selector));
  for (const input of inputs) enhance(input, cfg);
  return inputs.length;
}
