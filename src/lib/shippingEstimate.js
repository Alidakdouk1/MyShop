// Compute the "Get it by …" range from the admin-published shipping rules.
//
// The math is intentionally simple so the rules stay legible:
//   1. If we've passed the cutoff hour, push the "today" mark to tomorrow.
//   2. Skip weekends when advancing (Sat=6, Sun=0) — only when weekend_skip=1.
//   3. Add processing_days then transit_days to get earliest / latest dates.
//
// When `from` is provided (e.g. a pre-order release date) we use that as
// the starting point and skip the cutoff adjustment — releases happen on a
// fixed calendar date, not "today".

const DEFAULTS = {
  enabled: 1,
  processing_days_min: 1,
  processing_days_max: 2,
  transit_days_min: 2,
  transit_days_max: 4,
  cutoff_hour: 14,
  weekend_skip: 1,
}

function isWeekend(d) {
  const day = d.getDay()
  return day === 0 || day === 6
}

function addBusinessDays(date, days, skipWeekends) {
  const d = new Date(date.getTime())
  let added = 0
  while (added < days) {
    d.setDate(d.getDate() + 1)
    if (!skipWeekends || !isWeekend(d)) added++
  }
  return d
}

/**
 * @param {object} settings  Server-published shipping_estimate settings
 * @param {object} [opts]
 * @param {Date}   [opts.now]   Override current time (testing)
 * @param {Date|string} [opts.from]  Use this calendar date as the start (e.g. pre-order release)
 * @returns {{ earliest: Date, latest: Date, isRange: boolean } | null}
 */
export function computeDeliveryWindow(settings, opts = {}) {
  const s = { ...DEFAULTS, ...(settings || {}) }
  if (!s.enabled) return null

  const skipWk = !!s.weekend_skip
  let start

  if (opts.from) {
    start = opts.from instanceof Date ? new Date(opts.from.getTime()) : new Date(String(opts.from).slice(0, 10) + 'T00:00')
  } else {
    const now = opts.now ? new Date(opts.now.getTime()) : new Date()
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    // Past cutoff → orders ship "tomorrow", so advance one calendar day before processing.
    if (now.getHours() >= s.cutoff_hour) start.setDate(start.getDate() + 1)
    if (skipWk) {
      while (isWeekend(start)) start.setDate(start.getDate() + 1)
    }
  }

  const earliest = addBusinessDays(start, s.processing_days_min + s.transit_days_min, skipWk)
  const latest   = addBusinessDays(start, s.processing_days_max + s.transit_days_max, skipWk)

  return {
    earliest,
    latest,
    isRange: earliest.getTime() !== latest.getTime(),
  }
}

/** "Mon, Jun 8" — short, weekday-prefixed for the trust badge. */
export function formatDeliveryDate(d) {
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

/** "Mon, Jun 8 – Wed, Jun 10" or "Mon, Jun 8" if not a range. */
export function formatDeliveryWindow(window) {
  if (!window) return ''
  const a = formatDeliveryDate(window.earliest)
  if (!window.isRange) return a
  return `${a} – ${formatDeliveryDate(window.latest)}`
}
