// Resolve a stored image reference to a usable URL.
// Backend-relative paths (e.g. "uploads/products/1/x.jpg") get the API prefix,
// while absolute URLs (Unsplash https, blob:, or root-relative "/...") are
// returned untouched. Using this everywhere prevents broken
// "/MyShop/backend/https://..." paths in cart / wishlist / checkout / orders.
export function resolveImg(src) {
  if (!src) return ''
  return /^(https?:|blob:|\/)/.test(src) ? src : `/MyShop/backend/${src}`
}
