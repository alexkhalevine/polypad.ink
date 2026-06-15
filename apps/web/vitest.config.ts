import { defineConfig, configDefaults } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: 'jsdom',
    // Playwright specs live in e2e/ and run via `playwright test`; vitest must not
    // load them (their test() calls throw under the vitest runner).
    exclude: [...configDefaults.exclude, 'e2e/**'],
  },
})