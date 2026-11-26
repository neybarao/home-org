import { useEffect, useRef, useState } from 'react'
import { markSeen, useBadges } from '../data/badges'
import { BADGES, CATEGORIES, type BadgeCategory, type BadgeDef } from '../lib/badges'
import { fromISO, longDate, type ISODate } from '../lib/dates'
import { haptic } from '../lib/motion'
import { BadgeArt } from './BadgeArt'
import { Icon } from './Icon'

const byId = new Map(BADGES.map((b) => [b.id, b]))

const SHEET =
  'sheet-in m-0 mt-auto max-h-[92dvh] w-full max-w-none overflow-y-auto rounded-t-[32px] bg-[#f7f4ee] p-0 text-ink backdrop:bg-black/35 backdrop:backdrop-blur-sm sm:mx-auto sm:max-w-lg dark:bg-[#2c3b4d]'

const shortDate = (iso: ISODate) => {
  const d = fromISO(iso)
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
}

// ---------- Comemoração ----------

/**
 * Quando o casal ganha uma conquista, ela aparece assim que o app abre (ou na
 * hora, se o app já estiver aberto). Uma de cada vez; cada celular comemora uma vez.
 */
export function BadgeCelebration({ today }: { today: ISODate }) {
  const { unseen, earned } = useBadges(today)
  const dialog = useRef<HTMLDialogElement>(null)
  // A fila é fixada quando a comemoração abre, para o contador "1 de 3" não pular.
  const [queue, setQueue] = useState<string[]>([])
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (queue.length > 0 || unseen.length === 0) return
    // Um respiro depois de abrir, para a tela assentar antes.
    const id = window.setTimeout(() => {
      setQueue(unseen)
      setIndex(0)
    }, 700)
    return () => window.clearTimeout(id)
  }, [unseen, queue.length])

  const current = queue[index] ? byId.get(queue[index]) : undefined

  useEffect(() => {
    if (!current) return
    if (!dialog.current?.open) dialog.current?.showModal()
    haptic(20)
  }, [current])

  const close = () => {
    markSeen(queue)
    dialog.current?.close()
    setQueue([])
  }
  const next = () => {
    markSeen([queue[index]])
    if (index + 1 < queue.length) setIndex(index + 1)
    else close()
  }

  if (!current) return null
  const more = queue.length > 1

  return (
    <dialog
      ref={dialog}
      onCancel={(e) => {
        e.preventDefault()
        close()
      }}
      aria-labelledby="badge-new-title"
      className="badge-celebrate m-auto w-[min(92vw,380px)] overflow-visible rounded-[36px] bg-[#f7f4ee] p-0 text-ink backdrop:bg-[#1b2632]/70 backdrop:backdrop-blur-md dark:bg-[#2c3b4d]"
    >
      <div key={current.id} className="relative px-6 pt-8 pb-6 text-center">
        <div className="relative mx-auto grid size-[220px] place-items-center">
          <span aria-hidden className="badge-burst absolute inset-0" />
          <span aria-hidden className="badge-confetti absolute inset-0">
            {Array.from({ length: 14 }, (_, i) => (
              <i key={i} style={{ '--a': `${(360 / 14) * i}deg`, '--d': `${i % 3}` } as React.CSSProperties} />
            ))}
          </span>
          <BadgeArt id={current.id} size={180} className="badge-pop relative" title={current.name} />
        </div>
        <p className="badge-text mt-3 text-[13px] font-semibold tracking-wide text-muted uppercase">
          {more ? `Nova conquista · ${index + 1} de ${queue.length}` : 'Nova conquista'}
        </p>
        <h2 id="badge-new-title" className="badge-text mt-1 text-[28px] leading-tight font-semibold tracking-[-0.02em]">
          {current.name}
        </h2>
        <p className="badge-text mt-2 text-[16px] leading-snug">{current.cheer}</p>
        {earned[current.id] && earned[current.id] !== today && (
          <p className="badge-text mt-2 text-[13px] text-muted">Conquistada em {longDate(earned[current.id])}</p>
        )}
        <div className="mt-6 flex flex-col gap-2">
          <button onClick={next} className="pop glass-edge h-14 w-full rounded-full bg-solid text-[17px] font-semibold text-on-solid">
            {more && index + 1 < queue.length ? 'Próxima' : 'Que bom!'}
          </button>
          {more && index + 1 < queue.length && (
            <button onClick={close} className="pop h-11 w-full rounded-full text-[15px] text-muted">
              Ver depois na galeria
            </button>
          )}
        </div>
      </div>
    </dialog>
  )
}

// ---------- Galeria ----------

/** Cartão em Progresso: quantas já foram e as mais recentes. Toca para abrir a galeria. */
export function BadgesCard({ today }: { today: ISODate }) {
  const { earned, results } = useBadges(today)
  const [open, setOpen] = useState(false)
  const count = Object.keys(earned).filter((id) => byId.has(id)).length
  // As últimas ganhas; sem nenhuma, as primeiras da lista (apagadas), como convite.
  const recent = Object.keys(earned)
    .filter((id) => byId.has(id))
    .sort((a, b) => earned[b].localeCompare(earned[a]))
    .slice(0, 4)
  const showcase = recent.length > 0 ? recent : BADGES.slice(0, 4).map((b) => b.id)
  // Próxima mais perto de sair, entre as que ainda faltam.
  const nextUp = BADGES.filter((b) => !earned[b.id]).sort((a, b) => results[b.id].value / b.target - results[a.id].value / a.target)[0]

  return (
    <section className="mt-8">
      <button
        onClick={() => {
          haptic()
          setOpen(true)
        }}
        className="pop glass block w-full rounded-[28px] px-5 py-4 text-left"
        aria-label={`Conquistas: ${count} de ${BADGES.length}. Abrir galeria.`}
      >
        <span className="flex items-baseline justify-between">
          <span className="text-[17px] font-semibold">Conquistas</span>
          <span className="tabular flex items-center gap-1 text-[15px] text-muted">
            {count} de {BADGES.length}
            <Icon name="chevron" size={16} />
          </span>
        </span>
        <span className="mt-3 flex gap-2">
          {showcase.map((id) => (
            <BadgeArt key={id} id={id} size={58} className={earned[id] ? '' : 'badge-locked'} />
          ))}
        </span>
        {nextUp && (
          <span className="mt-3 block text-[13px] text-muted">
            Próxima: <span className="font-semibold text-ink">{nextUp.name}</span>
            {nextUp.target > 1 && ` · ${results[nextUp.id].value} de ${nextUp.target}`}
          </span>
        )}
      </button>
      {open && <Gallery today={today} onClose={() => setOpen(false)} />}
    </section>
  )
}

function Gallery({ today, onClose }: { today: ISODate; onClose: () => void }) {
  const { earned, results } = useBadges(today)
  const dialog = useRef<HTMLDialogElement>(null)
  const [selected, setSelected] = useState<BadgeDef | null>(null)
  useEffect(() => {
    dialog.current?.showModal()
  }, [])
  const count = Object.keys(earned).filter((id) => byId.has(id)).length

  return (
    <dialog ref={dialog} onClose={onClose} aria-labelledby="gallery-title" className={SHEET}>
      <div className="px-5 pt-5 pb-[max(env(safe-area-inset-bottom),1.5rem)]">
        <div className="flex items-start justify-between gap-3">
          {selected ? (
            <button onClick={() => setSelected(null)} aria-label="Voltar para a galeria" className="pop glass-btn grid size-11 place-items-center rounded-full">
              <Icon name="back" size={18} />
            </button>
          ) : (
            <div className="pt-1">
              <h2 id="gallery-title" className="text-[26px] leading-tight font-normal tracking-[-0.02em]">
                Conquistas
              </h2>
              <p className="tabular mt-1 text-[15px] text-muted">
                {count} de {BADGES.length} conquistadas pelo casal
              </p>
            </div>
          )}
          <button onClick={() => dialog.current?.close()} aria-label="Fechar" className="pop glass-btn grid size-11 shrink-0 place-items-center rounded-full">
            <Icon name="close" size={18} />
          </button>
        </div>

        {selected ? (
          <Detail badge={selected} earnedOn={earned[selected.id]} value={results[selected.id].value} />
        ) : (
          (Object.keys(CATEGORIES) as BadgeCategory[]).map((cat) => (
            <section key={cat} className="mt-6">
              <h3 className="px-1 text-[15px] font-semibold">{CATEGORIES[cat].name}</h3>
              <p className="px-1 text-[13px] text-muted">{CATEGORIES[cat].hint}</p>
              <ul className="mt-3 grid grid-cols-3 gap-x-2 gap-y-4">
                {BADGES.filter((b) => b.category === cat).map((b) => {
                  const on = earned[b.id]
                  const v = results[b.id].value
                  return (
                    <li key={b.id}>
                      <button
                        onClick={() => {
                          haptic()
                          setSelected(b)
                        }}
                        className="pop flex w-full flex-col items-center text-center"
                        aria-label={`${b.name}, ${on ? `conquistada em ${longDate(on)}` : 'ainda não conquistada'}`}
                      >
                        <BadgeArt id={b.id} size={84} className={on ? '' : 'badge-locked'} />
                        <span className={`mt-1.5 text-[13px] leading-tight font-semibold ${on ? '' : 'text-muted'}`}>{b.name}</span>
                        <span className="tabular mt-0.5 text-[12px] text-muted">{on ? shortDate(on) : b.target > 1 ? `${v} de ${b.target}` : 'A conquistar'}</span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </section>
          ))
        )}
      </div>
    </dialog>
  )
}

function Detail({ badge, earnedOn, value }: { badge: BadgeDef; earnedOn?: ISODate; value: number }) {
  const pct = Math.round((value / badge.target) * 100)
  return (
    <div className="rise flex flex-col items-center pt-4 pb-4 text-center">
      <BadgeArt id={badge.id} size={190} className={earnedOn ? 'badge-float' : 'badge-locked'} title={badge.name} />
      <p className="mt-4 text-[13px] font-semibold tracking-wide text-muted uppercase">{CATEGORIES[badge.category].name}</p>
      <h3 className="mt-1 text-[28px] leading-tight font-semibold tracking-[-0.02em]">{badge.name}</h3>
      <p className="mt-2 max-w-[30ch] text-[16px] leading-snug">{earnedOn ? badge.cheer : badge.how}</p>
      {earnedOn ? (
        <p className="mt-3 text-[14px] text-muted">
          Conquistada em {longDate(earnedOn)} · {badge.how.replace(/\.$/, '')}
        </p>
      ) : (
        badge.target > 1 && (
          <div className="mt-5 w-full max-w-[260px]">
            <div className="h-2.5 overflow-hidden rounded-full bg-black/10 dark:bg-white/10" role="progressbar" aria-valuemin={0} aria-valuemax={badge.target} aria-valuenow={value}>
              <div className="h-full rounded-full bg-accent transition-[width] duration-700" style={{ width: `${pct}%` }} />
            </div>
            <p className="tabular mt-2 text-[14px] text-muted">
              {value} de {badge.target}
              {badge.metric === 'bestStreak' && ' (melhor sequência até agora)'}
            </p>
          </div>
        )
      )}
    </div>
  )
}
