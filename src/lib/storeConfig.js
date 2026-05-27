// Store-wide commerce rules used for checkout display.
// IMPORTANT: these must stay in sync with the authoritative values in
// backend/controllers/OrderController.php (the backend recomputes the order
// total on the server — this is only for showing the breakdown to the user).
export const STORE_CONFIG = {
  freeShippingThreshold: 50,   // free shipping at/above this subtotal
  flatShippingFee: 8,          // otherwise this flat fee
  taxRate: 0,                  // e.g. 0.08 = 8%; 0 hides the tax line
  // Your shop's WhatsApp number — digits only, country code first, no "+" or spaces.
  // Example for Lebanon: '96170123456'. Leave '' to hide all WhatsApp buttons.
  whatsappNumber: '+96176820617',
  // Google OAuth Client ID from console.cloud.google.com.
  // Leave '' to hide the "Continue with Google" button.
  googleClientId: '15198360813-v2to3e36rubh09scdcp1nbcbrrq4aaf1.apps.googleusercontent.com',
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
