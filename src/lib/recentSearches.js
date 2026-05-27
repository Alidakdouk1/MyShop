// Recent search terms, backed by localStorage. Shown in the search dropdown
// when the box is focused but empty. Per-browser; capped to the latest few.

const KEY = 'myshop_recent_searches'
const MAX = 6

export function getRecentSearches() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY))
    return Array.isArray(raw) ? raw : []
  } catch {
    return []
  }
}

export function addRecentSearch(term) {
  const t = String(term || '').trim()
  if (!t) return
  const next = [t, ...getRecentSearches().filter(s => s.toLowerCase() !== t.toLowerCase())].slice(0, MAX)
  try { localStorage.setItem(KEY, JSON.stringify(next)) } catch { /* quota / disabled — ignore */ }
}

export function removeRecentSearch(term) {
  const t = String(term || '').trim().toLowerCase()
  const next = getRecentSearches().filter(s => s.toLowerCase() !== t)
  try { localStorage.setItem(KEY, JSON.stringify(next)) } catch { /* ignore */ }
}

export function clearRecentSearches() {
  try { localStorage.removeItem(KEY) } catch { /* ignore */ }
}
