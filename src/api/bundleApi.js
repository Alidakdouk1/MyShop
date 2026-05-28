import api from './axios'

// ── Public / shopper ──
export const getBundle      = (id) => api.get(`/bundles/${id}`)
export const addBundleToCart = (id) => api.post(`/cart/bundles/${id}`)

// ── Admin ──
export const getAdminBundles = ()        => api.get('/admin/bundles')
export const getAdminBundle  = (id)      => api.get(`/admin/bundles/${id}`)
export const createBundle    = (data)    => api.post('/admin/bundles', data)
export const updateBundle    = (id, data) => api.put(`/admin/bundles/${id}`, data)
export const deleteBundle    = (id)      => api.delete(`/admin/bundles/${id}`)
