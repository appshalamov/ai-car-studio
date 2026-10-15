import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: 'e2e',
  timeout: 90_000,
  workers: 1,
  use: {
    baseURL: 'http://localhost:4173',
    ...devices['iPhone 13'],
    browserName: 'chromium',
    launchOptions: process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {},
  },
  webServer: [
    { command: 'node e2e/mock-service.mjs', port: 8787, reuseExistingServer: true, env: { RENDER_MS: '600' } },
    { command: 'VITE_SERVICE_URL=http://localhost:8787 vite build --outDir dist-e2e && vite preview --outDir dist-e2e --port 4173 --strictPort', port: 4173, reuseExistingServer: true, timeout: 120_000 },
  ],
})
