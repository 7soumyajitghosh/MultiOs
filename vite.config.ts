import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    watch: {
      ignored: [
        '*.iso',
        '**/*.iso',
        '**/node_modules/**',
        '**/dist/**',
        '**/build/**',
        '**/iso/**',
        'arch/**',
        'boot/**',
        'kernel/**',
      ],
    },
  },
  test: {
    // The app has no DOM-dependent logic worth exercising yet; the process
    // system is pure TypeScript and runs straight through Node.
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
