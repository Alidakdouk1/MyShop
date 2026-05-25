import { useEffect, useRef } from 'react'

/**
 * Adds the `is-visible` class to the element the first time it scrolls into
 * view, driving the CSS `.reveal*` scroll-reveal utilities (see index.css).
 *
 * - Uses a single IntersectionObserver per element and disconnects after the
 *   first reveal, so there is zero ongoing scroll cost (no listeners, no leaks).
 * - Respects `prefers-reduced-motion`: reveals immediately, no animation.
 * - Safe on SSR-less Vite SPA; guards against missing IntersectionObserver.
 *
 * @param {{ threshold?: number, rootMargin?: string, once?: boolean }} [opts]
 * @returns {import('react').RefObject<HTMLElement>}
 */
export function useReveal({ threshold = 0.15, rootMargin = '0px 0px -8% 0px', once = true } = {}) {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

    if (prefersReduced || typeof IntersectionObserver === 'undefined') {
      el.classList.add('is-visible')
      return
    }

    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible')
            if (once) obs.unobserve(entry.target)
          } else if (!once) {
            entry.target.classList.remove('is-visible')
          }
        })
      },
      { threshold, rootMargin }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [threshold, rootMargin, once])

  return ref
}
