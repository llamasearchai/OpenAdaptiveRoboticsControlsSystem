/**
 * Global teardown for Playwright E2E tests
 *
 * This file runs once after all tests.
 * Use it to clean up test data, stop services, etc.
 */

import { FullConfig } from '@playwright/test';

async function globalTeardown(config: FullConfig) {
  console.log('\n🧹 Running E2E test teardown...');

  // Add any cleanup logic here
  // For example:
  // - Clear test database
  // - Stop mock servers
  // - Clean up temporary files

  console.log('   ✅ Global teardown complete\n');
}

export default globalTeardown;
