import { useEffect, useState, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'

/**
 * Fullscreen image lightbox with click-to-zoom and arrow navigation.
 *
 * Behaviour:
 *   - Click backdrop or × button to close
 *   - Arrow keys ←/→ to navigate, ESC to close
 *   - Click the image to toggle 2× zoom centered on the click point
 *   - On mobile, browser-native pinch-zoom works inside the zoomed wrapper
 *   - When zoomed, dragging pans the image; when not zoomed, dragging is a no-op
 *
 * @param {object[]} images   – list of resolved <img src> URLs (already absolute)
 * @param {number}   index    – the active image index
 * @param {function} onClose  – closes the lightbox
 * @param {function} onIndex  – called with the new index on prev/next
 */
export default function ImageLightbox({ images, index, onClose, onIndex }) {
  const [zoomed, setZoomed] = useState(false)
  const [origin, setOrigin] = useState({ x: 50, y: 50 })  // % values
  const [pan, setPan]       = useState({ x: 0, y: 0 })    // px offset when zoomed
  const dragging = useRef(false)
  const last     = useRef({ x: 0, y: 0 })

  const close = useCallback(() => {
    setZoomed(false); setPan({ x: 0, y: 0 })
    onClose()
  }, [onClose])

  // Reset zoom when changing slides.
  useEffect(() => { setZoomed(false); setPan({ x: 0, y: 0 }) }, [index])

  // Keyboard nav + body scroll lock while open.
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape')      close()
      if (e.key === 'ArrowLeft')   onIndex((index - 1 + images.length) % images.length)
      if (e.key === 'ArrowRight')  onIndex((index + 1) % images.length)
    }
    document.addEventListener('keydown', handler)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handler)
      document.body.style.overflow = prevOverflow
    }
  }, [close, onIndex, index, images.length])

  const onImageClick = (e) => {
    if (dragging.current) { dragging.current = false; return }
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width)  * 100
    const y = ((e.clientY - rect.top)  / rect.height) * 100
    setOrigin({ x, y })
    setPan({ x: 0, y: 0 })
    setZoomed(z => !z)
  }

  // Mouse drag panning while zoomed.
  const onPointerDown = (e) => {
    if (!zoomed) return
    dragging.current = true
    last.current = { x: e.clientX, y: e.clientY }
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }
  const onPointerMove = (e) => {
    if (!dragging.current) return
    const dx = e.clientX - last.current.x
    const dy = e.clientY - last.current.y
    last.current = { x: e.clientX, y: e.clientY }
    setPan(p => ({ x: p.x + dx, y: p.y + dy }))
  }
  const onPointerUp = (e) => {
    // We keep dragging=true briefly so onClick can detect "this was a drag, not a tap".
    last.current = { x: e.clientX, y: e.clientY }
    setTimeout(() => { dragging.current = false }, 0)
  }

  const prev = (e) => { e.stopPropagation(); onIndex((index - 1 + images.length) % images.length) }
  const next = (e) => { e.stopPropagation(); onIndex((index + 1) % images.length) }

  // Portal to <body> so a CSS `transform` on any ancestor (e.g. the PDP's
  // .animate-page-in slide-in wrapper) doesn't pin our `position: fixed`
  // backdrop to that ancestor's box instead of the real viewport.
  if (typeof document === 'undefined') return null
  return createPortal((
    <div
      onClick={close}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{
        background: 'rgba(15,15,15,0.92)',
        animation: 'fadeIn 0.18s ease both',
        touchAction: zoomed ? 'none' : 'pinch-zoom',
      }}
    >
      {/* Close × */}
      <button
        onClick={(e) => { e.stopPropagation(); close() }}
        aria-label="Close"
        className="absolute top-4 right-4 z-10 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur flex items-center justify-center text-white transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Counter */}
      {images.length > 1 && (
        <div className="absolute top-4 left-4 z-10 text-white/70 text-xs font-mono px-3 py-2 rounded-full bg-white/10 backdrop-blur">
          {index + 1} / {images.length}
        </div>
      )}

      {/* Prev / Next arrows */}
      {images.length > 1 && (
        <>
          <button
            onClick={prev}
            aria-label="Previous image"
            className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur flex items-center justify-center text-white transition-colors"
          >
            <svg className="w-5 h-5" data-rtl-flip fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={next}
            aria-label="Next image"
            className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur flex items-center justify-center text-white transition-colors"
          >
            <svg className="w-5 h-5" data-rtl-flip fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </>
      )}

      {/* Image stage — sized in inline styles so it doesn't depend on Tailwind
          arbitrary-value compilation (which has bitten this lightbox before). */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="select-none"
        style={{
          maxWidth:       '92vw',
          maxHeight:      '88vh',
          minWidth:       240,
          minHeight:      240,
          overflow:       'hidden',
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
        }}
      >
        <img
          src={images[index]}
          alt={`Image ${index + 1}`}
          draggable={false}
          onClick={onImageClick}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onError={(e) => {
            // Don't swallow the failure — give the user something visible to
            // signal "image didn't load" instead of an invisible 0×0 element.
            // eslint-disable-next-line no-console
            console.error('Lightbox image failed to load:', images[index])
            e.currentTarget.src = 'https://placehold.co/800x800/0F0F0F/E4E1D9?text=Image+failed+to+load'
          }}
          style={{
            display:    'block',
            maxWidth:   '92vw',
            maxHeight:  '88vh',
            width:      'auto',
            height:     'auto',
            transform:  zoomed
              ? `translate(${pan.x}px, ${pan.y}px) scale(2)`
              : 'translate(0, 0) scale(1)',
            transformOrigin:         `${origin.x}% ${origin.y}%`,
            cursor:                  zoomed ? 'grab' : 'zoom-in',
            transition:              'transform 220ms cubic-bezier(0.16, 1, 0.3, 1)',
            transitionDuration:      dragging.current ? '0ms' : '220ms',
            backgroundColor:         '#1f1f1f', // visible while the image loads
          }}
        />
      </div>

      {/* Hint at the bottom — only relevant on desktop */}
      <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[11px] uppercase tracking-[0.2em] text-white/40 hidden sm:block">
        {zoomed ? 'Click to zoom out · drag to pan' : 'Click image to zoom · ESC to close'}
      </p>
    </div>
  ), document.body)
}
