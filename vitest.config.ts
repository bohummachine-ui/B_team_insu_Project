import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    // e2e (playwright) 파일 제외
    exclude: ['**/tests/e2e/**', '**/node_modules/**'],
    environment: 'node',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
