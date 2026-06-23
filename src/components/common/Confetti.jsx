import { useEffect, useState, useMemo } from 'react'
import { createPortal } from 'react-dom'

/**
 * One-shot confetti burst. Mounts, plays once, unmounts itself.
 *
 * Usage:
 *   {showConfetti && <Confetti onDone={() => setShowConfetti(false)} />}
 *
 * Respects prefers-reduced-motion — bails to a no-op so users with motion
 * sensitivity don't get a screenful of flying particles.
 */
export default function Confetti({ pieces = 80, duration = 2400, onDone }) {
  const reduced = typeof window !== 'undefined'
    && window.matchMedia
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  // Generate piece configs once on mount so each render doesn't reshuffle.
  const pieceList = useMemo(() => {
    if (reduced) return []
    const COLORS = ['#00D1C1', '#A3FF12', '#0F172A', '#FF456B', '#FBBF24', '#7C3AED']
    return Array.from({ length: pieces }).map((_, i) => ({
      key:      i,
      left:     Math.random() * 100,            // %
      delay:    Math.random() * 220,            // ms
      duration: duration + Math.random() * 600, // ms; varying durations break up uniformity
      color:    COLORS[i % COLORS.length],
      width:    6 + Math.random() * 6,          // px
      height:   8 + Math.random() * 8,          // px
      rotateStart: Math.random() * 360,
      rotateEnd:   Math.random() * 1080 - 540,
      drift:    (Math.random() - 0.5) * 240,    // horizontal sway in px
      shape:    Math.random() > 0.5 ? 'rect' : 'circle',
    }))
  }, [pieces, duration, reduced])

  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (reduced) { onDone?.(); return }
    const longest = pieceList.reduce((m, p) => Math.max(m, p.delay + p.duration), 0)
    const t = setTimeout(() => { onDone?.() }, longest + 100)
    return () => clearTimeout(t)
  }, [pieceList, reduced, onDone])

  if (!mounted || reduced || typeof document === 'undefined') return null

  return createPortal((
    <>
      <style>{`
        @keyframes confetti-fall {
          0%   { transform: translate3d(0, -10vh, 0) rotate(var(--r-start, 0deg)); opacity: 1; }
          80%  { opacity: 1; }
          100% { transform: translate3d(var(--drift, 0px), 110vh, 0) rotate(var(--r-end, 360deg)); opacity: 0; }
        }
      `}</style>
      <div
        aria-hidden="true"
        style={{
          position:       'fixed',
          inset:          0,
          pointerEvents:  'none',
          overflow:       'hidden',
          zIndex:         9998,
        }}
      >
        {pieceList.map(p => (
          <span
            key={p.key}
            style={{
              position:        'absolute',
              top:             0,
              left:            `${p.left}%`,
              width:           `${p.width}px`,
              height:          `${p.height}px`,
              background:      p.color,
              borderRadius:    p.shape === 'circle' ? '50%' : '2px',
              animation:       `confetti-fall ${p.duration}ms cubic-bezier(0.22, 0.61, 0.36, 1) forwards`,
              animationDelay:  `${p.delay}ms`,
              willChange:      'transform, opacity',
              '--r-start':     `${p.rotateStart}deg`,
              '--r-end':       `${p.rotateEnd}deg`,
              '--drift':       `${p.drift}px`,
            }}
          />
        ))}
      </div>
    </>
  ), document.body)
}
