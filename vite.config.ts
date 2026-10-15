import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { resolve } from 'node:path'

export default defineConfig({
  base: './',
  build: {
    rollupOptions: { input: { main: resolve(__dirname, 'index.html'), admin: resolve(__dirname, 'admin.html') } },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'AI Car Studio',
        short_name: 'Car Studio',
        description: 'AI-визуализация тюнинга, чистка фото и замена фонов для автодилеров',
        theme_color: '#0b0d12',
        background_color: '#0b0d12',
        display: 'standalone',
        orientation: 'any',
        start_url: './',
        scope: './',
        lang: 'ru',
        categories: ['productivity', 'photo', 'business'],
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,jpg,webmanifest}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/admin/],
        importScripts: ['push-sw.js'],
      },
    }),
  ],
})
