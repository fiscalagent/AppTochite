import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// mode 'capacitor' (через `vite build --mode capacitor`) собирает бандл для APK:
// base './' (ассеты грузятся из https://localhost/, не из /AppTochite/) и БЕЗ
// service worker — внутри WebView Workbox не нужен и кэширует криво.
export default defineConfig(({ mode }) => {
  const isCapacitor = mode === 'capacitor'

  return {
    base: isCapacitor ? './' : '/AppTochite/',
    plugins: [
      react(),
      ...(isCapacitor
        ? []
        : [
            VitePWA({
              strategies: 'injectManifest',
              srcDir: 'src',
              filename: 'sw.ts',
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
              injectManifest: {
                globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
                globIgnores: ['**/cleaner.html', '**/guide.html'],
              },
            }),
          ]),
    ],
  }
})
