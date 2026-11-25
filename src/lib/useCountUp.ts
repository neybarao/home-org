import { useEffect, useRef, useState } from 'react'
import { reducedMotion } from './motion'

/** Número que sobe contando até o valor (ou só troca, com animações reduzidas). */
export function useCountUp(value: number, duration = 700): number {
  const [shown, setShown] = useState(reducedMotion() ? value : 0)
  const from = useRef(shown)
  useEffect(() => {
    if (reducedMotion()) return setShown(value)
    const start = performance.now()
    const begin = from.current
    let id = 0
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      const v = Math.round(begin + (value - begin) * eased)
      from.current = v
      setShown(v)
      if (t < 1) id = requestAnimationFrame(step)
    }
    id = requestAnimationFrame(step)
    return () => cancelAnimationFrame(id)
  }, [value, duration])
  return shown
}
