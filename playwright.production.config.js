import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/production',
  use: {
    baseURL: 'http://127.0.0.1:4174',
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
      : {},
  },
  webServer: {
    command: 'npm run build && npm run preview -- --port 4174',
    url: 'http://127.0.0.1:4174',
    reuseExistingServer: false,
    timeout: 60000,
    // Override any live-project values. This test never signs in or mutates data.
    env: {
      VITE_SUPABASE_URL: 'https://test-project.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'test-public-key',
    },
  },
});
