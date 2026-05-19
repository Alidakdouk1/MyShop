import { Link } from 'react-router-dom'

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
        ...(src
          ? { backgroundImage: `url(${src})`, backgroundSize: 'cover', backgroundPosition: 'center' }
          : { background: data.bg_color || '#1a1a1a' }
        ),
      }}
    >
      <div className="absolute inset-0 bg-black/30" />
      <div className={`relative z-10 w-full flex flex-col ${alignItems} px-8 py-16 max-w-screen-xl mx-auto`}>
        {data.title && (
          <h2
            className={`text-4xl md:text-6xl font-black mb-4 ${textAlign}`}
            style={{ color: data.text_color || '#ffffff' }}
          >
            {data.title}
          </h2>
        )}
        {data.subtitle && (
          <p
            className={`text-lg mb-8 max-w-xl ${textAlign}`}
            style={{ color: `${data.text_color || '#ffffff'}bb` }}
          >
            {data.subtitle}
          </p>
        )}
        {data.cta && data.cta_link && (
          <Link
            to={data.cta_link}
            className="inline-block bg-white text-ink font-bold text-sm px-8 py-3 rounded-xl hover:bg-white/90 transition-all"
          >
            {data.cta}
          </Link>
        )}
      </div>
    </section>
  )
}
