/**
 * Pick&Go LB full logo — PG monogram + "Pick&Go LB" wordmark, with optional tagline.
 *
 * Props:
 *   - variant   'dark' (default, for dark backgrounds) | 'light' (for light)
 *   - size      Pixel height of the whole lockup. Default 48.
 *   - showTag   Render the "Pick Smart. Go Further." tagline. Default false.
 *   - showText  Render the wordmark. Default true. (Set false for icon-only inline use.)
 *
 * Use this in navbars, footers, splash screens — anywhere you want the full lockup.
 * For 32-px chrome (favicons, button icons), use <LogoIcon /> directly.
 */
import LogoIcon from './LogoIcon'

export default function Logo({
  variant = 'dark',
  size = 48,
  showTag = false,
  showText = true,
  className,
  style,
  ...rest
}) {
  const isLight = variant === 'light'
  // Type colors per brand guide:
  //   dark variant  → "Pick" white  / "&Go" lime / "LB" teal
  //   light variant → "Pick" navy   / "&Go" teal / "LB" navy   (lime is hard to read on white)
  const colors = isLight
    ? { pick: '#0F172A', amp: '#15B8A6', lb: '#0F172A', tag: '#64748B', tagAccent: '#15B8A6' }
    : { pick: '#FFFFFF', amp: '#A3FF12', lb: '#00D1C1', tag: '#94A3B8', tagAccent: '#A3FF12' }

  const iconSize     = size
  const wordSize     = Math.round(size * 0.42)   // wordmark sits at ~42% of icon height
  const tagSize      = Math.round(size * 0.18)   // tagline ~18%, tiny but readable
  const gap          = Math.round(size * 0.18)   // horizontal gap icon ↔ words

  return (
    <div
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap,
        fontFamily: "'Poppins','Inter',system-ui,-apple-system,sans-serif",
        lineHeight: 1,
        ...style,
      }}
      {...rest}
    >
      <LogoIcon size={iconSize} />

      {showText && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: Math.round(size * 0.08) }}>
          <span style={{
            fontSize: wordSize,
            fontWeight: 800,
            letterSpacing: '-0.02em',
            whiteSpace: 'nowrap',
          }}>
            <span style={{ color: colors.pick }}>Pick</span>
            <span style={{ color: colors.amp  }}>&amp;Go</span>
            <span style={{ color: colors.lb   }}>LB</span>
          </span>

          {showTag && (
            <span style={{
              fontSize: tagSize,
              fontWeight: 600,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: colors.tag,
              whiteSpace: 'nowrap',
            }}>
              Pick Smart. <span style={{ color: colors.tagAccent }}>Go Further.</span>
            </span>
          )}
        </div>
      )}
    </div>
  )
}
