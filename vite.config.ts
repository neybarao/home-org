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
      includeAssets: ['favicon-v2.png', 'apple-touch-icon-v2.png'],
      manifest: {
        name: 'Dia',
        short_name: 'Dia',
        description: 'Tarefas da casa divididas ao longo da semana.',
        lang: 'pt-BR',
        theme_color: '#eee9df',
        background_color: '#eee9df',
        display: 'standalone',
        start_url: '/home-org/',
        scope: '/home-org/',
        icons: [
          { src: 'icon-192-v2.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512-v2.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512-v2.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
      },
    }),
  ],
})
