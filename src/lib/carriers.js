// Shipment carriers + URL templates. Used by:
//   • Admin Orders — carrier dropdown when setting Shipped status
//   • Customer OrderDetail — clickable "Track shipment" button
//
// To add a new carrier: append a row and (if you know the public tracking
// page URL pattern) include {tracking} as the placeholder.

export const CARRIERS = [
  { slug: 'aramex',        name: 'Aramex',         url: 'https://www.aramex.com/track/results?ShipmentNumber={tracking}' },
  { slug: 'dhl',           name: 'DHL',            url: 'https://www.dhl.com/global-en/home/tracking.html?tracking-id={tracking}' },
  { slug: 'fedex',         name: 'FedEx',          url: 'https://www.fedex.com/fedextrack/?trknbr={tracking}' },
  { slug: 'wakilni',       name: 'Wakilni',        url: 'https://wakilni.com/track/{tracking}' },
  { slug: 'libanpost',     name: 'LibanPost',      url: 'https://www.libanpost.com/en/tracker?id={tracking}' },
  { slug: 'liban_express', name: 'Liban Express',  url: '' },
  { slug: 'bosta',         name: 'Bosta',          url: 'https://app.bosta.co/tracking/{tracking}' },
  { slug: 'other',         name: 'Other',          url: '' },
]

export const carrierBySlug = (slug) => CARRIERS.find(c => c.slug === slug) || null

// Build a click-through URL for a given carrier + tracking number. Falls back
// to an admin-supplied tracking_url when the carrier doesn't have a public
// pattern (or when the admin pasted a direct link).
export function buildTrackingUrl({ carrier, tracking_number, tracking_url }) {
  if (tracking_url) return tracking_url
  if (!carrier || !tracking_number) return ''
  const c = carrierBySlug(carrier)
  if (!c?.url) return ''
  return c.url.replace('{tracking}', encodeURIComponent(tracking_number))
}
