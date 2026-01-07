/**
 * Playwright E2E Test Configuration
 * 
 * Configures cross-browser end-to-end testing with:
 * - Parallel test execution across multiple browsers
 * - Visual regression testing with screenshots
 * - Accessibility testing with axe-core
 * - Performance testing with Lighthouse CI integration
 * - Mobile viewport testing
 * 
 * @see https://playwright.dev/docs/test-configuration
 */

import { defineConfig, devices } from '@playwright/test';

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  // Test directory
  testDir: './e2e',
  
  // Run tests in parallel
  fullyParallel: true,
  
  // Fail build on CI if test.only is found
  forbidOnly: !!process.env.CI,
  
  // Retry configuration
  retries: process.env.CI ? 2 : 0,
  
  // Worker configuration
  ...(process.env.CI ? { workers: 4 } : {}),
  
  // Reporter configuration
  reporter: [
    ['html', { open: 'never' }],
    ['list'],
    ['json', { outputFile: 'playwright-report/results.json' }],
    ...(process.env.CI ? [['github', {}] as const] : []),
  ],
  
  // Global timeout for each test
  timeout: 30000,
  
  // Expect timeout
  expect: {
    timeout: 5000,
    // Screenshot comparison options
    toHaveScreenshot: {
      maxDiffPixels: 100,
      threshold: 0.2,
    },
    toMatchSnapshot: {
      maxDiffPixelRatio: 0.1,
    },
  },
  
  // Shared settings for all projects
  use: {
    // Base URL for navigation
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    
    // Collect trace on first retry
    trace: 'on-first-retry',
    
    // Screenshot on failure
    screenshot: 'only-on-failure',
    
    // Video recording
    video: 'retain-on-failure',
    
    // Accept downloads
    acceptDownloads: true,
    
    // Geolocation
    geolocation: { longitude: -122.084, latitude: 37.422 },
    
    // Permissions
    permissions: ['geolocation'],
    
    // Timezone
    timezoneId: 'America/Los_Angeles',
    
    // Locale
    locale: 'en-US',
    
    // Color scheme
    colorScheme: 'light',
    
    // Viewport
    viewport: { width: 1280, height: 720 },
    
    // Action timeout
    actionTimeout: 10000,
    
    // Navigation timeout
    navigationTimeout: 30000,
  },
  
  // Configure projects for major browsers and devices
  projects: [
    // Desktop browsers
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    
    // Mobile browsers
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 13'] },
    },
    
    // Tablet
    {
      name: 'tablet',
      use: { ...devices['iPad Pro 11'] },
    },
    
    // Accessibility testing project
    {
      name: 'accessibility',
      use: {
        ...devices['Desktop Chrome'],
      },
      testMatch: /.*\.a11y\.spec\.ts/,
    },
    
    // Visual regression testing project
    {
      name: 'visual',
      use: {
        ...devices['Desktop Chrome'],
        // Disable animations for consistent screenshots
        launchOptions: {
          args: ['--force-prefers-reduced-motion'],
        },
      },
      testMatch: /.*\.visual\.spec\.ts/,
    },
  ],
  
  // Web server configuration
  webServer: {
    command: process.env.CI ? 'pnpm run start' : 'pnpm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
  
  // Output directory for test artifacts
  outputDir: 'playwright-results',
  
  // Snapshot directory
  snapshotDir: './e2e/__snapshots__',
  
  // Global setup and teardown
  globalSetup: './e2e/global-setup.ts',
  globalTeardown: './e2e/global-teardown.ts',
});
