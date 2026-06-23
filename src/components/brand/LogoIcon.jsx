/**
 * Pick&Go LB monogram — the PG mark on its own (no wordmark).
 *
 * Inlined SVG so the gradient + accent colors respect CSS class overrides
 * (e.g. for monochrome variants on dark/disabled surfaces).
 *
 * Props:
 *   - size       Number or CSS string. Default 32.
 *   - variant    'gradient' (default) | 'mono-light' | 'mono-dark'
 *   - withChevron Show the lime forward-motion chevron accent. Default true.
 *   - title       Override the accessible <title> ("Pick&Go LB" by default).
 *
 * Each instance generates its own gradient id so multiple icons on the same
 * page never collide (SVG defs are global per document).
 */
import { useId } from 'react'

export default function LogoIcon({
  size = 32,
  variant = 'gradient',
  withChevron = true,
  title = 'Pick&Go LB',
  className,
  style,
  ...rest
}) {
  const gradId = useId().replace(/:/g, '')

  // Single-color variants keep the geometry but swap the fill — useful for
  // navbars, button icons, watermarks, etc.
  const monoFill =
    variant === 'mono-light' ? '#FFFFFF' :
    variant === 'mono-dark'  ? '#0F172A' :
    null

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 200 200"
      width={typeof size === 'number' ? size : undefined}
      height={typeof size === 'number' ? size : undefined}
      role="img"
      aria-label={title}
      className={className}
      style={typeof size === 'string' ? { width: size, height: size, ...style } : style}
      {...rest}
    >
      <title>{title}</title>
      {variant === 'gradient' && (
        <defs>
          <linearGradient id={gradId} x1="0.18" y1="0" x2="0.62" y2="1">
            <stop offset="0%"   stopColor="#00D1C1" />
            <stop offset="55%"  stopColor="#54E89A" />
            <stop offset="100%" stopColor="#A3FF12" />
          </linearGradient>
        </defs>
      )}

      <path
        fill={monoFill || `url(#${gradId})`}
        fillRule="evenodd"
        d="M 32 16 L 122 16 L 178 64 L 122 112 L 88 112 L 88 92 L 114 92 L 144 64 L 114 36 L 64 36 L 64 112 L 88 112 L 88 132 L 64 132 L 64 184 L 32 184 Z M 88 56 L 88 92 L 116 92 L 132 76 L 132 72 L 116 56 Z"
      />

      {withChevron && (
        <path
          fill={monoFill || '#A3FF12'}
          d="M 110 134 L 156 134 L 138 158 L 152 158 L 110 192 L 128 162 L 110 162 Z"
        />
      )}
    </svg>
  )
}
