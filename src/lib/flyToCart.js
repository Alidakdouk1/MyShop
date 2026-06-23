/**
 * "Fly to cart" animation. Clones the product image as a positioned ghost,
 * curves it toward the cart icon (any element with [data-cart-icon] —
 * navbar on desktop, bottom-nav on mobile), shrinks + fades it as it lands,
 * then pulses the cart icon once it arrives.
 *
 * Usage:
 *   import { flyToCart } from '../lib/flyToCart'
 *   ...
 *   flyToCart(imgElement)
 *   // or pass an explicit URL when there's no DOM image to clone:
 *   flyToCart(buttonElement, { imageUrl: resolveImg(product.primary_image) })
 *
 * No-op (returns immediately) when:
 *   - The source element isn't in the document
 *   - No [data-cart-icon] target exists (e.g. user is on the cart page)
 *   - The user prefers reduced motion
 */

const PREFERS_REDUCED_MOTION = typeof window !== 'undefined'
  && window.matchMedia
  && window.matchMedia('(prefers-reduced-motion: reduce)').matches

export function flyToCart(source, options = {}) {
  if (typeof window === 'undefined' || PREFERS_REDUCED_MOTION) return

  // Accept an explicit source, or fall back to whichever element marked
  // itself as the "currently visible product image" (PDP gallery does this).
  let sourceEl = source instanceof Element ? source : null
  if (!sourceEl || !sourceEl.isConnected) {
    sourceEl = document.querySelector('[data-fly-source]') || null
  }
  if (!sourceEl || !sourceEl.isConnected) return

  // Find the nearest <img> in the source (so callers can pass the whole card
  // or button and we still grab a real image to clone). Fall back to options.
  const sourceImg = sourceEl.tagName === 'IMG'
    ? sourceEl
    : sourceEl.querySelector?.('img')

  const targetEl = document.querySelector('[data-cart-icon]')
  if (!targetEl) return

  const fromRect = (sourceImg || sourceEl).getBoundingClientRect()
  const toRect   = targetEl.getBoundingClientRect()
  if (!fromRect.width || !fromRect.height) return

  const imageUrl = options.imageUrl || sourceImg?.currentSrc || sourceImg?.src
  if (!imageUrl) return

  // Build the ghost element.
  const ghost = document.createElement('div')
  ghost.setAttribute('aria-hidden', 'true')
  Object.assign(ghost.style, {
    position:       'fixed',
    left:           `${fromRect.left}px`,
    top:            `${fromRect.top}px`,
    width:          `${fromRect.width}px`,
    height:         `${fromRect.height}px`,
    backgroundImage: `url("${imageUrl}")`,
    backgroundSize:  'cover',
    backgroundPosition: 'center',
    borderRadius:   '12px',
    boxShadow:      '0 12px 32px rgba(15,23,42,0.25)',
    zIndex:         9999,
    pointerEvents:  'none',
    transformOrigin: 'top left',
    willChange:     'transform, opacity',
    opacity:        '1',
  })
  document.body.appendChild(ghost)

  // Vector + control point for a gentle arc. Translate to target center while
  // shrinking to a small badge-sized footprint.
  const dx = (toRect.left + toRect.width  / 2) - (fromRect.left + fromRect.width  / 2)
  const dy = (toRect.top  + toRect.height / 2) - (fromRect.top  + fromRect.height / 2)
  const finalScale = Math.max(0.18, Math.min(0.30, 48 / Math.max(fromRect.width, fromRect.height)))

  // We split the animation into two stages so the arc is convincing without
  // pulling in a tween library. Stage 1 lifts up and toward the target; stage
  // 2 drops in with a final scale-down.
  const liftY = Math.min(-80, dy * 0.35)

  const animation = ghost.animate(
    [
      { transform: 'translate(0, 0) scale(1)',                                       opacity: 1 },
      { transform: `translate(${dx * 0.55}px, ${liftY}px) scale(0.75)`,              opacity: 1, offset: 0.55 },
      { transform: `translate(${dx}px, ${dy}px) scale(${finalScale})`,               opacity: 0.4, offset: 0.95 },
      { transform: `translate(${dx}px, ${dy}px) scale(${finalScale * 0.7})`,         opacity: 0 },
    ],
    {
      duration: 750,
      easing:   'cubic-bezier(0.45, 0, 0.55, 1)',
      fill:     'forwards',
    }
  )

  animation.onfinish = () => {
    ghost.remove()
    // Pulse the cart icon once the ghost lands.
    targetEl.animate(
      [
        { transform: 'scale(1)' },
        { transform: 'scale(1.25)' },
        { transform: 'scale(0.95)' },
        { transform: 'scale(1)' },
      ],
      { duration: 360, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' }
    )
  }
}
