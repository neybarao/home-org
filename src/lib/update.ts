import { registerSW } from 'virtual:pwa-register'

/*
 * Atualização do app instalado.
 * O app instalado (principalmente no iPhone) quase nunca recarrega a página sozinho,
 * então o navegador não procura versão nova. Aqui o app procura ao abrir, toda vez
 * que volta para a frente e a cada hora. Quando acha, a versão nova instala e a
 * página recarrega sozinha (registerType: 'autoUpdate' no vite.config.ts).
 */

const HOUR = 60 * 60 * 1000
let registration: ServiceWorkerRegistration | undefined
let lastCheck = 0

async function check(): Promise<void> {
  if (!registration || !navigator.onLine) return
  lastCheck = Date.now()
  await registration.update()
}

export function setupUpdates() {
  registerSW({
    immediate: true,
    onRegisteredSW(_url, r) {
      registration = r
      window.setInterval(() => void check().catch(() => {}), HOUR)
      document.addEventListener('visibilitychange', () => {
        // Não precisa conferir a cada troca de app; um minuto de intervalo basta.
        if (document.visibilityState === 'visible' && Date.now() - lastCheck > 60_000) void check().catch(() => {})
      })
    },
  })
}

export type UpdateResult = 'updating' | 'latest' | 'offline' | 'unsupported'

/** Botão "Procurar atualização" em Ajustes. */
export async function checkForUpdate(): Promise<UpdateResult> {
  if (!registration) return 'unsupported'
  if (!navigator.onLine) return 'offline'
  await check()
  // Achou versão nova: ela está instalando e a página recarrega quando terminar.
  return registration.installing || registration.waiting ? 'updating' : 'latest'
}

/** Data e hora em que esta versão foi gerada (vem do build). */
export const BUILD_TIME: string = __BUILD_TIME__
export const BUILD_SHA: string = __BUILD_SHA__
