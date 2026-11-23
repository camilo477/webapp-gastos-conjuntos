import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  define: { __BUILD_ID__: JSON.stringify(process.env.GASTOS_BUILD_ID ?? 'local') },
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['icons/*.png', 'icons/app.svg'],
      manifest: {
        id: '/',
        name: 'Gastos compartidos',
        short_name: 'Gastos',
        description: 'Base de demostración de gastos compartidos. Sin datos reales.',
        lang: 'es',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#f7f7f5',
        theme_color: '#146347',
        icons: [
          { src: '/icons/pwa-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        clientsClaim: true,
        globPatterns: ['**/*.{html,js,css,svg,png,webmanifest}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/__/],
        cleanupOutdatedCaches: true,
        // Only the build's public shell is cached. No runtime/Firebase caching.
        runtimeCaching: [],
      },
      devOptions: { enabled: false },
    }),
  ],
});
