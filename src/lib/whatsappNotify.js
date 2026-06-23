/**
 * Build wa.me click-to-chat URLs from a stored template + an order.
 *
 * The admin clicks the URL → WhatsApp Web/Desktop opens with the message
 * pre-filled to the customer's phone number. Free; no Business API needed.
 *
 * Supported template variables:
 *   {customer_name}  — recipient name (falls back to "there")
 *   {order_id}       — order id
 *   {reference}      — MS-{order_id}
 *   {total}          — formatted total ($XX.XX by default; admin can override)
 *   {tracking_url}   — link back to the storefront order detail page
 *   {store_name}     — "Pick&Go LB"
 */

const STORE_NAME = 'Pick&Go LB'

/** Strip non-digits and a leading + so the number is in wa.me's "digits only" format. */
export function normalizePhone(raw) {
  return String(raw || '').replace(/[^\d]/g, '')
}

/** Substitute template variables. Unknown vars are left in-place so the admin sees them. */
export function substituteTemplate(template, order) {
  if (!template) return ''
  const vars = {
    customer_name: order?.shipping_address?.recipient_name?.split(' ')?.[0]
                || order?.customer_name?.split(' ')?.[0]
                || 'there',
    order_id:      order?.id ?? order?.order_id ?? '',
    reference:     order?.id ? `MS-${order.id}` : '',
    total:         order?.total != null ? `$${Number(order.total).toFixed(2)}` : '',
    tracking_url:  order?.id ? `${typeof window !== 'undefined' ? window.location.origin : ''}/account/orders/${order.id}` : '',
    store_name:    STORE_NAME,
  }
  return String(template).replace(/\{(\w+)\}/g, (_, key) => (key in vars ? String(vars[key]) : `{${key}}`))
}

/**
 * Map an order's current status to the template key. Most-recent status wins;
 * unknown statuses fall back to `order_placed`.
 */
export function eventForStatus(status, paymentStatus) {
  if (status === 'cancelled' || status === 'refunded') return 'cancelled'
  if (status === 'delivered') return 'delivered'
  if (status === 'shipped'   || status === 'in_transit') return 'shipped'
  if (paymentStatus === 'paid' && status === 'confirmed') return 'payment_confirmed'
  return 'order_placed'
}

/**
 * Build the final wa.me URL. Returns null when we don't have a phone number
 * to send to — the caller should disable the button instead of opening a
 * broken link.
 */
export function buildWhatsAppUrl({ phone, template, order }) {
  const digits = normalizePhone(phone)
  if (!digits) return null
  const text = substituteTemplate(template, order)
  return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ''}`
}

/**
 * Read the admin's stored WhatsApp settings. Returns the default events list
 * even when nothing's been configured so the UI never crashes.
 */
export const EVENT_LABELS = {
  order_placed:      'Order placed',
  payment_confirmed: 'Payment confirmed',
  shipped:           'Shipped',
  delivered:         'Delivered',
  cancelled:         'Cancelled',
}

export const EVENT_KEYS = Object.keys(EVENT_LABELS)
