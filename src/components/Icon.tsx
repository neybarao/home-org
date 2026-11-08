type Name = 'today' | 'house' | 'settings' | 'check' | 'plus' | 'close' | 'arrow'

export function Icon({ name, filled = false, size = 24 }: { name: Name; filled?: boolean; size?: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  }
  switch (name) {
    case 'today':
      return (
        <svg {...common}>
          <rect x="3.5" y="5" width="17" height="15" rx="3" fill={filled ? 'currentColor' : 'none'} />
          <path d="M8 3v4M16 3v4" />
          <path d="M8.5 13l2.5 2.5 4.5-5" stroke={filled ? 'var(--bg)' : 'currentColor'} />
        </svg>
      )
    case 'house':
      return (
        <svg {...common}>
          <path d="M4 11l8-6.5 8 6.5V20H4z" fill={filled ? 'currentColor' : 'none'} />
          <path d="M10 20v-5h4v5" stroke={filled ? 'var(--bg)' : 'currentColor'} />
        </svg>
      )
    case 'settings':
      return (
        <svg {...common}>
          <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
          <circle cx="16" cy="7" r="2.5" fill={filled ? 'currentColor' : 'none'} />
          <circle cx="10" cy="17" r="2.5" fill={filled ? 'currentColor' : 'none'} />
        </svg>
      )
    case 'check':
      return (
        <svg {...common} strokeWidth={3}>
          <path d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
      )
    case 'plus':
      return (
        <svg {...common}>
          <path d="M12 5v14M5 12h14" />
        </svg>
      )
    case 'close':
      return (
        <svg {...common}>
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      )
    case 'arrow':
      return (
        <svg {...common}>
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      )
  }
}
