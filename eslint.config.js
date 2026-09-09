import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'node_modules', '.wrangler', 'coverage'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  reactHooks.configs.flat.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.browser },
    },
    rules: {
      // Security: never allow dynamic code evaluation in this project.
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      // Privacy: fail lint if someone tries to add network or persistent storage APIs.
      'no-restricted-globals': [
        'error',
        { name: 'fetch', message: 'KAKKO must never make network requests with user data.' },
        { name: 'XMLHttpRequest', message: 'KAKKO must never make network requests with user data.' },
        { name: 'WebSocket', message: 'KAKKO must never open network connections.' },
        { name: 'EventSource', message: 'KAKKO must never open network connections.' },
        { name: 'localStorage', message: 'User data must not be persisted. Keep state in memory only.' },
        { name: 'sessionStorage', message: 'User data must not be persisted. Keep state in memory only.' },
        { name: 'indexedDB', message: 'User data must not be persisted. Keep state in memory only.' },
      ],
      'no-restricted-properties': [
        'error',
        { object: 'navigator', property: 'sendBeacon', message: 'No network transmission allowed.' },
        { object: 'window', property: 'fetch', message: 'No network transmission allowed.' },
        { object: 'globalThis', property: 'fetch', message: 'No network transmission allowed.' },
        { object: 'window', property: 'localStorage', message: 'No persistent storage allowed.' },
        { object: 'window', property: 'indexedDB', message: 'No persistent storage allowed.' },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']",
          message: 'dangerouslySetInnerHTML is not allowed.',
        },
      ],
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },
  {
    files: ['vite.config.ts', 'scripts/**/*.ts', 'eslint.config.js'],
    languageOptions: { globals: { ...globals.node } },
  },
  {
    files: ['src/**/*.test.{ts,tsx}', 'src/test/**/*.ts'],
    languageOptions: { globals: { ...globals.browser, ...globals.node, ...globals.vitest } },
    rules: {
      // Tests deliberately reference these globals to assert they are never called.
      'no-restricted-globals': 'off',
      'no-restricted-properties': 'off',
    },
  },
);
