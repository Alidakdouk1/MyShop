import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'

function Countdown({ endDate, textColor }) {
  const [left, setLeft] = useState({})

  useEffect(() => {
    const calc = () => {
      const diff = new Date(endDate) - new Date()
      if (diff <= 0) return setLeft({ expired: true })
      setLeft({
        d: Math.floor(diff / 86400000),
        h: Math.floor((diff % 86400000) / 3600000),
        m: Math.floor((diff % 3600000)  / 60000),
        s: Math.floor((diff % 60000)    / 1000),
      })
    }
    calc()
    const timer = setInterval(calc, 1000)
    return () => clearInterval(timer)
  }, [endDate])

  const tc = textColor || '#ffffff'

  if (left.expired) return <p className="text-sm mt-4" style={{ color: `${tc}80` }}>Offer has ended</p>

  return (
    <div className="flex items-center gap-3 justify-center mt-5">
      {[['d', 'Days'], ['h', 'Hrs'], ['m', 'Min'], ['s', 'Sec']].map(([k, lbl]) => (
        <div key={k} className="text-center">
          <div className="bg-white/20 backdrop-blur rounded-xl px-4 py-2 min-w-[60px]">
            <p className="text-2xl font-black tabular-nums" style={{ color: tc }}>
              {String(left[k] ?? 0).padStart(2, '0')}
            </p>
          </div>
          <p className="text-[10px] mt-1 uppercase tracking-wider" style={{ color: `${tc}80` }}>{lbl}</p>
        </div>
      ))}
    </div>
  )
}

export default function OfferSection({ data = {} }) {
  const paddingY  = data.padding_y  != null ? data.padding_y  : 64
  const paddingX  = data.padding_x  != null ? data.padding_x  : 16
  const maxWidth  = data.max_width  || 672
  const minHeight = data.min_height || 0

  return (
    <section
      style={{
        background:    data.bg_color || '#C0392B',
        paddingTop:    `${paddingY}px`,
        paddingBottom: `${paddingY}px`,
        paddingLeft:   `${paddingX}px`,
        paddingRight:  `${paddingX}px`,
        textAlign:     'center',
        minHeight:     minHeight > 0 ? `${minHeight}px` : undefined,
        display:       minHeight > 0 ? 'flex' : undefined,
        alignItems:    minHeight > 0 ? 'center' : undefined,
        justifyContent:minHeight > 0 ? 'center' : undefined,
      }}
    >
      <div style={{ maxWidth: `${maxWidth}px`, width: '100%', margin: '0 auto' }}>
        {data.title && (
          <h2 className="text-4xl font-black mb-2" style={{ color: data.text_color || '#ffffff' }}>
            {data.title}
          </h2>
        )}
        {data.subtitle && (
          <p className="text-lg" style={{ color: `${data.text_color || '#ffffff'}bb` }}>
            {data.subtitle}
          </p>
        )}
        {data.countdown_end && (
          <Countdown endDate={data.countdown_end} textColor={data.text_color} />
        )}
        {data.cta && data.cta_link && (
          <Link
            to={data.cta_link}
            className="inline-block mt-8 bg-white font-bold text-sm px-8 py-3 rounded-xl hover:bg-white/90 transition-all"
            style={{ color: data.bg_color || '#C0392B' }}
          >
            {data.cta}
          </Link>
        )}
      </div>
    </section>
  )
}
