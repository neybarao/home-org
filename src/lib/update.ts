/*
 * Atualização do app instalado.
 *
 * O GitHub Pages guarda arquivos em cache por até 10 minutos, inclusive o sw.js.
 * Por isso "procurar atualização" não pode confiar só em registration.update():
 * o navegador podia receber o sw.js antigo e responder que já estava em dia.
 *
 * Como funciona agora:
 * 1. O app lê version.json com um endereço único a cada vez (?t=...), que fura o cache.
 * 2. Se a versão do site for outra, registra o service worker com a versão no
 *    endereço (sw.js?v=abc1234). Endereço novo = arquivo novo, sem cache no caminho.
 * 3. O service worker novo instala, assume o app e a página recarrega sozinha.
 *
 * Confere ao abrir, quando o app volta para a frente (no máximo a cada minuto)
 * e a cada 30 minutos. O botão em Ajustes e o puxar para atualizar usam o mesmo caminho.
 */

const BASE = import.meta.env.BASE_URL
const swUrl = (sha: string) => `${BASE}sw.js?v=${sha}`

/** Data e hora em que esta versão foi gerada (vem do build). */
export const BUILD_TIME: string = __BUILD_TIME__
export const BUILD_SHA: string = __BUILD_SHA__

let lastCheck = 0
let running: Promise<UpdateResult> | null = null

export type UpdateResult = 'updating' | 'latest' | 'offline' | 'unsupported'

function supported(): boolean {
  return 'serviceWorker' in navigator && !import.meta.env.DEV
}

/** Versão publicada no site agora, lida sem passar por nenhum cache. */
async function latestSha(): Promise<string> {
  const r = await fetch(`${BASE}version.json?t=${Date.now()}`, { cache: 'no-store' })
  if (!r.ok) throw new Error(`version.json: ${r.status}`)
  const v = (await r.json()) as { sha?: string }
  if (!v.sha) throw new Error('version.json sem versão')
  return v.sha
}

async function register(sha: string) {
  return navigator.serviceWorker.register(swUrl(sha), { scope: BASE, updateViaCache: 'none' })
}

async function runCheck(): Promise<UpdateResult> {
  if (!supported()) return 'unsupported'
  if (!navigator.onLine) return 'offline'
  lastCheck = Date.now()
  const sha = await latestSha()
  if (sha === BUILD_SHA) return 'latest'
  // Versão nova no site: baixa o service worker dela. Quando ele assumir, a página recarrega.
  await register(sha)
  return 'updating'
}

/** Botão "Procurar atualização" em Ajustes (e puxar para atualizar). */
export function checkForUpdate(): Promise<UpdateResult> {
  // Dois toques seguidos não disparam duas buscas.
  running ??= runCheck().finally(() => (running = null))
  return running
}

export function setupUpdates() {
  if (!supported()) return

  // Recarrega quando assume um service worker de outra versão (o endereço dele diz qual).
  let reloading = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    const url = navigator.serviceWorker.controller?.scriptURL
    const v = url ? new URL(url).searchParams.get('v') : null
    if (v && v !== BUILD_SHA && !reloading) {
      reloading = true
      // Se tiver um editor ou detalhe aberto, espera fechar para não perder o que está sendo digitado.
      const go = () => (document.querySelector('dialog[open]') ? window.setTimeout(go, 1000) : window.location.reload())
      go()
    }
  })

  const quiet = () => void checkForUpdate().catch(() => {})
  // Registra a versão desta página (mesmo endereço = nada muda) e já confere se tem outra.
  register(BUILD_SHA)
    .catch(() => {})
    .finally(quiet)
  window.setInterval(quiet, 30 * 60 * 1000)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && Date.now() - lastCheck > 60_000) quiet()
  })
  window.addEventListener('online', quiet)
}
