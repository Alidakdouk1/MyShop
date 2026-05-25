import { Link } from 'react-router-dom'
import Reveal from '../../common/Reveal'

function imgSrc(url) {
  if (!url) return null
  if (url.startsWith('http') || url.startsWith('blob') || url.startsWith('/')) return url
  return `/MyShop/backend/${url}`
}

export default function CustomBannerSection({ data = {} }) {
  const src       = imgSrc(data.image_url)
  const minHeight = data.height ? `${data.height}px` : '320px'
  const alignment = data.alignment || 'center'
  const alignItems = alignment === 'left' ? 'items-start' : alignment === 'right' ? 'items-end' : 'items-center'
  const textAlign  = alignment === 'left' ? 'text-left'  : alignment === 'right' ? 'text-right' : 'text-center'

  return (
    <section
      className="relative overflow-hidden flex items-center"
      style={{
        minHeight,
        ...(src ? {} : { background: data.bg_color || '#1a1a1a' }),
      }}
    >
      {/* Ken-burns image layer — slow, subtle drift for cinematic depth */}
      {src && (
        <div
          className="absolute inset-0 animate-kenburns"
          style={{ backgroundImage: `url(${src})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
        />
      )}
      {/* Layered overlay: even darkening + bottom gradient for guaranteed contrast */}
      <div className="absolute inset-0 bg-black/30" />
      <div className="absolute inset-0 bg-linear-to-t from-black/55 via-black/10 to-black/25" />

      <Reveal
        variant="stagger"
        className={`relative z-10 w-full flex flex-col ${alignItems} px-8 py-16 max-w-screen-xl mx-auto`}
      >
        {data.title && (
          <h2
            className={`text-4xl md:text-6xl font-black mb-4 tracking-tight drop-shadow-sm ${textAlign}`}
            style={{ color: data.text_color || '#ffffff' }}
          >
            {data.title}
          </h2>
        )}
        {data.subtitle && (
          <p
            className={`text-lg mb-8 max-w-xl ${textAlign}`}
            style={{ color: `${data.text_color || '#ffffff'}cc` }}
          >
            {data.subtitle}
          </p>
        )}
        {data.cta && data.cta_link && (
          <Link
            to={data.cta_link}
            className="shine inline-block bg-white text-ink font-bold text-sm px-8 py-3.5 rounded-xl shadow-lg
              hover:bg-white hover:-translate-y-0.5 hover:shadow-xl active:scale-95 transition-all duration-300 ease-(--ease-out-soft)"
          >
            {data.cta}
          </Link>
        )}
      </Reveal>
    </section>
  )
}
