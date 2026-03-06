import { defineConfig, devices } from '@playwright/test'

const authProjects = process.env.E2E_ENABLE_AUTH_PROJECT
  ? [
      {
        name: 'setup',
        testMatch: /.*\.setup\.ts/,
        use: { ...devices['Desktop Chrome'] }
      },
      {
        name: 'chromium-auth',
        testMatch: /.*authenticated\.spec\.ts/,
        use: { ...devices['Desktop Chrome'] },
        dependencies: ['setup']
      }
    ]
  : []

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60 * 1000,
  expect: {
    timeout: 10 * 1000
  },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
    trace: process.env.CI ? 'on' : 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: [/.*\.setup\.ts/, /.*authenticated\.spec\.ts/]
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      testIgnore: [/.*\.setup\.ts/, /.*authenticated\.spec\.ts/]
    },
    ...authProjects
  ],
  webServer: {
    command: process.env.CI ? 'npm run build && npm run start' : 'npm run dev',
    url: 'http://127.0.0.1:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    stdout: 'pipe',
    stderr: 'pipe'
  }
})

