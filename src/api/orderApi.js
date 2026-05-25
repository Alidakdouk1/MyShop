import api from './axios'

export const getOrders      = (params) => api.get('/orders', { params })
export const getOrder       = (id)     => api.get(`/orders/${id}`)
export const checkout       = (data)   => api.post('/orders', data)
export const cancelOrder    = (id)     => api.put(`/orders/${id}/cancel`)
export const validateCoupon = (code)   => api.post('/coupons/validate', { code })
export const createReturn    = (data)   => api.post('/returns', data)
export const getReturns      = ()       => api.get('/returns')
