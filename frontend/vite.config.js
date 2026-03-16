import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  build: {
    outDir: '../server/public',
    emptyOutDir: true
  },
  server: {
    // In dev, Vite runs as Express middleware (same origin) — no proxy needed
  }
})
