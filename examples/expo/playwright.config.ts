import {defineConfig} from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  workers: 1,
  fullyParallel: false,
  use: {browserName: 'chromium', headless: true},
  webServer: [
    {
      command: 'node scripts/expo.mts server serve dist-server --port 8091',
      // The API healthcheck does not render a page or warm its RNW styles.
      url: 'http://localhost:8091/health',
      reuseExistingServer: false,
    },
    {
      command: 'node scripts/expo.mts single serve dist-single --port 8092',
      url: 'http://localhost:8092',
      reuseExistingServer: false,
    },
  ],
});
