import { defineConfig } from 'vite';

/**
 * Builds `kakko.js`, the embeddable recipient-side script, as a single
 * classic (IIFE) file into dist/ next to the app. It shares the app's source
 * (payload parsing, verification) and, like the app, never makes a network
 * request. Run after the main build (`npm run build`).
 *
 * Not Vite's lib mode: that would add a global named after the library on
 * top of the `window.KAKKO` helper the entry defines itself.
 */
export default defineConfig({
  publicDir: false,
  build: {
    target: 'es2020',
    outDir: 'dist',
    emptyOutDir: false,
    sourcemap: false,
    rollupOptions: {
      input: 'src/embed/kakko.ts',
      output: { format: 'iife', entryFileNames: 'kakko.js', inlineDynamicImports: true },
    },
  },
});
