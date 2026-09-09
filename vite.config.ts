import { defineConfig } from 'vitest/config';
import type { Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { PRODUCTION_CSP_META, DEVELOPMENT_CSP } from './scripts/csp.ts';

/**
 * Content Security Policy handling.
 *
 * - Production (`vite build`): a strict CSP `<meta>` tag is injected into
 *   index.html as defence in depth (it protects the page even if someone
 *   hosts dist/ on a server that ignores `_headers`). The primary CSP is
 *   delivered as an HTTP header from `public/_headers`.
 * - Development (`vite dev`): Vite's HMR client needs a WebSocket connection
 *   and the React plugin injects an inline preamble, so a relaxed policy is
 *   sent as a response header instead. The relaxed policy is never shipped.
 */
function csp(): Plugin {
  return {
    name: 'kakko-csp',
    transformIndexHtml: {
      order: 'pre',
      handler(html, ctx) {
        if (ctx.server) return html; // dev: header only, see configureServer
        return {
          html,
          tags: [
            {
              tag: 'meta',
              injectTo: 'head-prepend',
              attrs: { 'http-equiv': 'Content-Security-Policy', content: PRODUCTION_CSP_META },
            },
          ],
        };
      },
    },
    configureServer(server) {
      server.middlewares.use((_req, res, next) => {
        res.setHeader('Content-Security-Policy', DEVELOPMENT_CSP);
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Referrer-Policy', 'no-referrer');
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), csp()],
  build: {
    target: 'es2022',
    sourcemap: false,
    // Everything is inlined by Vite only below this size; we keep it small so
    // the sample image is always served as a separate file (img-src 'self').
    assetsInlineLimit: 0,
  },
  server: {
    // Bind to localhost only. Do not expose the dev server to the LAN by default.
    host: '127.0.0.1',
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    css: false,
  },
});
