type Name = 'today' | 'house' | 'settings' | 'check' | 'plus' | 'close' | 'chevron' | 'solo' | 'swap'

export function Icon({ name, size = 22 }: { name: Name; size?: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  }
  switch (name) {
    case 'today':
      return (
        <svg {...common}>
          <rect x="4" y="5" width="16" height="15" rx="4" />
          <path d="M8.5 3v4M15.5 3v4M8.5 13l2.5 2.5 4.5-5" />
        </svg>
      )
    case 'house':
      return (
        <svg {...common}>
          <rect x="4" y="4" width="7" height="7" rx="2" />
          <rect x="13" y="4" width="7" height="7" rx="2" />
          <rect x="4" y="13" width="7" height="7" rx="2" />
          <rect x="13" y="13" width="7" height="7" rx="2" />
        </svg>
      )
    case 'settings':
      return (
        <svg {...common}>
          <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
          <circle cx="15" cy="7" r="2" />
          <circle cx="9" cy="17" r="2" />
        </svg>
      )
    case 'check':
      return (
        <svg {...common} strokeWidth={2.6}>
          <path d="M5.5 12.5l4 4L18.5 7.5" />
        </svg>
      )
    case 'plus':
      return (
        <svg {...common} strokeWidth={2.2}>
          <path d="M12 5v14M5 12h14" />
        </svg>
      )
    case 'close':
      return (
        <svg {...common} strokeWidth={2.2}>
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      )
    case 'chevron':
      return (
        <svg {...common} strokeWidth={2}>
          <path d="M9 6l6 6-6 6" />
        </svg>
      )
    case 'solo':
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="3.5" />
          <path d="M5 20c.8-3.5 3.6-5.5 7-5.5s6.2 2 7 5.5" />
        </svg>
      )
    case 'swap':
      return (
        <svg {...common}>
          <path d="M4 8h13l-3-3M20 16H7l3 3" />
        </svg>
      )
  }
}
