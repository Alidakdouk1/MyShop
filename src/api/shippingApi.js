import api from './axios'

// Public — read by ProductDetail to render the "Get it by …" badge.
export const getShippingEstimate    = ()    => api.get('/shipping-estimate')

// Admin
export const getShippingEstimateAdmin    = ()   => api.get('/admin/shipping-estimate')
export const updateShippingEstimateAdmin = (s)  => api.put('/admin/shipping-estimate', s)
