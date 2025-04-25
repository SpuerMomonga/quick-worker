import js from '@eslint/js';
import tsEslint from 'typescript-eslint';
import configPrettier from 'eslint-config-prettier';
import pluginPrettier from 'eslint-plugin-prettier';

export default tsEslint.config(
  { ignores: ['**/node_modules', '**/build', '**/dist', '**/pnpm-lock.yaml', '.vscode'] },
  {
    extends: [js.configs.recommended, ...tsEslint.configs.recommended, configPrettier],
    files: ['**/*.d.ts', '**/*.ts', '**/*.js', '**/*.cjs', '**/*.mjs'],
    languageOptions: {
      ecmaVersion: 2020,
    },
    plugins: {
      prettier: pluginPrettier,
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      semi: ['error', 'always'],
    },
  },
);
