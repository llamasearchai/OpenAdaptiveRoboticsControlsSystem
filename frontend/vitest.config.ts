/**
 * Vitest Configuration
 * 
 * Configures unit and integration testing with:
 * - JSDOM environment for React component testing
 * - Coverage thresholds enforcing ≥90% across all modules
 * - Setup files for Testing Library and custom matchers
 * - Path aliases matching tsconfig.json
 * - Three.js and WebGL mocking support
 * 
 * @see https://vitest.dev/config/
 */

import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  
  test: {
    // Use JSDOM for DOM APIs
    environment: 'jsdom',
    
    // Enable globals for cleaner test syntax
    globals: true,
    
    // Setup files run before each test file
    setupFiles: ['./src/__tests__/setup.ts'],
    
    // Include patterns for test files
    include: [
      'src/**/*.test.{ts,tsx}',
      'src/**/*.spec.{ts,tsx}',
    ],
    
    // Exclude patterns
    exclude: [
      'node_modules',
      'dist',
      '.next',
      'e2e/**/*',
      'storybook-static',
    ],
    
    // Coverage configuration
    coverage: {
      // Use v8 for fast coverage collection
      provider: 'v8',
      
      // Report formats
      reporter: ['text', 'text-summary', 'lcov', 'html', 'json'],
      
      // Output directory
      reportsDirectory: './coverage',
      
      // Coverage thresholds - enforced in CI
      thresholds: {
        // Global thresholds
        statements: 90,
        branches: 85,
        functions: 90,
        lines: 90,
        
        // Per-directory thresholds
        'src/lib/**/*.{ts,tsx}': {
          statements: 95,
          branches: 90,
          functions: 95,
          lines: 95,
        },
        'src/hooks/**/*.{ts,tsx}': {
          statements: 95,
          branches: 90,
          functions: 95,
          lines: 95,
        },
        'src/components/ui/**/*.{ts,tsx}': {
          statements: 90,
          branches: 85,
          functions: 90,
          lines: 90,
        },
        'src/components/3d/**/*.{ts,tsx}': {
          statements: 85,
          branches: 80,
          functions: 85,
          lines: 85,
        },
        'src/components/visualizations/**/*.{ts,tsx}': {
          statements: 90,
          branches: 85,
          functions: 90,
          lines: 90,
        },
        'src/app/**/*.{ts,tsx}': {
          statements: 85,
          branches: 80,
          functions: 85,
          lines: 85,
        },
      },
      
      // Include patterns
      include: ['src/**/*.{ts,tsx}'],
      
      // Exclude patterns from coverage
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/**/*.spec.{ts,tsx}',
        'src/**/*.stories.{ts,tsx}',
        'src/**/*.d.ts',
        'src/types/**/*',
        'src/__tests__/mocks/**/*',
        'src/__tests__/fixtures/**/*',
        'src/__tests__/utils/**/*',
        'node_modules',
      ],
    },
    
    // Reporter configuration
    reporters: ['default', 'html'],
    
    // Timeout for tests
    testTimeout: 10000,
    
    // Hook timeout
    hookTimeout: 10000,
    
    // Retry failed tests
    retry: process.env.CI ? 2 : 0,
    
    // Pool configuration for parallel execution
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
        maxThreads: 4,
        minThreads: 1,
      },
    },
    
    // Mock clear between tests
    clearMocks: true,
    mockReset: true,
    restoreMocks: true,
    
    // Dependency optimization for Three.js
    deps: {
      optimizer: {
        web: {
          include: ['three', '@react-three/fiber', '@react-three/drei'],
        },
      },
    },
  },
  
  // Path aliases matching tsconfig.json
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/components': path.resolve(__dirname, './src/components'),
      '@/lib': path.resolve(__dirname, './src/lib'),
      '@/hooks': path.resolve(__dirname, './src/hooks'),
      '@/stores': path.resolve(__dirname, './src/stores'),
      '@/types': path.resolve(__dirname, './src/types'),
      '@/styles': path.resolve(__dirname, './src/styles'),
      '@/assets': path.resolve(__dirname, './src/assets'),
    },
  },
});
