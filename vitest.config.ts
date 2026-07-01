import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // The default forks pool crashes at teardown on Node 24
    // (ERR_IPC_CHANNEL_CLOSED) before printing the run summary.
    pool: 'threads',
    setupFiles: ['./vitest.setup.ts'],
    include: [
      '**/__tests__/**/*.{test,spec}.{ts,tsx}',
      '**/*.{test,spec}.{ts,tsx}'
    ],
    exclude: [
      'tests/e2e/**',
      'node_modules/**'
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'json-summary'],
      reportsDirectory: './coverage',
      // Coverage targets the modules we actually unit-test (lib + app/api
      // handlers). React components and page files are covered by
      // Playwright end-to-end tests instead.
      include: ['lib/**/*.{ts,tsx}', 'app/api/**/*.ts'],
      exclude: [
        'node_modules/',
        '.next/',
        'coverage/',
        '**/*.d.ts',
        '**/__tests__/**',
        '**/*.{test,spec}.{ts,tsx}',
        'lib/**/types.ts',
        'remotion/**',
        'scripts/**',
        'tests/e2e/**',
        'load-tests/**'
      ]
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
      'server-only': path.resolve(__dirname, 'test/mocks/server-only.ts'),
    }
  }
})

