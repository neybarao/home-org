import { useEffect, useState } from 'react'

export type ThemeChoice = 'system' | 'light' | 'dark'

const KEY = 'home-org:theme'
const media = () => window.matchMedia('(prefers-color-scheme: dark)')

export function loadTheme(): ThemeChoice {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'light' || v === 'dark' ? v : 'system'
  } catch {
    return 'system'
  }
}

export function applyTheme(choice: ThemeChoice) {
  const dark = choice === 'dark' || (choice === 'system' && media().matches)
  document.documentElement.dataset.theme = dark ? 'dark' : 'light'
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#1f2023' : '#e6e5e2')
}

/** Tema escolhido neste aparelho. "Sistema" segue o celular. */
export function useTheme(): [ThemeChoice, (c: ThemeChoice) => void] {
  const [choice, setChoice] = useState(loadTheme)
  useEffect(() => {
    applyTheme(choice)
    if (choice !== 'system') return
    const m = media()
    const onChange = () => applyTheme('system')
    m.addEventListener('change', onChange)
    return () => m.removeEventListener('change', onChange)
  }, [choice])
  const set = (c: ThemeChoice) => {
    try {
      localStorage.setItem(KEY, c)
    } catch {
      /* ignora */
    }
    setChoice(c)
  }
  return [choice, set]
}
