import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  outputDir: '.sitiohoy/qa/e2e',
  use: {
    baseURL: process.env.SITE_URL ?? 'http://localhost:3000',
    screenshot: 'on',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'mobile', use: { viewport: { width: 375, height: 812 } } },
    { name: 'tablet', use: { viewport: { width: 768, height: 1024 } } },
    { name: 'desktop', use: { viewport: { width: 1280, height: 800 } } },
    { name: 'wide', use: { viewport: { width: 1920, height: 1080 } } },
  ],
})
