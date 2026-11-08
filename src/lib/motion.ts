import { flushSync } from 'react-dom'

export const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * Faz a mudança dentro de uma View Transition, para a lista se rearrumar
 * com movimento (tarefa feita descendo, tarefa adiada saindo, troca de aba).
 * Sem suporte ou com animações desligadas, só aplica a mudança.
 */
export function withTransition(update: () => void, rootClass?: string): ViewTransition | null {
  if (!document.startViewTransition || reducedMotion()) {
    update()
    return null
  }
  const root = document.documentElement
  if (rootClass) root.classList.add(rootClass)
  const t = document.startViewTransition(() => flushSync(update))
  if (rootClass) t.finished.finally(() => root.classList.remove(rootClass))
  return t
}

/** Vibração curta de confirmação (Android). No iPhone o navegador ignora. */
export function haptic(ms = 8) {
  try {
    navigator.vibrate?.(ms)
  } catch {
    /* ignora */
  }
}

/** Nome válido de view-transition a partir de uma chave qualquer. */
export function vtName(prefix: string, key: string) {
  return `${prefix}-${key.replace(/[^a-zA-Z0-9]/g, '-')}`
}

// Guarda onde foi o último toque, para a troca de tema abrir a partir dele.
let lastPointer = { x: window.innerWidth / 2, y: window.innerHeight / 2 }
window.addEventListener('pointerdown', (e) => (lastPointer = { x: e.clientX, y: e.clientY }), { passive: true, capture: true })

/** Troca de tema com um círculo que se abre a partir do toque. */
export function revealTheme(update: () => void) {
  if (!document.startViewTransition || reducedMotion()) return update()
  const { x, y } = lastPointer
  const r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y))
  const root = document.documentElement
  root.classList.add('theme-switch')
  const t = document.startViewTransition(() => flushSync(update))
  t.ready.then(() =>
    root.animate(
      { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
      { duration: 520, easing: 'cubic-bezier(0.3, 0.7, 0.2, 1)', pseudoElement: '::view-transition-new(root)' },
    ),
  )
  t.finished.finally(() => root.classList.remove('theme-switch'))
}
