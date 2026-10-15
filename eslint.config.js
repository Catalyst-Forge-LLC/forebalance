import eslint from '@eslint/js';
import prettier from 'eslint-config-prettier';
import svelte from 'eslint-plugin-svelte';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/** @type {import('eslint').Linter.Config[]} */
export default tseslint.config(
  { ignores: ['build/**', '.svelte-kit/**', 'node_modules/**', 'static/**', 'playwright-report/**', 'test-results/**'] },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  ...svelte.configs['flat/recommended'],
  prettier,
  {
    rules: {
      // Navigation uses document anchors and external URLs on a root-hosted static site.
      'svelte/no-navigation-without-resolve': 'off',
    },
  },
  ...svelte.configs['flat/prettier'],
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },
  {
    files: ['**/*.svelte', '**/*.svelte.ts'],
    // ESLint cannot see reads scheduled by Svelte's legacy reactive statements.
    rules: { 'no-useless-assignment': 'off' },
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
      },
    },
  },
  {
    ignores: ['build/', '.svelte-kit/', 'node_modules/'],
  },
);
