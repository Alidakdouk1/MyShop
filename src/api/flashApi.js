import api from './axios'

// ── Admin ──
export const getFlashSales   = ()     => api.get('/admin/flash-sales')
export const createFlashSale = (data) => api.post('/admin/flash-sales', data)
export const deleteFlashSale = (id)   => api.delete(`/admin/flash-sales/${id}`)
