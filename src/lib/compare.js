// Side-by-side product comparison, stored locally per browser.
// We persist a compact product summary so the floating bar and /compare page
// can render without re-hitting the API for items already on the list.
//
// External callers can subscribe via the `myshop:compare-changed` window event;
// the `useCompare()` hook below wires that up to React state automatically.

import { useEffect, useState } from 'react'

const KEY = 'myshop_compare'
export const COMPARE_MAX   = 3
export const COMPARE_EVENT = 'myshop:compare-changed'

function read() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY))
    return Array.isArray(raw) ? raw : []
  } catch {
    return []
  }
}

function write(list) {
  try { localStorage.setItem(KEY, JSON.stringify(list)) } catch { /* quota / disabled */ }
  window.dispatchEvent(new Event(COMPARE_EVENT))
}

export function getCompareList() {
  return read()
}

export function isInCompare(productId) {
  return read().some(p => Number(p.id) === Number(productId))
}

function summarize(product) {
  return {
    id:            product.id,
    slug:          product.slug,
    name:          product.name,
    base_price:    product.base_price ?? product.price ?? 0,
    sale_price:    product.sale_price ?? null,
    primary_image: product.images?.[0]?.image_url || product.primary_image || product.main_image || null,
    rating_avg:    product.review_stats?.avg_rating ?? product.rating_avg ?? product.avg_rating ?? null,
    review_count:  product.review_count ?? product.review_stats?.count ?? 0,
    stock_qty:     Number(product.stock_qty ?? 0),
    variant_count: product.variants?.length ?? product.variant_count ?? 0,
    category_name: product.category_name ?? product.category?.name ?? null,
    weight:        product.weight ?? null,
    release_date:  product.release_date ?? null,
    description:   product.description ?? null,
  }
}

// Returns { ok, reason } so callers can show a toast.
export function addToCompare(product) {
  const list = read()
  if (list.some(p => Number(p.id) === Number(product.id))) {
    return { ok: false, reason: 'already' }
  }
  if (list.length >= COMPARE_MAX) {
    return { ok: false, reason: 'full' }
  }
  write([...list, summarize(product)])
  return { ok: true }
}

export function removeFromCompare(productId) {
  write(read().filter(p => Number(p.id) !== Number(productId)))
}

// Convenience: card-style "toggle" with consistent feedback.
export function toggleCompare(product) {
  if (isInCompare(product.id)) {
    removeFromCompare(product.id)
    return { ok: true, action: 'removed' }
  }
  const res = addToCompare(product)
  return { ...res, action: 'added' }
}

export function clearCompare() {
  write([])
}

// React subscription. Updates whenever this tab — or any other tab — writes.
export function useCompare() {
  const [list, setList] = useState(read)
  useEffect(() => {
    const sync = () => setList(read())
    window.addEventListener(COMPARE_EVENT, sync)
    window.addEventListener('storage', e => { if (e.key === KEY) sync() })
    return () => {
      window.removeEventListener(COMPARE_EVENT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [])
  return list
}
