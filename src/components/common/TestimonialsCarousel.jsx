import { useEffect, useState, useRef } from 'react'
import { getTestimonials } from '../../api/testimonialApi'

// Session cache — the homepage rerenders frequently in dev, no need to refetch.
let _cache = null

const imgUrl = (src) =>
  src ? (src.startsWith('http') ? src : `/MyShop/backend/${src}`) : null

function Stars({ rating }) {
  return (
    <div className="flex gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map(i => (
        <svg key={i} className="w-4 h-4" viewBox="0 0 20 20"
          fill={i <= rating ? '#F59E0B' : '#E4E1D9'}>
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.366 2.446a1 1 0 00-.364 1.118l1.286 3.957c.3.921-.755 1.688-1.54 1.118l-3.366-2.446a1 1 0 00-1.176 0l-3.366 2.446c-.784.57-1.838-.197-1.539-1.118l1.286-3.957a1 1 0 00-.364-1.118L2.013 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.286-3.957z" />
        </svg>
      ))}
    </div>
  )
}

function Avatar({ name, photo }) {
  const url = imgUrl(photo)
  if (url) {
    return (
      <img src={url} alt={name}
        className="w-14 h-14 rounded-full object-cover ring-2 ring-white shadow-soft shrink-0"
        loading="lazy"
      />
    )
  }
  // Initials fallback so the carousel still looks composed without a photo.
  const initials = (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  return (
    <div className="w-14 h-14 rounded-full bg-ink text-white flex items-center justify-center font-bold text-sm shrink-0 ring-2 ring-white shadow-soft">
      {initials}
    </div>
  )
}

export default function TestimonialsCarousel() {
  const [items, setItems] = useState(_cache || [])
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const intervalRef = useRef(null)

  useEffect(() => {
    if (_cache) return
    getTestimonials()
      .then(r => { _cache = r.data.data || []; setItems(_cache) })
      .catch(() => setItems([]))
  }, [])

  // Auto-advance every 6s; pauses while user hovers/focuses inside.
  useEffect(() => {
    if (paused || items.length <= 1) return
    intervalRef.current = setInterval(
      () => setIndex(i => (i + 1) % items.length),
      6000
    )
    return () => clearInterval(intervalRef.current)
  }, [paused, items.length])

  if (!items.length) return null

  const goTo = (i) => setIndex((i + items.length) % items.length)
  const current = items[index]

  return (
    <section
      className="bg-surface-alt"
      style={{ padding: '64px 20px' }}
      aria-label="Customer testimonials"
    >
      <div className="max-w-screen-xl mx-auto">
        <div className="text-center mb-10">
          <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.25em', textTransform: 'uppercase', color: '#9C9894', marginBottom: 6 }}>
            What customers say
          </p>
          <h2 className="hero-display text-4xl tracking-wide text-ink">LOVED BY SHOPPERS</h2>
        </div>

        <div
          className="relative max-w-3xl mx-auto"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocus={() => setPaused(true)}
          onBlur={() => setPaused(false)}
        >
          {/* Card — keyed by index so the cross-fade animation re-runs per slide */}
          <div
            key={current.id}
            className="rounded-2xl bg-surface p-8 md:p-10 shadow-premium ring-1 ring-border/60"
            style={{ animation: 'fadeIn 0.5s var(--ease-out-soft) both' }}
          >
            {/* Big serif quote glyph as a watermark behind the text */}
            <div className="text-7xl leading-none font-serif text-ink/10 select-none" aria-hidden="true">"</div>
            <p className="text-lg md:text-xl text-ink-secondary leading-relaxed -mt-6 mb-6 italic">
              {current.body}
            </p>
            <div className="flex items-center gap-4">
              <Avatar name={current.name} photo={current.photo_url} />
              <div className="min-w-0">
                <p className="font-bold text-ink">{current.name}</p>
                {current.location && (
                  <p className="text-xs text-ink-tertiary">{current.location}</p>
                )}
                <div className="mt-1.5"><Stars rating={Number(current.rating) || 5} /></div>
              </div>
            </div>
          </div>

          {/* Prev / Next arrows — hidden on the smallest screens */}
          {items.length > 1 && (
            <>
              <button
                onClick={() => goTo(index - 1)}
                aria-label="Previous testimonial"
                className="hidden sm:flex absolute top-1/2 -translate-y-1/2 -left-4 md:-left-12 w-10 h-10 rounded-full bg-white shadow-float items-center justify-center text-ink hover:bg-ink hover:text-white transition-colors"
              >
                <svg className="w-4 h-4" data-rtl-flip fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={() => goTo(index + 1)}
                aria-label="Next testimonial"
                className="hidden sm:flex absolute top-1/2 -translate-y-1/2 -right-4 md:-right-12 w-10 h-10 rounded-full bg-white shadow-float items-center justify-center text-ink hover:bg-ink hover:text-white transition-colors"
              >
                <svg className="w-4 h-4" data-rtl-flip fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </>
          )}

          {/* Dots */}
          {items.length > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              {items.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goTo(i)}
                  aria-label={`Go to testimonial ${i + 1}`}
                  className="transition-all duration-300 rounded-full"
                  style={{
                    width:  i === index ? 24 : 8,
                    height: 8,
                    background: i === index ? '#0F0F0F' : '#C8C4BC',
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
