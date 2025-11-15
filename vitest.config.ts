import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    // Environment for React component testing
    environment: 'jsdom',

    // Setup files - runs before each test file
    setupFiles: ['./src/test/setup.ts'],

    // Global test APIs (describe, it, expect) without imports
    globals: true,

    // Coverage configuration (run with --coverage flag)
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.config.{js,ts}',
        '**/dist/',
        '**/*.d.ts',
      ],
      // Recommended thresholds from tech stack: 60-70%
      thresholds: {
        lines: 60,
        functions: 60,
        branches: 60,
        statements: 60,
      },
    },

    // Include test files
    include: ['src/**/*.{test,spec}.{js,ts,tsx}'],

    // Exclude files
    exclude: ['node_modules', 'dist', '.astro'],
  },

  // Resolve aliases (matching Astro's path mapping)
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
