import { Link } from 'react-router-dom'

/**
 * Brand-themed empty state. Used wherever a page or list has nothing to show
 * (empty cart, no orders yet, wishlist with zero items, etc.).
 *
 * Props:
 *   icon        – optional custom icon (SVG node). Defaults to the brand monogram.
 *   title       – headline ("Your cart is waiting")
 *   description – sub-copy
 *   primary     – { label, to }  — main CTA, rendered as Link
 *   secondary   – { label, to }  — optional secondary CTA (link or button)
 *   accent      – 'teal' (default) | 'lime' | 'navy'  — controls the monogram ring
 *   children    – optional extra content rendered under the CTAs (chips, etc.)
 */
const ACCENTS = {
  teal: { ring: 'rgba(0,216,200,0.35)', glow: 'rgba(0,216,200,0.20)', fill: '#00D8C8' },
  lime: { ring: 'rgba(163,255,18,0.45)', glow: 'rgba(163,255,18,0.20)', fill: '#A3FF12' },
  navy: { ring: 'rgba(15,23,42,0.18)',  glow: 'rgba(15,23,42,0.10)',  fill: '#0F172A' },
}

function Monogram({ accent }) {
  const c = ACCENTS[accent] || ACCENTS.teal
  return (
    <div
      aria-hidden="true"
      style={{
        width: 96, height: 96, borderRadius: '50%',
        background:        `radial-gradient(circle at 30% 30%, #ffffff, #FAFAFC 70%)`,
        boxShadow:         `0 0 0 8px ${c.glow}, 0 8px 24px -8px ${c.ring}, 0 0 0 1.5px ${c.ring}`,
        display:           'inline-flex',
        alignItems:        'center',
        justifyContent:    'center',
        marginInline:      'auto',
      }}
    >
      <svg width="44" height="44" viewBox="0 0 100 100" aria-hidden="true">
        <defs>
          <linearGradient id="pg-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%"  stopColor="#00D8C8" />
            <stop offset="100%" stopColor="#A3FF12" />
          </linearGradient>
        </defs>
        <text
          x="50" y="68"
          textAnchor="middle"
          fontFamily="Poppins, Inter, sans-serif"
          fontWeight="900"
          fontSize="54"
          letterSpacing="-3"
          fill="url(#pg-grad)"
        >
          PG
        </text>
      </svg>
    </div>
  )
}

export default function EmptyState({
  icon,
  title,
  description,
  primary,
  secondary,
  accent = 'teal',
  children,
}) {
  return (
    <div className="text-center py-12 px-4">
      {icon || <Monogram accent={accent} />}

      <h2
        className="font-bold text-ink mt-6"
        style={{ fontSize: '1.35rem', letterSpacing: '-0.01em' }}
      >
        {title}
      </h2>

      {description && (
        <p
          className="mx-auto mt-2"
          style={{ color: '#5C5854', fontSize: 14, lineHeight: 1.55, maxWidth: 380 }}
        >
          {description}
        </p>
      )}

      {(primary || secondary) && (
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 mt-6">
          {primary && (
            <Link
              to={primary.to}
              className="cta-glow inline-flex items-center justify-center"
              style={{
                background:    'linear-gradient(135deg, #00D8C8 0%, #0AB0A2 100%)',
                color:         '#fff',
                textDecoration:'none',
                padding:       '12px 22px',
                borderRadius:  12,
                fontSize:      12,
                fontWeight:    700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                minWidth:      180,
              }}
            >
              {primary.label}
            </Link>
          )}
          {secondary && (
            <Link
              to={secondary.to}
              className="inline-flex items-center justify-center"
              style={{
                background:    'transparent',
                color:         '#0F172A',
                textDecoration:'none',
                padding:       '12px 22px',
                borderRadius:  12,
                fontSize:      12,
                fontWeight:    700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                border:        '1.5px solid #E5E2DA',
                minWidth:      180,
              }}
            >
              {secondary.label}
            </Link>
          )}
        </div>
      )}

      {children && <div className="mt-8">{children}</div>}
    </div>
  )
}
