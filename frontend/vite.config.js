import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
  },
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      registerType: 'autoUpdate',
      // pwa-*.svg / favicon.svg no existen en public/ (bug real: el manifest
      // apuntaba a iconos inexistentes → 404 → Chrome no ofrecía instalar).
      // Iconos reales generados desde el isotipo de marca (src/assets/icono.png).
      includeAssets: ['favicon.png', 'icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'Debti — Finanzas Personales',
        short_name: 'Debti',
        description: 'Gestiona tus tarjetas, créditos, suscripciones y metas de ahorro',
        theme_color: '#047857',
        background_color: '#F8FAFC',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      injectManifest: {
        // +png: los iconos de instalación ahora son PNG (antes solo se
        // precacheaban svg/js/css, dejando los iconos fuera del caché offline).
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
      },
    }),
  ],
  server: {
    host: true,
    port: 5174,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})
