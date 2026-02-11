import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Use root path for custom domain (3amcollectivemovement.com)
  base: '/',
  server: {
    port: 3002,
    host: true,
    // Proxy only works when using local backend (/api)
    // When using remote backend (https://...), proxy is bypassed
    proxy: {
      '/api': {
        target: 'http://localhost:3003',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    outDir: 'docs', // Build to docs folder for GitHub Pages
    assetsDir: 'assets',
    emptyOutDir: true, // Clean docs folder on each build
  },
})
