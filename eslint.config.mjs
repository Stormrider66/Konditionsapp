// ESLint flat config for Next 16 + eslint-config-next 16.
// FlatCompat was tried first but the circular structure in the Next
// preset blows up in ESLint 9; loading the flat export directly works.

import nextConfig from 'eslint-config-next'
import tseslint from 'typescript-eslint'

export default [
  // `eslint-config-next` already ignores node_modules, .next, build, out,
  // and next-env.d.ts. Add project-specific ignores here.
  {
    ignores: [
      '.next/**',
      '.agents/**',
      '.storybook/**',
      'coverage/**',
      'public/**',
      'remotion/**',
      'storybook-static/**',
      'scripts/archive/**',
      'prisma/**',
    ],
  },

  // Base rules from Next.js (core-web-vitals + typescript).
  ...nextConfig,

  // Project-wide rule tuning. Re-registers the @typescript-eslint plugin
  // so this block can own rules from it (each flat-config block needs
  // its plugins declared; the Next preset's registration is scoped to
  // its own block). `projectService: true` turns on type-aware linting
  // which `no-floating-promises` requires.
  {
    files: ['**/*.{ts,tsx}'],
    plugins: { '@typescript-eslint': tseslint.plugin },
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/ban-ts-comment': 'warn',
      '@typescript-eslint/no-empty-object-type': 'warn',
      '@typescript-eslint/no-require-imports': 'warn',
      '@typescript-eslint/no-unsafe-function-type': 'warn',
      '@typescript-eslint/no-wrapper-object-types': 'warn',
      '@typescript-eslint/no-this-alias': 'warn',
      '@typescript-eslint/triple-slash-reference': 'warn',
      // Catches forgotten `await` on async calls — a common source of
      // silent bugs (missed DB writes, uncaught rejections, races).
      '@typescript-eslint/no-floating-promises': 'warn',
      'prefer-const': 'warn',

      // React Compiler-adjacent rules from eslint-plugin-react-hooks v6
      // fire heavily on codebases that aren't running React Compiler yet.
      // Keep the classic rules-of-hooks error, downgrade the new ones to
      // warnings so they're visible without blocking CI.
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/static-components': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
      // Classic exhaustive-deps is noisy on real codebases; keep it
      // visible but non-blocking, matching the old v4 preset default.
      'react-hooks/exhaustive-deps': 'warn',
    },
  },

  // Production source: disallow stray console.log (error/warn are fine).
  {
    files: ['app/**/*.{ts,tsx}', 'lib/**/*.{ts,tsx}', 'components/**/*.{ts,tsx}'],
    rules: {
      'no-console': ['error', { allow: ['error', 'warn'] }],
    },
  },

  // Scripts, tests, middleware, loggers — allow console + any.
  {
    files: [
      'scripts/**/*',
      '__tests__/**/*',
      '**/*.test.{ts,tsx}',
      '**/*.spec.{ts,tsx}',
      'proxy.ts',
      'lib/logger.ts',
      'lib/logger-console.ts',
    ],
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
    },
  },
]
