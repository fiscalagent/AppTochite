import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/AppTochite/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'AppTochite',
        short_name: 'AppTochite',
        description: 'Журнал профессионального заточника',
        theme_color: '#161618',
        background_color: '#161618',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/AppTochite/',
        scope: '/AppTochite/',
        lang: 'ru',
        icons: [
          {
            src: 'pwa-64x64.png',
            sizes: '64x64',
            type: 'image/png',
          },
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        globIgnores: ['**/cleaner.html', '**/guide.html'],
        navigateFallback: '/AppTochite/index.html',
        navigateFallbackDenylist: [/\/cleaner\.html$/, /\/guide\.html$/],
      },
    }),
  ],
})
