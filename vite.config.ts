import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: './',
  build: {
    rollupOptions: { input: { main: 'index.html', admin: 'admin.html' } },
  },
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      injectRegister: false,
      includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'img/*.jpg'],
      manifest: {
        name: 'Auto Studio',
        short_name: 'Auto Studio',
        description: 'See your car in a new color and on new wheels before you buy.',
        theme_color: '#e6e3de',
        background_color: '#e6e3de',
        display: 'standalone',
        orientation: 'portrait',
        start_url: './',
        scope: './',
        lang: 'en',
        categories: ['lifestyle', 'photo'],
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,svg,png,jpg,webmanifest}'],
        globIgnores: ['img/cars/**'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
    }),
    {
      // The admin page installs as its own app (admin.webmanifest), not as the client app.
      name: 'admin-manifest-only',
      enforce: 'post',
      transformIndexHtml: {
        order: 'post',
        handler: (html, ctx) => (ctx.filename.endsWith('admin.html') ? html.replace(/<link rel="manifest" href="\.\/manifest\.webmanifest"\s*\/?>/, '') : html),
      },
    },
  ],
})
