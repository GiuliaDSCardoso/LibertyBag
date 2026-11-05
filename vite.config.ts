import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: [
        'favicon.svg',
        'apple-touch-icon.png',
        'icons/apple-touch-icon.png',
        'icons/pwa-192x192.png',
        'icons/pwa-512x512.png',
        'icons/maskable-icon-512x512.png',
        'icons/icon-192.svg',
        'icons/icon-512.svg'
      ],
      manifest: {
        name: 'LibertyBag',
        short_name: 'LibertyBag',
        description: 'Aplicativo inteligente de organização financeira.',
        theme_color: '#2346C8',
        background_color: '#FBF6EA',
        display: 'standalone',
        orientation: 'portrait',
        lang: 'pt-BR',
        start_url: '/',
        scope: '/',
        categories: ['finance', 'productivity', 'utilities'],
        icons: [
          {
            src: '/icons/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icons/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icons/maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          },
          {
            src: '/icons/apple-touch-icon.png',
            sizes: '180x180',
            type: 'image/png'
          },
          {
            src: '/icons/icon-192.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'any'
          },
          {
            src: '/icons/icon-512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\/.*/, /^https:\/\/.*\.supabase\.co\/.*/],
        runtimeCaching: [
          // 1. SEGURANÇA MÁXIMA PARA DADOS FINANCEIROS / SUPABASE:
          // Chamadas ao Supabase (autenticação, transações, espaços) NUNCA vão para o Cache Storage do navegador.
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkOnly'
          },
          // 2. Fontes seguras do Google Fonts (apenas assets estáticos de tipografia)
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      }
    })
  ]
});
