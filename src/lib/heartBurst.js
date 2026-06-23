/**
 * Heart burst — spawn a small flock of mini heart glyphs around a source
 * element and let them float up + outward while fading out.
 *
 * Usage:
 *   import { heartBurst } from '../lib/heartBurst'
 *   heartBurst(buttonElement)
 *
 * Pure DOM + Web Animations API. No React, no library.
 * Bails on prefers-reduced-motion so we don't trigger sensitivities.
 */

const PREFERS_REDUCED_MOTION = typeof window !== 'undefined'
  && window.matchMedia
  && window.matchMedia('(prefers-reduced-motion: reduce)').matches

// SVG heart path — small, antialiased, fills the container.
const HEART_SVG = `
  <svg viewBox="0 0 24 24" width="100%" height="100%" fill="currentColor" aria-hidden="true">
    <path d="M12 21s-7.5-4.6-9.7-9.4C.8 8.5 2.7 5 6.2 5c2 0 3.4 1.1 4.3 2.6.1.2.4.2.5 0C12 6.1 13.4 5 15.4 5c3.5 0 5.4 3.5 3.9 6.6C19.5 16.4 12 21 12 21z"/>
  </svg>
`

const COLORS = ['#FF456B', '#C0392B', '#00D8C8']

export function heartBurst(source, options = {}) {
  if (typeof window === 'undefined' || PREFERS_REDUCED_MOTION) return
  const el = source instanceof Element ? source : null
  if (!el || !el.isConnected) return

  const rect = el.getBoundingClientRect()
  // Center of the source — that's where every heart spawns from.
  const cx = rect.left + rect.width  / 2
  const cy = rect.top  + rect.height / 2

  const count = options.count ?? 6
  for (let i = 0; i < count; i++) {
    const heart = document.createElement('span')
    heart.setAttribute('aria-hidden', 'true')
    heart.innerHTML = HEART_SVG
    const size = 10 + Math.random() * 10
    Object.assign(heart.style, {
      position:      'fixed',
      left:          `${cx - size / 2}px`,
      top:           `${cy - size / 2}px`,
      width:         `${size}px`,
      height:        `${size}px`,
      color:         COLORS[i % COLORS.length],
      pointerEvents: 'none',
      zIndex:        9999,
      willChange:    'transform, opacity',
      // Subtle scaled-up shadow so each heart catches the eye.
      filter:        'drop-shadow(0 1px 2px rgba(15,23,42,0.18))',
    })
    document.body.appendChild(heart)

    // Each heart drifts up and slightly outward in a random direction.
    const angle  = (-Math.PI / 2) + (Math.random() - 0.5) * (Math.PI / 1.4) // mostly upward
    const dist   = 50 + Math.random() * 50
    const dx     = Math.cos(angle) * dist
    const dy     = Math.sin(angle) * dist
    const rot    = (Math.random() - 0.5) * 50
    const dur    = 700 + Math.random() * 400
    const delay  = i * 35

    const anim = heart.animate(
      [
        { transform: 'translate(0, 0) scale(0.4) rotate(0deg)',                              opacity: 0 },
        { transform: 'translate(0, -4px) scale(1.15) rotate(0deg)',                          opacity: 1, offset: 0.15 },
        { transform: `translate(${dx * 0.6}px, ${dy * 0.6}px) scale(1) rotate(${rot * 0.6}deg)`, opacity: 1, offset: 0.55 },
        { transform: `translate(${dx}px, ${dy}px) scale(0.55) rotate(${rot}deg)`,            opacity: 0 },
      ],
      {
        duration: dur,
        delay,
        easing:   'cubic-bezier(0.22, 0.61, 0.36, 1)',
        fill:     'forwards',
      }
    )
    anim.onfinish = () => heart.remove()
  }
}
