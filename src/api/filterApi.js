import api from './axios'

// Public — used by storefront sidebar.
// Pass a categoryId to get only the filters assigned to that category.
export const getFilters = (categoryId) =>
  api.get('/filters', { params: categoryId ? { category_id: categoryId } : {} })

// Admin — full list (incl. inactive)
export const getAdminFilters = ()   => api.get('/admin/filters')

// Admin — which filters appear for a category (sidebar)
export const getCategoryFilters  = (categoryId)            => api.get(`/admin/categories/${categoryId}/filters`)
export const saveCategoryFilters = (categoryId, filterIds) =>
  api.put(`/admin/categories/${categoryId}/filters`, { filter_ids: filterIds })

// Filter CRUD
export const createFilter = (data)      => api.post('/filters', data)
export const updateFilter = (id, data)  => api.put(`/filters/${id}`, data)
export const deleteFilter = (id)        => api.delete(`/filters/${id}`)

// Option CRUD
export const createFilterOption = (data)      => api.post('/filter-options', data)
export const updateFilterOption = (id, data)  => api.put(`/filter-options/${id}`, data)
export const deleteFilterOption = (id)        => api.delete(`/filter-options/${id}`)

// Product ↔ filters
export const getProductFilters  = (productId)              => api.get(`/products/${productId}/filters`)
export const saveProductFilters = (productId, selections)  =>
  api.post(`/products/${productId}/filters`, { filters: selections })

// Helper: turn { filterId: [optionId, ...] } into the compact URL string.
// Usage: getProducts({ filters: serializeFilterParam(selected) })
export const serializeFilterParam = (sel) => {
  const parts = []
  Object.entries(sel || {}).forEach(([fid, opts]) => {
    const ids = (opts || []).filter(Boolean)
    if (ids.length) parts.push(`${fid}:${ids.join(',')}`)
  })
  return parts.join(';')
}

// Build the payload shape the API expects from the picker's internal value:
//   { [filterId]: { enabled, visible, option_ids:[], min_value, max_value } }
//     → [{ filter_id, option_ids, is_visible }, ...]
// Filters that are not enabled are skipped entirely.
export const buildFiltersPayload = (value) => {
  const out = []
  Object.entries(value || {}).forEach(([filterId, sel]) => {
    const fid = Number(filterId)
    if (!fid) return
    if (sel.enabled === false) return
    const hasOptions = (sel.option_ids || []).filter(Boolean).length > 0
    const hasRange   = (sel.min_value !== '' && sel.min_value != null) || (sel.max_value !== '' && sel.max_value != null)
    if (!hasOptions && !hasRange) return
    const isVisible = sel.visible === false ? 0 : 1
    if (hasRange) {
      out.push({
        filter_id: fid,
        min_value: sel.min_value !== '' && sel.min_value != null ? Number(sel.min_value) : null,
        max_value: sel.max_value !== '' && sel.max_value != null ? Number(sel.max_value) : null,
        is_visible: isVisible,
      })
    }
    if (hasOptions) {
      const ids = sel.option_ids.filter(Boolean)
      const quantities  = {}
      const hover_texts = {}
      ids.forEach(id => {
        const q = (sel.quantities  || {})[id]
        const h = (sel.hover_texts || {})[id]
        if (q !== '' && q != null) quantities[id]  = Number(q)
        if (h !== '' && h != null) hover_texts[id] = String(h)
      })
      out.push({
        filter_id:   fid,
        option_ids:  ids,
        quantities,
        hover_texts,
        is_visible:  isVisible,
      })
    }
  })
  return out
}
