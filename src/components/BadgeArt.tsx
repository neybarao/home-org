import { useId, type ReactNode } from 'react'
import { BADGES, type BadgeCategory } from '../lib/badges'

/*
 * Desenhos das conquistas, em vetor, no estilo adesivo: borda clara, fundo com
 * raios de sol, brilho no canto e, quando tem número, uma fitinha embaixo.
 * Só cores da marca Dia (e as derivadas do handoff). Cada categoria tem um formato:
 * Primeiros passos = círculo, Sequência = hexágono, Constância = escudo,
 * Mãos à obra = roseta (sol), Ritmo da casa = quadrado arredondado.
 * Bloqueada, a figura fica monocromática pelo CSS (filtro), não aqui.
 */

// Paleta Dia
const P = '#EEE9DF' // Palladian
const P2 = '#F7F4EE' // derivada, creme claro
const O = '#C9C1B1' // Oatmeal
const B = '#2C3B4D' // Blue Fantastic
const B2 = '#3E5268' // derivada, azul médio
const A = '#1B2632' // Abyssal
const F = '#FFB162' // Burning Flame
const F2 = '#FFD3A3' // derivada, laranja claro
const T = '#A35139' // Truffle
const T2 = '#D4806A' // derivada, Truffle clara
const S = '#9FB2C8' // derivada, azul acinzentado
const S2 = '#C5D0DC' // derivada, azul claro
const C = '#F2C9B8' // derivada, pêssego

interface Theme {
  bg: string
  rim: string
  ribbon?: string
  /** Cor dos raios por cima do fundo. */
  ray?: string
}

const THEMES: Record<string, Theme> = {
  'primeiro-raio': { bg: B, rim: S2 },
  'dia-pleno': { bg: S, rim: P2 },
  'boa-noite': { bg: A, rim: B2 },
  'em-dupla': { bg: C, rim: P2, ray: '#fff' },

  embalo: { bg: O, rim: P2, ribbon: B, ray: '#fff' },
  'semana-redonda': { bg: S, rim: P2, ribbon: T },
  quinzena: { bg: B2, rim: S2, ribbon: F },
  'lua-cheia': { bg: B, rim: S, ribbon: T2 },
  estacao: { bg: T, rim: F2, ribbon: A },

  broto: { bg: B2, rim: S2, ribbon: T2 },
  jardim: { bg: T2, rim: C, ribbon: B },
  centenario: { bg: F, rim: F2, ribbon: T, ray: '#fff' },

  balde: { bg: T2, rim: C, ribbon: B },
  espuma: { bg: B2, rim: S2, ribbon: T },
  'mil-sois': { bg: T, rim: F, ribbon: A },

  'sono-tranquilo': { bg: B, rim: S, ribbon: T2 },
  'tres-aneis': { bg: A, rim: B2 },
  'fim-de-semana': { bg: S, rim: P2 },
  'jogo-de-cintura': { bg: B2, rim: S2, ribbon: T },
  cume: { bg: C, rim: P2, ribbon: B, ray: '#fff' },
}

// ---------- Formatos ----------

const CX = 60
const CY = 60

function hexagon(r: number) {
  return Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i - Math.PI / 2
    return `${(CX + r * Math.cos(a)).toFixed(2)},${(CY + r * Math.sin(a)).toFixed(2)}`
  }).join(' ')
}

/** Roseta com bolinhas em volta, lembrando um sol. */
function rosette(r: number, n = 16) {
  const pts = Array.from({ length: n }, (_, i) => {
    const a = ((Math.PI * 2) / n) * i - Math.PI / 2
    return [CX + r * Math.cos(a), CY + r * Math.sin(a)]
  })
  const chord = Math.hypot(pts[1][0] - pts[0][0], pts[1][1] - pts[0][1])
  const br = (chord / 2) * 1.15
  let d = `M${pts[0][0].toFixed(2)} ${pts[0][1].toFixed(2)}`
  for (let i = 1; i <= n; i++) {
    const p = pts[i % n]
    d += ` A${br.toFixed(2)} ${br.toFixed(2)} 0 0 1 ${p[0].toFixed(2)} ${p[1].toFixed(2)}`
  }
  return d + 'Z'
}

const SHIELD = 'M60 6 C74 13 88 15 102 15 C104 15 105 16 105 18 L105 54 C105 82 86 101 60 114 C34 101 15 82 15 54 L15 18 C15 16 16 15 18 15 C32 15 46 13 60 6Z'

/** Formato da categoria. `inset` encolhe em volta do centro (para o miolo). */
function Shape({ category, inset = 0, ...rest }: { category: BadgeCategory; inset?: number } & React.SVGProps<SVGElement>) {
  const k = 1 - inset
  const t = `translate(${CX * (1 - k)} ${CY * (1 - k)}) scale(${k})`
  const props = rest as React.SVGProps<SVGPathElement>
  switch (category) {
    case 'inicio':
      return <circle cx={CX} cy={CY} r={52 * k} {...(rest as React.SVGProps<SVGCircleElement>)} />
    case 'sequencia':
      return (
        <polygon
          points={hexagon(48)}
          transform={t}
          strokeLinejoin="round"
          strokeWidth={10}
          stroke={(rest.fill as string) ?? 'none'}
          {...(rest as React.SVGProps<SVGPolygonElement>)}
        />
      )
    case 'constancia':
      return <path d={SHIELD} transform={t} {...props} />
    case 'volume':
      return <path d={rosette(46)} transform={t} {...props} />
    case 'ritmo':
      return <rect x={10} y={10} width={100} height={100} rx={30} transform={t} {...(rest as React.SVGProps<SVGRectElement>)} />
  }
}

// ---------- Peças ----------

/** Brilho de quatro pontas. */
function Sparkle({ x, y, r, fill = '#fff', opacity = 1 }: { x: number; y: number; r: number; fill?: string; opacity?: number }) {
  const q = r * 0.28
  return (
    <path
      d={`M${x} ${y - r} Q${x + q} ${y - q} ${x + r} ${y} Q${x + q} ${y + q} ${x} ${y + r} Q${x - q} ${y + q} ${x - r} ${y} Q${x - q} ${y - q} ${x} ${y - r}Z`}
      fill={fill}
      opacity={opacity}
    />
  )
}

/** Raios de sol no fundo (fatias alternadas). */
function Rays({ color, opacity }: { color: string; opacity: number }) {
  const n = 14
  const wedges = []
  for (let i = 0; i < n; i++) {
    const a1 = ((Math.PI * 2) / n) * i
    const a2 = a1 + Math.PI / n
    const R = 90
    wedges.push(
      <path
        key={i}
        d={`M${CX} ${CY} L${CX + R * Math.cos(a1)} ${CY + R * Math.sin(a1)} L${CX + R * Math.cos(a2)} ${CY + R * Math.sin(a2)}Z`}
      />,
    )
  }
  return (
    <g fill={color} opacity={opacity}>
      {wedges}
    </g>
  )
}

/** Fitinha com o número, atravessando a parte de baixo. */
function Ribbon({ value, color }: { value: number; color: string }) {
  const label = String(value)
  const w = 26 + label.length * 9.5
  const x = CX - w / 2
  const y = 88
  const h = 20
  return (
    <g>
      {/* pontas dobradas */}
      <path d={`M${x + 4} ${y + 5} L${x - 10} ${y + 5} L${x - 4} ${y + 12} L${x - 10} ${y + h + 4} L${x + 4} ${y + h + 4}Z`} fill={color} />
      <path d={`M${x + w - 4} ${y + 5} L${x + w + 10} ${y + 5} L${x + w + 4} ${y + 12} L${x + w + 10} ${y + h + 4} L${x + w - 4} ${y + h + 4}Z`} fill={color} />
      <path d={`M${x + 4} ${y + h + 4} L${x + 4} ${y + h} L${x} ${y + h}Z`} fill="#000" opacity={0.35} />
      <path d={`M${x + w - 4} ${y + h + 4} L${x + w - 4} ${y + h} L${x + w} ${y + h}Z`} fill="#000" opacity={0.35} />
      <rect x={x} y={y} width={w} height={h} rx={3} fill={color} />
      <rect x={x} y={y} width={w} height={h / 2} rx={3} fill="#fff" opacity={0.12} />
      <text
        x={CX}
        y={y + h / 2 + 5.2}
        textAnchor="middle"
        fontSize={15}
        fontWeight={800}
        fill={P}
        style={{ fontFamily: 'inherit', letterSpacing: '0.02em' }}
      >
        {label}
      </text>
    </g>
  )
}

/** Lua crescente: círculo menos outro círculo deslocado. */
function crescent(cx: number, cy: number, r: number, dx: number, dy: number, r2: number) {
  const x2 = cx + dx
  const y2 = cy + dy
  const d = Math.hypot(dx, dy)
  const a = (r * r - r2 * r2 + d * d) / (2 * d)
  const h = Math.sqrt(Math.max(0, r * r - a * a))
  const mx = cx + (a * dx) / d
  const my = cy + (a * dy) / d
  const p1 = [mx + (h * dy) / d, my - (h * dx) / d]
  const p2 = [mx - (h * dy) / d, my + (h * dx) / d]
  void x2
  void y2
  const f = (n: number) => n.toFixed(2)
  return `M${f(p1[0])} ${f(p1[1])} A${r} ${r} 0 1 0 ${f(p2[0])} ${f(p2[1])} A${r2} ${r2} 0 0 1 ${f(p1[0])} ${f(p1[1])}Z`
}

// ---------- Ilustrações ----------

const ART: Record<string, (hasRibbon: boolean) => ReactNode> = {
  'primeiro-raio': () => (
    <g>
      {[-60, -30, 0, 30, 60].map((deg) => (
        <line
          key={deg}
          x1={60 + 27 * Math.sin((deg * Math.PI) / 180)}
          y1={66 - 27 * Math.cos((deg * Math.PI) / 180)}
          x2={60 + 36 * Math.sin((deg * Math.PI) / 180)}
          y2={66 - 36 * Math.cos((deg * Math.PI) / 180)}
          stroke={F2}
          strokeWidth={4.5}
          strokeLinecap="round"
        />
      ))}
      <path d="M38 66 A22 22 0 0 1 82 66Z" fill={F} />
      <path d="M44 60 A16 16 0 0 1 60 46" stroke="#fff" strokeOpacity={0.45} strokeWidth={3.5} fill="none" strokeLinecap="round" />
      <rect x={30} y={70} width={60} height={5} rx={2.5} fill={P} />
      <rect x={40} y={80} width={40} height={4} rx={2} fill={S2} opacity={0.8} />
      <rect x={50} y={88} width={20} height={3.5} rx={1.75} fill={S2} opacity={0.5} />
    </g>
  ),
  'dia-pleno': () => (
    <g>
      {Array.from({ length: 10 }, (_, i) => {
        const a = (Math.PI * 2 * i) / 10
        return (
          <line key={i} x1={60 + 25 * Math.cos(a)} y1={60 + 25 * Math.sin(a)} x2={60 + 34 * Math.cos(a)} y2={60 + 34 * Math.sin(a)} stroke={F2} strokeWidth={5} strokeLinecap="round" />
        )
      })}
      <circle cx={60} cy={60} r={20} fill={F} />
      <circle cx={60} cy={60} r={20} fill="none" stroke="#fff" strokeOpacity={0.35} strokeWidth={3} strokeDasharray="22 200" transform="rotate(200 60 60)" />
      <path d="M51 60.5 L57.5 67 L70 53.5" fill="none" stroke={A} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
    </g>
  ),
  'boa-noite': () => (
    <g>
      <path d={crescent(58, 60, 24, 12, -8, 20)} fill={F2} />
      <path d={crescent(58, 60, 24, 12, -8, 20)} fill="none" stroke="#fff" strokeOpacity={0.3} strokeWidth={2} />
      <circle cx={47} cy={70} r={3} fill={F} opacity={0.6} />
      <circle cx={42} cy={58} r={2} fill={F} opacity={0.6} />
      <Sparkle x={80} y={46} r={7} fill={F} />
      <Sparkle x={84} y={70} r={4.5} fill={P} />
      <Sparkle x={70} y={33} r={3.5} fill={P} />
    </g>
  ),
  'em-dupla': () => (
    <g>
      <path d="M26 92 C26 74 34 66 46 66 C58 66 66 74 66 92Z" fill={S} />
      <circle cx={46} cy={52} r={12} fill={S2} />
      <path d="M54 92 C54 74 62 66 74 66 C86 66 94 74 94 92Z" fill={T2} />
      <circle cx={74} cy={52} r={12} fill={F2} />
      <path d="M60 40 C60 35 53 33 53 38 C53 42 60 46 60 46 C60 46 67 42 67 38 C67 33 60 35 60 40Z" fill={T} transform="translate(0 -6)" />
    </g>
  ),

  embalo: () => (
    <g transform="translate(0 -6)">
      <line x1={80} y1={30} x2={58} y2={62} stroke={T} strokeWidth={5} strokeLinecap="round" />
      <path d="M50 58 L66 69 L58 84 C52 88 38 80 36 74Z" fill={F} />
      <path d="M50 58 L66 69 L63 74 L46 63Z" fill={T} />
      <path d="M42 76 L48 70 M47 80 L53 73 M52 83 L57 77" stroke={T} strokeWidth={1.8} strokeLinecap="round" />
      <circle cx={30} cy={84} r={3.5} fill="#fff" opacity={0.7} />
      <circle cx={25} cy={77} r={2.5} fill="#fff" opacity={0.5} />
      <path d="M72 82 h12 M76 76 h10" stroke={B} strokeOpacity={0.35} strokeWidth={3} strokeLinecap="round" />
    </g>
  ),
  'semana-redonda': () => (
    <g transform="translate(0 -6)">
      <rect x={34} y={36} width={52} height={46} rx={9} fill={P2} />
      <path d="M34 45 a9 9 0 0 1 9 -9 h34 a9 9 0 0 1 9 9 v4 h-52Z" fill={T} />
      <rect x={44} y={30} width={5} height={11} rx={2.5} fill={B} />
      <rect x={71} y={30} width={5} height={11} rx={2.5} fill={B} />
      {[0, 1, 2, 3, 4, 5, 6].map((i) => {
        const col = i % 4
        const row = Math.floor(i / 4)
        return <circle key={i} cx={44 + col * 10.7 + (row ? 5.3 : 0)} cy={59 + row * 12} r={4} fill={F} />
      })}
    </g>
  ),
  quinzena: () => (
    <g transform="translate(0 -6)">
      <path d="M48 52 h22 l3 8 v24 a6 6 0 0 1 -6 6 h-16 a6 6 0 0 1 -6 -6 v-24Z" fill={S2} />
      <rect x={45} y={64} width={28} height={12} fill={F} />
      <path d="M50 52 v-8 h20 l8 6 l-3 3 l-6 -3 v2Z" fill={P} />
      <rect x={52} y={36} width={14} height={9} rx={2} fill={P} />
      <path d="M50 54 v30" stroke="#fff" strokeOpacity={0.5} strokeWidth={3} strokeLinecap="round" />
      <circle cx={84} cy={42} r={2.4} fill={P} />
      <circle cx={89} cy={50} r={2} fill={P} opacity={0.8} />
      <circle cx={86} cy={34} r={1.8} fill={P} opacity={0.7} />
      <Sparkle x={33} y={46} r={7} fill={F2} />
      <Sparkle x={88} y={66} r={5} fill={F2} />
    </g>
  ),
  'lua-cheia': () => (
    <g transform="translate(0 -5)">
      <circle cx={60} cy={56} r={24} fill={F2} />
      <circle cx={52} cy={50} r={5} fill={F} opacity={0.55} />
      <circle cx={67} cy={63} r={7} fill={F} opacity={0.45} />
      <circle cx={66} cy={45} r={3} fill={F} opacity={0.5} />
      <circle cx={50} cy={66} r={3.4} fill={F} opacity={0.45} />
      <path d="M41 46 A22 22 0 0 1 56 34" stroke="#fff" strokeOpacity={0.55} strokeWidth={3.5} fill="none" strokeLinecap="round" />
      <Sparkle x={31} y={34} r={5} fill={P} />
      <Sparkle x={90} y={74} r={4} fill={P} />
    </g>
  ),
  estacao: () => (
    <g transform="translate(0 -6)">
      <rect x={56} y={58} width={8} height={26} rx={3} fill={A} />
      <path d="M60 70 L50 62 M60 66 L69 60" stroke={A} strokeWidth={3.5} strokeLinecap="round" />
      <circle cx={46} cy={54} r={13} fill={F} />
      <circle cx={74} cy={54} r={13} fill={T2} />
      <circle cx={60} cy={42} r={16} fill={F2} />
      <circle cx={60} cy={58} r={11} fill={F} />
      <circle cx={53} cy={37} r={4} fill="#fff" opacity={0.4} />
      <path d="M78 76 q4 -3 7 0 q-3 4 -7 0Z" fill={F2} />
      <path d="M34 72 q4 -3 7 0 q-3 4 -7 0Z" fill={F} />
    </g>
  ),

  broto: () => (
    <g transform="translate(0 -6)">
      <path d="M38 82 C38 74 82 74 82 82Z" fill={T2} />
      <path d="M60 78 C60 66 60 60 60 54" stroke={P} strokeWidth={4} strokeLinecap="round" fill="none" />
      <path d="M60 60 C50 60 42 54 40 44 C50 43 58 48 60 60Z" fill={S2} />
      <path d="M60 56 C64 46 72 40 82 40 C81 50 72 57 60 56Z" fill={P} />
      <path d="M60 60 C54 56 48 52 44 47" stroke={B2} strokeOpacity={0.4} strokeWidth={1.5} fill="none" />
    </g>
  ),
  jardim: () => (
    <g transform="translate(0 -6)">
      <path d="M44 70 h32 l-4 18 h-24Z" fill={B} />
      <rect x={42} y={66} width={36} height={7} rx={2} fill={B2} />
      <path d="M60 66 V44" stroke={P} strokeWidth={3.5} strokeLinecap="round" />
      <path d="M60 60 C50 60 44 54 42 46 C51 46 57 50 60 60Z" fill={S2} />
      <path d="M60 56 C66 50 72 48 79 50 C76 57 68 60 60 56Z" fill={P} />
      {[0, 72, 144, 216, 288].map((d) => (
        <ellipse key={d} cx={60} cy={34} rx={4.5} ry={7} fill={P2} transform={`rotate(${d} 60 40)`} />
      ))}
      <circle cx={60} cy={40} r={5} fill={F} />
    </g>
  ),
  centenario: () => (
    <g transform="translate(0 -6)">
      <rect x={56} y={56} width={8} height={28} rx={3} fill={T} />
      <path d="M60 70 L50 62 M60 64 L70 58" stroke={T} strokeWidth={3.5} strokeLinecap="round" />
      <circle cx={60} cy={44} r={20} fill={B2} />
      <circle cx={46} cy={54} r={12} fill={B} />
      <circle cx={74} cy={54} r={12} fill={B} />
      <circle cx={60} cy={40} r={13} fill={S} />
      <circle cx={54} cy={35} r={4} fill="#fff" opacity={0.35} />
      <circle cx={68} cy={50} r={2.6} fill={F2} />
      <circle cx={50} cy={46} r={2.6} fill={F2} />
      <circle cx={62} cy={58} r={2.6} fill={F2} />
      <rect x={34} y={82} width={52} height={4} rx={2} fill={T} opacity={0.5} />
    </g>
  ),

  balde: () => (
    <g transform="translate(0 -6)">
      <path d="M40 48 A20 20 0 0 1 80 48" fill="none" stroke={B} strokeWidth={3.5} />
      <path d="M38 50 h44 l-6 34 a4 4 0 0 1 -4 3 h-24 a4 4 0 0 1 -4 -3Z" fill={S2} />
      <rect x={37} y={47} width={46} height={7} rx={3.5} fill={B} />
      <path d="M41 62 h38 l-1 6 h-36Z" fill={B2} opacity={0.5} />
      <path d="M44 56 l3 28" stroke="#fff" strokeOpacity={0.6} strokeWidth={3} strokeLinecap="round" />
      <circle cx={52} cy={40} r={5} fill={P2} />
      <circle cx={63} cy={36} r={6.5} fill={P2} />
      <circle cx={72} cy={42} r={4} fill={P2} />
      <circle cx={61} cy={34} r={2} fill="#fff" />
    </g>
  ),
  espuma: () => (
    <g transform="translate(0 -6)">
      <rect x={36} y={52} width={42} height={30} rx={8} fill={F} transform="rotate(-10 57 67)" />
      <rect x={36} y={52} width={42} height={10} rx={5} fill={T2} transform="rotate(-10 57 67)" />
      <circle cx={48} cy={72} r={2.6} fill={T2} />
      <circle cx={60} cy={70} r={2} fill={T2} />
      <circle cx={68} cy={76} r={2.6} fill={T2} />
      <circle cx={56} cy={79} r={1.8} fill={T2} />
      {[
        [74, 42, 9],
        [86, 56, 6],
        [58, 38, 6],
        [44, 44, 4],
      ].map(([x, y, r]) => (
        <g key={`${x}-${y}`}>
          <circle cx={x} cy={y} r={r} fill={P2} fillOpacity={0.25} stroke={P2} strokeWidth={2} />
          <circle cx={x - r * 0.35} cy={y - r * 0.35} r={r * 0.25} fill="#fff" />
        </g>
      ))}
    </g>
  ),
  'mil-sois': () => (
    <g transform="translate(0 -6)">
      {Array.from({ length: 8 }, (_, i) => {
        const a = (Math.PI * 2 * i) / 8 - Math.PI / 2
        return <line key={i} x1={60 + 11 * Math.cos(a)} y1={34 + 11 * Math.sin(a)} x2={60 + 16 * Math.cos(a)} y2={34 + 16 * Math.sin(a)} stroke={F2} strokeWidth={3} strokeLinecap="round" />
      })}
      <circle cx={60} cy={34} r={8} fill={F2} />
      <path d="M36 52 L46 64 L60 46 L74 64 L84 52 L80 82 H40Z" fill={F} />
      <rect x={40} y={78} width={40} height={8} rx={3} fill={F2} />
      <circle cx={60} cy={68} r={4.5} fill={B} />
      <circle cx={47} cy={72} r={3} fill={P} />
      <circle cx={73} cy={72} r={3} fill={P} />
      <circle cx={36} cy={52} r={3.5} fill={F2} />
      <circle cx={84} cy={52} r={3.5} fill={F2} />
      <path d="M44 60 L42 78" stroke="#fff" strokeOpacity={0.45} strokeWidth={3} strokeLinecap="round" />
    </g>
  ),

  'sono-tranquilo': () => (
    <g transform="translate(0 -6)">
      <rect x={30} y={58} width={60} height={26} rx={12} fill={P2} />
      <path d="M36 66 Q60 58 84 66" stroke={O} strokeWidth={2} fill="none" strokeLinecap="round" />
      <path d={crescent(54, 46, 12, 6, -4, 10)} fill={F} />
      <text x={72} y={46} fontSize={13} fontWeight={800} fill={S2} style={{ fontFamily: 'inherit' }}>
        z
      </text>
      <text x={80} y={36} fontSize={10} fontWeight={800} fill={S2} opacity={0.75} style={{ fontFamily: 'inherit' }}>
        z
      </text>
    </g>
  ),
  'tres-aneis': () => (
    <g transform="rotate(-90 60 60)">
      {[
        [30, F, 0.88],
        [21, T2, 0.8],
        [12, S, 0.95],
      ].map(([r, c, v]) => {
        const len = 2 * Math.PI * (r as number)
        return (
          <g key={r as number}>
            <circle cx={60} cy={60} r={r as number} fill="none" stroke={c as string} strokeOpacity={0.25} strokeWidth={7} />
            <circle cx={60} cy={60} r={r as number} fill="none" stroke={c as string} strokeWidth={7} strokeLinecap="round" strokeDasharray={`${len * (v as number)} ${len}`} />
          </g>
        )
      })}
    </g>
  ),
  'fim-de-semana': () => (
    <g>
      <circle cx={78} cy={40} r={11} fill={F} />
      <path d="M38 54 h34 v18 a14 14 0 0 1 -14 14 h-6 a14 14 0 0 1 -14 -14Z" fill={P2} />
      <path d="M72 58 h4 a7 7 0 0 1 0 14 h-5" stroke={P2} strokeWidth={4.5} fill="none" />
      <ellipse cx={55} cy={55} rx={16} ry={3.2} fill={T} />
      <path d="M42 60 v12" stroke={O} strokeWidth={3} strokeLinecap="round" />
      <path d="M48 46 q-4 -5 0 -10 q4 -5 0 -10 M58 46 q-4 -5 0 -10 q4 -5 0 -10" stroke={P2} strokeWidth={3} fill="none" strokeLinecap="round" opacity={0.85} />
      <rect x={32} y={88} width={56} height={4} rx={2} fill={B} opacity={0.3} />
    </g>
  ),
  'jogo-de-cintura': () => (
    <g transform="translate(0 -6)">
      <path d="M66 28 L42 62 H58 L52 88 L80 50 H63Z" fill={F} stroke={T} strokeWidth={3} strokeLinejoin="round" />
      <path d="M62 36 L49 56" stroke="#fff" strokeOpacity={0.55} strokeWidth={3} strokeLinecap="round" />
      <Sparkle x={34} y={40} r={6} fill={F2} />
      <Sparkle x={86} y={72} r={5} fill={P} />
    </g>
  ),
  cume: () => (
    <g transform="translate(0 -6)">
      <path d="M24 86 L50 50 L62 64 L74 46 L98 86Z" fill={S} />
      <path d="M24 86 L50 50 L76 86Z" fill={B2} />
      <path d="M50 50 L44 58 L49 56 L53 60 L56 54Z" fill={P2} />
      <path d="M74 46 L69 53 L74 51 L78 55 L80 54Z" fill={P2} />
      <line x1={74} y1={46} x2={74} y2={26} stroke={B} strokeWidth={2.5} strokeLinecap="round" />
      <path d="M74 27 L88 31 L74 36Z" fill={T} />
    </g>
  ),
}

/** Uma conquista desenhada. Bloqueada, quem tira a cor é o CSS (classe badge-locked). */
export function BadgeArt({ id, size = 96, className = '', title }: { id: string; size?: number; className?: string; title?: string }) {
  const uid = useId().replace(/:/g, '')
  const badge = BADGES.find((b) => b.id === id)
  if (!badge) return null
  const theme = THEMES[id]
  const clip = `clip-${uid}`
  const hasRibbon = badge.number !== undefined && !!theme.ribbon

  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 120 124"
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      style={{ overflow: 'visible' }}
    >
      <defs>
        <clipPath id={clip}>
          <Shape category={badge.category} inset={0.12} />
        </clipPath>
      </defs>
      {/* sombra de adesivo */}
      <g transform="translate(0 4)" opacity={0.18}>
        <Shape category={badge.category} fill={A} />
      </g>
      <Shape category={badge.category} fill={theme.rim} />
      <Shape category={badge.category} inset={0.12} fill={theme.bg} />
      <g clipPath={`url(#${clip})`}>
        <Rays color={theme.ray ?? '#fff'} opacity={theme.ray ? 0.22 : 0.07} />
        {/* metade de baixo levemente mais escura, para dar volume */}
        <rect x={0} y={62} width={120} height={70} fill={A} opacity={0.08} />
        {ART[id](hasRibbon)}
      </g>
      <Sparkle x={30} y={30} r={7.5} />
      {hasRibbon && <Ribbon value={badge.number!} color={theme.ribbon!} />}
    </svg>
  )
}
