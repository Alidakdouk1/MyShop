import { Link } from 'react-router-dom'
import Reveal from '../../common/Reveal'

function imgSrc(url) {
  if (!url) return null
  if (url.startsWith('http') || url.startsWith('blob') || url.startsWith('/')) return url
  return `/MyShop/backend/${url}`
}

export default function PromoBannersSection({ data = {} }) {
  const banners = data.banners || []
  const layout  = data.layout  || '2col'
  const colMap  = { '1col': 1, '2col': 2, '3col': 3 }
  const cols    = colMap[layout] || 2

  const gridCls = cols === 1
    ? 'grid-cols-1'
    : cols === 3
      ? 'grid-cols-1 md:grid-cols-3'
      : 'grid-cols-1 md:grid-cols-2'

  return (
    <section className="max-w-screen-xl mx-auto px-4 py-8">
      <Reveal variant="stagger" className={`grid ${gridCls} gap-4`}>
        {banners.map((banner, i) => {
          const src = imgSrc(banner.image_url)
          return (
            <Link
              key={i}
              to={banner.link || '/shop'}
              className="relative overflow-hidden rounded-2xl p-8 min-h-[180px] flex flex-col justify-end group
                shadow-soft hover:shadow-float hover:-translate-y-1 transition-all duration-500 ease-(--ease-out-soft)"
              style={src
                ? { backgroundImage: `url(${src})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                : { background: banner.bg_color || '#333' }
              }
            >
              {/* Contrast overlay — darkens slightly more on hover for depth */}
              {src
                ? <div className="absolute inset-0 bg-linear-to-t from-black/55 via-black/10 to-transparent group-hover:from-black/65 transition-colors duration-500" />
                : <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, white, transparent 60%)' }} />
              }
              <p
                className="relative hero-display text-6xl text-white leading-none group-hover:scale-105 transition-transform duration-500 ease-(--ease-out-soft) origin-left drop-shadow"
                style={{ color: banner.text_color || '#ffffff' }}
              >
                {banner.title}
              </p>
              <p
                className="relative text-sm mt-1 font-medium"
                style={{ color: `${banner.text_color || '#ffffff'}cc` }}
              >
                {banner.subtitle}
              </p>
              <span
                className="relative mt-3 inline-flex items-center gap-1 text-sm font-bold group-hover:gap-2 transition-all duration-300"
                style={{ color: banner.text_color || '#ffffff' }}
              >
                {banner.cta}
                {banner.cta && <span aria-hidden="true">→</span>}
              </span>
            </Link>
          )
        })}
      </Reveal>
    </section>
  )
}
