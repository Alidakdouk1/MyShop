import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'

function imgSrc(url) {
  if (!url) return null
  if (url.startsWith('http') || url.startsWith('blob') || url.startsWith('/')) return url
  return `/MyShop/backend/${url}`
}

const SLIDE_CSS = `
  @keyframes cc-in-r  { from { transform:translateX(100%) } to { transform:translateX(0) } }
  @keyframes cc-out-l { from { transform:translateX(0) }    to { transform:translateX(-100%) } }
  @keyframes cc-in-l  { from { transform:translateX(-100%) } to { transform:translateX(0) } }
  @keyframes cc-out-r { from { transform:translateX(0) }    to { transform:translateX(100%) } }
  @keyframes cc-prog  { from { width:0% } to { width:100% } }
`

export default function Hero3ColSection({ data = {} }) {
  const leftBanners = data.left_banners || []
  const center      = data.center       || {}
  const rightBrands = data.right_brands || []

  const slides = (center.slides?.length > 0)
    ? center.slides
    : [{ image_url: center.image_url || '', bg_color: center.bg_color || '#f5e8c8' }]

  // ── Admin-controlled settings ───────────────────────────────────────────────
  const intervalSec   = Math.max(1,   center.slide_interval    ?? 4.5)
  const transSec      = Math.max(0.2, center.slide_trans_dur   ?? 0.7)
  const transDurMs    = Math.round(transSec * 1000)
  const effect        = center.slide_effect        || 'fade'  // 'fade' | 'slide'
  const autoPlay      = center.slide_autoplay      !== false   // default on
  const showDots      = center.slide_show_dots     !== false   // default on
  const showArrows    = center.slide_show_arrows   === true    // default off
  const pauseOnHover  = center.slide_pause_hover   !== false   // default on
  const showProgress  = center.slide_show_progress !== false   // default on

  // ── State ───────────────────────────────────────────────────────────────────
  const [current,   setCurrent]   = useState(0)
  const [prev,      setPrev]      = useState(-1)
  const [dir,       setDir]       = useState(1)
  const [animKey,   setAnimKey]   = useState(0)
  const [isHovered, setIsHovered] = useState(false)
  const currentRef = useRef(0)
  currentRef.current = current

  // ── Navigation ──────────────────────────────────────────────────────────────
  const doSlide = useCallback((nextIdx, d) => {
    const curr = currentRef.current
    if (nextIdx === curr || slides.length <= 1) return
    setDir(d)
    setPrev(curr)
    setCurrent(nextIdx)
    setAnimKey(k => k + 1)
  }, [slides.length])

  const goNext = useCallback(() =>
    doSlide((currentRef.current + 1) % slides.length, 1),
  [doSlide, slides.length])

  const goPrev = useCallback(() =>
    doSlide((currentRef.current - 1 + slides.length) % slides.length, -1),
  [doSlide, slides.length])

  const goTo = (i) => doSlide(i, i > current ? 1 : -1)

  // ── Auto-play ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!autoPlay || slides.length <= 1) return
    if (pauseOnHover && isHovered) return
    const t = setInterval(() => {
      doSlide((currentRef.current + 1) % slides.length, 1)
    }, intervalSec * 1000)
    return () => clearInterval(t)
  }, [autoPlay, isHovered, pauseOnHover, intervalSec, slides.length, doSlide])

  // ── Slide key / style ───────────────────────────────────────────────────────
  const slideKey = (i) =>
    effect === 'slide' && animKey > 0 && (i === current || i === prev)
      ? `${i}-${animKey}`
      : `${i}`

  const slideStyle = (i) => {
    if (effect === 'fade') {
      return { opacity: i === current ? 1 : 0, transition: `opacity ${transDurMs}ms ease-in-out`, zIndex: i === current ? 1 : 0 }
    }
    if (i === current) {
      if (animKey === 0) return { zIndex: 2 }
      return { zIndex: 2, animation: `${dir > 0 ? 'cc-in-r' : 'cc-in-l'} ${transDurMs}ms ease-in-out both` }
    }
    if (i === prev && animKey > 0) {
      return { zIndex: 1, animation: `${dir > 0 ? 'cc-out-l' : 'cc-out-r'} ${transDurMs}ms ease-in-out both` }
    }
    return { opacity: 0, zIndex: 0 }
  }

  return (
    <>
      <style>{SLIDE_CSS}</style>
      <div className="max-w-screen-xl mx-auto px-4 pt-4 pb-2">
        <div className="flex gap-1.5 h-[280px] md:h-[400px] lg:h-[440px]">

          {/* Left: 3 stacked banners */}
          <div className="hidden md:flex flex-col gap-1.5 shrink-0 w-[22%]">
            {leftBanners.slice(0, 3).map((banner, i) => {
              const src = imgSrc(banner.image_url)
              return (
                <Link
                  key={i}
                  to={banner.link || '/shop'}
                  className="relative overflow-hidden rounded-lg flex-1 group block"
                  style={src
                    ? { backgroundImage: `url(${src})`, backgroundSize: 'cover', backgroundPosition: 'center', minHeight: 0 }
                    : { background: banner.bg_color || '#1a1a1a', minHeight: 0 }
                  }
                >
                  <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0) 55%)' }} />
                  {!src && <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 80% 10%, rgba(255,255,255,0.5), transparent 60%)' }} />}
                  <div className="absolute bottom-0 left-0 p-3 md:p-4">
                    <p className="font-black text-sm md:text-base leading-tight group-hover:translate-x-1 transition-transform duration-200" style={{ color: banner.text_color || '#ffffff' }}>
                      {banner.title}
                    </p>
                  </div>
                </Link>
              )
            })}
          </div>

          {/* Center: promo panel */}
          <div
            className="relative overflow-hidden rounded-lg flex-1"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            {/* Slide backgrounds */}
            {slides.map((slide, i) => {
              const src = imgSrc(slide.image_url)
              return (
                <div
                  key={slideKey(i)}
                  className="absolute inset-0"
                  style={{
                    ...slideStyle(i),
                    ...(src
                      ? { backgroundImage: `url(${src})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                      : { background: slide.bg_color || center.bg_color || '#f5e8c8' }
                    ),
                  }}
                />
              )
            })}

            {/* Content overlay */}
            <Link to={center.link || '/shop'} className="absolute inset-0 group flex flex-col" style={{ zIndex: 10 }}>
              <div className="absolute left-0 top-0 bottom-0 flex items-center">
                <div className="text-white font-black text-[10px] tracking-[0.25em] uppercase py-3 px-2 rounded-r" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', background: 'rgba(0,0,0,0.75)' }}>
                  BESTSELLERS
                </div>
              </div>
              <div className="h-full flex flex-col justify-between pl-10 md:pl-12 pr-4 md:pr-8 py-5 md:py-7">
                <div>
                  <div className="flex flex-col items-center justify-center rounded-full text-white text-center shrink-0" style={{ width: 72, height: 72, background: center.accent_color || '#C0392B' }}>
                    <span className="text-[9px] font-bold leading-none">UP TO</span>
                    <span className="text-xl font-black leading-tight">90%</span>
                    <span className="text-[9px] font-bold leading-none">OFF</span>
                  </div>
                </div>
                <div>
                  <p className="text-xs md:text-sm font-semibold uppercase tracking-widest text-ink/60 mb-1">{center.title_top}</p>
                  <p className="hero-display leading-none text-ink" style={{ fontSize: 'clamp(3rem, 8vw, 5rem)' }}>{center.title_main}</p>
                  <p className="hero-display leading-none text-ink" style={{ fontSize: 'clamp(2rem, 5vw, 3.2rem)' }}>{center.title_sub}</p>
                </div>
                <div>
                  <div className="inline-flex items-center gap-3 text-white text-xs md:text-sm font-bold py-2 md:py-2.5 px-4 md:px-6 rounded-sm" style={{ background: center.accent_color || '#C0392B' }}>
                    <span className="flex items-center gap-1 text-xs border-r border-white/30 pr-3">
                      <svg className="w-3 h-3 md:w-3.5 md:h-3.5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                      </svg>
                      Local
                    </span>
                    <span>{center.cta || 'SHOP NOW'}</span>
                  </div>
                </div>
              </div>
              <div className="absolute inset-0 bg-white/0 group-hover:bg-white/5 transition-colors duration-300 pointer-events-none" />
            </Link>

            {/* Prev / Next arrows */}
            {showArrows && slides.length > 1 && (
              <>
                <button
                  onClick={e => { e.preventDefault(); e.stopPropagation(); goPrev() }}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center text-2xl font-bold transition-all select-none"
                  style={{ zIndex: 20 }}
                >
                  ‹
                </button>
                <button
                  onClick={e => { e.preventDefault(); e.stopPropagation(); goNext() }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center text-2xl font-bold transition-all select-none"
                  style={{ zIndex: 20 }}
                >
                  ›
                </button>
              </>
            )}

            {/* Dot indicators */}
            {showDots && slides.length > 1 && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5" style={{ zIndex: 20 }}>
                {slides.map((_, i) => (
                  <button
                    key={i}
                    onClick={e => { e.preventDefault(); e.stopPropagation(); goTo(i) }}
                    className={`h-1.5 rounded-full transition-all duration-300 ${i === current ? 'w-4 bg-white shadow-sm' : 'w-1.5 bg-white/50 hover:bg-white/75'}`}
                  />
                ))}
              </div>
            )}

            {/* Progress bar */}
            {autoPlay && showProgress && slides.length > 1 && (
              <div
                key={`pb-${current}-${isHovered ? 1 : 0}`}
                className="absolute bottom-0 left-0 h-[3px] bg-white/60"
                style={{
                  zIndex: 20,
                  animation: `cc-prog ${intervalSec}s linear forwards`,
                  animationPlayState: pauseOnHover && isHovered ? 'paused' : 'running',
                }}
              />
            )}

            {/* Pause indicator */}
            {pauseOnHover && isHovered && slides.length > 1 && (
              <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/50 text-white/80 text-[10px] font-bold px-2 py-1 rounded-full" style={{ zIndex: 20 }}>
                <span className="flex gap-0.5">
                  <span className="w-[3px] h-3 bg-current rounded-full" />
                  <span className="w-[3px] h-3 bg-current rounded-full" />
                </span>
                Paused
              </div>
            )}
          </div>

          {/* Right: brand tiles */}
          <div className="hidden lg:flex flex-col gap-1.5 shrink-0 w-[22%]">
            {rightBrands.slice(0, 3).map((brand, i) => {
              const src = imgSrc(brand.image_url)
              return (
                <Link
                  key={i}
                  to={brand.link || '/shop'}
                  className="relative overflow-hidden rounded-lg flex-1 group flex items-center justify-center"
                  style={src
                    ? { backgroundImage: `url(${src})`, backgroundSize: 'cover', backgroundPosition: 'center', minHeight: 0 }
                    : { background: brand.bg_color || '#888', minHeight: 0 }
                  }
                >
                  <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 50% 30%, rgba(255,255,255,0.15), transparent 70%)' }} />
                  <div className="absolute inset-0 bg-black/20" />
                  <p className="hero-display text-xl md:text-2xl text-white tracking-[0.15em] text-center px-3 relative z-10 group-hover:scale-105 transition-transform duration-200">
                    {brand.name}
                  </p>
                </Link>
              )
            })}
          </div>

        </div>
      </div>
    </>
  )
}
