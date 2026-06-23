/**
 * Pick&Go LB — Type system.
 *
 * Primary: Poppins (geometric, confident, clean lines — matches the wordmark).
 * Fallback: Inter, then system stack so the page never falls back to Times.
 */
export const fontFamilies = {
  body:    "'Poppins', 'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  display: "'Poppins', 'Inter', system-ui, -apple-system, sans-serif",  // wordmark + headings
  mono:    "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
}

/** Weight tokens — Poppins ships 100-900; we use a focused subset. */
export const fontWeights = {
  regular:  400,
  medium:   500,
  semibold: 600,
  bold:     700,
  extrabold: 800,
  black:    900,
}

/**
 * Type scale — pairs with Tailwind defaults. Sizes are in `rem` so they
 * scale with the user's root font-size accessibility preference.
 */
export const fontSizes = {
  xs:  '0.75rem',   // 12px — captions, badges
  sm:  '0.875rem',  // 14px — body
  base:'1rem',      // 16px — body default
  lg:  '1.125rem',  // 18px — lead paragraph
  xl:  '1.25rem',   // 20px — H4
  '2xl':'1.5rem',   // 24px — H3
  '3xl':'1.875rem', // 30px — H2 mobile
  '4xl':'2.25rem',  // 36px — H1 mobile
  '5xl':'3rem',     // 48px — H1 desktop
  '6xl':'3.75rem',  // 60px — hero
  '7xl':'4.5rem',   // 72px — display hero
}

export const lineHeights = {
  tight:   1.1,  // headings
  snug:    1.3,
  normal:  1.6,  // body
  relaxed: 1.8,
}

export const letterSpacing = {
  tight:   '-0.02em', // big wordmarks
  normal:  '0',
  wide:    '0.08em',
  wider:   '0.12em',
  widest:  '0.2em',   // tiny caps / labels
}
