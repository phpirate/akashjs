import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  retries: 1,
  use: {
    baseURL: 'http://localhost:3000',
    headless: true,
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'cd ../apps/taskflow && node ../../node_modules/.pnpm/vite@5.4.21_@types+node@25.5.0/node_modules/vite/bin/vite.js --port 3000',
    port: 3000,
    reuseExistingServer: true,
    timeout: 15000,
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
  ],
});
