import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/three')) {
            return 'three'
          }

          if (id.includes('node_modules/react-globe.gl') || id.includes('node_modules/globe.gl')) {
            return 'globe'
          }

          if (id.includes('node_modules/mammoth')) {
            return 'mammoth'
          }

          if (id.includes('node_modules/react-pdf') || id.includes('node_modules/pdfjs-dist')) {
            return 'pdf-viewer'
          }

          if (id.includes('node_modules/firebase/')) {
            return 'firebase'
          }

          if (id.includes('node_modules/react-router') || id.includes('node_modules/@remix-run')) {
            return 'router'
          }

          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
            return 'react-vendor'
          }
        },
      },
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/apple-touch-icon.png'],
      devOptions: {
        enabled: true
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/firebasestorage\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'firebase-storage-images',
              expiration: {
                maxEntries: 150,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
      manifest: {
        name: 'Global 85',
        short_name: 'G85',
        start_url: '/',
        display: 'standalone',
        background_color: '#BA0C2F',
        theme_color: '#BA0C2F',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' }
        ]
      }
    })
  ]
})
