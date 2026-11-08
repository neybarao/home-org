import type { ReactNode } from 'react'
import { PEOPLE, type Person } from '../lib/types'

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <span className="relative inline-flex shrink-0">
      <input
        type="checkbox"
        role="switch"
        aria-label={label}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="peer absolute inset-0 z-10 cursor-pointer opacity-0"
      />
      <span
        className="h-8 w-14 rounded-full bg-black/10 transition-colors peer-checked:bg-white peer-checked:shadow-[0_1px_3px_rgb(0_0_0/0.12)] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ink dark:bg-white/10 dark:peer-checked:bg-accent"
        aria-hidden
      />
      <span
        className="pointer-events-none absolute top-1 left-1 size-6 rounded-full bg-white shadow-sm transition-[transform,background-color] peer-checked:translate-x-6 peer-checked:bg-solid dark:peer-checked:bg-white"
        aria-hidden
      />
    </span>
  )
}

export function Avatar({ person, size = 40 }: { person: Person; size?: number }) {
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full font-bold text-on-person"
      style={{ width: size, height: size, background: `var(--${person})`, fontSize: size * 0.42 }}
      aria-hidden
    >
      {PEOPLE[person].initial}
    </span>
  )
}

export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  columns,
  label,
}: {
  options: readonly (readonly [T, string])[]
  value: T | T[]
  onChange: (v: T) => void
  columns?: number
  label?: string
}) {
  const selected = (v: T) => (Array.isArray(value) ? value.includes(v) : value === v)
  return (
    <div
      role="group"
      aria-label={label}
      className="glass grid gap-1 rounded-[22px] p-1"
      style={{ gridTemplateColumns: `repeat(${columns ?? options.length}, minmax(0, 1fr))` }}
    >
      {options.map(([v, text]) => (
        <button
          key={String(v)}
          type="button"
          aria-pressed={selected(v)}
          onClick={() => onChange(v)}
          className={`pop h-11 rounded-[18px] px-1 text-[15px] ${
            selected(v)
              ? 'bg-white font-semibold text-ink shadow-[0_1px_3px_rgb(0_0_0/0.1)] dark:bg-white/15'
              : 'text-muted'
          }`}
        >
          {text}
        </button>
      ))}
    </div>
  )
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`glass rounded-[28px] ${className}`}>{children}</div>
}

export function SectionTitle({ children, count, tone }: { children: ReactNode; count?: number; tone?: 'late' }) {
  return (
    <h2 className={`mb-2 flex items-baseline gap-2 px-1 text-[15px] font-semibold ${tone === 'late' ? 'text-late' : 'text-muted'}`}>
      {children}
      {count !== undefined && count > 0 && <span className="tabular font-normal">{count}</span>}
    </h2>
  )
}
