import { STORE_CONFIG } from './storeConfig'

// Digits-only store number (e.g. '96170123456'); '' when not configured.
const number = () => String(STORE_CONFIG.whatsappNumber || '').replace(/\D/g, '')

// Whether a WhatsApp number is set — used to show/hide the buttons.
export const whatsappEnabled = () => number().length > 0

// Build a wa.me deep link with an optional pre-filled message. null if no number.
export function waLink(text = '') {
  const n = number()
  if (!n) return null
  return `https://wa.me/${n}${text ? `?text=${encodeURIComponent(text)}` : ''}`
}

// Pre-filled message that lists the current cart contents.
export function cartWhatsAppMessage(items = [], total = 0) {
  const lines = items.map(i => {
    const opts = [i.color, i.size].filter(Boolean).join(', ')
    return `• ${i.name}${opts ? ` (${opts})` : ''} x${i.quantity} - $${(Number(i.price) * i.quantity).toFixed(2)}`
  })
  return [
    'Hello! I would like to place this order:',
    '',
    ...lines,
    '',
    `Total: $${Number(total).toFixed(2)}`,
  ].join('\n')
}
