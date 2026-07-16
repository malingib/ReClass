import svelte from 'eslint-plugin-svelte';
import ts from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';

export default [
  {
    ignores: ['**/.svelte-kit/**', '**/node_modules/**', '**/build/**'],
  },
  {
    files: ['**/*.svelte'],
    languageOptions: {
      parser: svelte,
      parserOptions: {
        parser: tsParser,
      },
    },
    plugins: {
      svelte,
    },
    rules: {
      'no-unused-vars': 'warn',
      'prefer-const': 'warn',
    },
  },
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tsParser,
    },
    plugins: {
      '@typescript-eslint': ts,
    },
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      'prefer-const': 'warn',
    },
  },
];
