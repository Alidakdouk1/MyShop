import api from './axios'

export const subscribeNewsletter = (email, source = 'footer') =>
  api.post('/newsletter/subscribe', { email, source })

export const getPopupConfig        = ()       => api.get('/newsletter/popup')
export const claimWelcomeDiscount  = (email)  => api.post('/newsletter/welcome-discount', { email })

// Admin
export const getPopupSettings      = ()       => api.get('/admin/newsletter/popup')
export const updatePopupSettings   = (s)      => api.put('/admin/newsletter/popup', s)
