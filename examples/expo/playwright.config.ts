import {defineConfig} from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  workers: 1,
  fullyParallel: false,
  use: {browserName: 'chromium', headless: true},
  webServer: [
    {
      command: 'node scripts/expo.mjs server serve dist-server --port 8091',
      url: 'http://localhost:8091/details',
      reuseExistingServer: false,
    },
    {
      command: 'node scripts/expo.mjs single serve dist-single --port 8092',
      url: 'http://localhost:8092',
      reuseExistingServer: false,
    },
  ],
});
