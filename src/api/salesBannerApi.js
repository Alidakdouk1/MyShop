import api from './axios'

// Public — read by SalesBanner.jsx on every layout render.
export const getSalesBanner       = ()    => api.get('/sales-banner')

// Admin
export const getSalesBannerAdmin    = ()   => api.get('/admin/sales-banner')
export const updateSalesBannerAdmin = (s)  => api.put('/admin/sales-banner', s)
