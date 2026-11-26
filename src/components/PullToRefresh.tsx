import { useEffect, useRef, useState } from 'react'
import { syncNow } from '../data/store'
import { haptic } from '../lib/motion'
import { checkForUpdate } from '../lib/update'

const THRESHOLD = 72 // distância (já amortecida) para soltar e atualizar
const MAX = 110

/**
 * Puxar a tela para baixo no topo: lê tudo do banco de novo e procura versão nova do app.
 * O app instalado não tem isso de fábrica (no iPhone, por exemplo), então é feito à mão.
 */
export function PullToRefresh() {
  const [pull, setPull] = useState(0)
  const [busy, setBusy] = useState(false)
  const start = useRef<{ y: number; x: number } | null>(null)
  const pullRef = useRef(0)
  const armed = useRef(false)
  const busyRef = useRef(false)

  useEffect(() => {
    const set = (v: number) => {
      pullRef.current = v
      setPull(v)
    }
    const onStart = (e: TouchEvent) => {
      if (busyRef.current || window.scrollY > 0 || e.touches.length !== 1) return
      if ((e.target as Element | null)?.closest?.('dialog')) return
      start.current = { y: e.touches[0].clientY, x: e.touches[0].clientX }
      armed.current = false
    }
    const onMove = (e: TouchEvent) => {
      if (!start.current) return
      const dy = e.touches[0].clientY - start.current.y
      const dx = Math.abs(e.touches[0].clientX - start.current.x)
      if (dy <= 0 || window.scrollY > 0 || dx > dy) {
        start.current = null
        return set(0)
      }
      const d = Math.min(MAX, dy * 0.5)
      if (d >= THRESHOLD && !armed.current) {
        armed.current = true
        haptic()
      } else if (d < THRESHOLD) armed.current = false
      set(d)
    }
    const onEnd = async () => {
      if (!start.current) return
      start.current = null
      if (pullRef.current < THRESHOLD) return set(0)
      busyRef.current = true
      setBusy(true)
      set(THRESHOLD * 0.75)
      try {
        await Promise.all([syncNow(), checkForUpdate().catch(() => {}), new Promise((r) => setTimeout(r, 700))])
      } finally {
        busyRef.current = false
        setBusy(false)
        set(0)
      }
    }
    document.addEventListener('touchstart', onStart, { passive: true })
    document.addEventListener('touchmove', onMove, { passive: true })
    document.addEventListener('touchend', onEnd)
    document.addEventListener('touchcancel', onEnd)
    return () => {
      document.removeEventListener('touchstart', onStart)
      document.removeEventListener('touchmove', onMove)
      document.removeEventListener('touchend', onEnd)
      document.removeEventListener('touchcancel', onEnd)
    }
  }, [])

  const visible = pull > 4 || busy
  const progress = Math.min(1, pull / THRESHOLD)
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-0 z-30 flex justify-center"
      style={{
        transform: `translateY(calc(max(env(safe-area-inset-top), 0.5rem) + ${pull - 44}px))`,
        opacity: visible ? 1 : 0,
        transition: start.current ? 'none' : 'transform 250ms ease, opacity 200ms ease',
      }}
    >
      <span className="glass-bar grid size-10 place-items-center rounded-full">
        <svg
          viewBox="0 0 24 24"
          className={`size-5 text-ink ${busy ? 'animate-spin' : ''}`}
          style={busy ? undefined : { transform: `rotate(${progress * 270}deg)` }}
          fill="none"
          stroke="currentColor"
          strokeWidth={2.2}
          strokeLinecap="round"
          aria-hidden
        >
          <path d="M20 12a8 8 0 1 1-2.34-5.66" opacity={busy ? 1 : 0.35 + progress * 0.65} />
          <path d="M20 4v4h-4" opacity={progress >= 1 || busy ? 1 : 0} />
        </svg>
        <span className="sr-only">{busy ? 'Atualizando' : ''}</span>
      </span>
    </div>
  )
}
