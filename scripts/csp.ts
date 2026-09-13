/**
 * Single source of truth for the Content Security Policy.
 *
 * Design goal: the deployed app must not be able to talk to any network
 * endpoint at all. ID document images live only in the browser's memory.
 *
 *   connect-src 'none'  -> no fetch / XHR / WebSocket / sendBeacon
 *   form-action 'none'  -> no form submissions
 *   default-src 'none'  -> everything else is denied unless listed below
 *   img-src blob:       -> needed to decode the user's file via an object URL
 *   img-src 'self'      -> the fictional sample image and the favicon
 *
 * `public/_headers` must be kept in sync with PRODUCTION_CSP. A unit test
 * (src/lib/security.test.ts) verifies that they match.
 */
export const PRODUCTION_CSP_DIRECTIVES: Record<string, string> = {
  'default-src': "'none'",
  'script-src': "'self'",
  'style-src': "'self'",
  'img-src': "'self' blob:",
  'font-src': "'self'",
  'connect-src': "'none'",
  'media-src': "'none'",
  'object-src': "'none'",
  'worker-src': "'none'",
  'child-src': "'none'",
  'frame-src': "'none'",
  'manifest-src': "'self'",
  'form-action': "'none'",
  'base-uri': "'none'",
  'frame-ancestors': "'none'",
  'upgrade-insecure-requests': '',
};

export function serializeCsp(directives: Record<string, string>): string {
  return Object.entries(directives)
    .map(([k, v]) => (v ? `${k} ${v}` : k))
    .join('; ');
}

export const PRODUCTION_CSP = serializeCsp(PRODUCTION_CSP_DIRECTIVES);

/**
 * Same policy for the `<meta http-equiv>` fallback in index.html.
 * `frame-ancestors` is not honoured in meta tags (browsers warn about it),
 * so it is delivered by the HTTP header only.
 */
const { 'frame-ancestors': _frameAncestors, ...metaDirectives } = PRODUCTION_CSP_DIRECTIVES;
void _frameAncestors;
export const PRODUCTION_CSP_META = serializeCsp(metaDirectives);

/** Only for `vite dev`. Allows the HMR WebSocket and Vite's inline preamble. */
const { 'upgrade-insecure-requests': _upgrade, ...devBase } = metaDirectives;
void _upgrade;

export const DEVELOPMENT_CSP = serializeCsp({
  ...devBase,
  'script-src': "'self' 'unsafe-inline'",
  'style-src': "'self' 'unsafe-inline'",
  'connect-src': "'self' ws://127.0.0.1:* ws://localhost:* http://127.0.0.1:* http://localhost:*",
  'worker-src': "'self' blob:",
});
