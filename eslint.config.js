import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',

      'no-console': ['error', { allow: ['warn', 'error'] }],

      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'react',
              importNames: ['default'],
              message: 'Do not import React default. Use the automatic JSX runtime.',
            },
          ],
          patterns: [
            {
              group: ['../../*'],
              message: 'Avoid deep relative imports. Use path aliases instead.',
            },
          ],
        },
      ],

      'max-lines': ['warn', { max: 300, skipBlankLines: true, skipComments: true }],

      'max-lines-per-function': ['warn', { max: 80, skipBlankLines: true, skipComments: true }],
    },
  },
  // Seed files are pure data — line limits don't apply
  {
    files: ['**/*.seed.ts'],
    rules: {
      'max-lines': 'off',
    },
  },
  // Node.js scripts legitimately cross directory boundaries — relax deep import rule
  {
    files: ['src/scripts/**/*.ts'],
    rules: {
      'no-restricted-imports': 'off',
    },
  },
])
