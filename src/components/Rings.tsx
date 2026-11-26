import { useEffect, useState } from 'react'

/**
 * Anéis do dia, no espírito do app Fitness: de fora para dentro, "Pra hoje",
 * "Fechamento" e "Extras". Cada anel enche até fechar e para ali (não dá volta).
 */
export function Rings({
  values,
  size,
  stroke,
  gap = stroke * 0.18,
  dim = false,
  animate = true,
  delay = 0,
  label,
}: {
  /** De 0 a 1, de fora para dentro: Pra hoje, Fechamento, Extras. */
  values: number[]
  size: number
  stroke: number
  gap?: number
  /** Dia sem dados (futuro ou antes do início): só os trilhos, mais apagados. */
  dim?: boolean
  animate?: boolean
  /** Atraso do enchimento, em ms (para a faixa da semana encher em cascata). */
  delay?: number
  label?: string
}) {
  // Começa vazio e enche no primeiro quadro, para a transição de CSS rodar.
  const [shown, setShown] = useState(animate ? values.map(() => 0) : values)
  useEffect(() => {
    if (!animate) return setShown(values)
    const id = requestAnimationFrame(() => setShown(values))
    return () => cancelAnimationFrame(id)
  }, [animate, values.join()]) // eslint-disable-line react-hooks/exhaustive-deps

  const c = size / 2
  const colors = ['var(--ring-1)', 'var(--ring-2)', 'var(--ring-3)'].slice(0, values.length)
  // Quando algum anel fecha, a figura dá um pulinho depois de terminar de encher.
  const closed = !dim && shown.some((v) => v >= 1)
  return (
    <svg
      className={closed && animate ? 'ring-celebrate' : undefined}
      style={{ '--ring-delay': `${delay}ms` } as React.CSSProperties}
      width={size} height={size} viewBox={`0 0 ${size} ${size}`} role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      {colors.map((color, i) => {
        const r = c - stroke / 2 - i * (stroke + gap)
        const length = 2 * Math.PI * r
        const v = Math.max(0, Math.min(1, shown[i]))
        return (
          <g key={i} transform={`rotate(-90 ${c} ${c})`}>
            <circle cx={c} cy={c} r={r} fill="none" stroke={color} strokeOpacity={dim ? 0.1 : 0.2} strokeWidth={stroke} />
            {!dim && (
              <circle
                className="ring-fill"
                cx={c}
                cy={c}
                r={r}
                fill="none"
                stroke={color}
                strokeWidth={stroke}
                strokeLinecap="round"
                strokeDasharray={length}
                // Com 0 o traço redondo ainda desenharia uma bolinha; esconde.
                strokeDashoffset={length * (1 - v)}
                opacity={v === 0 ? 0 : 1}
                style={{ transitionDelay: `${delay}ms` }}
              />
            )}
          </g>
        )
      })}
    </svg>
  )
}
