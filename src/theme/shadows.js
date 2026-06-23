/**
 * Pick&Go LB — Elevation system.
 *
 * Three tiers — soft / premium / float — matching the CSS variables in
 * [src/index.css](../index.css). The brand-glow shadows are reserved for
 * splash/success/CTA moments where we want the teal-lime energy to leak.
 */
export const shadows = {
  /** Cards, sub-panels — subtle, layered black. */
  soft:    '0 1px 2px rgba(15,15,15,0.04), 0 4px 12px rgba(15,15,15,0.05)',

  /** Hero cards, prominent buttons — clearly elevated. */
  premium: '0 2px 6px rgba(15,15,15,0.05), 0 14px 30px -10px rgba(15,15,15,0.14)',

  /** Floating UI (sticky bars, drawers, modals) — strong drop. */
  float:   '0 6px 14px rgba(15,15,15,0.07), 0 26px 50px -16px rgba(15,15,15,0.22)',

  /** Brand glow — teal halo for the splash mark + success animation. */
  glowTeal:'0 0 0 4px rgba(0,209,193,0.18), 0 12px 36px -8px rgba(0,209,193,0.45)',

  /** Brand glow — lime sweep for the route loader + CTA hover. */
  glowLime:'0 0 0 4px rgba(163,255,18,0.18), 0 12px 36px -8px rgba(163,255,18,0.45)',
}

export default shadows
