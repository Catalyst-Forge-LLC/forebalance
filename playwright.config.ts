import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  workers: 3,
  retries: process.env.CI ? 1 : 0,
  use: { baseURL: 'http://127.0.0.1:46001', trace: 'retain-on-failure' },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  webServer: { command: 'pnpm preview --host 127.0.0.1 --port 46001 --strictPort', url: 'http://127.0.0.1:46001', reuseExistingServer: false },
});
