// Store-wide commerce rules used for checkout display.
// IMPORTANT: these must stay in sync with the authoritative values in
// backend/controllers/OrderController.php (the backend recomputes the order
// total on the server — this is only for showing the breakdown to the user).
export const STORE_CONFIG = {
  freeShippingThreshold: 50,   // free shipping at/above this subtotal
  flatShippingFee: 8,          // otherwise this flat fee
  taxRate: 0,                  // e.g. 0.08 = 8%; 0 hides the tax line
}

// Compute the order money breakdown from a subtotal + applied discount.
export function computeTotals(subtotal, discount = 0) {
  const { freeShippingThreshold, flatShippingFee, taxRate } = STORE_CONFIG
  const shipping = subtotal >= freeShippingThreshold ? 0 : flatShippingFee
  const tax = Math.max(0, subtotal - discount) * taxRate
  const total = subtotal - discount + shipping + tax
  const freeShippingRemaining = Math.max(0, freeShippingThreshold - subtotal)
  return {
    shipping,
    tax: Math.round(tax * 100) / 100,
    total: Math.round(total * 100) / 100,
    freeShippingRemaining: Math.round(freeShippingRemaining * 100) / 100,
  }
}
