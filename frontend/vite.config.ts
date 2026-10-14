import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    port: 5173,
    // Bind all interfaces so the app is reachable from other devices on the
    // same network (phone testing, showing a groupmate). Without this Vite
    // binds [::1] only and nothing outside this machine can connect.
    //
    // Only /api and /sanctum are proxied, and the proxy runs server-side — so
    // the browser only ever talks to Vite. That keeps everything same-origin
    // from the browser's point of view and means CORS is not involved.
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/sanctum': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
