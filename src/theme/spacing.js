/**
 * Pick&Go LB — Spacing scale.
 *
 * 4-px base grid. Aligns with Tailwind's default spacing so the design system
 * stays consistent whether you reach for the JS tokens or `p-4` / `gap-6`.
 */
export const spacing = {
  px:   '1px',
  0:    '0',
  0.5:  '0.125rem',  // 2
  1:    '0.25rem',   // 4
  1.5:  '0.375rem',  // 6
  2:    '0.5rem',    // 8
  3:    '0.75rem',   // 12
  4:    '1rem',      // 16
  5:    '1.25rem',   // 20
  6:    '1.5rem',    // 24
  8:    '2rem',      // 32
  10:   '2.5rem',    // 40
  12:   '3rem',      // 48
  16:   '4rem',      // 64
  20:   '5rem',      // 80
  24:   '6rem',      // 96
  32:   '8rem',      // 128
}

/** Corner radii — soft on small UI, more rounded on cards/sheets. */
export const radii = {
  none: '0',
  sm:   '0.375rem',  // chips, inputs
  md:   '0.5rem',    // buttons
  lg:   '0.75rem',   // small cards
  xl:   '1rem',      // cards
  '2xl':'1.25rem',   // panels
  '3xl':'1.75rem',   // hero surfaces
  full: '9999px',    // pills, avatars
}

export const breakpoints = {
  sm:  '640px',
  md:  '768px',
  lg:  '1024px',
  xl:  '1280px',
  '2xl':'1536px',
}
