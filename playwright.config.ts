// playwright.config.ts
// Sprint Agents IA v20 · 30 avril 2026
//
// Configuration Playwright pour les tests E2E du tunnel public AMANA.
//
// Usage :
//   npx playwright test                    # tous les tests
//   npx playwright test funnel-mass        # un test spécifique
//   npx playwright test --headed --debug   # debug visuel
//   PLAYWRIGHT_BASE_URL=https://preview-xx.vercel.app npx playwright test
//
// En CI : utilise PLAYWRIGHT_BASE_URL pointant sur l'URL preview Vercel.
// En local : Playwright lance npm run dev sur localhost:3000.

import { defineConfig, devices } from '@playwright/test'

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000'
const isCI = !!process.env.CI

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false, // séquentiel pour ne pas saturer la base test
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 2 : 1,
  reporter: isCI ? [['github'], ['html']] : 'html',
  timeout: 60_000, // 60s par test (E2E peuvent être lents)

  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10_000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Mobile à activer plus tard si besoin
    // {
    //   name: 'mobile-safari',
    //   use: { ...devices['iPhone 13'] },
    // },
  ],

  webServer: isCI
    ? undefined
    : {
        command: 'npm run dev',
        url: 'http://localhost:3000',
        reuseExistingServer: true,
        timeout: 120_000,
      },
})
