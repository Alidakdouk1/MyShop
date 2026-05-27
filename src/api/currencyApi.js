import api from './axios'

// ── Public ──
export const getCurrencies = () => api.get('/currencies')

// ── Admin ──
export const getAdminCurrencies = ()        => api.get('/admin/currencies')
export const createCurrency     = (data)    => api.post('/admin/currencies', data)
export const updateCurrency     = (id, data) => api.put(`/admin/currencies/${id}`, data)
export const deleteCurrency     = (id)      => api.delete(`/admin/currencies/${id}`)
