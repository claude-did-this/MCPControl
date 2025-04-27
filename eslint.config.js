import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default [
  // Ignore patterns for all configs
  {
    ignores: [
      'build/**',
      'coverage/**',
      '*.html',
      'mcpcontrol-wrapper.sh',
      'eslint.config.js',
      '.github/**',
      'scripts/**'
    ]
  },

  // Base config for all JavaScript files
  {
    files: ['**/*.js'],
    ...eslint.configs.recommended,
    rules: {
      'no-console': 'off',
    }
  },

  // TypeScript-specific configs
  ...tseslint.config(
    eslint.configs.recommended,
    ...tseslint.configs.recommended,
    ...tseslint.configs.recommendedTypeChecked,
    {
      files: ['**/*.ts'],
      languageOptions: {
        parserOptions: {
          project: true,
          tsconfigRootDir: import.meta.dirname,
        },
      },
      rules: {
        'no-console': 'off',
        '@typescript-eslint/no-explicit-any': 'warn',
        '@typescript-eslint/explicit-module-boundary-types': 'error',
        '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      }
    },
    {
      // Test files specific configuration
      files: ['**/*.test.ts', '**/*.spec.ts', '**/tests/**/*.ts'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-non-null-assertion': 'off',
        '@typescript-eslint/no-unsafe-assignment': 'off',
        '@typescript-eslint/no-unsafe-member-access': 'off',
        '@typescript-eslint/no-unsafe-call': 'off',
        '@typescript-eslint/no-unsafe-return': 'off',
        '@typescript-eslint/no-unsafe-argument': 'off',
        '@typescript-eslint/unbound-method': 'off',
      },
    }
  )
];