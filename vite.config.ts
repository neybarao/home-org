import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// GitHub Pages serve o app em https://neybarao.github.io/home-org/
export default defineConfig({
  base: '/home-org/',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Casa em dia',
        short_name: 'Casa',
        description: 'Tarefas da casa divididas ao longo da semana.',
        lang: 'pt-BR',
        theme_color: '#e6e5e2',
        background_color: '#e6e5e2',
        display: 'standalone',
        start_url: '/home-org/',
        scope: '/home-org/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
      },
    }),
  ],
})
