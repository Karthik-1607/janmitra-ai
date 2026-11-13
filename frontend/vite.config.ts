import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // The sandbox exposes this dev server through a forwarded hostname.
    allowedHosts: true,
    proxy: {
      '/api': {
        // Use 127.0.0.1 (not "localhost") so the proxy targets the IPv4 address
        // uvicorn binds by default and avoids Windows IPv6 resolution issues.
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})
