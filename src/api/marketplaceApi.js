import api from './axios'

// Public / user
export const getAds        = (params)      => api.get('/marketplace', { params })
export const getAd         = (id)          => api.get(`/marketplace/${id}`)
export const getMyAds      = ()            => api.get('/marketplace/mine')
export const createAd      = (data)        => api.post('/marketplace', data)
export const updateAd      = (id, data)    => api.put(`/marketplace/${id}`, data)
export const deleteAd      = (id)          => api.delete(`/marketplace/${id}`)
export const markAdSold    = (id)          => api.put(`/marketplace/${id}/sold`)
export const renewAd       = (id)          => api.put(`/marketplace/${id}/renew`)
export const reportAd      = (id, reason, note) => api.post(`/marketplace/${id}/report`, { reason, note })
export const uploadAdImage = (id, formData)=> api.post(`/marketplace/${id}/image`, formData, { headers: { 'Content-Type': 'multipart/form-data' } })

// Settings
export const getMarketplaceSettings      = () => api.get('/marketplace/settings')
export const getAdminMarketplaceSettings = () => api.get('/admin/marketplace/settings')
export const updateMarketplaceSettings   = (data) => api.put('/admin/marketplace/settings', data)

// Admin
export const adminGetAds      = (status)      => api.get('/admin/marketplace', { params: status ? { status } : {} })
export const adminSetAdStatus = (id, status, reason) => api.put(`/admin/marketplace/${id}/status`, { status, reason })
export const adminSetAdFeatured = (id, featured) => api.put(`/admin/marketplace/${id}/feature`, { featured })
