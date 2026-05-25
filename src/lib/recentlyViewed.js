// Lightweight "recently viewed" store backed by localStorage.
// We persist a compact product summary (enough for ProductCard) so rendering
// the row needs no extra API calls. Shared across the app; per-browser.

const KEY = 'myshop_recently_viewed'
const MAX = 12

export function getRecentlyViewed() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY))
    return Array.isArray(raw) ? raw : []
  } catch {
    return []
  }
}

export function addRecentlyViewed(product) {
  if (!product?.id) return
  const entry = {
    id:            product.id,
    slug:          product.slug,
    name:          product.name,
    base_price:    product.base_price ?? product.price ?? 0,
    sale_price:    product.sale_price ?? null,
    primary_image: product.images?.[0]?.image_url || product.primary_image || product.main_image || null,
    rating_avg:    product.review_stats?.avg_rating ?? product.rating_avg ?? product.avg_rating ?? null,
    review_count:  product.review_count ?? product.review_stats?.count ?? null,
    variant_count: product.variants?.length ?? product.variant_count ?? 0,
  }
  const next = [entry, ...getRecentlyViewed().filter(p => p.id !== product.id)].slice(0, MAX)
  try { localStorage.setItem(KEY, JSON.stringify(next)) } catch { /* quota / disabled — ignore */ }
}
