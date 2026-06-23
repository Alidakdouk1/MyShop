import api from './axios'

export const subscribeNewsletter = (email, source = 'footer') =>
  api.post('/newsletter/subscribe', { email, source })

export const getPopupConfig        = ()       => api.get('/newsletter/popup')
export const claimWelcomeDiscount  = (email)  => api.post('/newsletter/welcome-discount', { email })

// Admin
export const getPopupSettings      = ()       => api.get('/admin/newsletter/popup')
export const updatePopupSettings   = (s)      => api.put('/admin/newsletter/popup', s)

// Campaigns (admin)
export const getNewsletterCampaigns   = ()       => api.get('/admin/newsletter/campaigns')
export const getNewsletterCampaign    = (id)     => api.get(`/admin/newsletter/campaigns/${id}`)
export const createNewsletterCampaign = (data)   => api.post('/admin/newsletter/campaigns', data)
export const updateNewsletterCampaign = (id, d)  => api.put(`/admin/newsletter/campaigns/${id}`, d)
export const deleteNewsletterCampaign = (id)     => api.delete(`/admin/newsletter/campaigns/${id}`)
export const sendNewsletterCampaign   = (id)     => api.post(`/admin/newsletter/campaigns/${id}/send`)
