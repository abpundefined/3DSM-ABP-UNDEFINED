import { defineConfig } from '@playwright/test';
import config from './playwright.config';

export default defineConfig(config, {
  use: { baseURL: 'http://localhost:5173' },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: false,
  },
});
