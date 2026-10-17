import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/browser',
  use: {
    baseURL: 'http://127.0.0.1:5173',
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
      : {},
  },
  webServer: {
    command: 'npm run dev -- --port 5173',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: !process.env.CI,
    env: { VITE_SUPABASE_URL: 'https://test-project.supabase.co', VITE_SUPABASE_ANON_KEY: 'test-public-key' },
  },
});
