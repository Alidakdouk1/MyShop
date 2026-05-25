import { Link } from 'react-router-dom'
import Reveal from '../../common/Reveal'

function imgSrc(url) {
  if (!url) return null
  if (url.startsWith('http') || url.startsWith('blob') || url.startsWith('/')) return url
  return `/MyShop/backend/${url}`
}

export default function ImageTextSection({ data = {} }) {
  const imageLeft = data.image_side !== 'right'
  const src       = imgSrc(data.image_url)

  return (
    <section
      className="px-4 py-12"
      style={data.bg_color ? { background: data.bg_color } : {}}
    >
      <div
        className={`max-w-screen-xl mx-auto flex flex-col md:flex-row gap-10 items-center ${
          imageLeft ? '' : 'md:flex-row-reverse'
        }`}
      >
        <Reveal variant={imageLeft ? 'left' : 'right'} className="flex-1 w-full">
          {src ? (
            <div className="group overflow-hidden rounded-2xl shadow-premium">
              <img
                src={src}
                alt={data.title || ''}
                loading="lazy"
                className="w-full object-cover aspect-video transition-transform duration-700 ease-(--ease-out-soft) group-hover:scale-[1.04]"
              />
            </div>
          ) : (
            <div className="w-full rounded-2xl aspect-video bg-surface-alt border border-border flex items-center justify-center text-ink-tertiary text-sm">
              No image
            </div>
          )}
        </Reveal>

        <Reveal variant={imageLeft ? 'right' : 'left'} className="flex-1 space-y-4">
          {data.title && (
            <h2
              className="text-3xl md:text-4xl font-black leading-tight tracking-tight"
              style={{ color: data.text_color || 'var(--color-ink)' }}
            >
              {data.title}
            </h2>
          )}
          {data.text && (
            <p
              className="leading-relaxed whitespace-pre-line"
              style={{ color: data.text_color ? `${data.text_color}99` : 'var(--color-ink-secondary)' }}
            >
              {data.text}
            </p>
          )}
          {data.cta && data.cta_link && (
            <Link
              to={data.cta_link}
              className="shine inline-flex items-center gap-2 bg-ink text-white text-sm font-bold px-6 py-3 rounded-xl
                hover:bg-ink/80 hover:-translate-y-0.5 active:scale-95 transition-all duration-300 ease-(--ease-out-soft)"
            >
              {data.cta}
              <span aria-hidden="true">→</span>
            </Link>
          )}
        </Reveal>
      </div>
    </section>
  )
}
