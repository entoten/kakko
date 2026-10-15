import { install, readConfig, requestLinkFor, verify } from './lib';

/**
 * Entry point of kakko.js. No exports on purpose: the bundle is a plain
 * classic script that runs on load and exposes a small `window.KAKKO`
 * helper. All logic lives in ./lib.ts, which is what the tests import.
 */
const current = typeof document !== 'undefined' ? (document.currentScript as HTMLScriptElement | null) : null;
if (current) {
  const cfg = readConfig(current);
  const run = () => install(document, cfg);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run, { once: true });
  else run();
  (window as Window & { KAKKO?: unknown }).KAKKO = { config: cfg, install: (root: ParentNode = document) => install(root, cfg), verify: (file: Blob) => verify(file, cfg), requestLink: requestLinkFor(cfg) };
}
