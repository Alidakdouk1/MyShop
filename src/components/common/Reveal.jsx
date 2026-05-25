import { useReveal } from '../../hooks/useReveal'

const VARIANT_CLASS = {
  up:      'reveal',
  left:    'reveal-left',
  right:   'reveal-right',
  scale:   'reveal-scale',
  stagger: 'reveal reveal-stagger',
}

/**
 * Wraps children in a scroll-reveal container. Purely presentational — adds no
 * layout box semantics beyond the chosen element, and never blocks content
 * (reduced-motion users see it immediately via the CSS guard).
 *
 * @param {{
 *   as?: keyof JSX.IntrinsicElements,
 *   variant?: 'up'|'left'|'right'|'scale'|'stagger',
 *   delay?: number,            // seconds
 *   className?: string,
 *   threshold?: number,
 *   rootMargin?: string,
 *   children: import('react').ReactNode,
 * }} props
 */
export default function Reveal({
  as: Tag = 'div',
  variant = 'up',
  delay = 0,
  className = '',
  threshold,
  rootMargin,
  children,
  ...rest
}) {
  const ref = useReveal({ threshold, rootMargin })
  const variantClass = VARIANT_CLASS[variant] || VARIANT_CLASS.up

  return (
    <Tag
      ref={ref}
      className={`${variantClass} ${className}`}
      style={delay ? { transitionDelay: `${delay}s` } : undefined}
      {...rest}
    >
      {children}
    </Tag>
  )
}
