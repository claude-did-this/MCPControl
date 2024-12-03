import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: [
        'node_modules/**',
        'build/**',
        '**/*.d.ts',
        'vitest.config.ts'
      ]
    },
    include: ['src/**/*.test.ts'],
    exclude: ['node_modules', 'build']
  }
})
