import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

const BUILD_TIME = new Date().toISOString()
const BUILD_SHA = (process.env.GITHUB_SHA ?? 'local').slice(0, 7)

// GitHub Pages serve o app em https://neybarao.github.io/home-org/
export default defineConfig({
  base: '/home-org/',
  // Mostrado em Ajustes, para saber qual versão está aberta no celular.
  define: {
    __BUILD_TIME__: JSON.stringify(BUILD_TIME),
    __BUILD_SHA__: JSON.stringify(BUILD_SHA),
  },
  plugins: [
    react(),
    tailwindcss(),
    // version.json: o app lê este arquivo (sem cache) para saber se existe versão nova.
    {
      name: 'dia-version-json',
      apply: 'build',
      generateBundle() {
        this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ sha: BUILD_SHA, time: BUILD_TIME }) })
      },
    },
    VitePWA({
      registerType: 'autoUpdate',
      // O registro do service worker é feito à mão em src/lib/update.ts.
      injectRegister: false,
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
        // Recebe e mostra as notificações push.
        importScripts: ['push-sw.js'],
        // Versão nova assume na hora (sem esperar fechar o app) e a página recarrega.
        skipWaiting: true,
        clientsClaim: true,
      },
    }),
  ],
})
