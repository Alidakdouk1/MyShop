import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * Per-route fade + lift transition.
 *
 * IMPORTANT: this wrapper deliberately does NOT use CSS `transform`. A non-none
 * transform on the wrapper would create a containing block for every
 * `position: fixed` descendant — meaning Modals, Toasts, MobileSearchOverlay,
 * NewsletterPopup, PwaInstall etc. would be trapped inside this div instead of
 * the viewport. We animate `opacity` + `margin-top` instead so the wrapper
 * stays a "static" containing block. Same visual effect, none of the gotchas.
 *
 * Bails on prefers-reduced-motion: renders children straight through.
 */
const PHASE_OUT_MS = 160
const PHASE_IN_MS  = 240

export default function PageTransition({ children }) {
  const location = useLocation()
  const reduced  = typeof window !== 'undefined'
    && window.matchMedia
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const [displayed, setDisplayed] = useState({ key: location.pathname, node: children })
  const [phase,     setPhase]     = useState('in') // 'in' | 'out'

  useEffect(() => {
    if (reduced) {
      setDisplayed({ key: location.pathname, node: children })
      return
    }
    // Same route (state, hash, child re-render) — just freshen the node.
    if (location.pathname === displayed.key) {
      setDisplayed(d => ({ ...d, node: children }))
      return
    }
    setPhase('out')
    const t = setTimeout(() => {
      setDisplayed({ key: location.pathname, node: children })
      setPhase('in')
      window.scrollTo({ top: 0, behavior: 'auto' })
    }, PHASE_OUT_MS)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, reduced])

  useEffect(() => {
    if (location.pathname === displayed.key) {
      setDisplayed(d => ({ ...d, node: children }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [children])

  if (reduced) return children

  const style = phase === 'out'
    ? {
        opacity:    0,
        marginTop:  -8,
        transition: `opacity ${PHASE_OUT_MS}ms ease, margin-top ${PHASE_OUT_MS}ms ease`,
      }
    : {
        opacity:    1,
        marginTop:  0,
        transition: `opacity ${PHASE_IN_MS}ms cubic-bezier(0.16, 1, 0.3, 1), margin-top ${PHASE_IN_MS}ms cubic-bezier(0.16, 1, 0.3, 1)`,
      }

  return <div style={style}>{displayed.node}</div>
}
