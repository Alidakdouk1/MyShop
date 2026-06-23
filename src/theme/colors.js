/**
 * Pick&Go LB — Color tokens.
 *
 * Authoritative palette per the brand sheet. Keep this file in sync with
 * the CSS variables exposed in [src/index.css](../index.css); the CSS layer
 * is what actually drives the UI (so Tailwind utilities like `bg-accent`
 * keep working), and these constants are the JS-side reference for one-off
 * inline styles, motion components, and email/PDF generation.
 */
export const colors = {
  // Brand core
  midnight:    '#0F172A',  // Brand surface — splash, app icon, dark chrome
  teal:        '#00D1C1',  // Primary accent — links, buttons, highlights
  lime:        '#A3FF12',  // Forward-motion accent — CTAs, success, signal
  white:       '#FFFFFF',

  // Surface tones used inside the dark chrome (splash, navbar dark mode, app tiles).
  // Pulled from slate-900 → slate-700 for consistency with Tailwind's dark scale.
  slate900:    '#0F172A',
  slate800:    '#1E293B',
  slate700:    '#334155',
  slate500:    '#64748B',
  slate300:    '#94A3B8',
  slate100:    '#F1F5F9',

  // Light shopping UI — surfaces stay light/cream, ink stays dark. The brand
  // accents (teal/lime) replace the old red/gold from the previous palette.
  bg:          '#FAFAF8',
  surface:     '#FFFFFF',
  surfaceAlt:  '#F2F0EB',
  border:      '#E4E1D9',
  ink:         '#0F0F0F',
  inkSecondary:'#5C5854',
  inkTertiary: '#9C9894',

  // Status (semantic) — small set, used by toasts, badges, alerts.
  success:     '#16A34A',
  warning:     '#D97706',
  info:        '#0284C7',
  danger:      '#DC2626',
}

/**
 * Brand gradient — the canonical teal→lime sweep used for the PG monogram,
 * the route loader, and any "premium" surface (e.g. checkout success).
 */
export const brandGradient = {
  css: `linear-gradient(135deg, ${colors.teal} 0%, #54E89A 55%, ${colors.lime} 100%)`,
  stops: [
    { offset: 0,   color: colors.teal },
    { offset: 55,  color: '#54E89A' },
    { offset: 100, color: colors.lime },
  ],
}

export default colors
