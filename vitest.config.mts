import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    projects: [
      {
        test: {
          name: 'unit',
          environment: 'node',
          include: ['test/unit/**/*.test.ts'],
        },
      },
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      // Expand this list whenever additional pure business-logic modules are introduced.
      include: ['lib/security.ts'],
      thresholds: {
        statements: 80,
        lines: 80,
        functions: 80,
        branches: 70,
      },
    },
  },
})
